export type HeaderRecord = Record<string, string>;

export function normalizeHeaders(input: HeadersInit | undefined | null): HeaderRecord {
  if (!input) return {};
  if (input instanceof Headers) return Object.fromEntries(input.entries());
  if (Array.isArray(input)) return Object.fromEntries(input);
  return { ...(input as Record<string, string>) };
}

export function getHeader(headers: HeaderRecord, name: string): string {
  const direct = headers[name];
  if (direct != null && String(direct).trim() !== '') return String(direct).trim();
  const lower = headers[name.toLowerCase()];
  if (lower != null && String(lower).trim() !== '') return String(lower).trim();
  return '';
}

