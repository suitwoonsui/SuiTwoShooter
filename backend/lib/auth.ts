import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/config/config';
import { getCorsHeaders } from './cors';

/**
 * Authentication utilities for admin endpoints
 */

/**
 * Verify API key from request header
 * Supports both 'Authorization: Bearer <key>' and 'X-API-Key: <key>' headers
 */
export function verifyApiKey(request: NextRequest): boolean {
  const config = getConfig();
  const apiKey = config.security.apiKey;

  // If no API key is configured, deny access (security by default)
  if (!apiKey || apiKey === '') {
    console.warn('⚠️ [AUTH] API_KEY not configured in environment variables');
    return false;
  }

  // Check Authorization header (Bearer token format)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === apiKey) {
      return true;
    }
  }

  // Check X-API-Key header (alternative format)
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader && apiKeyHeader === apiKey) {
    return true;
  }

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

