// ==========================================
// Copyable address/ID - shows condensed value + copy button
// Use anywhere an address or object ID is displayed on the admin page.
// ==========================================

'use client';

import { useState, useCallback } from 'react';
import { AdminStyles } from '../types';

function condense(value: string, head = 8, tail = 6): string {
  if (!value || value.length <= head + tail + 3) return value;
  return `${value.substring(0, head)}...${value.substring(value.length - tail)}`;
}

export interface CopyableAddressProps {
  /** Full value to copy to clipboard */
  value: string;
  /** Optional display text; if not set, value is shown condensed (first 8 + ... + last 6) */
  displayText?: string;
  /** Theme styles (optional; copy button still works without) */
  styles?: AdminStyles;
  /** Compact layout for table cells (smaller button) */
  compact?: boolean;
  /** Optional inline style for the wrapper */
  style?: React.CSSProperties;
  /** Optional title/tooltip (defaults to full value) */
  title?: string;
}

export function CopyableAddress({
  value,
  displayText,
  styles,
  compact = false,
  style,
  title,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }, [value]);

  const text = displayText ?? condense(value);
  const border = styles?.border ?? 'rgba(128,128,128,0.3)';
  const bg = styles?.bgSecondary ?? '#f5f5f5';
  const textColor = styles?.text ?? '#333';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '0.25rem' : '0.5rem',
        fontFamily: 'monospace',
        fontSize: compact ? '0.85rem' : '0.9rem',
        color: textColor,
        ...style,
      }}
      title={title ?? value}
    >
      <span style={{ userSelect: 'none' }}>{text}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCopy();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Copy to clipboard"
        style={{
          padding: compact ? '0.2rem' : '0.3rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: copied ? (styles?.bgSuccess ?? '#e8f5e9') : bg,
          color: copied ? (styles?.textSuccess ?? '#2e7d32') : textColor,
          border: `1px solid ${border}`,
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {copied ? (
          <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </span>
  );
}
