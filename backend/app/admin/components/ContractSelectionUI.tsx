// ==========================================
// Contract Selection UI Component
// Reusable component for selecting between new and old contracts
// ==========================================

'use client';

import { AdminStyles } from '../types';

interface ContractSelectionUIProps {
  styles: AdminStyles;
  contractSelection: 'new' | 'old';
  setContractSelection: (selection: 'new' | 'old') => void;
  envVarName?: string;
  label?: string;
}

export function ContractSelectionUI({
  styles,
  contractSelection,
  setContractSelection,
  envVarName,
  label = 'Contract Selection:',
}: ContractSelectionUIProps) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label className="admin-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
          <input
            type="radio"
            value="new"
            checked={contractSelection === 'new'}
            onChange={(e) => setContractSelection(e.target.value as 'new' | 'old')}
            style={{ marginRight: '0.5rem' }}
          />
          New Contract Only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
          <input
            type="radio"
            value="old"
            checked={contractSelection === 'old'}
            onChange={(e) => setContractSelection(e.target.value as 'new' | 'old')}
            style={{ marginRight: '0.5rem' }}
          />
          Old Contract Only
        </label>
      </div>
      {contractSelection === 'old' && envVarName && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary, fontStyle: 'italic' }}>
          ⚠️ Make sure {envVarName} is configured in environment variables.
        </p>
      )}
    </div>
  );
}
