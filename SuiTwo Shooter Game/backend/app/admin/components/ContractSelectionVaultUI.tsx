// ==========================================
// Contract Selection for Vault Release
// Current contract | Old contract | Enter a contract (custom cap ID)
// ==========================================

'use client';

import { AdminStyles } from '../types';

export type VaultContractSelection = 'current' | 'old' | 'custom';

interface ContractSelectionVaultUIProps {
  styles: AdminStyles;
  contractSelection: VaultContractSelection;
  setContractSelection: (selection: VaultContractSelection) => void;
  customCapId: string;
  setCustomCapId: (value: string) => void;
  label?: string;
}

export function ContractSelectionVaultUI({
  styles,
  contractSelection,
  setContractSelection,
  customCapId,
  setCustomCapId,
  label = 'Contract (Corridor Admin Cap):',
}: ContractSelectionVaultUIProps) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label className="admin-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 'bold', color: styles.text }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
          <input
            type="radio"
            value="current"
            checked={contractSelection === 'current'}
            onChange={() => setContractSelection('current')}
            style={{ marginRight: '0.5rem' }}
          />
          Current contract
        </label>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
          <input
            type="radio"
            value="old"
            checked={contractSelection === 'old'}
            onChange={() => setContractSelection('old')}
            style={{ marginRight: '0.5rem' }}
          />
          Old contract
        </label>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
          <input
            type="radio"
            value="custom"
            checked={contractSelection === 'custom'}
            onChange={() => setContractSelection('custom')}
            style={{ marginRight: '0.5rem' }}
          />
          Enter a contract
        </label>
      </div>
      {contractSelection === 'old' && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary, fontStyle: 'italic' }}>
          Make sure OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID (or OLD_CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET / _MAINNET) is set in{' '}
          <code>config/contracts.testnet.json</code> (or <code>contracts.mainnet.json</code>).
        </p>
      )}
      {contractSelection === 'custom' && (
        <div style={{ marginTop: '0.75rem' }}>
          <input
            type="text"
            value={customCapId}
            onChange={(e) => setCustomCapId(e.target.value)}
            placeholder="0x... Corridor Admin Cap object ID"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.9rem',
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              backgroundColor: styles.inputBg,
              color: styles.text,
            }}
          />
        </div>
      )}
    </div>
  );
}
