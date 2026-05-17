import type { HeaderRecord } from '@/lib/http/headers';
import { getHeader, normalizeHeaders } from '@/lib/http/headers';

export function makeRequestId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getRequestIdFromHeaders(headers: HeadersInit | HeaderRecord | undefined | null): string {
  const h = normalizeHeaders(headers as HeadersInit | undefined | null);
  return getHeader(h, 'X-Request-Id');
}

export function getOrCreateRequestId(request?: Request | null): string {
  const fromReq = request ? getRequestIdFromHeaders(request.headers) : '';
  return fromReq || makeRequestId();
}

