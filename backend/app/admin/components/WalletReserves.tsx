// ==========================================
// Wallet Reserves Display Component
// ==========================================
// Shows admin wallet token reserves with warnings

'use client';

import { useState, useEffect, useCallback } from 'react';

interface WalletReserve {
  token: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  isLow: boolean;
  minReserve: string;
  minReserveFormatted: string;
}

interface WalletReservesProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  styles: {
    bgSecondary: string;
    bgTertiary: string;
    border: string;
    text: string;
    textSecondary: string;
    bgWarning: string;
    bgSuccess: string;
    success: string;
    danger: string;
  };
}

export function WalletReserves({ isAdminWalletConnected, connectedAddress, styles }: WalletReservesProps) {
  const [reserves, setReserves] = useState<WalletReserve[]>([]);
  const [address, setAddress] = useState<string>('');
  const [hasWarnings, setHasWarnings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchReserves = useCallback(async () => {
    if (!isAdminWalletConnected || !connectedAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/wallet-reserves', {
        headers: {
          'X-Admin-Wallet': connectedAddress,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reserves');
      }

      const data = await response.json();
      
      if (data.success) {
        setReserves(data.reserves);
        setAddress(data.address);
        setHasWarnings(data.hasWarnings);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reserves');
    } finally {
      setLoading(false);
    }
  }, [isAdminWalletConnected, connectedAddress]);

  // Fetch on mount and when wallet connects
  useEffect(() => {
    if (isAdminWalletConnected && connectedAddress) {
      fetchReserves();
    }
  }, [isAdminWalletConnected, connectedAddress, fetchReserves]);

  // Don't show if not connected
  if (!isAdminWalletConnected) {
    return null;
  }

  const getStatusColor = (isLow: boolean) => {
    return isLow ? styles.danger : styles.success;
  };

  const getStatusIcon = (isLow: boolean) => {
    return isLow ? '⚠️' : '✅';
  };

  return (
    <div
      style={{
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: hasWarnings ? styles.bgWarning : styles.bgSecondary,
        borderRadius: '8px',
        border: `1px solid ${hasWarnings ? styles.danger : styles.border}`,
      }}
    >
      {/* Header - always visible */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>
            {hasWarnings ? '⚠️' : '💰'}
          </span>
          <strong style={{ color: styles.text }}>
            Admin Wallet Reserves
          </strong>
          {hasWarnings && (
            <span
              style={{
                padding: '0.2rem 0.5rem',
                backgroundColor: styles.danger,
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
              }}
            >
              LOW
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.8rem', color: styles.textSecondary }}>
              Updated: {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fetchReserves();
            }}
            disabled={loading}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: styles.bgTertiary,
              color: styles.text,
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            {loading ? '⏳' : '🔄'}
          </button>
          <span style={{ fontSize: '0.9rem', color: styles.textSecondary }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div style={{ marginTop: '1rem' }}>
          {error ? (
            <div style={{ color: styles.danger }}>{error}</div>
          ) : (
            <>
              {/* Address */}
              <div
                style={{
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  color: styles.textSecondary,
                }}
              >
                Address:{' '}
                <code
                  style={{
                    backgroundColor: styles.bgTertiary,
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                  }}
                >
                  {address.slice(0, 8)}...{address.slice(-6)}
                </code>
              </div>

              {/* Reserves grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {reserves.map((reserve) => (
                  <div
                    key={reserve.token}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: styles.bgTertiary,
                      borderRadius: '6px',
                      border: `1px solid ${reserve.isLow ? styles.danger : styles.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <strong style={{ color: styles.text, fontSize: '0.95rem' }}>
                        {reserve.token}
                      </strong>
                      <span>{getStatusIcon(reserve.isLow)}</span>
                    </div>
                    <div
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: getStatusColor(reserve.isLow),
                        marginBottom: '0.25rem',
                      }}
                    >
                      {reserve.balanceFormatted}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: styles.textSecondary,
                      }}
                    >
                      Min: {reserve.minReserveFormatted}
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning message */}
              {hasWarnings && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: styles.bgTertiary,
                    borderRadius: '6px',
                    border: `1px solid ${styles.danger}`,
                    fontSize: '0.85rem',
                    color: styles.danger,
                  }}
                >
                  <strong>⚠️ Action Required:</strong> One or more token reserves are below minimum levels.
                  Fund the admin wallet to ensure tournament rewards can be distributed.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
