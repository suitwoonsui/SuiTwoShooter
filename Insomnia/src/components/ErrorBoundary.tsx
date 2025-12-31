'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service here
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--color-surface)] rounded-xl p-6 shadow-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold text-[var(--color-text)]">
                Something went wrong
              </h2>
            </div>
            
            <div className="mb-6">
              <p className="text-[var(--color-text-secondary)] mb-3">
                We encountered an unexpected error. This could be due to a temporary issue.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4">
                  <summary className="text-sm text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text)] mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-[var(--color-background)] p-3 rounded-lg border border-[var(--color-border)] text-xs font-mono">
                    <div className="text-red-400 mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
                      <strong>Stack:</strong>
                      <br />
                      {this.state.error.stack}
                    </div>
                    {this.state.errorInfo && (
                      <div className="text-[var(--color-text-secondary)] whitespace-pre-wrap mt-2">
                        <strong>Component Stack:</strong>
                        <br />
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 bg-[var(--color-accent1)] hover:bg-[var(--color-accent2)] text-[var(--color-background)] px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-[var(--color-surface)] hover:bg-[var(--color-background)] text-[var(--color-text)] px-4 py-2 rounded-lg border border-[var(--color-border)] transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
