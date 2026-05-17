// ==========================================
// Admin Page - Vaults Tab
// List vaults, select contract (current / old / enter), release vaults ready to be released.
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { ContractSelectionVaultUI, VaultContractSelection } from '../components/ContractSelectionVaultUI';
import { CopyableAddress } from '../components/CopyableAddress';

interface VaultListItem {
  vaultId: string;
  status?: string;
  balanceRaw?: string;
  coinTypeId?: string;
  label?: string;
  released?: boolean;
  unlockAtMs?: number;
  depositDeadlineMs?: number;
  eventObjectId?: string;
  eventName?: string;
  balances?: Array<{ coinTypeId: string; balanceRaw: string }>;
  /** From platform: 'current' | 'legacy'. Used to filter list by contract selection. */
  source?: 'current' | 'legacy';
}

interface VaultsTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function VaultsTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: VaultsTabProps) {
  const [vaults, setVaults] = useState<VaultListItem[]>([]);
  const [loadingVaults, setLoadingVaults] = useState(false);
  const [vaultListError, setVaultListError] = useState<string | null>(null);

  const [contractSelection, setContractSelection] = useState<VaultContractSelection>('current');
  const [customCapId, setCustomCapId] = useState('');

  const [eventLookupId, setEventLookupId] = useState('');
  const [eventLookupResult, setEventLookupResult] = useState<{
    eventObjectId: string;
    tournamentId?: number;
    name?: string;
    poolVaultId?: string | null;
    poolVaultCoinTypeId?: string | null;
    poolVaultBalanceRaw?: string | null;
  } | null>(null);
  const [loadingEventLookup, setLoadingEventLookup] = useState(false);
  const [eventLookupError, setEventLookupError] = useState<string | null>(null);

