'use client';

import { useEffect, useState } from 'react';
import type { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';

interface TournamentCreationFeeEditorProps {
  styles: AdminStyles;
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  canWriteOnChain?: boolean;
  onChainUnavailableMessage?: string;
}

export function TournamentCreationFeeEditor({
  styles,
  isAdminWalletConnected,
  connectedAddress,
  canWriteOnChain = true,
  onChainUnavailableMessage = 'On-chain game config is not configured on this network.',
}: TournamentCreationFeeEditorProps) {
  // Don't assume a fee exists; load from API. Undefined means "not configured".
  const [feeUsdCents, setFeeUsdCents] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [platformFeeMist, setPlatformFeeMist] = useState<number | null>(null);
  const [platformFeeUsdCentsEstimate, setPlatformFeeUsdCentsEstimate] = useState<number | null>(null);
  const [vaultFeeMist, setVaultFeeMist] = useState<number | null>(null);
  const [vaultFeeUsdCentsEstimate, setVaultFeeUsdCentsEstimate] = useState<number | null>(null);
  const [tokenPrices, setTokenPrices] = useState<{ SUI: number; MEWS: number; USDC: number } | null>(null);
  const [feeMode, setFeeMode] = useState<'usd' | 'token'>('usd');
  const [feeToken, setFeeToken] = useState<'SUI' | 'MEWS' | 'USDC'>('SUI');
  const [feeTokenAmount, setFeeTokenAmount] = useState<number>(0);
  const [message, setMessage] = useState<{ success: boolean; text: string; digest?: string } | null>(null);

  const loadFee = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(getApiUrl('api/game-config'));
      const data = await response.json();
      if (data?.success && data?.config && typeof data.config.tournamentCreationFeeUsdCents === 'number') {
        setFeeUsdCents(data.config.tournamentCreationFeeUsdCents);
        if (
          (data.config.tournamentCreationFeeToken === 'SUI' ||
            data.config.tournamentCreationFeeToken === 'MEWS' ||
            data.config.tournamentCreationFeeToken === 'USDC') &&
          typeof data.config.tournamentCreationFeeTokenAmount === 'number'
        ) {
          setFeeMode('token');
          setFeeToken(data.config.tournamentCreationFeeToken);
          setFeeTokenAmount(Math.max(0, data.config.tournamentCreationFeeTokenAmount));
        } else {
          setFeeMode('usd');
        }
      } else {
        setFeeUsdCents(null);
        setFeeMode('usd');
      }
    } catch {
      setMessage({ success: false, text: 'Failed to load tournament creation fee.' });
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformFee = async () => {
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/platform-fee'));
      const data = await response.json();
      if (
        data?.success &&
        typeof data.tournamentCreationFeeMist === 'number' &&
        typeof data.vaultCreationFeeMist === 'number'
      ) {
        setPlatformFeeMist(data.tournamentCreationFeeMist);
        setPlatformFeeUsdCentsEstimate(
          typeof data.tournamentCreationFeeUsdCentsEstimate === 'number'
            ? data.tournamentCreationFeeUsdCentsEstimate
            : null
        );
        setVaultFeeMist(data.vaultCreationFeeMist);
        setVaultFeeUsdCentsEstimate(
          typeof data.vaultCreationFeeUsdCentsEstimate === 'number'
            ? data.vaultCreationFeeUsdCentsEstimate
            : null
        );
        setTokenPrices(
          data.tokenPrices &&
            typeof data.tokenPrices.SUI === 'number' &&
            typeof data.tokenPrices.MEWS === 'number' &&
            typeof data.tokenPrices.USDC === 'number'
            ? data.tokenPrices
            : null
        );
      } else {
        setPlatformFeeMist(null);
        setPlatformFeeUsdCentsEstimate(null);
        setVaultFeeMist(null);
        setVaultFeeUsdCentsEstimate(null);
        setTokenPrices(null);
      }
    } catch {
      setPlatformFeeMist(null);
      setPlatformFeeUsdCentsEstimate(null);
      setVaultFeeMist(null);
      setVaultFeeUsdCentsEstimate(null);
      setTokenPrices(null);
    }
  };

  useEffect(() => {
    loadFee();
    loadPlatformFee();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain) {
      setMessage({ success: false, text: onChainUnavailableMessage });
      return;
    }
    if (!isAdminWalletConnected || !connectedAddress) {
      setMessage({ success: false, text: 'Admin wallet must be connected.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(getApiUrl('api/game-config/admin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tournament-creation-fee',
          tournamentCreationFeeMode: feeMode,
          tournamentCreationFeeUsdCents: Math.max(0, Math.round(feeUsdCents ?? 0)),
          tournamentCreationFeeToken: feeToken,
          tournamentCreationFeeTokenAmount: Math.max(0, feeTokenAmount),
          adminWalletAddress: connectedAddress,
        }),
      });
      const data = await response.json();
      if (data?.success) {
        setMessage({ success: true, text: data.message || 'Tournament creation fee updated successfully', digest: data.digest });
        setEditing(false);
        await loadFee();
      } else {
        setMessage({ success: false, text: data?.error || 'Failed to update tournament creation fee' });
      }
    } catch {
      setMessage({ success: false, text: 'Failed to update tournament creation fee' });
    } finally {
      setSaving(false);
    }
  };

  const liveConvertedUsdCents =
    feeMode === 'token' && tokenPrices
      ? Math.round(
          Math.max(0, feeTokenAmount) *
            (feeToken === 'SUI' ? tokenPrices.SUI : feeToken === 'MEWS' ? tokenPrices.MEWS : tokenPrices.USDC) *
            100
        )
      : null;
  const liveTokenToOpposing =
    feeMode === 'token' && tokenPrices
      ? feeToken === 'SUI' && tokenPrices.MEWS > 0
        ? `${((Math.max(0, feeTokenAmount) * tokenPrices.SUI) / tokenPrices.MEWS).toFixed(3)} MEWS`
        : feeToken === 'MEWS' && tokenPrices.SUI > 0
          ? `${((Math.max(0, feeTokenAmount) * tokenPrices.MEWS) / tokenPrices.SUI).toFixed(6)} SUI`
          : null
      : null;
  const liveUsdToSui =
    feeMode === 'usd' && tokenPrices && tokenPrices.SUI > 0
      ? (Math.max(0, feeUsdCents ?? 0) / 100) / tokenPrices.SUI
      : null;
  const liveUsdToMews =
    feeMode === 'usd' && tokenPrices && tokenPrices.MEWS > 0
      ? (Math.max(0, feeUsdCents ?? 0) / 100) / tokenPrices.MEWS
      : null;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">🏆 Tournament Creation Fee</h2>
      </div>
      <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
        App fee (USD) charged when players create a tournament. Stored on-chain (Helm). Platform has its own separate fee.
      </p>
      <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
        Ensure the app tournament fee covers the platform event fee.
      </p>
      <div style={{ padding: '0.75rem', marginBottom: '1rem', background: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <div style={{ color: styles.text, fontSize: '0.9rem', fontWeight: 600 }}>
          Platform Event Fee:{' '}
          {platformFeeMist == null
            ? 'Unavailable'
            : `${platformFeeMist.toLocaleString()} MIST${platformFeeUsdCentsEstimate != null ? ` (~$${(platformFeeUsdCentsEstimate / 100).toFixed(2)})` : ''}`}
        </div>
        <div style={{ color: styles.text, fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem' }}>
          Vault Creation Fee:{' '}
          {vaultFeeMist == null
            ? 'Unavailable'
            : `${vaultFeeMist.toLocaleString()} MIST${vaultFeeUsdCentsEstimate != null ? ` (~$${(vaultFeeUsdCentsEstimate / 100).toFixed(2)})` : ''}`}
        </div>
        <div style={{ color: styles.textSecondary, fontSize: '0.8rem', marginTop: '0.25rem' }}>
          Pulled live from platform fee config so game admins can cover both platform event and vault creation fees.
        </div>
      </div>

      {!editing && (
        <div style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: 0, color: styles.heading }}>Current Tournament Creation Fee</h4>
              <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', color: styles.buttonPrimary }}>
                {loading
                  ? 'Loading...'
                  : feeUsdCents == null
                    ? 'Not set'
                    : `$${(feeUsdCents / 100).toFixed(2)} (${feeUsdCents} cents)`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={!isAdminWalletConnected || loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: (!isAdminWalletConnected || loading) ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (!isAdminWalletConnected || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              ✏️ Edit
            </button>
          </div>
          {message && (
            <div style={{ color: message.success ? 'green' : 'red', fontSize: '0.9rem' }}>
              {message.success ? `✅ ${message.text}` : `❌ ${message.text}`}
              {message.success && message.digest ? (
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Transaction: {message.digest}</div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSave} style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
          <h4 style={{ margin: '0 0 1rem 0', color: styles.heading }}>Edit Tournament Creation Fee</h4>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Fee Mode:
            </label>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: styles.text }}>
                <input
                  type="radio"
                  name="feeMode"
                  value="usd"
                  checked={feeMode === 'usd'}
                  onChange={() => setFeeMode('usd')}
                />
                USD
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: styles.text }}>
                <input
                  type="radio"
                  name="feeMode"
                  value="token"
                  checked={feeMode === 'token'}
                  onChange={() => setFeeMode('token')}
                />
                Token
              </label>
            </div>
            {feeMode === 'usd' ? (
              <>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Creation Fee (USD Cents):
                </label>
                <input
                  type="number"
                  value={feeUsdCents ?? 0}
                  onChange={(e) => setFeeUsdCents(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  min="0"
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: styles.inputBg,
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    color: styles.text,
                  }}
                />
                <small style={{ color: styles.textSecondary, display: 'block', marginTop: '0.25rem' }}>
                  ${(((feeUsdCents ?? 0) / 100)).toFixed(2)}
                </small>
                <small style={{ color: styles.textSecondary, display: 'block', marginTop: '0.25rem' }}>
                  Live estimate: {liveUsdToSui == null ? 'Unavailable' : `${liveUsdToSui.toFixed(6)} SUI`} |{' '}
                  {liveUsdToMews == null ? 'Unavailable' : `${liveUsdToMews.toFixed(3)} MEWS`}
                </small>
              </>
            ) : (
              <>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Token + Amount:
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <select
                    value={feeToken}
                    onChange={(e) => setFeeToken(e.target.value as 'SUI' | 'MEWS' | 'USDC')}
                    style={{
                      padding: '0.5rem',
                      background: styles.inputBg,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      color: styles.text,
                    }}
                  >
                    <option value="SUI">SUI</option>
                    <option value="MEWS">MEWS</option>
                    <option value="USDC">USDC</option>
                  </select>
                  <input
                    type="number"
                    value={feeTokenAmount}
                    onChange={(e) => setFeeTokenAmount(Math.max(0, Number(e.target.value) || 0))}
                    min="0"
                    step="any"
                    required
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: styles.inputBg,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      color: styles.text,
                    }}
                  />
                </div>
                <small style={{ color: styles.textSecondary, display: 'block', marginTop: '0.25rem' }}>
                  Converted to USD via platform pricing tool on save.
                </small>
                <small style={{ color: styles.textSecondary, display: 'block', marginTop: '0.25rem' }}>
                  Live estimate: {liveConvertedUsdCents == null ? 'Unavailable' : `$${(liveConvertedUsdCents / 100).toFixed(2)} (${liveConvertedUsdCents} cents)`}
                  {feeToken !== 'USDC' ? ` | ${liveTokenToOpposing ?? 'Unavailable'}` : ''}
                </small>
              </>
            )}
          </div>
          {message && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                background: message.success ? styles.bgSuccess : styles.bgError,
                borderRadius: '4px',
                color: message.success ? 'green' : 'red',
                fontSize: '0.9rem',
              }}
            >
              {message.success ? (
                <div>
                  ✅ {message.text}
                  {message.digest ? (
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Transaction: {message.digest}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>❌ {message.text}</div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={saving || !isAdminWalletConnected}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: (saving || !isAdminWalletConnected) ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (saving || !isAdminWalletConnected) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {saving ? '⏳ Updating...' : '💾 Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setMessage(null);
              }}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: styles.bgTertiary,
                color: styles.text,
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
