'use client';

import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingSpinnerComponent: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text, 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin text-[var(--color-accent1)] ${sizeClasses[size]}`} />
      {text && (
        <span className={`text-[var(--color-text-secondary)] ${textSizeClasses[size]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export const LoadingSpinner = memo(LoadingSpinnerComponent);