  const [manualVaultId, setManualVaultId] = useState('');
  const [manualVaultDetails, setManualVaultDetails] = useState<{
    vaultId: string;
    balances: Array<{ coinTypeId: string; balanceRaw: string }>;
    coinTypeId?: string;
    balanceRaw?: string;
  } | null>(null);
  const [loadingManualVault, setLoadingManualVault] = useState(false);
  const [manualVaultError, setManualVaultError] = useState<string | null>(null);

  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  type ReleaseAmountMode = 'raw' | 'percent';
  type ReleaseRow = {
    id: string;
    recipient: string;
    coinTypeId: string;
    amountMode: ReleaseAmountMode;
    amount: string; // raw bigint string OR percent string (0-100)
  };
  const [releaseRows, setReleaseRows] = useState<ReleaseRow[]>([
    { id: `r_${Date.now()}`, recipient: '', coinTypeId: '', amountMode: 'raw', amount: '' },
  ]);
  const [buildOnly, setBuildOnly] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseResult, setReleaseResult] = useState<{ success: boolean; digest?: string; transactionBytesBase64?: string; error?: string; message?: string } | null>(null);
  const [forceEnableRelease, setForceEnableRelease] = useState(false);
  const [forceConfirmText, setForceConfirmText] = useState('');
  const [forceReleaseArmedVaultId, setForceReleaseArmedVaultId] = useState<string | null>(null);
  const [closeEmptyCoinTypeId, setCloseEmptyCoinTypeId] = useState('0x2::sui::SUI');

  const loadVaults = async () => {
    setLoadingVaults(true);
    setVaultListError(null);
    try {
      const res = await fetch(getApiUrl('api/admin/vaults?limit=200'));
      const data = await res.json();
      if (!res.ok) {
        setVaultListError(data.error || 'Failed to load vaults');
        setVaults([]);
        return;
      }
      setVaults(data.vaults ?? []);
    } catch (e) {
      setVaultListError(e instanceof Error ? e.message : 'Failed to load vaults');
      setVaults([]);
    } finally {
      setLoadingVaults(false);
    }
  };

  useEffect(() => {
    if (isAdminWalletConnected) loadVaults();
  }, [isAdminWalletConnected]);

  const lookupVaultForEvent = async () => {
    const id = eventLookupId.trim();
    if (!id.startsWith('0x')) {
      setEventLookupError('Enter a valid event/tournament object ID (0x...)');
      return;
    }
    setLoadingEventLookup(true);
    setEventLookupError(null);
    setEventLookupResult(null);
    try {
      const res = await fetch(getApiUrl(`api/tournaments/${encodeURIComponent(id)}`));
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setEventLookupError(data?.error || 'Failed to load tournament');
        return;
      }
      const t = data.tournament ?? {};
      setEventLookupResult({
        eventObjectId: id,
        tournamentId: t.tournamentId,
        name: t.name,
        poolVaultId: t.poolVaultId ?? null,
        poolVaultCoinTypeId: t.poolVaultCoinTypeId ?? null,
        poolVaultBalanceRaw: t.poolVaultBalanceRaw ?? null,
      });
    } catch (e) {
      setEventLookupError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLoadingEventLookup(false);
    }
  };

  const loadVaultById = async () => {
    const id = manualVaultId.trim();
    if (!id.startsWith('0x')) {
      setManualVaultError('Enter a valid vault ID (0x...)');
      return;
    }
    setLoadingManualVault(true);
    setManualVaultError(null);
    setManualVaultDetails(null);
    try {
      const res = await fetch(getApiUrl(`api/admin/vaults/${encodeURIComponent(id)}`));
      const data = await res.json();
      if (!res.ok) {
        setManualVaultError(data.error || 'Failed to load vault');
        return;
      }
      const balances = data.balances ?? [];
      const first = balances[0];
      setManualVaultDetails({
        vaultId: data.vaultId ?? id,
        balances,
        coinTypeId: data.coinTypeId ?? first?.coinTypeId,
        balanceRaw: data.balanceRaw ?? first?.balanceRaw,
      });
    } catch (e) {
      setManualVaultError(e instanceof Error ? e.message : 'Failed to load vault');
    } finally {
      setLoadingManualVault(false);
    }
  };

  const displayedVaults = (() => {
    if (contractSelection === 'current') return vaults.filter((v) => (v.source ?? 'current') === 'current');
    if (contractSelection === 'old') return vaults.filter((v) => v.source === 'legacy');
    return vaults;
  })();
  const selectedVault = selectedVaultId
    ? displayedVaults.find((v) => v.vaultId === selectedVaultId) ?? (manualVaultDetails?.vaultId === selectedVaultId ? manualVaultDetails : null)
    : null;
  const selectedVaultBalances: Array<{ coinTypeId: string; balanceRaw: string }> =
    selectedVault && 'balances' in selectedVault && Array.isArray((selectedVault as any).balances)
      ? ((selectedVault as any).balances as Array<{ coinTypeId: string; balanceRaw: string }>)
          .map((b) => ({ coinTypeId: String((b as any).coinTypeId ?? '').trim(), balanceRaw: String((b as any).balanceRaw ?? '').trim() }))
          .filter((b) => b.coinTypeId.length > 0)
      : [];
  const vaultBalanceByCoinType = new Map<string, bigint>(
    selectedVaultBalances
      .map((b) => {
        try {
          return [b.coinTypeId, BigInt(b.balanceRaw)] as const;
        } catch {
          return null;
        }
      })
      .filter((x): x is readonly [string, bigint] => Boolean(x))
  );
  const availableCoinTypes = selectedVaultBalances.map((b) => b.coinTypeId);
  const selectedVaultHasBalances = availableCoinTypes.length > 0;

  const parsePercentToScaled = (s: string): { ok: true; scaled: bigint } | { ok: false; error: string } => {
    const raw = s.trim();
    if (!raw) return { ok: false, error: 'Percent is required.' };
    // Allow up to 2 decimal places (basis points of 1% => 0.01%).
    const m = raw.match(/^(\d{1,3})(?:\.(\d{1,2}))?$/);
    if (!m) return { ok: false, error: 'Percent must be a number (0-100), up to 2 decimals.' };
    const whole = Number(m[1]);
    const frac = (m[2] ?? '').padEnd(2, '0');
    const scaled = BigInt(whole) * 100n + BigInt(frac); // 100.00% => 10000
    if (scaled < 0n || scaled > 10000n) return { ok: false, error: 'Percent must be between 0 and 100.' };
    return { ok: true, scaled };
  };

  const computeRowRawAmount = (row: ReleaseRow): { ok: true; raw: bigint } | { ok: false; error: string } => {
    const coinTypeId = row.coinTypeId.trim();
    if (!coinTypeId) return { ok: false, error: 'Coin type is required.' };
    const vaultBal = vaultBalanceByCoinType.get(coinTypeId);
    if (vaultBal == null) return { ok: false, error: 'Coin type not found in this vault.' };
    if (row.amountMode === 'percent') {
      const pct = parsePercentToScaled(row.amount);
      if (!pct.ok) return pct;
      const raw = (vaultBal * pct.scaled) / 10000n;
      if (raw <= 0n) return { ok: false, error: 'Percent results in 0.' };
      return { ok: true, raw };
    }
    const amt = row.amount.trim();
    if (!amt) return { ok: false, error: 'Amount is required.' };
    try {
      const raw = BigInt(amt);
      if (raw <= 0n) return { ok: false, error: 'Amount must be > 0.' };
      return { ok: true, raw };
    } catch {
      return { ok: false, error: 'Amount must be an integer (raw units).' };
    }
  };

  const normalizeAddress = (s: string) => s.trim();

  const releaseRowsValidation = (() => {
    const errors: string[] = [];
    const perCoinTotals = new Map<string, bigint>();
    const coinTypesUsed = new Set<string>();

    if (!selectedVaultHasBalances) {
      return { ok: false, errors: ['This vault has no token balances to distribute.'], perCoinTotals, coinTypesUsed };
    }

    const nonEmptyRows = releaseRows.filter((r) => r.recipient.trim() || r.amount.trim() || r.coinTypeId.trim());
    if (nonEmptyRows.length === 0) {
      return { ok: false, errors: ['Add at least one recipient.'], perCoinTotals, coinTypesUsed };
    }

    for (const row of nonEmptyRows) {
      const recipient = normalizeAddress(row.recipient);
      if (!recipient.startsWith('0x')) errors.push('Each recipient must be a valid 0x address.');

      const coinTypeId = row.coinTypeId.trim();
      if (!coinTypeId) errors.push('Each row must have a coin type.');
      if (coinTypeId) coinTypesUsed.add(coinTypeId);

      const amt = computeRowRawAmount(row);
      if (!amt.ok) {
        errors.push(amt.error);
      } else {
        perCoinTotals.set(coinTypeId, (perCoinTotals.get(coinTypeId) ?? 0n) + amt.raw);
      }
    }

    // Cap totals by vault balances (per coin type).
    for (const [coinTypeId, total] of perCoinTotals.entries()) {
      const bal = vaultBalanceByCoinType.get(coinTypeId);
      if (bal == null) {
        errors.push(`Coin type not found in vault: ${coinTypeId}`);
        continue;
      }
      if (total > bal) {
        errors.push(`Total for ${coinTypeId} exceeds vault balance (${total.toString()} > ${bal.toString()}).`);
      }
    }

    // Build-only can only return a single tx; enforce single coin type when building only.
    if (buildOnly && coinTypesUsed.size > 1) {
      errors.push('Build-only currently supports a single coin type. Use one coin type or uncheck Build only.');
    }

    return { ok: errors.length === 0, errors, perCoinTotals, coinTypesUsed };
  })();

  const nowMs = Date.now();
  const selectedVaultUnlockAtMs = selectedVault && 'unlockAtMs' in selectedVault ? selectedVault.unlockAtMs : undefined;
  const selectedVaultReleased = selectedVault && 'released' in selectedVault ? Boolean(selectedVault.released) : false;
  const selectedVaultEventStatus = selectedVault && 'eventStatus' in selectedVault ? (selectedVault as any).eventStatus as string | undefined : undefined;
  const selectedVaultHasLinkedEvent = Boolean(selectedVault && 'eventObjectId' in selectedVault && (selectedVault as any).eventObjectId);
  const isEventUpcomingOrActive = selectedVaultEventStatus === 'upcoming' || selectedVaultEventStatus === 'active';
  const isLockedByTime = typeof selectedVaultUnlockAtMs === 'number' ? nowMs < selectedVaultUnlockAtMs : false;
  const onChainTimeLockReason = isLockedByTime ? `Vault is still locked until ${new Date(selectedVaultUnlockAtMs!).toLocaleString()}.` : null;
  const timeUntilUnlockMs = isLockedByTime && typeof selectedVaultUnlockAtMs === 'number' ? selectedVaultUnlockAtMs - nowMs : 0;
  const formatDuration = (ms: number) => {
    if (!(ms > 0)) return '0s';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    if (minutes || hours || days) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  };
  const releaseBlockedReason =
    selectedVaultReleased
      ? 'Vault already released.'
      : isLockedByTime
        ? onChainTimeLockReason
        : selectedVaultHasLinkedEvent && isEventUpcomingOrActive
          ? `Linked event is ${selectedVaultEventStatus}; default policy blocks release during live events.`
          : null;
  const forceConfirmExpected = selectedVaultId ? selectedVaultId.slice(-8).toLowerCase() : '';
  const isForceConfirmed = forceConfirmExpected ? forceConfirmText.trim().toLowerCase() === forceConfirmExpected : false;
  const canAttemptRelease =
    Boolean(selectedVaultId && adminAddress) &&
    releaseRowsValidation.ok &&
    // Unlock time is an on-chain constraint; force override cannot bypass it.
    !isLockedByTime &&
    (!releaseBlockedReason || (forceEnableRelease && isForceConfirmed));

  const canAttemptCloseEmptyVault =
    Boolean(selectedVaultId && adminAddress) &&
    !selectedVaultHasBalances &&
    // Unlock time is an on-chain constraint; force override cannot bypass it.
    !isLockedByTime &&
    (!releaseBlockedReason || (forceEnableRelease && isForceConfirmed));

  const handleCloseEmptyVault = async () => {
    const vaultId = selectedVaultId?.trim();
    if (!vaultId || !vaultId.startsWith('0x')) {
      setReleaseResult({ success: false, error: 'Select or enter a vault first.' });
      return;
    }
    if (!adminAddress) {
      setReleaseResult({ success: false, error: 'Admin wallet not connected.' });
      return;
    }
    if (selectedVaultHasBalances) {
      setReleaseResult({ success: false, error: 'This vault has balances. Use Release distribute instead.' });
      return;
    }
    if (!canAttemptCloseEmptyVault) {
      setReleaseResult({ success: false, error: releaseBlockedReason ?? 'Close is blocked by policy.' });
      return;
    }
    if (contractSelection === 'custom' && !customCapId.trim().startsWith('0x')) {
      setReleaseResult({ success: false, error: 'Enter a valid Corridor Admin Cap object ID when using "Enter a contract".' });
      return;
    }

    setReleasing(true);
    setReleaseResult(null);
    try {
      const res = await fetch(getApiUrl(`api/admin/vaults/${encodeURIComponent(vaultId)}/release-vault-empty`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractSelection,
          customCorridorAdminCapId: contractSelection === 'custom' ? customCapId.trim() : undefined,
          adminWalletAddress: adminAddress,
          buildOnly,
          senderAddress: adminAddress,
          coinTypeId: closeEmptyCoinTypeId.trim() || '0x2::sui::SUI',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setReleaseResult({ success: false, error: data?.error || 'Close-empty-vault request failed' });
        return;
      }
      setReleaseResult({
        success: true,
        digest: data.digest,
        transactionBytesBase64: data.transactionBytesBase64,
        message: data.message ?? 'Empty vault closed.',
      });
      if (data.success && !buildOnly) void loadVaults();
    } catch (e) {
      setReleaseResult({ success: false, error: e instanceof Error ? e.message : 'Request failed' });
    } finally {
      setReleasing(false);
    }
  };

  const computeReleaseBlockedReason = (v: VaultListItem): string | null => {
    if (v.released) return 'Vault already released.';
    const unlockAt = typeof v.unlockAtMs === 'number' ? v.unlockAtMs : undefined;
    if (unlockAt != null && nowMs < unlockAt) return 'Vault is still locked (unlockAtMs not reached).';
    const status = (v as any).eventStatus as string | undefined;
    if (v.eventObjectId && (status === 'upcoming' || status === 'active')) return `Linked event is ${status}.`;
    return null;
  };

  const handleRelease = async () => {
    const vaultId = selectedVaultId?.trim();
    if (!vaultId || !vaultId.startsWith('0x')) {
      setReleaseResult({ success: false, error: 'Select or enter a vault first.' });
      return;
    }
    if (!selectedVaultHasBalances) {
      setReleaseResult({ success: false, error: 'This vault has no token balances to distribute.' });
      return;
    }
    if (!adminAddress) {
      setReleaseResult({ success: false, error: 'Admin wallet not connected.' });
      return;
    }
    if (!releaseRowsValidation.ok) {
      setReleaseResult({ success: false, error: releaseRowsValidation.errors[0] ?? 'Invalid release inputs.' });
      return;
    }
    if (contractSelection === 'custom' && !customCapId.trim().startsWith('0x')) {
      setReleaseResult({ success: false, error: 'Enter a valid Corridor Admin Cap object ID when using "Enter a contract".' });
      return;
    }

    setReleasing(true);
    setReleaseResult(null);
    try {
      const nonEmptyRows = releaseRows.filter((r) => r.recipient.trim() || r.amount.trim() || r.coinTypeId.trim());

      const rowsByCoinType = new Map<string, Array<{ recipient: string; rawAmount: string }>>();
      for (const row of nonEmptyRows) {
        const coinTypeId = row.coinTypeId.trim();
        const recipient = normalizeAddress(row.recipient);
        const amt = computeRowRawAmount(row);
        if (!amt.ok) {
          setReleaseResult({ success: false, error: amt.error });
          return;
        }
        const arr = rowsByCoinType.get(coinTypeId) ?? [];
        arr.push({ recipient, rawAmount: amt.raw.toString() });
        rowsByCoinType.set(coinTypeId, arr);
      }

      const digests: string[] = [];
      const txs: Array<{ coinTypeId: string; transactionBytesBase64?: string }> = [];

      for (const [coinTypeId, rows] of rowsByCoinType.entries()) {
        const recipients = rows.map((r) => r.recipient);
        const amounts = rows.map((r) => r.rawAmount);

        const res = await fetch(getApiUrl(`api/admin/vaults/${encodeURIComponent(vaultId)}/release-distribute`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractSelection,
            customCorridorAdminCapId: contractSelection === 'custom' ? customCapId.trim() : undefined,
            adminWalletAddress: adminAddress,
            buildOnly,
            senderAddress: adminAddress,
            recipients,
            amounts,
            coinTypeId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setReleaseResult({ success: false, error: data.error || `Release request failed for coin type ${coinTypeId}` });
          return;
        }
        if (data.digest) digests.push(data.digest);
        if (data.transactionBytesBase64) txs.push({ coinTypeId, transactionBytesBase64: data.transactionBytesBase64 });
      }

      setReleaseResult({
        success: true,
        digest: digests.length ? digests.join(', ') : undefined,
        transactionBytesBase64: txs.length === 1 ? txs[0].transactionBytesBase64 : undefined,
        message:
          buildOnly && txs.length > 1
            ? `Built ${txs.length} transactions (one per coin type). Build-only UI currently displays a single tx; run per coin type or uncheck Build only.`
            : rowsByCoinType.size > 1
              ? `Released across ${rowsByCoinType.size} coin types.`
              : 'Release succeeded.',
      });

      if (!buildOnly) void loadVaults();
    } catch (e) {
      setReleaseResult({ success: false, error: e instanceof Error ? e.message : 'Request failed' });
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      <h2 style={{ color: styles.heading, marginTop: 0 }}>Vault release</h2>
      <p style={{ color: styles.textSecondary, marginBottom: '1.5rem' }}>
        Release vaults that are ready to be released (e.g. not attached to events or on old contracts). Choose which contract (Corridor Admin Cap) to use, then build or execute release.
      </p>

      <ContractSelectionVaultUI
        styles={styles}
        contractSelection={contractSelection}
        setContractSelection={setContractSelection}
        customCapId={customCapId}
        setCustomCapId={setCustomCapId}
      />

      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
        <h3 style={{ color: styles.text, marginTop: 0 }}>Lookup vault by tournament/event</h3>
        <p style={{ color: styles.textSecondary, marginTop: 0 }}>
          Paste a tournament/event object ID (0x...) to fetch the linked pool vault ID from the platform event.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={eventLookupId}
            onChange={(e) => setEventLookupId(e.target.value)}
            placeholder="Event/tournament object ID (0x...)"
            style={{
              flex: '1 1 420px',
              padding: '0.6rem 0.75rem',
              borderRadius: '6px',
              border: `1px solid ${styles.border}`,
              backgroundColor: styles.bgTertiary,
              color: styles.text,
              fontFamily: 'monospace',
            }}
          />
          <button
            type="button"
            onClick={lookupVaultForEvent}
            disabled={loadingEventLookup}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: loadingEventLookup ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loadingEventLookup ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loadingEventLookup ? 'Looking up…' : 'Lookup'}
          </button>
        </div>
        {eventLookupError && (
          <div style={{ marginTop: '0.75rem', color: styles.textError }}>
            {eventLookupError}
          </div>
        )}
        {eventLookupResult && (
          <div style={{ marginTop: '0.75rem', color: styles.text }}>
            <div style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
              Event: <span style={{ fontFamily: 'monospace' }}>{eventLookupResult.eventObjectId}</span>
              {eventLookupResult.tournamentId != null ? ` • Tournament #${eventLookupResult.tournamentId}` : ''}
              {eventLookupResult.name ? ` • ${eventLookupResult.name}` : ''}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Pool vault:</strong>{' '}
              {eventLookupResult.poolVaultId ? (
                <CopyableAddress value={eventLookupResult.poolVaultId} styles={styles} />
              ) : (
                <span style={{ color: styles.textSecondary }}>— not linked / not set</span>
              )}
              {eventLookupResult.poolVaultBalanceRaw != null && eventLookupResult.poolVaultId && (
                <span style={{ marginLeft: '0.5rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                  ({eventLookupResult.poolVaultBalanceRaw} raw)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ color: styles.text, marginBottom: '0.5rem' }}>Vault list</h3>
        {loadingVaults ? (
          <p style={{ color: styles.textSecondary }}>Loading vaults…</p>
        ) : vaultListError ? (
          <p style={{ color: styles.textError }}>{vaultListError}</p>
        ) : (
          <p style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
            {contractSelection === 'current' && 'Showing vaults from the current contract only. '}
            {contractSelection === 'old' && 'Showing vaults from the old contract only. '}
            {contractSelection === 'custom' && 'Showing all vaults. '}
            To load a single vault by ID, use &quot;Load vault by ID&quot; below.
          </p>
        )}
        {!loadingVaults && displayedVaults.length > 0 && (
          <div style={{ overflowX: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px', marginTop: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: styles.bgSecondary }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Vault</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Balance</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Event</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedVaults.map((v) => (
                  <tr key={v.vaultId} style={{ borderTop: `1px solid ${styles.border}` }}>
                    <td style={{ padding: '0.5rem', color: styles.text }}>
                      <CopyableAddress value={v.vaultId} styles={styles} compact />
                    </td>
                    <td style={{ padding: '0.5rem', color: styles.text }}>{v.status ?? '—'}</td>
                    <td style={{ padding: '0.5rem', color: styles.text }}>{v.balanceRaw ?? (v.balances?.[0]?.balanceRaw ?? '0')}</td>
                    <td style={{ padding: '0.5rem', color: styles.textSecondary }}>{v.eventName ?? (v.eventObjectId ? '—' : 'Not linked')}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {(() => {
                        const blocked = computeReleaseBlockedReason(v);
                        const isArmed = forceReleaseArmedVaultId === v.vaultId;
                        const isReleased = blocked === 'Vault already released.';
                        const label =
                          isReleased
                            ? 'Released'
                            : blocked && !isArmed
                              ? 'Force release'
                              : 'Select to release';
                        return (
                          <button
                            type="button"
                            disabled={isReleased}
                            onClick={() => {
                              if (blocked && !isArmed) {
                                // Step 1 (blocked vault): arm force-release path, but do NOT select (no details yet).
                                setForceReleaseArmedVaultId(v.vaultId);
                                setForceEnableRelease(false);
                                setForceConfirmText('');
                                return;
                              }

                              // Step 2: user explicitly selects to release; show details UI.
                              setSelectedVaultId(v.vaultId);
                              setReleaseResult(null);
                              setBuildOnly(false);
                              setCloseEmptyCoinTypeId((v.coinTypeId ?? '0x2::sui::SUI').trim() || '0x2::sui::SUI');
                              setReleaseRows([
                                {
                                  id: `r_${Date.now()}`,
                                  recipient: '',
                                  coinTypeId: availableCoinTypes[0] ?? '',
                                  amountMode: 'raw',
                                  amount: '',
                                },
                              ]);

                              // If this vault is not blocked, clear any previously-armed force-release state.
                              if (!blocked) {
                                setForceReleaseArmedVaultId(null);
                                setForceEnableRelease(false);
                                setForceConfirmText('');
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.85rem',
                              backgroundColor: isReleased ? styles.buttonDisabled : blocked && !isArmed ? styles.bgWarning : styles.bgTertiary,
                              color: styles.text,
                              border: `1px solid ${styles.border}`,
                              borderRadius: '4px',
                              cursor: isReleased ? 'not-allowed' : 'pointer',
                            }}
                            title={blocked ? `Blocked by default: ${blocked}` : undefined}
                          >
                            {label}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={loadVaults}
          disabled={loadingVaults}
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1rem',
            backgroundColor: styles.buttonPrimary,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loadingVaults ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Refresh list
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
        <h3 style={{ color: styles.text, marginBottom: '0.5rem' }}>Load vault by ID</h3>
        <p style={{ color: styles.textSecondary, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          For vaults not in the list (e.g. not attached to events), enter the vault object ID and load details.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={manualVaultId}
            onChange={(e) => setManualVaultId(e.target.value)}
            placeholder="0x... vault ID"
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '0.5rem 0.75rem',
              border: `1px solid ${styles.border}`,
              borderRadius: '4px',
              backgroundColor: styles.inputBg,
              color: styles.text,
            }}
          />
          <button
            type="button"
            onClick={loadVaultById}
            disabled={loadingManualVault || !manualVaultId.trim().startsWith('0x')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loadingManualVault ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loadingManualVault ? 'Loading…' : 'Load vault'}
          </button>
        </div>
        {manualVaultError && <p style={{ color: styles.textError, marginTop: '0.5rem', fontSize: '0.9rem' }}>{manualVaultError}</p>}
        {manualVaultDetails && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: styles.text }}>
            <div>Vault: <CopyableAddress value={manualVaultDetails.vaultId} styles={styles} /></div>
            <div>Balance(s): {manualVaultDetails.balances?.map((b) => `${b.balanceRaw} (${b.coinTypeId?.slice(-20) ?? '?'})`).join(', ') || '—'}</div>
            <button
              type="button"
              onClick={() => {
                setSelectedVaultId(manualVaultDetails.vaultId);
                setReleaseResult(null);
                setBuildOnly(false);
                setReleaseRows([
                  {
                    id: `r_${Date.now()}`,
                    recipient: '',
                    coinTypeId: manualVaultDetails.coinTypeId ?? '',
                    amountMode: 'raw',
                    amount: '',
                  },
                ]);
                setCloseEmptyCoinTypeId((manualVaultDetails.coinTypeId ?? '0x2::sui::SUI').trim() || '0x2::sui::SUI');
                setForceReleaseArmedVaultId(null);
              }}
              style={{
                marginTop: '0.5rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                backgroundColor: styles.bgTertiary,
                color: styles.text,
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Select to release
            </button>
          </div>
        )}
      </div>

      {selectedVaultId && (
        <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '8px', border: `1px solid ${styles.border}`, marginBottom: '1rem' }}>
          <h3 style={{ color: styles.text, marginTop: 0 }}>Release vault</h3>
          <p style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
            Selected: {selectedVaultId ? <CopyableAddress value={selectedVaultId} styles={styles} /> : '—'}
          </p>
          {typeof selectedVaultUnlockAtMs === 'number' && (
            <div style={{ marginTop: '-0.25rem', marginBottom: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
              <div>
                <strong style={{ color: styles.text }}>Unlock time:</strong> {new Date(selectedVaultUnlockAtMs).toLocaleString()}
                {isLockedByTime && (
                  <>
                    {' '}
                    <span style={{ color: styles.textSecondary }}>
                      (in {formatDuration(timeUntilUnlockMs)})
                    </span>
                  </>
                )}
              </div>
              {isLockedByTime && (
                <div style={{ marginTop: '0.25rem' }}>
                  <strong style={{ color: styles.text }}>Locked:</strong> on-chain time lock prevents release/close until unlock.
                </div>
              )}
            </div>
          )}
          {!selectedVaultHasBalances && (
            <div style={{ marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgTertiary, color: styles.textSecondary }}>
              This vault currently has <strong style={{ color: styles.text }}>no token balances</strong>. There’s nothing to distribute.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '560px' }}>
            {!selectedVaultHasBalances && (
              <div style={{ padding: '0.75rem', borderRadius: '6px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgTertiary }}>
                <div style={{ color: styles.text, fontWeight: 'bold', marginBottom: '0.35rem' }}>Close empty vault</div>
                <div style={{ color: styles.textSecondary, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  This closes/releases an empty vault (no balances). A coin type is still required for the Move generic; default is SUI.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={closeEmptyCoinTypeId}
                    onChange={(e) => setCloseEmptyCoinTypeId(e.target.value)}
                    placeholder="0x2::sui::SUI"
                    style={{
                      flex: '1 1 360px',
                      minWidth: '240px',
                      padding: '0.5rem',
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCloseEmptyVault}
                    disabled={releasing || !canAttemptCloseEmptyVault}
                    style={{
                      padding: '0.6rem 1rem',
                      backgroundColor: releasing || !canAttemptCloseEmptyVault ? styles.buttonDisabled : styles.bgWarning,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '6px',
                      cursor: releasing || !canAttemptCloseEmptyVault ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                    title={releaseBlockedReason ? `Blocked by default: ${releaseBlockedReason}` : undefined}
                  >
                    {releasing ? 'Processing…' : buildOnly ? 'Build close transaction' : 'Close empty vault'}
                  </button>
                </div>
              </div>
            )}
            <div style={{ opacity: selectedVaultHasBalances ? 1 : 0.55, pointerEvents: selectedVaultHasBalances ? 'auto' : 'none' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', color: styles.text }}>Recipients</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {releaseRows.map((row, idx) => {
                  const coinBalance = row.coinTypeId ? vaultBalanceByCoinType.get(row.coinTypeId) : undefined;
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        padding: '0.5rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '6px',
                        backgroundColor: styles.bgTertiary,
                      }}
                    >
                      <input
                        type="text"
                        value={row.recipient}
                        onChange={(e) => {
                          const v = e.target.value;
                          setReleaseRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, recipient: v } : r)));
                        }}
                        placeholder="0x... recipient"
                        style={{
                          flex: '1 1 260px',
                          minWidth: '220px',
                          padding: '0.5rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                        }}
                      />

                      <select
                        value={row.coinTypeId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setReleaseRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, coinTypeId: v } : r)));
                        }}
                        style={{
                          flex: '1 1 220px',
                          minWidth: '200px',
                          padding: '0.5rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="">Select coin type…</option>
                        {availableCoinTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.amountMode}
                        onChange={(e) => {
                          const v = e.target.value as 'raw' | 'percent';
                          setReleaseRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, amountMode: v } : r)));
                        }}
                        style={{
                          padding: '0.5rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                        }}
                      >
                        <option value="raw">Raw</option>
                        <option value="percent">%</option>
                      </select>

                      <input
                        type="text"
                        value={row.amount}
                        onChange={(e) => {
                          const v = e.target.value;
                          setReleaseRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, amount: v } : r)));
                        }}
                        placeholder={row.amountMode === 'percent' ? 'e.g. 25 or 12.5' : 'e.g. 1000000000'}
                        style={{
                          width: row.amountMode === 'percent' ? '140px' : '220px',
                          padding: '0.5rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                        }}
                      />

                      <div style={{ flex: '1 1 180px', color: styles.textSecondary, fontSize: '0.85rem' }}>
                        {coinBalance != null ? `Vault bal: ${coinBalance.toString()}` : row.coinTypeId ? 'Balance unknown' : ' '}
                      </div>

                      <button
                        type="button"
                        onClick={() => setReleaseRows((prev) => prev.filter((r) => r.id !== row.id))}
                        disabled={releaseRows.length <= 1}
                        style={{
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.85rem',
                          backgroundColor: releaseRows.length <= 1 ? styles.buttonDisabled : styles.bgWarning,
                          color: styles.text,
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          cursor: releaseRows.length <= 1 ? 'not-allowed' : 'pointer',
                        }}
                        title={releaseRows.length <= 1 ? 'At least one row is required' : 'Remove row'}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() =>
                      setReleaseRows((prev) => [
                        ...prev,
                        {
                          id: `r_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                          recipient: '',
                          coinTypeId: availableCoinTypes[0] ?? '',
                          amountMode: 'raw',
                          amount: '',
                        },
                      ])
                    }
                    style={{
                      padding: '0.5rem 0.9rem',
                      backgroundColor: styles.bgTertiary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Add recipient
                  </button>
                  <span style={{ color: styles.textSecondary, fontSize: '0.85rem' }}>
                    Percent is computed per coin type from the vault’s current on-chain balance.
                  </span>
                </div>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={buildOnly} onChange={(e) => setBuildOnly(e.target.checked)} />
              Build only (return tx for manual sign; uncheck to build and execute with admin wallet)
            </label>
            <button
              type="button"
              onClick={handleRelease}
              disabled={releasing || !canAttemptRelease}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: releasing || !canAttemptRelease ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: releasing || !canAttemptRelease ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {releasing ? 'Processing…' : buildOnly ? 'Build release transaction' : 'Build & execute release'}
            </button>
            {!releaseRowsValidation.ok && (
              <div style={{ marginTop: '0.5rem', color: styles.textError, fontSize: '0.9rem' }}>
                {releaseRowsValidation.errors[0]}
              </div>
            )}
            {releaseRowsValidation.ok && releaseRowsValidation.errors.length > 0 && (
              <div style={{ marginTop: '0.5rem', color: styles.textError, fontSize: '0.9rem' }}>
                {releaseRowsValidation.errors[0]}
              </div>
            )}
            {releaseBlockedReason && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '6px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgTertiary, color: styles.textSecondary, fontSize: '0.9rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: styles.text }}>Release blocked:</strong> {releaseBlockedReason}
                </div>
                {isLockedByTime && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: styles.text }}>Note:</strong> The unlock time is enforced on-chain and cannot be overridden.
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={forceEnableRelease}
                    onChange={(e) => {
                      setForceEnableRelease(e.target.checked);
                      if (!e.target.checked) setForceConfirmText('');
                    }}
                  />
                  Force enable release (rescue / manual override)
                </label>
                {forceEnableRelease && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ color: styles.textSecondary, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      Type the last 8 chars of the vault id to confirm: <span style={{ fontFamily: 'monospace' }}>{forceConfirmExpected}</span>
                    </div>
                    <input
                      type="text"
                      value={forceConfirmText}
                      onChange={(e) => setForceConfirmText(e.target.value)}
                      placeholder={forceConfirmExpected}
                      style={{
                        width: '220px',
                        padding: '0.5rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {releaseResult && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: releaseResult.success ? styles.bgSuccess : styles.bgError,
            color: releaseResult.success ? styles.text : styles.textError,
            border: `1px solid ${releaseResult.success ? styles.borderSuccess : styles.borderError}`,
          }}
        >
          {releaseResult.success ? (
            <>
              <strong>Success</strong>
              {releaseResult.digest && <p>Digest: {releaseResult.digest}</p>}
              {releaseResult.transactionBytesBase64 && <p style={{ fontSize: '0.9rem' }}>Transaction built. Sign and submit via API or use execute with signed tx.</p>}
              {releaseResult.message && <p style={{ fontSize: '0.9rem' }}>{releaseResult.message}</p>}
            </>
          ) : (
            <>
              <strong>Error</strong>
              <p>{releaseResult.error}</p>
            </>
          )}
        </div>
      )}

      {!isAdminWalletConnected && (
        <p style={{ color: styles.textSecondary, marginTop: '1rem' }}>Connect the admin wallet to list vaults and release.</p>
      )}
    </div>
  );
}
