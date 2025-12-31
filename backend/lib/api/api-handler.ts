// ==========================================
// API Handler - Shared middleware for API routes
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';

/**
 * Options for API handler
 */
export interface ApiHandlerOptions {
  requireAuth?: boolean;
  validateBody?: (body: any) => void | Promise<void>;
  logRequest?: boolean;
}

/**
 * API Handler wrapper that provides:
 * - CORS handling
 * - Error handling
 * - Request logging
 * - Response formatting
 */
export function withApiHandler<T, TParams = any>(
  handler: (req: NextRequest, context: { params: Promise<TParams> }) => Promise<T>,
  options: ApiHandlerOptions = {}
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const corsHeaders = getCorsHeaders(request);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const corsResponse = handleCorsPreflight(request);
      // Convert Response to NextResponse
      return new NextResponse(null, {
        status: corsResponse.status,
        headers: Object.fromEntries(corsResponse.headers.entries()),
      });
    }

    try {
      // Log request if enabled
      if (options.logRequest !== false) {
        BadgeLogger.info('API request received', {
          method: request.method,
          url: request.url,
          pathname: new URL(request.url).pathname,
        });
      }

      // Call the actual handler
      const result = await handler(request, context);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log successful response
      if (options.logRequest !== false) {
        BadgeLogger.info('API request completed', {
          method: request.method,
          pathname: new URL(request.url).pathname,
          duration: `${duration}ms`,
        });
      }

      // Return response (handler can return NextResponse or data object)
      if (result instanceof NextResponse) {
        return result;
      }

      // If handler already returns a response-like object with 'success' field, use it directly
      // This prevents double-wrapping responses that are already formatted
      if (result && typeof result === 'object' && 'success' in result) {
        return NextResponse.json(result, { headers: corsHeaders });
      }

      // If handler returns plain data, wrap it in a success response
      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle BadgeError specifically
      if (error instanceof BadgeError) {
        BadgeLogger.error('API request failed (BadgeError)', {
          method: request.method,
          pathname: new URL(request.url).pathname,
          error: error.message,
          code: error.code,
          duration: `${duration}ms`,
        });

        return NextResponse.json(
          {
            success: false,
            error: sanitizeErrorMessage(error.message),
            code: error.code,
          },
          {
            status: getStatusCodeForError(error.code),
            headers: corsHeaders,
          }
        );
      }

      // Handle other errors
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';

      BadgeLogger.error('API request failed (unknown error)', {
        method: request.method,
        pathname: new URL(request.url).pathname,
        error: errorMessage,
        duration: `${duration}ms`,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        {
          success: false,
          error: sanitizeErrorMessage(errorMessage),
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
  };
}

/**
 * Sanitize error messages for production
 * Prevents exposing internal details
 */
function sanitizeErrorMessage(message: string): string {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return message;
  }

  // Sanitize common error patterns
  if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
    return 'Connection failed. Please try again later.';
  }

  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return message; // Keep validation errors as they're user-friendly
  }

  // Generic error for internal issues
  if (
    message.includes('Cannot read') ||
    message.includes('undefined') ||
    message.includes('null')
  ) {
    return 'An error occurred. Please try again.';
  }

  // For known user-facing errors, return as-is
  if (
    message.includes('already has a badge') ||
    message.includes('not configured') ||
    message.includes('required')
  ) {
    return message;
  }

  // Default: generic error message
  return 'An error occurred. Please try again.';
}

/**
 * Get HTTP status code for BadgeError code
 */
function getStatusCodeForError(code: BadgeErrorCode): number {
  switch (code) {
    case BadgeErrorCode.INVALID_ADDRESS:
    case BadgeErrorCode.INVALID_BADGE_ID:
    case BadgeErrorCode.INVALID_TIER:
    case BadgeErrorCode.INVALID_SESSION_ID:
      return 400; // Bad Request

    case BadgeErrorCode.CONFIG_MISSING:
      return 500; // Internal Server Error

    case BadgeErrorCode.TRANSACTION_FAILED:
      return 502; // Bad Gateway

    case BadgeErrorCode.BLOCKCHAIN_QUERY_FAILED:
    case BadgeErrorCode.NETWORK_ERROR:
      return 503; // Service Unavailable

    default:
      return 500;
  }
}

/**
 * Helper to extract and validate request body
 */
export async function getRequestBody<T = any>(
  request: NextRequest
): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new BadgeError(
      BadgeErrorCode.INVALID_ADDRESS,
      'Invalid request body. Expected JSON.'
    );
  }
}

/**
 * Helper to extract address parameter
 */
export async function getAddressParam(
  params: Promise<{ address: string }> | { address: string }
): Promise<string> {
  const resolvedParams =
    params instanceof Promise ? await params : params;
  return resolvedParams.address;
}

/**
 * Helper to extract digest parameter
 */
export async function getDigestParam(
  params: Promise<{ digest: string }> | { digest: string }
): Promise<string> {
  const resolvedParams =
    params instanceof Promise ? await params : params;
  const digest = resolvedParams.digest;
  
  if (!digest || typeof digest !== 'string' || digest.length < 40) {
    throw new BadgeError(
      BadgeErrorCode.INVALID_ADDRESS,
      'Invalid transaction digest format'
    );
  }
  
  return digest;
}

