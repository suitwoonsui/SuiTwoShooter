// ==========================================
// Migration Results Display Component
// ==========================================

import { AdminStyles } from '../../types';
import { CopyableAddress } from '../CopyableAddress';

export interface MigrationResult {
  address: string;
  success: boolean;
  digest?: string;
  error?: string;
}

interface MigrationResultsProps {
  results: MigrationResult[];
  styles: AdminStyles;
}

export function MigrationResults({ results, styles }: MigrationResultsProps) {
  if (results.length === 0) return null;

  return (
    <div style={{ marginTop: '1rem' }}>
      <strong style={{ color: styles.text }}>📊 Migration Results:</strong>
      <div style={{ marginTop: '0.5rem', maxHeight: '400px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '1rem', backgroundColor: styles.bgSecondary }}>
        {results.map((result, index) => (
          <div
            key={index}
            style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              backgroundColor: result.success ? styles.bgSuccess : styles.bgError,
              borderRadius: '4px',
              fontSize: '0.9rem',
              border: `1px solid ${result.success ? styles.borderSuccess : styles.borderError}`,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: styles.text, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {result.success ? '✅' : '❌'} <CopyableAddress value={result.address} styles={styles} compact />
            </div>
            {result.success && result.digest && (
              <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                Digest: <CopyableAddress value={result.digest} styles={styles} compact />
              </div>
            )}
            {!result.success && result.error && (
              <div style={{ fontSize: '0.85rem', color: styles.textError, marginTop: '0.25rem' }}>
                Error: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

