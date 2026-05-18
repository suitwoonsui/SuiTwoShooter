// ==========================================
// Auth Utilities - Re-export from base backend
// ==========================================
// Game backend uses auth from base backend

import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/config/config';
import { getCorsHeaders } from './cors';
import { getPlatformApiKeyForCall } from '@/lib/services/platform/client/platform-client';

const SERVER_KEY_HINT =
  'Set ECOSYSTEM_<id>_APP_<app>_API_KEY (preferred), ECOSYSTEM_<id>_API_KEY, or legacy API_KEY / ADMIN_API_KEY in backend/.env';

/**
 * Keys the game backend may use for outbound platform calls and optional inbound admin auth.
 */
function getConfiguredAdminApiKeys(): string[] {
  const keys = new Set<string>();
  try {
    const legacy = getConfig().security.apiKey;
    if (legacy) keys.add(legacy);
  } catch {
    /* config not ready */
  }
  const appKey = getPlatformApiKeyForCall({ apiKeyScope: 'app' });
  if (appKey) keys.add(appKey);
  const ecoKey = getPlatformApiKeyForCall({ apiKeyScope: 'ecosystem' });
  if (ecoKey) keys.add(ecoKey);
  return [...keys];
}

/** True when the server can call the platform (app/ecosystem key or legacy API_KEY). */
export function isGameAdminServerConfigured(): boolean {
  return getConfiguredAdminApiKeys().length > 0;
}

/** Throws when no platform/legacy API key is configured (admin proxy routes). */
export function assertGameAdminServerConfigured(): void {
  if (!isGameAdminServerConfigured()) {
    throw new Error(`Platform API key not configured on server. ${SERVER_KEY_HINT}`);
  }
}

/**
 * Authentication utilities for admin endpoints
 */

/**
 * Verify API key from request header
 * Supports both 'Authorization: Bearer <key>' and 'X-API-Key: <key>' headers
 */
export function verifyApiKey(request: NextRequest): boolean {
  const accepted = getConfiguredAdminApiKeys();
  if (accepted.length === 0) {
    console.warn('⚠️ [AUTH] No admin/platform API key configured in environment');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (accepted.includes(token)) return true;
  }

  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader && accepted.includes(apiKeyHeader)) return true;

  return false;
}

/**
 * Middleware to protect admin endpoints with API key authentication
 * Returns null if authorized, or a NextResponse with error if unauthorized
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const corsHeaders = getCorsHeaders(request);

  if (!verifyApiKey(request)) {
    console.warn('⚠️ [AUTH] Unauthorized admin access attempt');
    console.warn(`   IP: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'}`);
    console.warn(`   Path: ${request.nextUrl.pathname}`);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized. Valid API key required.',
      },
      { status: 401, headers: corsHeaders }
    );
  }

  return null; // Authorized
}

/**
 * Get admin identifier from request (for logging)
 * Returns IP address or 'unknown'
 */
export function getAdminIdentifier(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
