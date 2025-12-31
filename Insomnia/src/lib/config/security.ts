/**
 * Security configuration and utilities
 * Centralizes security-related constants and validation
 */

// Content Security Policy for production
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "https:"],
  'font-src': ["'self'"],
  'connect-src': ["'self'", "wss:", "https:"],
  'worker-src': ["'self'", "blob:"],
};

// Rate limiting configuration
export const RATE_LIMITS = {
  API_CALLS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
  },
  BLOCKCHAIN_CALLS: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // requests per window
  },
};

// Input validation
export const VALIDATION = {
  MAX_SCORE: 10000,
  MIN_SCORE: 0,
  MAX_USERNAME_LENGTH: 50,
  ALLOWED_NETWORKS: ['mainnet', 'testnet', 'devnet'] as const,
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, VALIDATION.MAX_USERNAME_LENGTH);
};

// Validate Sui address format
export const isValidSuiAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
};

// Validate score range
export const isValidScore = (score: number): boolean => {
  return (
    typeof score === 'number' &&
    !isNaN(score) &&
    score >= VALIDATION.MIN_SCORE &&
    score <= VALIDATION.MAX_SCORE
  );
};

// Security headers for API responses
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Environment validation
export const validateEnvironment = () => {
  const warnings: string[] = [];
  
  // Check for common security misconfigurations
  if (typeof window !== 'undefined') {
    // Client-side checks
    if (document.location.protocol === 'http:' && 
        !document.location.hostname.includes('localhost')) {
      warnings.push('Application not served over HTTPS in production');
    }
  }
  
  // Check environment variables
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl && backendUrl.includes('localhost') && 
      process.env.NODE_ENV === 'production') {
    warnings.push('Backend URL points to localhost in production');
  }
  
  return warnings;
};
