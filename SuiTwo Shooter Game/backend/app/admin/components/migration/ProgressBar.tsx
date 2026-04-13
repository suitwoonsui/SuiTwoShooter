// ==========================================
// Migration Progress Bar Component
// ==========================================

import { AdminStyles } from '../../types';

interface ProgressBarProps {
  progress: { current: number; total: number } | null;
  styles: AdminStyles;
}

export function ProgressBar({ progress, styles }: ProgressBarProps) {
  if (!progress) return null;
  
  return (
    <div style={{ padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
      <strong style={{ color: styles.text }}>⏳ Migration Progress:</strong>
      <p style={{ color: styles.text }}>
        Processing {progress.current} of {progress.total} wallets...
      </p>
      <div style={{ width: '100%', backgroundColor: styles.bgTertiary, borderRadius: '4px', height: '20px', marginTop: '0.5rem' }}>
        <div
          style={{
            width: `${(progress.current / progress.total) * 100}%`,
            backgroundColor: styles.buttonPrimary,
            height: '100%',
            borderRadius: '4px',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}

