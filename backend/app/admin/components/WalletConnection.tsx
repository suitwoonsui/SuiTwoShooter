// ==========================================
// Admin Page - Wallet Connection Component
// ==========================================

'use client';

import { AdminStyles } from '../types';

interface WalletConnectionProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  walletError: string | null;
  styles: AdminStyles;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnection({
  isAdminWalletConnected,
  connectedAddress,
  walletError,
  styles,
  onConnect,
  onDisconnect,
}: WalletConnectionProps) {
  return (
    <div style={{ marginBottom: '2rem', padding: '1rem', background: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
        Admin Wallet:
      </label>
      
      {!isAdminWalletConnected ? (
        <div>
          <p style={{ marginBottom: '0.5rem' }}>🔒 Connect your admin wallet to continue</p>
          <button
            type="button"
            onClick={onConnect}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Connect Wallet
          </button>
          {walletError && (
            <div style={{ marginTop: '0.5rem', color: '#721c24' }}>
              <strong>❌ Error:</strong> {walletError}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>✅ Wallet Connected:</strong> {connectedAddress?.substring(0, 10)}...{connectedAddress?.substring(connectedAddress.length - 8)}
          </p>
          <button
            type="button"
            onClick={onDisconnect}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

