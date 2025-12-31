/**
 * Comprehensive error handling and logging utilities
 */

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  userAgent?: string;
  url?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: AppError[] = [];
  private maxErrors = 100;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        code: 'JAVASCRIPT_ERROR',
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
        severity: 'high',
      });
    });

    // Handle Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        code: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || 'Unhandled promise rejection',
        details: {
          reason: event.reason,
          stack: event.reason?.stack,
        },
        severity: 'high',
      });
    });

    // Handle network errors
    window.addEventListener('offline', () => {
      this.logError({
        code: 'NETWORK_OFFLINE',
        message: 'User went offline',
        severity: 'medium',
      });
    });
  }

  public logError(error: Partial<AppError>): void {
    const fullError: AppError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details || {},
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      severity: error.severity || 'medium',
      ...error,
    };

    // Add to local storage
    this.errors.unshift(fullError);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error [${fullError.severity.toUpperCase()}]`);
      console.error('Code:', fullError.code);
      console.error('Message:', fullError.message);
      console.error('Details:', fullError.details);
      console.error('Timestamp:', new Date(fullError.timestamp).toISOString());
      console.groupEnd();
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(fullError);
    }

    // Store in localStorage for debugging
    try {
      localStorage.setItem('insomnia_errors', JSON.stringify(this.errors.slice(0, 10)));
    } catch {
      // localStorage might be full
    }
  }

  private async sendToAnalytics(error: AppError): Promise<void> {
    try {
      // Only send critical and high severity errors in production
      if (error.severity === 'critical' || error.severity === 'high') {
        // You would implement your analytics service here
        // Example: Sentry, LogRocket, or custom endpoint
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error),
        });
      }
    } catch {
      // Fail silently - don't want error reporting to cause more errors
    }
  }

  public getErrors(): AppError[] {
    return [...this.errors];
  }

  public clearErrors(): void {
    this.errors = [];
    try {
      localStorage.removeItem('insomnia_errors');
    } catch {
      // Ignore
    }
  }

  public getErrorsByCode(code: string): AppError[] {
    return this.errors.filter(error => error.code === code);
  }

  public getErrorsBySeverity(severity: AppError['severity']): AppError[] {
    return this.errors.filter(error => error.severity === severity);
  }
}

// Specific error types for the game
export const GameErrors = {
  BLOCKCHAIN_CONNECTION_FAILED: 'BLOCKCHAIN_CONNECTION_FAILED',
  WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  GAME_STATE_CORRUPTED: 'GAME_STATE_CORRUPTED',
  PERFORMANCE_ISSUE: 'PERFORMANCE_ISSUE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  WEB_WORKER_ERROR: 'WEB_WORKER_ERROR',
  AUDIO_ERROR: 'AUDIO_ERROR',
} as const;

// Helper functions for common error scenarios
export const handleBlockchainError = (error: unknown, context: string) => {
  const logger = ErrorLogger.getInstance();
  logger.logError({
    code: GameErrors.BLOCKCHAIN_CONNECTION_FAILED,
    message: `Blockchain error in ${context}`,
    details: { 
      error: error instanceof Error ? error.message : String(error),
      context,
      stack: error instanceof Error ? error.stack : undefined,
    },
    severity: 'high',
  });
};

export const handlePerformanceIssue = (metric: string, value: number, threshold: number) => {
  const logger = ErrorLogger.getInstance();
  logger.logError({
    code: GameErrors.PERFORMANCE_ISSUE,
    message: `Performance issue detected: ${metric}`,
    details: { metric, value, threshold },
    severity: value > threshold * 2 ? 'high' : 'medium',
  });
};

export const handleGameStateError = (state: Record<string, unknown>, expectedState: Record<string, unknown>) => {
  const logger = ErrorLogger.getInstance();
  logger.logError({
    code: GameErrors.GAME_STATE_CORRUPTED,
    message: 'Game state corruption detected',
    details: { currentState: state, expectedState },
    severity: 'critical',
  });
};

// React Error Boundary helper
export const createErrorBoundaryHandler = (componentName: string) => {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    const logger = ErrorLogger.getInstance();
    logger.logError({
      code: 'REACT_ERROR_BOUNDARY',
      message: `React error in ${componentName}`,
      details: {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        componentName,
      },
      severity: 'high',
    });
  };
};

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();
