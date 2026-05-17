// ==========================================
// API handler for game routes (game-owned; no platform dependency)
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getRequestContextAsync } from '@/lib/api/request-context';
import type { RequestContext } from '@/lib/api/request-context';

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  validateBody?: (body: unknown) => void | Promise<void>;
  logRequest?: boolean;
}

export interface ApiHandlerContext<TParams = unknown> {
  params: Promise<TParams>;
  requestContext: RequestContext;
}

export function withApiHandler<T, TParams = unknown>(
  handler: (req: NextRequest, context: ApiHandlerContext<TParams>) => Promise<T>,
  options: ApiHandlerOptions = {}
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    const requestContext = await getRequestContextAsync(request);
    const enrichedContext: ApiHandlerContext<TParams> = { ...context, requestContext };
    const startTime = Date.now();
    const corsHeaders = getCorsHeaders(request);
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('X-Request-Id', requestContext.requestId);

    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(request);
    }

    try {
      if (options.logRequest !== false) {
        PlatformLogger.info('API request received', {
          method: request.method,
          url: request.url,
          pathname: new URL(request.url).pathname,
          requestId: requestContext.requestId,
          corridorCapabilityObjectId: requestContext.corridor?.corridorCapabilityObjectId || null,
          corridorAdminCapabilityObjectId: requestContext.corridor?.corridorAdminCapabilityObjectId || null,
        });
      }

      const result = await handler(request, enrichedContext);
      const duration = Date.now() - startTime;

      if (options.logRequest !== false) {
        PlatformLogger.info('API request completed', {
          method: request.method,
          pathname: new URL(request.url).pathname,
          duration: `${duration}ms`,
          requestId: requestContext.requestId,
          corridorCapabilityObjectId: requestContext.corridor?.corridorCapabilityObjectId || null,
          corridorAdminCapabilityObjectId: requestContext.corridor?.corridorAdminCapabilityObjectId || null,
        });
      }

      if (result instanceof NextResponse) return result;
      if (result && typeof result === 'object' && 'success' in result) {
        return NextResponse.json(result, { headers: responseHeaders });
      }
      return NextResponse.json(
        { success: true, data: result },
        { headers: responseHeaders }
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof PlatformError) {
        PlatformLogger.error('API request failed (PlatformError)', {
          method: request.method,
          pathname: new URL(request.url).pathname,
          error: error.message,
          code: error.code,
          duration: `${duration}ms`,
          requestId: requestContext.requestId,
        });
        return NextResponse.json(
          {
            success: false,
            error: sanitizeErrorMessage(error.message),
            code: error.code,
          },
          { status: getStatusCodeForError(error.code), headers: responseHeaders }
        );
      }

      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      PlatformLogger.error('API request failed (unknown error)', {
        method: request.method,
        pathname: new URL(request.url).pathname,
        error: errorMessage,
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : undefined,
        requestId: requestContext.requestId,
      });
      return NextResponse.json(
        { success: false, error: sanitizeErrorMessage(errorMessage) },
        { status: 500, headers: responseHeaders }
      );
    }
  };
}

function sanitizeErrorMessage(message: string): string {
  if (process.env.NODE_ENV !== 'production') return message;
  if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) return 'Connection failed. Please try again later.';
  if (message.includes('timeout')) return 'Request timed out. Please try again.';
  // Sui JSON-RPC and gateways: one read (e.g. listing gas coins) can 429 even when building a single tx.
  if (/\b429\b/.test(message) || /Too Many Requests/i.test(message) || /rate limit/i.test(message)) {
    return 'The blockchain service temporarily rate-limited this request. Wait a few seconds and try again. Nothing was deducted if the transaction did not complete.';
  }
  if (/\b503\b/.test(message) || /Bad Gateway/i.test(message) || /temporarily unavailable/i.test(message)) {
    return 'The blockchain or upstream service is temporarily busy. Try again in a few seconds.';
  }
  if (/Unexpected status code:\s*5\d\d/i.test(message)) {
    return 'The blockchain service returned a temporary error while preparing the transaction. Try again shortly.';
  }
  // Sui MoveAbort: reservoir::consume_balance inner abort 3 = E_HOLDINGS_NOT_FOUND (no balance row for key).
  if (/MoveAbort[\s\S]*consume_balance[\s\S]*,\s*3\s*\)\s*in\s*command/i.test(message)) {
    return 'On-chain inventory has no row for the balance key used (common fix: provision keys must match the store, e.g. extra_lives_2 not extra_lives). Nothing was consumed.';
  }
  if (message.includes('validation') || message.includes('invalid')) return message;
  if (message.includes('Cannot read') || message.includes('undefined') || message.includes('null')) return 'An error occurred. Please try again.';
  if (message.includes('already has a badge') || message.includes('not configured') || message.includes('required')) return message;
  return 'An error occurred. Please try again.';
}

function getStatusCodeForError(code: PlatformErrorCode): number {
  switch (code) {
    case PlatformErrorCode.UNAUTHORIZED: return 401;
    case PlatformErrorCode.ADMIN_REQUIRED: return 403;
    case PlatformErrorCode.INVALID_INPUT:
    case PlatformErrorCode.INVALID_ADDRESS:
    case PlatformErrorCode.INVALID_BADGE_ID:
    case PlatformErrorCode.INVALID_TIER:
    case PlatformErrorCode.INVALID_SESSION_ID: return 400;
    case PlatformErrorCode.CONFIG_MISSING:
    case PlatformErrorCode.CONFIG_INVALID: return 503;
    case PlatformErrorCode.TRANSACTION_FAILED: return 502;
    case PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED:
    case PlatformErrorCode.NETWORK_ERROR: return 503;
    case PlatformErrorCode.SERVICE_UNAVAILABLE: return 410;
    default: return 500;
  }
}

export async function getRequestBody<T = unknown>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'Invalid request body. Expected JSON.');
  }
}

export async function getAddressParam(
  params: Promise<{ address: string }> | { address: string }
): Promise<string> {
  const resolved = params instanceof Promise ? await params : params;
  return resolved.address;
}

export async function getDigestParam(
  params: Promise<{ digest: string }> | { digest: string }
): Promise<string> {
  const resolved = params instanceof Promise ? await params : params;
  const digest = resolved.digest;
  if (!digest || typeof digest !== 'string' || digest.length < 40) {
    throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'Invalid transaction digest format');
  }
  return digest;
}
