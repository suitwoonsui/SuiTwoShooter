// ==========================================
// Admin Page - Tournaments Tab Component (API paths remain /api/tournaments)
// ==========================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { TournamentWizardStep, AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { TicketManagement } from '../components/TicketManagement';
import { ContractSelectionUI } from '../components/ContractSelectionUI';
import { CopyableAddress } from '../components/CopyableAddress';
import { TournamentCreationFeeEditor } from '../components/TournamentCreationFeeEditor';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';
import {
  isLeveledProvisionItem,
  serializeAdminInventoryItem,
  type AdminInventoryItemInput,
} from '@/lib/services/inventory/admin-inventory-item';

const PROVISION_ITEM_OPTIONS = [
  { id: 'extra_lives', label: '❤️ Extra Lives' },
  { id: 'force_field', label: '🛡️ Force Field' },
  { id: 'orb_level', label: '🔮 Orb Level' },
  { id: 'coin_tractor_beam', label: '🧲 Coin Tractor Beam' },
  { id: 'slow_time', label: '⏱️ Slow Time' },
  { id: 'destroy_all', label: '💥 Destroy All' },
  { id: 'boss_kill_shot', label: '🎯 Boss Kill Shot' },
] as const;

/** Ensure config has poolDistribution and other required fields (avoids .reduce on undefined) */
function normalizeDefaultRewardConfig(
  c: { rewardDepth?: number; poolDepth?: number; poolDistribution?: number[]; poolSource?: number; itemRewards?: Record<number, AdminInventoryItemInput[]> } | null
): { rewardDepth: number; poolDepth: number; poolDistribution: number[]; poolSource: number; itemRewards: Record<number, AdminInventoryItemInput[]> } {
  if (!c) {
    return {
      rewardDepth: 10,
      poolDepth: 3,
      poolDistribution: [50, 30, 20],
      poolSource: 0,
      itemRewards: {},
    };
  }
  return {
    rewardDepth: typeof c.rewardDepth === 'number' ? c.rewardDepth : 10,
    poolDepth: typeof c.poolDepth === 'number' ? c.poolDepth : 3,
    poolDistribution: Array.isArray(c.poolDistribution) ? c.poolDistribution : [50, 30, 20],
    poolSource: typeof c.poolSource === 'number' ? c.poolSource : 0,
    itemRewards: c.itemRewards && typeof c.itemRewards === 'object' ? c.itemRewards : {},
  };
}

interface TournamentsTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

export function TournamentsTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: TournamentsTabProps) {
  const [wizardStep, setWizardStep] = useState<TournamentWizardStep>('name');
  const [tournamentName, setTournamentName] = useState('');
  const tournamentNameInputRef = useRef<HTMLInputElement>(null);
  const [tournamentCategory, setTournamentCategory] = useState<'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies'>('highestScore');
  const [tournamentStartDate, setTournamentStartDate] = useState('');
  const [tournamentStartTime, setTournamentStartTime] = useState('');
  const [tournamentEndDate, setTournamentEndDate] = useState('');
  const [tournamentEndTime, setTournamentEndTime] = useState('');
  const [entryFeeTickets, setEntryFeeTickets] = useState<number>(1);
  const [startingAnteUSDCents, setStartingAnteUSDCents] = useState<number>(0);
  const [startingAnteToken, setStartingAnteToken] = useState<'SUI' | 'MEWS' | 'USDC'>('SUI');
  /** Raw token amount to deposit into pool vault at create (e.g. MIST for SUI). When set, vault is funded. */
  const [useCustomRewards, setUseCustomRewards] = useState<boolean>(false);
  const [rewardDepth, setRewardDepth] = useState<number>(3);
  const [itemRewards, setItemRewards] = useState<Record<number, Array<{ itemId: string; level: number; quantity: number }>>>({});
  const [rewardCost, setRewardCost] = useState<number | null>(null);
  const [calculatingCost, setCalculatingCost] = useState<boolean>(false);
  const [tournamentCreating, setTournamentCreating] = useState(false);
  const [tournamentResult, setTournamentResult] = useState<{ success: boolean; tournament?: any; error?: string } | null>(null);
  
  // Ticket management state
  const [activeSection, setActiveSection] = useState<'create' | 'tickets' | 'rewards' | 'manage' | 'defaultRewards'>('create');
  
  // Default rewards configuration state
  const [defaultRewardConfig, setDefaultRewardConfig] = useState<{
    rewardDepth: number;
    poolDepth: number;
    poolDistribution: number[];
    poolSource: number;
    itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
  } | null>(null);
  const [loadingDefaultRewards, setLoadingDefaultRewards] = useState(false);
  const [initDefaultRewardsLoading, setInitDefaultRewardsLoading] = useState(false);
  const [initDefaultRewardsResult, setInitDefaultRewardsResult] = useState<{
    success: boolean;
    message?: string;
    digest?: string;
    error?: string;
  } | null>(null);
  const [saveDefaultRewardsLoading, setSaveDefaultRewardsLoading] = useState(false);
  const [saveDefaultRewardsResult, setSaveDefaultRewardsResult] = useState<{
    success: boolean;
    message?: string;
    digest?: string;
    error?: string;
  } | null>(null);
  
  // Contract selection (new or old only)
  const [contractSelection, setContractSelection] = useState<'new' | 'old'>('new');
  
  // Tournament management state
  const [allTournaments, setAllTournaments] = useState<Array<{
    tournamentId: number;
    name: string;
    category: string;
    startTime: number;
    endTime: number;
    status: 'upcoming' | 'active' | 'ended';
    participants: number;
    prizePoolUsdCents: number;
    distributionStatus: number;
    objectId: string;
    rewardToken?: 'SUI' | 'MEWS' | 'USDC';
    createdBy?: string;
    isOldContract?: boolean; // Flag to indicate tournament is from old contract
    poolVaultId?: string;
  }>>([]);
  const [loadingAllTournaments, setLoadingAllTournaments] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<any>(null);
  const [loadingTournamentDetails, setLoadingTournamentDetails] = useState(false);
  const [tournamentLeaderboard, setTournamentLeaderboard] = useState<Array<{
    rank: number;
    playerAddress: string;
    playerName?: string;
    value: number;
    displayValue: string;
  }>>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [tournamentFilter, setTournamentFilter] = useState<
    'all' | 'upcoming' | 'active' | 'pending_distribution' | 'ended'
  >('all');
  
  // Tournament distribution settings (grace period, auto distribute)
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(60);
  const [autoDistribute, setAutoDistribute] = useState<boolean>(false);
  const [maxRetries, setMaxRetries] = useState<number | ''>('');
  const [maxConcurrentDistributions, setMaxConcurrentDistributions] = useState<number | ''>('');
  const [tideCallbackUrl, setTideCallbackUrl] = useState<string>('');
  const [creatorRewardEnabled, setCreatorRewardEnabled] = useState<boolean>(false);
  const [creatorRewardCreationFeeUsdCents, setCreatorRewardCreationFeeUsdCents] = useState<number | ''>('');
  const [creatorRewardBoostPct, setCreatorRewardBoostPct] = useState<number | ''>('');
  const [creatorRewardStandardPct, setCreatorRewardStandardPct] = useState<number | ''>('');
  const [creatorRewardToken, setCreatorRewardToken] = useState<'MEWS' | 'SUI' | 'USDC' | ''>('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rewards management state
  const [tournamentsList, setTournamentsList] = useState<Array<{
    tournamentId: number;
    name: string;
    category: string;
    endTime: number;
    prizePoolUsdCents: number;
    distributionStatus: number;
    objectId?: string;
  }>>([]);
  /** Platform distribution state per tournamentId (PENDING, SCHEDULED, EXECUTING, COMPLETED, FAILED). */
  const [platformStatusMap, setPlatformStatusMap] = useState<Record<number, { state: string; lastError?: string; retryCount?: number }>>({});
  const [loadingPlatformStatus, setLoadingPlatformStatus] = useState(false);
  const [retryingTournamentId, setRetryingTournamentId] = useState<number | null>(null);
  const [overrideEditTournamentId, setOverrideEditTournamentId] = useState<number | null>(null);
  const [overrideForm, setOverrideForm] = useState<{ override_auto_distribute: boolean; override_grace_period_minutes: '' | number }>({ override_auto_distribute: false, override_grace_period_minutes: '' });
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [distributingRewards, setDistributingRewards] = useState<number | null>(null);
  const [distributionResult, setDistributionResult] = useState<{
    tournamentId: number;
    success: boolean;
    distributions?: any[];
    digest?: string;
    error?: string;
  } | null>(null);
  
  // Edit/Delete state
  const [editingTournament, setEditingTournament] = useState<number | null>(null);
  const [deletingTournament, setDeletingTournament] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    entryFeeTickets?: number;
    category?: string;
  }>({});
  // Old contract query state (kept for backward compatibility)
  const [oldQueryPlayerAddress, setOldQueryPlayerAddress] = useState('');
  const [oldQueryTicketId, setOldQueryTicketId] = useState<string>('');
  const [oldQueryPackageId, setOldQueryPackageId] = useState('');
  const [oldQuerySystemId, setOldQuerySystemId] = useState('');
  const [queryingOldTickets, setQueryingOldTickets] = useState(false);
  const [oldTicketQueryResult, setOldTicketQueryResult] = useState<any>(null);

  const stepNames = { name: 'Name', category: 'Category', schedule: 'Schedule', entry: 'Entry Fee', rewards: 'Rewards', review: 'Review' };
  const stepIndex = (['name', 'category', 'schedule', 'entry', 'rewards', 'review'] as TournamentWizardStep[]).indexOf(wizardStep);

  // Load tournaments for rewards section (past/ended only; include objectId for platform status and retry)
  const loadTournaments = async () => {
    setLoadingTournaments(true);
    setPlatformStatusMap({});
    try {
      const response = await fetch(getApiUrl('api/tournaments/past?limit=100'));
      const data = await response.json();
      if (data.success && data.tournaments) {
        const endedTournaments = (data.tournaments as any[])
          .sort((a: any, b: any) => b.endTime - a.endTime)
          .map((t: any) => ({
            tournamentId: t.tournamentId,
            name: t.name,
            category: t.category,
            endTime: t.endTime,
            prizePoolUsdCents: t.prizePoolUsdCents ?? t.prizePoolUSDCents ?? 0,
            distributionStatus: t.distributionStatus ?? 0,
            objectId: t.objectId,
          }));
        setTournamentsList(endedTournaments);
      } else {
        setTournamentsList([]);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load tournaments');
    } finally {
      setLoadingTournaments(false);
    }
  };

  // Fetch platform distribution state for all tournaments in the list
  const loadPlatformDistributionStatus = async () => {
    if (tournamentsList.length === 0) return;
    setLoadingPlatformStatus(true);
    try {
      const results = await Promise.all(
        tournamentsList.map(async (t) => {
          try {
            const res = await fetch(getApiUrl(`api/admin/tournaments/${t.tournamentId}/distribution-status`));
            const data = await res.json();
            if (data?.success && data?.distribution) {
              return { tournamentId: t.tournamentId, distribution: data.distribution };
            }
            return { tournamentId: t.tournamentId, distribution: null };
          } catch {
            return { tournamentId: t.tournamentId, distribution: null };
          }
        })
      );
      const next: Record<number, { state: string; lastError?: string; retryCount?: number }> = {};
      results.forEach((r) => {
        if (r.distribution) {
          next[r.tournamentId] = {
            state: r.distribution.state ?? 'PENDING',
            lastError: r.distribution.lastError,
            retryCount: r.distribution.retryCount,
          };
        }
      });
      setPlatformStatusMap(next);
    } finally {
      setLoadingPlatformStatus(false);
    }
  };

  const retryDistributionForTournament = async (tournamentId: number) => {
    if (!connectedAddress || !adminAddress || connectedAddress.toLowerCase() !== adminAddress.toLowerCase()) {
      setSettingsMessage({ type: 'error', text: 'Connect admin wallet to retry distribution.' });
      return;
    }
    setRetryingTournamentId(tournamentId);
    try {
      const response = await fetch(getApiUrl(`api/admin/tournaments/${tournamentId}/retry-distribution`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminWalletAddress: connectedAddress }),
      });
      const data = await response.json();
      if (data?.success) {
        setSettingsMessage({ type: 'success', text: `Tournament ${tournamentId} queued for retry.` });
        await loadPlatformDistributionStatus();
      } else {
        setSettingsMessage({ type: 'error', text: data?.error ?? 'Retry failed.' });
      }
    } catch (e) {
      setSettingsMessage({ type: 'error', text: e instanceof Error ? e.message : 'Retry failed.' });
    } finally {
      setRetryingTournamentId(null);
    }
  };

  const openOverrideModal = async (tournamentId: number) => {
    setOverrideEditTournamentId(tournamentId);
    setOverrideForm({ override_auto_distribute: false, override_grace_period_minutes: '' });
    setLoadingOverrides(true);
    try {
      const res = await fetch(getApiUrl(`api/admin/tournaments/${tournamentId}/distribution-overrides`));
      const data = await res.json();
      if (data?.success) {
        setOverrideForm({
          override_auto_distribute: data.override_auto_distribute === true,
          override_grace_period_minutes: data.override_grace_period_minutes != null ? data.override_grace_period_minutes : '',
        });
      }
    } catch {
      setOverrideForm({ override_auto_distribute: false, override_grace_period_minutes: '' });
    } finally {
      setLoadingOverrides(false);
    }
  };

  const saveOverrideForTournament = async () => {
    if (overrideEditTournamentId == null || !connectedAddress || !adminAddress || connectedAddress.toLowerCase() !== adminAddress.toLowerCase()) {
      setSettingsMessage({ type: 'error', text: 'Connect admin wallet to save overrides.' });
      return;
    }
    setSavingOverrides(true);
    try {
      const body: { adminWalletAddress: string; override_auto_distribute: boolean; override_grace_period_minutes?: number } = {
        adminWalletAddress: connectedAddress,
        override_auto_distribute: overrideForm.override_auto_distribute,
      };
      if (typeof overrideForm.override_grace_period_minutes === 'number' && overrideForm.override_grace_period_minutes >= 0) {
        body.override_grace_period_minutes = overrideForm.override_grace_period_minutes;
      }
      const res = await fetch(getApiUrl(`api/admin/tournaments/${overrideEditTournamentId}/distribution-overrides`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data?.success) {
        setSettingsMessage({ type: 'success', text: 'Overrides saved.' });
        setOverrideEditTournamentId(null);
      } else {
        setSettingsMessage({ type: 'error', text: data?.error ?? 'Failed to save overrides.' });
      }
    } catch (e) {
      setSettingsMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save overrides.' });
    } finally {
      setSavingOverrides(false);
    }
  };

  // Delete tournament
  const deleteTournament = async (tournamentId: number, tournamentObjectId: string) => {
    if (!confirm(`Are you sure you want to DELETE tournament ${tournamentId}? This action cannot be undone and will remove the tournament from the registry.`)) {
      return;
    }

    setDeletingTournament(tournamentId);

    try {
      const response = await fetch(getApiUrl(`api/admin/tournaments/${tournamentId}/delete`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentObjectId, adminWalletAddress: connectedAddress }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Tournament ${tournamentId} deleted successfully`);
        // Reload tournaments
        await loadAllTournaments();
      } else {
        alert(data.error || 'Failed to delete tournament');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete tournament');
    } finally {
      setDeletingTournament(null);
    }
  };

  // Edit tournament
  const startEditTournament = (tournament: typeof allTournaments[0]) => {
    // Convert timestamps to date/time strings for the form
    const startDate = new Date(tournament.startTime);
    const endDate = new Date(tournament.endTime);
    
    // Get entry fee from tournament details if available, otherwise default to 1
    const entryFee = (tournament as any).entryFeeTickets || 1;
    
    setEditFormData({
      name: tournament.name,
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate.toISOString().split('T')[0],
      endTime: endDate.toTimeString().slice(0, 5),
      entryFeeTickets: entryFee,
      category: tournament.category,
    });
    setEditingTournament(tournament.tournamentId);
  };

  const cancelEdit = () => {
    setEditingTournament(null);
    setEditFormData({});
  };

  const saveEditTournament = async (tournamentId: number, tournamentObjectId: string) => {
    const updates: any = { tournamentObjectId };
    
    if (editFormData.name) {
      updates.name = editFormData.name;
    }
    
    if (editFormData.startDate && editFormData.startTime && editFormData.endDate && editFormData.endTime) {
      const startDateTime = new Date(`${editFormData.startDate}T${editFormData.startTime}`);
      const endDateTime = new Date(`${editFormData.endDate}T${editFormData.endTime}`);
      updates.startTime = startDateTime.getTime();
      updates.endTime = endDateTime.getTime();
    }
    
    if (editFormData.entryFeeTickets !== undefined) {
      updates.entryFeeTickets = editFormData.entryFeeTickets;
    }
    
    if (editFormData.category) {
      // Map category string to number
      const categoryMap: Record<string, number> = {
        'highestScore': 0,
        'totalCoins': 1,
        'longestStreak': 2,
        'longestDistance': 3,
        'mostBosses': 4,
        'mostEnemies': 5,
      };
      updates.category = categoryMap[editFormData.category] ?? 0;
    }

    setEditingTournament(tournamentId);

    try {
      const response = await fetch(getApiUrl(`api/admin/tournaments/${tournamentId}/edit`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Tournament ${tournamentId} updated successfully`);
        // Reload tournaments
        await loadAllTournaments();
        cancelEdit();
      } else {
        alert(data.error || 'Failed to update tournament');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update tournament');
    } finally {
      setEditingTournament(null);
    }
  };

  // Load tournament settings (grace period) when entering rewards section
  const loadTournamentSettings = async () => {
    setLoadingSettings(true);
    setSettingsMessage(null);
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/settings'));
      const data = await response.json();
      if (data?.success && data?.settings) {
        if (data.settings.gracePeriodMinutes != null) setGracePeriodMinutes(data.settings.gracePeriodMinutes);
        if (typeof data.settings.auto_distribute === 'boolean') setAutoDistribute(data.settings.auto_distribute);
        if (typeof data.settings.max_retries === 'number') setMaxRetries(data.settings.max_retries);
        else setMaxRetries('');
        if (typeof data.settings.max_concurrent_distributions === 'number') setMaxConcurrentDistributions(data.settings.max_concurrent_distributions);
        else setMaxConcurrentDistributions('');
        if (typeof data.settings.tideCallbackUrl === 'string') setTideCallbackUrl(data.settings.tideCallbackUrl);
        else setTideCallbackUrl('');
        if (typeof data.settings.creator_reward_enabled === 'boolean') setCreatorRewardEnabled(data.settings.creator_reward_enabled);
        if (typeof data.settings.creator_reward_creation_fee_usd_cents === 'number') setCreatorRewardCreationFeeUsdCents(data.settings.creator_reward_creation_fee_usd_cents);
        else setCreatorRewardCreationFeeUsdCents('');
        if (typeof data.settings.creator_reward_boost_percentage === 'number') setCreatorRewardBoostPct(data.settings.creator_reward_boost_percentage);
        else setCreatorRewardBoostPct('');
        if (typeof data.settings.creator_reward_standard_percentage === 'number') setCreatorRewardStandardPct(data.settings.creator_reward_standard_percentage);
        else setCreatorRewardStandardPct('');
        if (data.settings.creator_reward_token === 'MEWS' || data.settings.creator_reward_token === 'SUI' || data.settings.creator_reward_token === 'USDC') setCreatorRewardToken(data.settings.creator_reward_token);
        else setCreatorRewardToken('');
      }
    } catch {
      setSettingsMessage({ type: 'error', text: 'Failed to load tournament settings.' });
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveTournamentSettings = async () => {
    if (!adminAddress || !connectedAddress) {
      setSettingsMessage({ type: 'error', text: 'Connect admin wallet to save settings.' });
      return;
    }
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress,
          gracePeriodMinutes: Math.max(0, Math.round(gracePeriodMinutes)),
          auto_distribute: autoDistribute,
          ...(typeof maxRetries === 'number' && maxRetries >= 0 && { max_retries: maxRetries }),
          ...(typeof maxConcurrentDistributions === 'number' && maxConcurrentDistributions >= 0 && { max_concurrent_distributions: maxConcurrentDistributions }),
          tideCallbackUrl: (tideCallbackUrl || '').trim(),
          creator_reward_enabled: creatorRewardEnabled,
          ...(typeof creatorRewardCreationFeeUsdCents === 'number' && creatorRewardCreationFeeUsdCents >= 0 && { creator_reward_creation_fee_usd_cents: creatorRewardCreationFeeUsdCents }),
          ...(typeof creatorRewardBoostPct === 'number' && creatorRewardBoostPct >= 0 && { creator_reward_boost_percentage: creatorRewardBoostPct }),
          ...(typeof creatorRewardStandardPct === 'number' && creatorRewardStandardPct >= 0 && { creator_reward_standard_percentage: creatorRewardStandardPct }),
          ...(creatorRewardToken === 'MEWS' || creatorRewardToken === 'SUI' || creatorRewardToken === 'USDC' ? { creator_reward_token: creatorRewardToken } : {}),
        }),
      });
      const data = await response.json();
      if (data?.success) {
        setSettingsMessage({ type: 'success', text: 'Settings saved.' });
      } else {
        setSettingsMessage({ type: 'error', text: data?.error || 'Failed to save settings.' });
      }
    } catch {
      setSettingsMessage({ type: 'error', text: 'Failed to save tournament settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Distribute rewards for a tournament
  const distributeRewards = async (tournamentId: number) => {
    if (!confirm(`Are you sure you want to distribute rewards for tournament ${tournamentId}? This action cannot be undone.`)) {
      return;
    }

    setDistributingRewards(tournamentId);
    setDistributionResult(null);

    try {
      const response = await fetch(getApiUrl(`api/admin/tournaments/${tournamentId}/distribute-rewards`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminWalletAddress: connectedAddress }),
      });

      const data = await response.json();
      setDistributionResult({
        tournamentId,
        success: data.success,
        distributions: data.distributions,
        digest: data.digest,
        error: data.error,
      });

      if (data.success) {
        // Reload event list and rewards section so distribution status updates everywhere
        await loadAllTournaments();
        await loadTournaments();
      } else {
        alert(data.error || 'Failed to distribute rewards');
      }
    } catch (error) {
      setDistributionResult({
        tournamentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      alert(error instanceof Error ? error.message : 'Failed to distribute rewards');
    } finally {
      setDistributingRewards(null);
    }
  };

  // Load all tournaments (active, upcoming, ended)
  const loadAllTournaments = async () => {
    setLoadingAllTournaments(true);
    setLoadingPlatformStatus(true);
    try {
      const now = Date.now();
      const allTournamentsList: any[] = [];
      
      // 1. Fetch from current (new) contract (if selected)
      if (contractSelection === 'new') {
        try {
          // api/tournaments (no status) returns upcoming + active merged; past is separate
          const [upcomingAndActiveResponse, pastResponse] = await Promise.all([
            fetch(getApiUrl('api/tournaments')),
            fetch(getApiUrl('api/tournaments/past?limit=100')),
          ]);
          
          const upcomingAndActiveData = await upcomingAndActiveResponse.json();
          const pastData = await pastResponse.json();
          
          // Process upcoming + active tournaments
          if (upcomingAndActiveData.success && upcomingAndActiveData.tournaments) {
            upcomingAndActiveData.tournaments.forEach((t: any) => {
              allTournamentsList.push({
                tournamentId: t.tournamentId,
                name: t.name,
                category: t.category,
                startTime: t.startTime,
                endTime: t.endTime,
                // Trust API: it is table-driven (upcoming_events vs active_events), not time-based self-filtering.
                status: t.status ?? (now < t.startTime ? 'upcoming' : now <= t.endTime ? 'active' : 'ended'),
                participants: t.participants || 0,
                prizePoolUsdCents: t.prizePoolUSDCents || 0,
                distributionStatus: t.distributionStatus ?? 0,
                objectId: t.objectId,
                rewardToken: t.rewardToken,
                createdBy: t.createdBy,
                isOldContract: false,
                poolVaultId: t.poolVaultId,
                poolVaultBalanceRaw: t.poolVaultBalanceRaw,
                poolVaultCoinTypeId: t.poolVaultCoinTypeId,
              });
            });
          }
          
          // Process past tournaments
          if (pastData.success && pastData.tournaments) {
            pastData.tournaments.forEach((t: any) => {
              allTournamentsList.push({
                tournamentId: t.tournamentId,
                name: t.name,
                category: t.category,
                startTime: t.startTime,
                endTime: t.endTime,
                status: 'ended',
                participants: t.participants || 0,
                prizePoolUsdCents: t.prizePoolUSDCents || 0,
                distributionStatus: t.distributionStatus ?? 0,
                objectId: t.objectId,
                rewardToken: t.rewardToken,
                createdBy: t.createdBy,
                poolVaultId: t.poolVaultId,
                poolVaultBalanceRaw: t.poolVaultBalanceRaw,
                poolVaultCoinTypeId: t.poolVaultCoinTypeId,
                isOldContract: false,
              });
            });
          }
        } catch (error) {
          console.warn('Error fetching tournaments from current contract:', error);
        }
      }
      
      // 2. Fetch from old contract (if selected)
      if (contractSelection === 'old') {
        try {
          const oldResponse = await fetch(getApiUrl('api/tournaments/migrate'));
          const oldData = await oldResponse.json();
          
          if (oldResponse.ok && oldData.success && oldData.tournamentIds) {
            // Old tournaments only have IDs, not full details
            oldData.tournamentIds.forEach((tournamentId: number) => {
              // Check if we already have this tournament from the new contract
              const existing = allTournamentsList.find(t => t.tournamentId === tournamentId && !t.isOldContract);
              if (!existing) {
                // Add as old contract tournament with limited info
                allTournamentsList.push({
                  tournamentId,
                  name: `Tournament #${tournamentId} (Old Contract)`,
                  category: 'unknown',
                  startTime: 0,
                  endTime: 0,
                  status: 'ended' as const,
                  participants: 0,
                  prizePoolUsdCents: 0,
                  distributionStatus: 0,
                  objectId: '',
                  isOldContract: true,
                });
              }
            });
          }
        } catch (error) {
          console.warn('Error fetching tournaments from old contract:', error);
        }
      }
      
      // Sort by tournament ID (newest first)
      allTournamentsList.sort((a, b) => b.tournamentId - a.tournamentId);
      setAllTournaments(allTournamentsList);

      // Also load platform distribution state for ended tournaments so Manage tab categories are accurate.
      // (Distribution state is stored off-chain on the platform and can differ from on-chain rewardsDistributed until mark completes.)
      try {
        const ended = allTournamentsList.filter((t) => !t.isOldContract && t.status === 'ended' && t.tournamentId != null);
        const results = await Promise.all(
          ended.map(async (t: any) => {
            try {
              const res = await fetch(getApiUrl(`api/admin/tournaments/${t.tournamentId}/distribution-status`));
              const data = await res.json();
              if (data?.success && data?.distribution) {
                return { tournamentId: t.tournamentId, distribution: data.distribution };
              }
              return { tournamentId: t.tournamentId, distribution: null };
            } catch {
              return { tournamentId: t.tournamentId, distribution: null };
            }
          })
        );
        const next: Record<number, { state: string; lastError?: string; retryCount?: number }> = {};
        results.forEach((r) => {
          if (r.distribution) {
            next[r.tournamentId] = {
              state: r.distribution.state ?? 'PENDING',
              lastError: r.distribution.lastError,
              retryCount: r.distribution.retryCount,
            };
          }
        });
        setPlatformStatusMap(next);
      } catch {
        // keep existing map
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load tournaments');
    } finally {
      setLoadingAllTournaments(false);
      setLoadingPlatformStatus(false);
    }
  };

  const getPlatformDistributionState = (tournamentId: number, distributionStatus?: number): string => {
    const s = platformStatusMap[tournamentId]?.state;
    if (s) return s;
    // Fallback when platform state hasn't been loaded yet.
    if (distributionStatus === 1) return 'COMPLETED';
    return 'PENDING';
  };

  const isPendingDistribution = (t: (typeof allTournaments)[number]): boolean => {
    if (t.isOldContract) return false;
    if (t.status !== 'ended') return false;
    // If already processed on-chain (Distributed/No participants/No rewards), treat as ended (not pending distribution).
    if ((t as any).distributionStatus != null && (t as any).distributionStatus > 0) return false;
    const state = getPlatformDistributionState(t.tournamentId, (t as any).distributionStatus);
    return state !== 'COMPLETED';
  };

  const isEndedDone = (t: (typeof allTournaments)[number]): boolean => {
    if (t.isOldContract) return true;
    if (t.status !== 'ended') return false;
    // Any "processed" terminal-ish on-chain status counts as ended for admin UX.
    if ((t as any).distributionStatus != null && (t as any).distributionStatus > 0) return true;
    const state = getPlatformDistributionState(t.tournamentId, (t as any).distributionStatus);
    return state === 'COMPLETED';
  };

  const matchesTournamentFilter = (t: (typeof allTournaments)[number]): boolean => {
    if (tournamentFilter === 'all') return true;
    if (tournamentFilter === 'upcoming' || tournamentFilter === 'active') {
      return t.status === tournamentFilter;
    }
    if (tournamentFilter === 'pending_distribution') return isPendingDistribution(t);
    if (tournamentFilter === 'ended') return isEndedDone(t);
    return true;
  };

  // Load tournament details
  const loadTournamentDetails = async (objectId: string) => {
    setLoadingTournamentDetails(true);
    setSelectedTournament(objectId);
    try {
      const response = await fetch(getApiUrl(`api/tournaments/${objectId}`));
      const data = await response.json();
      
      if (data.success && data.tournament) {
        setTournamentDetails(data.tournament);
      } else {
        alert(data.error || 'Failed to load tournament details');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load tournament details');
    } finally {
      setLoadingTournamentDetails(false);
    }
  };

  // Load tournament leaderboard
  const loadTournamentLeaderboard = async (objectId: string) => {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch(getApiUrl(`api/tournaments/${objectId}/leaderboard?limit=100`));
      const data = await response.json();
      
      if (data.success && data.leaderboard) {
        setTournamentLeaderboard(data.leaderboard);
      } else {
        alert(data.error || 'Failed to load leaderboard');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Whether the last load found config on-chain (from platform). When false, we show defaults and prompt to Initialize.
  const [defaultRewardsFromChain, setDefaultRewardsFromChain] = useState<boolean | null>(null);

  // Load default rewards configuration from platform (on-chain only)
  const loadDefaultRewards = async () => {
    setLoadingDefaultRewards(true);
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/default-sustain-config'));
      const data = await response.json();
      if (data.success && data.config) {
        setDefaultRewardConfig(normalizeDefaultRewardConfig(data.config));
        setDefaultRewardsFromChain(true);
      } else {
        setDefaultRewardConfig(null);
        setDefaultRewardsFromChain(false);
      }
    } catch (error) {
      console.error('Failed to load default rewards:', error);
      setDefaultRewardConfig(null);
      setDefaultRewardsFromChain(false);
    } finally {
      setLoadingDefaultRewards(false);
    }
  };

  // Initialize default rewards on-chain (code-defined defaults, same pattern as Game Config)
  const handleInitializeDefaultRewards = async () => {
    if (!connectedAddress) {
      alert('Please connect your admin wallet to initialize default sustain config on-chain');
      return;
    }
    setInitDefaultRewardsLoading(true);
    setInitDefaultRewardsResult(null);
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/default-sustain-config/initialize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminWalletAddress: connectedAddress }),
      });
      const data = await response.json();
      if (data.success) {
        setInitDefaultRewardsResult({ success: true, message: data.message, digest: data.digest });
        if (data.config && typeof data.config === 'object') {
          setDefaultRewardConfig(normalizeDefaultRewardConfig(data.config));
          setDefaultRewardsFromChain(true);
        } else {
          await loadDefaultRewards();
        }
      } else {
        setInitDefaultRewardsResult({ success: false, error: data.error || 'Initialize failed' });
      }
    } catch (err: unknown) {
      setInitDefaultRewardsResult({
        success: false,
        error: err instanceof Error ? err.message : 'Initialize failed',
      });
    } finally {
      setInitDefaultRewardsLoading(false);
    }
  };

  const handleSaveDefaultRewards = async () => {
    if (!connectedAddress) {
      alert('Please connect your admin wallet to save default sustain config on-chain');
      return;
    }
    if (!defaultRewardConfig) {
      alert('No default reward config loaded to save.');
      return;
    }

    setSaveDefaultRewardsLoading(true);
    setSaveDefaultRewardsResult(null);
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/default-sustain-config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress,
          config: defaultRewardConfig,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSaveDefaultRewardsResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        if (data.config && typeof data.config === 'object') {
          setDefaultRewardConfig(normalizeDefaultRewardConfig(data.config));
          setDefaultRewardsFromChain(true);
        } else {
          await loadDefaultRewards();
        }
      } else {
        setSaveDefaultRewardsResult({ success: false, error: data.error || 'Save failed' });
      }
    } catch (err: unknown) {
      setSaveDefaultRewardsResult({
        success: false,
        error: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSaveDefaultRewardsLoading(false);
    }
  };

  // Reset tournament form when connected address changes
  useEffect(() => {
    setTournamentName('');
    setTournamentCategory('highestScore');
    setTournamentStartDate('');
    setTournamentStartTime('');
    setTournamentEndDate('');
    setTournamentEndTime('');
    setEntryFeeTickets(1);
    setStartingAnteUSDCents(0);
    setStartingAnteToken('SUI');
    setUseCustomRewards(false);
    setRewardDepth(3);
    setItemRewards({});
    setRewardCost(null);
    setWizardStep('name');
    setTournamentResult(null);
    setTournamentCreating(false);
  }, [connectedAddress]);

  return (
    <div style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Section Selector */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: `2px solid ${styles.border}`, paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveSection('create')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'create' ? styles.buttonPrimary : 'transparent',
            color: activeSection === 'create' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'create' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🏆 Create Tournament
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSection('manage');
            // Load all tournaments and pool vaults when switching to manage section
            if (allTournaments.length === 0) {
              loadAllTournaments();
            }
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'manage' ? styles.buttonPrimary : 'transparent',
            color: activeSection === 'manage' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'manage' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          📋 Manage Events
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('tickets')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'tickets' ? styles.buttonPrimary : 'transparent',
            color: activeSection === 'tickets' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'tickets' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🎫 Ticket Management
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSection('defaultRewards');
            loadDefaultRewards();
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'defaultRewards' ? styles.buttonPrimary : 'transparent',
            color: activeSection === 'defaultRewards' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'defaultRewards' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🎁 Default Rewards
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSection('rewards');
            loadTournamentSettings();
            // Load tournaments when switching to rewards section
            if (tournamentsList.length === 0) {
              loadTournaments();
            }
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'rewards' ? styles.buttonPrimary : 'transparent',
            color: activeSection === 'rewards' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'rewards' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          ⚙️ Tournament Config
        </button>
      </div>

      {/* Tournament Creation Wizard */}
      {activeSection === 'create' && (
      <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
        <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>🏆 Create Tournament</h2>
        
        {/* Wizard Steps Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
          {(['name', 'category', 'schedule', 'entry', 'rewards', 'review'] as TournamentWizardStep[]).map((step, index) => {
            const isActive = step === wizardStep;
            const isCompleted = stepIndex > index;
            
            return (
              <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? styles.buttonPrimary : isCompleted ? '#4CAF50' : styles.bgTertiary,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    border: `2px solid ${isActive ? styles.buttonPrimary : isCompleted ? '#4CAF50' : styles.border}`,
                  }}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div style={{ fontSize: '0.85rem', color: isActive ? styles.text : styles.textSecondary, textAlign: 'center' }}>
                  {stepNames[step]}
                </div>
                {index < 4 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      width: '100%',
                      height: '2px',
                      backgroundColor: stepIndex > index ? '#4CAF50' : styles.border,
                      zIndex: -1,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Tournament Name */}
        {wizardStep === 'name' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Tournament Name:
            </label>
            <input
              ref={tournamentNameInputRef}
              type="text"
              key={`tournament-name-${connectedAddress}-${wizardStep}`}
              value={tournamentName}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log('Tournament name input changed:', newValue);
                setTournamentName(newValue);
              }}
              onBlur={(e) => {
                // Log when field loses focus to verify final value
                console.log('Tournament name field blurred, final value:', e.target.value);
                console.log('Tournament name state:', tournamentName);
              }}
              placeholder="e.g., Weekly High Score Challenge"
              autoComplete="off"
              name={`tournament-name-${connectedAddress}`}
              id={`tournament-name-${connectedAddress}`}
              data-form-type="other"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                backgroundColor: styles.inputBg,
                color: styles.text,
              }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              Choose a descriptive name for your tournament
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setWizardStep('category')}
                disabled={!tournamentName.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: !tournamentName.trim() ? styles.buttonDisabled : styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !tournamentName.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category */}
        {wizardStep === 'category' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Tournament Category:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { value: 'highestScore', label: 'Highest Score', icon: '🎯' },
                { value: 'totalCoins', label: 'Total Coins', icon: '💰' },
                { value: 'longestStreak', label: 'Longest Streak', icon: '🔥' },
                { value: 'longestDistance', label: 'Longest Distance', icon: '📏' },
                { value: 'mostBosses', label: 'Most Bosses', icon: '👹' },
                { value: 'mostEnemies', label: 'Most Enemies', icon: '💀' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setTournamentCategory(cat.value as any)}
                  style={{
                    padding: '1rem',
                    backgroundColor: tournamentCategory === cat.value ? styles.buttonPrimary : styles.bgTertiary,
                    color: tournamentCategory === cat.value ? 'white' : styles.text,
                    border: `2px solid ${tournamentCategory === cat.value ? styles.buttonPrimary : styles.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setWizardStep('name')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.bgTertiary,
                  color: styles.text,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setWizardStep('schedule')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {wizardStep === 'schedule' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Start Date & Time:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={tournamentStartDate}
                  onChange={(e) => setTournamentStartDate(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    colorScheme: styles.colorScheme,
                  }}
                />
                <input
                  type="time"
                  value={tournamentStartTime}
                  onChange={(e) => setTournamentStartTime(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    colorScheme: styles.colorScheme,
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                End Date & Time:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={tournamentEndDate}
                  onChange={(e) => setTournamentEndDate(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    colorScheme: styles.colorScheme,
                  }}
                />
                <input
                  type="time"
                  value={tournamentEndTime}
                  onChange={(e) => setTournamentEndTime(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    colorScheme: styles.colorScheme,
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setWizardStep('category')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.bgTertiary,
                  color: styles.text,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tournamentStartDate && tournamentStartTime && tournamentEndDate && tournamentEndTime) {
                    const start = new Date(`${tournamentStartDate}T${tournamentStartTime}`);
                    const end = new Date(`${tournamentEndDate}T${tournamentEndTime}`);
                    if (end > start) {
                      setWizardStep('entry');
                    } else {
                      alert('End time must be after start time');
                    }
                  } else {
                    alert('Please fill in all date and time fields');
                  }
                }}
                disabled={!tournamentStartDate || !tournamentStartTime || !tournamentEndDate || !tournamentEndTime}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: (!tournamentStartDate || !tournamentStartTime || !tournamentEndDate || !tournamentEndTime) ? styles.buttonDisabled : styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (!tournamentStartDate || !tournamentStartTime || !tournamentEndDate || !tournamentEndTime) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Entry Fee */}
        {wizardStep === 'entry' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Entry Fee (Tournament Tickets):
            </label>
            <input
              type="number"
              min="1"
              value={entryFeeTickets}
              onChange={(e) => setEntryFeeTickets(parseInt(e.target.value) || 1)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                backgroundColor: styles.inputBg,
                color: styles.text,
              }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              Number of tournament tickets required to enter. Typically 1 ticket.
            </p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Starting Ante (USD Cents) <span style={{ fontWeight: 'normal', fontSize: '0.9rem', color: styles.textSecondary }}>(Optional)</span>:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={startingAnteUSDCents}
                  onChange={(e) => setStartingAnteUSDCents(parseInt(e.target.value) || 0)}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                  }}
                />
                <select
                  value={startingAnteToken}
                  onChange={(e) => setStartingAnteToken(e.target.value as 'SUI' | 'MEWS' | 'USDC')}
                  disabled={startingAnteUSDCents === 0}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: startingAnteUSDCents === 0 ? styles.bgTertiary : styles.inputBg,
                    color: startingAnteUSDCents === 0 ? styles.textSecondary : styles.text,
                    cursor: startingAnteUSDCents === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="SUI">SUI</option>
                  <option value="MEWS">MEWS</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                Initial prize pool amount in USD cents. Leave as 0 for no starting prize pool. Example: 1000 = $10.00
                {startingAnteUSDCents > 0 && (
                  <span style={{ display: 'block', marginTop: '0.25rem', fontStyle: 'italic', color: styles.text }}>
                    <strong>Important:</strong> The selected token ({startingAnteToken}) will be used for reward distribution. Winners will receive rewards in {startingAnteToken} tokens.
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setWizardStep('schedule')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.bgTertiary,
                  color: styles.text,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setWizardStep('rewards')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Rewards */}
        {wizardStep === 'rewards' && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: styles.text }}>Configure Rewards</h3>
            <p style={{ marginBottom: '1.5rem', color: styles.textSecondary }}>
              Choose whether to use default tournament rewards or configure custom item rewards for specific ranks.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!useCustomRewards}
                  onChange={() => setUseCustomRewards(false)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                <span style={{ color: styles.text, fontWeight: 'bold' }}>Use Default Rewards</span>
              </label>
              <p style={{ marginLeft: '1.5rem', marginBottom: '1rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                Top 3 players receive token rewards from the prize pool. No additional configuration needed.
              </p>

              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={useCustomRewards}
                  onChange={() => setUseCustomRewards(true)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                <span style={{ color: styles.text, fontWeight: 'bold' }}>Configure Custom Item Rewards</span>
              </label>
              <p style={{ marginLeft: '1.5rem', marginBottom: '1rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                Add custom item rewards for specific ranks. Players will receive these items in addition to token rewards.
              </p>
            </div>

            {useCustomRewards && (
              <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1.5rem', border: `1px solid ${styles.border}` }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                    Reward Depth:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="255"
                    value={rewardDepth}
                    onChange={(e) => {
                      const depth = parseInt(e.target.value) || 1;
                      setRewardDepth(depth);
                      // Clear rewards for ranks beyond new depth
                      const newRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>> = {};
                      for (let i = 1; i <= depth; i++) {
                        if (itemRewards[i]) {
                          newRewards[i] = itemRewards[i];
                        }
                      }
                      setItemRewards(newRewards);
                    }}
                    style={{
                      padding: '0.75rem',
                      fontSize: '1rem',
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                      width: '100px',
                    }}
                  />
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                    How many ranks will receive item rewards (1-255)
                  </p>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: styles.text }}>Item Rewards by Rank</h4>
                  {Array.from({ length: rewardDepth }, (_, i) => i + 1).map((rank) => (
                    <div key={rank} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ color: styles.text }}>Rank {rank}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            const current = itemRewards[rank] || [];
                            setItemRewards({
                              ...itemRewards,
                              [rank]: [...current, { itemId: 'extra_lives', level: 1, quantity: 1 }],
                            });
                          }}
                          style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.875rem',
                            backgroundColor: styles.buttonPrimary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          + Add Item
                        </button>
                      </div>
                      {(itemRewards[rank] || []).map((item, itemIndex) => (
                        <div key={itemIndex} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: styles.bgTertiary, borderRadius: '4px' }}>
                          <select
                            value={toDynamicProvisionKey(item.itemId)}
                            onChange={(e) => {
                              const newRewards = { ...itemRewards };
                              if (!newRewards[rank]) newRewards[rank] = [];
                              newRewards[rank][itemIndex].itemId = e.target.value;
                              setItemRewards(newRewards);
                            }}
                            style={{
                              padding: '0.5rem',
                              fontSize: '0.875rem',
                              border: `1px solid ${styles.border}`,
                              borderRadius: '4px',
                              backgroundColor: styles.inputBg,
                              color: styles.text,
                              flex: 1,
                            }}
                          >
                            {PROVISION_ITEM_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={item.level}
                            onChange={(e) => {
                              const newRewards = { ...itemRewards };
                              if (!newRewards[rank]) newRewards[rank] = [];
                              newRewards[rank][itemIndex].level = parseInt(e.target.value);
                              setItemRewards(newRewards);
                            }}
                            style={{
                              padding: '0.5rem',
                              fontSize: '0.875rem',
                              border: `1px solid ${styles.border}`,
                              borderRadius: '4px',
                              backgroundColor: styles.inputBg,
                              color: styles.text,
                              width: '80px',
                            }}
                          >
                            <option value="1">Level 1</option>
                            <option value="2">Level 2</option>
                            <option value="3">Level 3</option>
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newRewards = { ...itemRewards };
                              if (!newRewards[rank]) newRewards[rank] = [];
                              newRewards[rank][itemIndex].quantity = parseInt(e.target.value) || 1;
                              setItemRewards(newRewards);
                            }}
                            style={{
                              padding: '0.5rem',
                              fontSize: '0.875rem',
                              border: `1px solid ${styles.border}`,
                              borderRadius: '4px',
                              backgroundColor: styles.inputBg,
                              color: styles.text,
                              width: '80px',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newRewards = { ...itemRewards };
                              if (newRewards[rank]) {
                                newRewards[rank] = newRewards[rank].filter((_, idx) => idx !== itemIndex);
                                if (newRewards[rank].length === 0) {
                                  delete newRewards[rank];
                                }
                              }
                              setItemRewards(newRewards);
                            }}
                            style={{
                              padding: '0.5rem',
                              fontSize: '0.875rem',
                              backgroundColor: styles.buttonDanger,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {(!itemRewards[rank] || itemRewards[rank].length === 0) && (
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: styles.textSecondary, fontStyle: 'italic' }}>
                          No items configured for this rank
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {rewardCost !== null && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                    <strong style={{ color: styles.text }}>Estimated Reward Cost: ${(rewardCost / 100).toFixed(2)}</strong>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: styles.textSecondary }}>
                      Note: This is an estimate. Actual cost may vary based on badge discounts.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setWizardStep('entry')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.bgTertiary,
                  color: styles.text,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Calculate reward cost if using custom rewards
                  if (useCustomRewards && Object.keys(itemRewards).length > 0) {
                    setCalculatingCost(true);
                    try {
                      const response = await fetch(getApiUrl('api/tournaments/calculate-reward-cost'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          rewardDepth,
                          itemRewards: Object.entries(itemRewards).reduce((acc, [rank, items]) => {
                            acc[parseInt(rank)] = items;
                            return acc;
                          }, {} as Record<number, Array<{ itemId: string; level: number; quantity: number }>>),
                        }),
                      });
                      const data = await response.json();
                      if (data.success && data.cost) {
                        setRewardCost(data.cost.totalCostUSDCents);
                      }
                    } catch (error) {
                      console.error('Error calculating reward cost:', error);
                    } finally {
                      setCalculatingCost(false);
                    }
                  }
                  setWizardStep('review');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {calculatingCost ? 'Calculating...' : 'Next →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Review */}
        {wizardStep === 'review' && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: styles.text }}>Review Tournament Details</h3>
            <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: styles.text }}>Name:</strong>
                <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>{tournamentName}</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: styles.text }}>Category:</strong>
                <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                  {tournamentCategory === 'highestScore' && '🎯 Highest Score'}
                  {tournamentCategory === 'totalCoins' && '💰 Total Coins'}
                  {tournamentCategory === 'longestStreak' && '🔥 Longest Streak'}
                  {tournamentCategory === 'longestDistance' && '📏 Longest Distance'}
                  {tournamentCategory === 'mostBosses' && '👹 Most Bosses'}
                  {tournamentCategory === 'mostEnemies' && '💀 Most Enemies'}
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: styles.text }}>Start:</strong>
                <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                  {tournamentStartDate && tournamentStartTime && new Date(`${tournamentStartDate}T${tournamentStartTime}`).toLocaleString()}
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: styles.text }}>End:</strong>
                <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                  {tournamentEndDate && tournamentEndTime && new Date(`${tournamentEndDate}T${tournamentEndTime}`).toLocaleString()}
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: styles.text }}>Entry Fee:</strong>
                <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>{entryFeeTickets} tournament ticket(s)</div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: styles.text }}>Starting Ante:</strong>
                <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                  {startingAnteUSDCents > 0 
                    ? `$${(startingAnteUSDCents / 100).toFixed(2)} (${startingAnteUSDCents} cents) - ${startingAnteToken}`
                    : '$0.00 (No starting prize pool)'}
                </div>
              </div>
              <div>
                <strong style={{ color: styles.text }}>Rewards:</strong>
                <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                  {useCustomRewards ? (
                    <div>
                      <div>Custom Item Rewards (Depth: {rewardDepth})</div>
                      {Object.keys(itemRewards).length > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                          {Object.entries(itemRewards).map(([rank, items]) => (
                            <div key={rank} style={{ marginTop: '0.25rem' }}>
                              Rank {rank}: {items.map((item, idx) => (
                                <span key={idx}>
                                  {item.quantity}x {item.itemId} Lv{item.level}
                                  {idx < items.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {rewardCost !== null && (
                        <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                          Estimated Cost: ${(rewardCost / 100).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    'Default Rewards (Top 3 token rewards from prize pool)'
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setWizardStep('rewards')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: styles.bgTertiary,
                  color: styles.text,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!connectedAddress) {
                    alert('Please connect your wallet first');
                    return;
                  }

                  const start = new Date(`${tournamentStartDate}T${tournamentStartTime}`);
                  const end = new Date(`${tournamentEndDate}T${tournamentEndTime}`);
                  
                  setTournamentCreating(true);
                  setTournamentResult(null);

                  try {
                    // Get the current value from both state and DOM to ensure we have the latest
                    const stateName = tournamentName.trim();
                    const domName = tournamentNameInputRef.current?.value.trim() || '';
                    
                    // Use DOM value if it differs from state (state might be stale)
                    const currentName = domName || stateName;
                    
                    // Debug: Log the tournament name being sent
                    console.log('=== TOURNAMENT CREATION DEBUG ===');
                    console.log('Tournament name from state:', tournamentName);
                    console.log('Tournament name from state (trimmed):', stateName);
                    console.log('Tournament name from DOM:', tournamentNameInputRef.current?.value);
                    console.log('Tournament name from DOM (trimmed):', domName);
                    console.log('Final name being used:', currentName);
                    console.log('Connected address:', connectedAddress);
                    
                    // Validate that we have a name
                    if (!currentName || currentName === '') {
                      alert('Please enter a tournament name');
                      setTournamentCreating(false);
                      return;
                    }
                    
                    // Build reward config if using custom rewards
                    let rewardConfig = null;
                    if (useCustomRewards && Object.keys(itemRewards).length > 0) {
                      // Convert itemRewards to the format expected by the API
                      const itemRewardsMap: Record<number, Array<{ itemId: string; level: number; quantity: number }>> = {};
                      Object.entries(itemRewards).forEach(([rank, items]) => {
                        if (items && items.length > 0) {
                          itemRewardsMap[parseInt(rank)] = items;
                        }
                      });
                      
                      if (Object.keys(itemRewardsMap).length > 0) {
                        rewardConfig = {
                          rewardDepth,
                          poolDepth: 3, // Default pool depth for top 3
                          poolDistribution: [50, 30, 20], // Default distribution percentages
                          poolSource: 0, // 0 = Prize Pool
                          itemRewards: itemRewardsMap,
                        };
                      }
                    }
                    
                    const requestBody = {
                      name: currentName,
                      category: tournamentCategory,
                      startTime: start.getTime(),
                      endTime: end.getTime(),
                      entryFeeTickets,
                      startingAnteUSDCents: startingAnteUSDCents || 0,
                      startingAnteToken: startingAnteToken,
                      adminWalletAddress: connectedAddress,
                      rewardConfig: rewardConfig,
                    };
                    
                    console.log('Full request body:', JSON.stringify(requestBody, null, 2));
                    
                    const response = await fetch(getApiUrl('api/admin/tournaments/create'), {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(requestBody),
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                      setTournamentResult({ success: true, tournament: data.tournament });
                      // Refresh tournament list so the new tournament appears
                      await loadTournaments();
                      // Reset wizard
                      setWizardStep('name');
                      setTournamentName('');
                      setTournamentStartDate('');
                      setTournamentStartTime('');
                      setTournamentEndDate('');
                      setTournamentEndTime('');
                      setEntryFeeTickets(1);
                      setStartingAnteUSDCents(0);
                      setStartingAnteToken('SUI');
                      setUseCustomRewards(false);
                      setRewardDepth(3);
                      setItemRewards({});
                      setRewardCost(null);
                    } else {
                      setTournamentResult({ success: false, error: data.error || 'Failed to create tournament' });
                    }
                  } catch (error) {
                    setTournamentResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                  } finally {
                    setTournamentCreating(false);
                  }
                }}
                disabled={tournamentCreating || !isAdminWalletConnected}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: tournamentCreating || !isAdminWalletConnected ? styles.buttonDisabled : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: tournamentCreating || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {tournamentCreating ? 'Creating...' : 'Create Tournament'}
              </button>
            </div>
          </div>
        )}

        {/* Tournament Creation Result */}
        {tournamentResult && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '4px',
              backgroundColor: tournamentResult.success ? styles.bgSuccess : styles.bgError,
              border: `1px solid ${tournamentResult.success ? styles.borderSuccess : styles.borderError}`,
            }}
          >
            {tournamentResult.success ? (
              <div>
                <strong style={{ color: styles.text }}>✅ Tournament Created Successfully!</strong>
                {tournamentResult.tournament && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                    <div>Tournament ID: {tournamentResult.tournament.tournamentId}</div>
                    {tournamentResult.tournament.objectId && (
                      <div>Object ID: <CopyableAddress value={tournamentResult.tournament.objectId} styles={styles} /></div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <strong style={{ color: styles.text }}>❌ Error:</strong>
                <div style={{ marginTop: '0.5rem', color: styles.textError }}>{tournamentResult.error}</div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Ticket Management Section */}
      {activeSection === 'tickets' && (
        <TicketManagement
          isAdminWalletConnected={isAdminWalletConnected}
          connectedAddress={connectedAddress}
          adminAddress={adminAddress}
          styles={styles}
          title="Tournament Ticket Management"
        />
                  )}

      {/* Old Contract Query Section (kept for backward compatibility) */}
      {activeSection === 'tickets' && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
          <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>🔍 Query Old Contract Tickets</h2>
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <h3 style={{ marginBottom: '1rem', color: styles.text, fontSize: '1.2rem' }}>🔍 Query Old Contract Tickets</h3>
            <p style={{ marginBottom: '1rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
              Query tickets directly from the old contract to verify if ticket values were stored.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Player Address: *
                </label>
                <input
                  type="text"
                  value={oldQueryPlayerAddress}
                  onChange={(e) => setOldQueryPlayerAddress(e.target.value)}
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Ticket ID (optional, leave empty for all tickets):
                </label>
                <input
                  type="number"
                  value={oldQueryTicketId}
                  onChange={(e) => setOldQueryTicketId(e.target.value)}
                  placeholder="Leave empty for all"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Package ID (optional, uses env var if empty):
                </label>
                <input
                  type="text"
                  value={oldQueryPackageId}
                  onChange={(e) => setOldQueryPackageId(e.target.value)}
                  placeholder="0x... (or leave empty)"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Game Pass System ID (optional, uses env var if empty):
                </label>
                <input
                  type="text"
                  value={oldQuerySystemId}
                  onChange={(e) => setOldQuerySystemId(e.target.value)}
                  placeholder="0x... (or leave empty)"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!oldQueryPlayerAddress.trim()) {
                  alert('Please enter a player address');
                  return;
                }

                setQueryingOldTickets(true);
                setOldTicketQueryResult(null);

                try {
                  const requestBody: any = {
                    playerAddress: oldQueryPlayerAddress.trim(),
                  };
                  
                  if (oldQueryTicketId.trim() && !isNaN(Number(oldQueryTicketId)) && Number(oldQueryTicketId) > 0) {
                    requestBody.ticketId = Number(oldQueryTicketId);
                  }
                  
                  if (oldQueryPackageId.trim()) {
                    requestBody.oldPackageId = oldQueryPackageId.trim();
                  }
                  
                  if (oldQuerySystemId.trim()) {
                    requestBody.oldGamePassSystemId = oldQuerySystemId.trim();
                  }

                  const response = await fetch(getApiUrl('api/admin/legacy/tournaments/query-old-tickets'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                  });

                  const data = await response.json();
                  if (data.success) {
                    setOldTicketQueryResult(data);
                  } else {
                    alert(data.error || 'Failed to query old tickets');
                  }
                } catch (error) {
                  alert(error instanceof Error ? error.message : 'Unknown error');
                } finally {
                  setQueryingOldTickets(false);
                }
              }}
              disabled={queryingOldTickets || !oldQueryPlayerAddress.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: (queryingOldTickets || !oldQueryPlayerAddress.trim()) ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (queryingOldTickets || !oldQueryPlayerAddress.trim()) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              {queryingOldTickets ? 'Querying...' : 'Query Old Contract'}
            </button>

            {oldTicketQueryResult && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <h4 style={{ marginBottom: '0.5rem', color: styles.text }}>Query Results</h4>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  <strong>Package ID:</strong> <CopyableAddress value={oldTicketQueryResult.oldPackageId || ''} styles={styles} /><br />
                  <strong>System ID:</strong> <CopyableAddress value={oldTicketQueryResult.oldGamePassSystemId || ''} styles={styles} /><br />
                  <strong>Ticket ID:</strong> <CopyableAddress value={String(oldTicketQueryResult.ticketId ?? '')} styles={styles} /><br />
                  <strong>Total Results:</strong> {oldTicketQueryResult.results?.length || 0}
                </div>
                
                {oldTicketQueryResult.summary && (
                  <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: styles.bgTertiary, borderRadius: '4px' }}>
                    <strong style={{ color: styles.text }}>Summary:</strong>
                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', color: styles.textSecondary }}>
                      <li>Total Tickets: {oldTicketQueryResult.summary.totalTickets}</li>
                      <li>Tickets with Values &gt; $0: {oldTicketQueryResult.summary.ticketsWithValues}</li>
                      <li>Tickets with $0.00: {oldTicketQueryResult.summary.ticketsWithZeroValues}</li>
                    </ul>
                  </div>
                )}

                {oldTicketQueryResult.results && oldTicketQueryResult.results.length > 0 && (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${styles.border}` }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Method</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Ticket ID</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Value (USD cents)</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', color: styles.text }}>Purchased At</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', color: styles.text }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {oldTicketQueryResult.results.map((result: any, index: number) => (
                          <tr key={index} style={{ borderBottom: `1px solid ${styles.border}` }}>
                            <td style={{ padding: '0.5rem', color: styles.text, fontSize: '0.9rem' }}>
                              {result.method || 'unknown'}
                            </td>
                            <td style={{ padding: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                              {result.ticketId || result.ticketIdValue || 'N/A'}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.textSecondary }}>
                              {result.error ? (
                                <span style={{ color: 'red' }}>Error</span>
                              ) : (
                                `$${(result.valuePaidUsdCents / 100).toFixed(2)}`
                              )}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: styles.textSecondary }}>
                              {result.error ? (
                                <span style={{ color: 'red' }}>N/A</span>
                              ) : result.purchasedAt > 0 ? (
                                new Date(result.purchasedAt).toLocaleString()
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td style={{ padding: '0.5rem', color: result.error ? 'red' : styles.textSecondary, fontSize: '0.85rem' }}>
                              {result.error ? `Error: ${result.error}` : 'Success'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {oldTicketQueryResult.results && oldTicketQueryResult.results.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: styles.textSecondary }}>
                    No tickets found in old contract for this player.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reward Distribution Section */}
      {activeSection === 'rewards' && (
        <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
          <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>🎁 Tournament Reward Distribution</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <TournamentCreationFeeEditor
              styles={styles}
              isAdminWalletConnected={isAdminWalletConnected}
              connectedAddress={connectedAddress}
            />
          </div>

          {/* Distribution settings: grace period + auto distribute */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '6px', border: `1px solid ${styles.border}` }}>
            <h3 style={{ marginBottom: '0.75rem', color: styles.text, fontSize: '1.1rem' }}>⏱️ Grace period</h3>
            <p style={{ marginBottom: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
              Time after tournament end before distribution is allowed and score submission is closed (minutes).
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <input
                type="number"
                min={0}
                max={10080}
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(Number(e.target.value) || 0)}
                disabled={loadingSettings}
                style={{
                  width: '6rem',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: `1px solid ${styles.border}`,
                  backgroundColor: styles.bgSecondary,
                  color: styles.text,
                  fontSize: '1rem',
                }}
              />
              <span style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>minutes</span>
            </div>
            <h3 style={{ marginBottom: '0.5rem', color: styles.text, fontSize: '1.1rem' }}>🤖 Auto distribute</h3>
            <p style={{ marginBottom: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
              When enabled, the platform (Tide) will automatically queue and run reward distribution for ended tournaments after the grace period. Requires platform Tide to be running.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoDistribute}
                  onChange={(e) => setAutoDistribute(e.target.checked)}
                  disabled={loadingSettings}
                  style={{ width: '1.1rem', height: '1.1rem' }}
                />
                <span>Enable auto distribute</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text }}>
                <span style={{ fontSize: '0.9rem' }}>Max retries:</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={maxRetries === '' ? '' : maxRetries}
                  onChange={(e) => setMaxRetries(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="3"
                  disabled={loadingSettings}
                  style={{ width: '4rem', padding: '0.35rem', borderRadius: '4px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgSecondary, color: styles.text }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text }}>
                <span style={{ fontSize: '0.9rem' }}>Max concurrent:</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={maxConcurrentDistributions === '' ? '' : maxConcurrentDistributions}
                  onChange={(e) => setMaxConcurrentDistributions(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="—"
                  disabled={loadingSettings}
                  style={{ width: '4rem', padding: '0.35rem', borderRadius: '4px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgSecondary, color: styles.text }}
                />
              </label>
            </div>

            <h3 style={{ marginBottom: '0.5rem', marginTop: '1rem', color: styles.text, fontSize: '1.1rem' }}>🌐 Tide callback URL</h3>
            <p style={{ marginBottom: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
              Base URL Tide will POST lifecycle/distribution callbacks to for this app (stored in Helm as <code>tide_callback_config</code>).
              In production this should be your deployed game backend URL.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <input
                type="text"
                value={tideCallbackUrl}
                onChange={(e) => setTideCallbackUrl(e.target.value)}
                placeholder={typeof window !== 'undefined' ? window.location.origin : 'https://your-game-backend.com'}
                disabled={loadingSettings}
                style={{
                  minWidth: '18rem',
                  flex: '1 1 18rem',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: `1px solid ${styles.border}`,
                  backgroundColor: styles.bgSecondary,
                  color: styles.text,
                  fontSize: '0.95rem',
                }}
              />
              <button
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined' && window.location?.origin) {
                      setTideCallbackUrl(window.location.origin);
                    }
                  } catch {
                    /* ignore */
                  }
                }}
                disabled={loadingSettings}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${styles.border}`,
                  backgroundColor: loadingSettings ? styles.buttonDisabled : styles.bgSecondary,
                  color: styles.text,
                  cursor: loadingSettings ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
                title="Set Tide callback URL to the current admin page origin."
              >
                Autofill from current origin
              </button>
            </div>
            <h3 style={{ marginBottom: '0.5rem', marginTop: '1rem', color: styles.text, fontSize: '1.1rem' }}>👤 Creator reward (from pool)</h3>
            <p style={{ marginBottom: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
              When enabled, player-created tournaments pay the creator from the prize pool first (boost % until creation fee is covered, then standard %). Set creation fee (USD), boost %, standard %, and token.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={creatorRewardEnabled}
                  onChange={(e) => setCreatorRewardEnabled(e.target.checked)}
                  disabled={loadingSettings}
                  style={{ width: '1.1rem', height: '1.1rem' }}
                />
                <span>Pay creator from pool</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text }}>
                <span style={{ fontSize: '0.9rem' }}>Creation fee ($):</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={creatorRewardCreationFeeUsdCents === '' ? '' : creatorRewardCreationFeeUsdCents / 100}
                  onChange={(e) => {
                    const v = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                    setCreatorRewardCreationFeeUsdCents(v === '' ? '' : Math.round(Number(v) * 100));
                  }}
                  placeholder="5"
                  disabled={loadingSettings}
                  style={{ width: '4rem', padding: '0.35rem', borderRadius: '4px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgSecondary, color: styles.text }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text }}>
                <span style={{ fontSize: '0.9rem' }}>Boost %:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={creatorRewardBoostPct === '' ? '' : creatorRewardBoostPct}
                  onChange={(e) => setCreatorRewardBoostPct(e.target.value === '' ? '' : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                  placeholder="50"
                  disabled={loadingSettings}
                  style={{ width: '4rem', padding: '0.35rem', borderRadius: '4px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgSecondary, color: styles.text }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text }}>
                <span style={{ fontSize: '0.9rem' }}>Standard %:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={creatorRewardStandardPct === '' ? '' : creatorRewardStandardPct}
                  onChange={(e) => setCreatorRewardStandardPct(e.target.value === '' ? '' : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                  placeholder="25"
                  disabled={loadingSettings}
                  style={{ width: '4rem', padding: '0.35rem', borderRadius: '4px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgSecondary, color: styles.text }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: styles.text }}>
                <span style={{ fontSize: '0.9rem' }}>Token:</span>
                <select
                  value={creatorRewardToken}
                  onChange={(e) => setCreatorRewardToken((e.target.value || '') as 'MEWS' | 'SUI' | 'USDC' | '')}
                  disabled={loadingSettings}
                  style={{ padding: '0.35rem', borderRadius: '4px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgSecondary, color: styles.text }}
                >
                  <option value="">—</option>
                  <option value="MEWS">MEWS</option>
                  <option value="SUI">SUI</option>
                  <option value="USDC">USDC</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={saveTournamentSettings}
                disabled={savingSettings || loadingSettings || !isAdminWalletConnected}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: (savingSettings || loadingSettings || !isAdminWalletConnected) ? styles.buttonDisabled : styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (savingSettings || loadingSettings || !isAdminWalletConnected) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }}
              >
                {savingSettings ? 'Saving...' : 'Save'}
              </button>
              {settingsMessage && (
                <span style={{ color: settingsMessage.type === 'success' ? '#4CAF50' : '#f44336', fontSize: '0.9rem' }}>
                  {settingsMessage.text}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadTournaments}
              disabled={loadingTournaments}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loadingTournaments ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingTournaments ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              {loadingTournaments ? 'Loading...' : '🔄 Refresh Tournaments'}
            </button>
            <button
              type="button"
              onClick={loadPlatformDistributionStatus}
              disabled={loadingPlatformStatus || tournamentsList.length === 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: (loadingPlatformStatus || tournamentsList.length === 0) ? styles.buttonDisabled : styles.bgTertiary,
                color: styles.text,
                border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                cursor: (loadingPlatformStatus || tournamentsList.length === 0) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              {loadingPlatformStatus ? 'Loading...' : '📋 Load platform status'}
            </button>
            <span style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
              Showing ended tournaments only | Distribution is triggered by the platform (Tide).
            </span>
          </div>

          {loadingTournaments ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
              Loading tournaments...
            </div>
          ) : tournamentsList.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
              No ended tournaments found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${styles.border}` }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: styles.text }}>Prize Pool</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Ended</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Platform</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Overrides</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentsList.map((tournament) => (
                    <tr key={tournament.tournamentId} style={{ borderBottom: `1px solid ${styles.border}` }}>
                      <td style={{ padding: '0.75rem', color: styles.text, fontWeight: 'bold' }}>
                        #{tournament.tournamentId}
                      </td>
                      <td style={{ padding: '0.75rem', color: styles.text }}>{tournament.name}</td>
                      <td style={{ padding: '0.75rem', color: styles.textSecondary, textTransform: 'capitalize' }}>
                        {tournament.category}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: styles.text, fontWeight: 'bold' }}>
                        ${(tournament.prizePoolUsdCents / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: styles.textSecondary, fontSize: '0.9rem' }}>
                        {new Date(tournament.endTime).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {tournament.distributionStatus === 1 ? (
                          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✅ Distributed</span>
                        ) : tournament.distributionStatus === 2 ? (
                          <span style={{ color: '#9E9E9E', fontWeight: 'bold' }}>👥 No Participants</span>
                        ) : tournament.distributionStatus === 3 ? (
                          <span style={{ color: '#9E9E9E', fontWeight: 'bold' }}>🎁 No Rewards</span>
                        ) : (
                          <span style={{ color: '#FF9800', fontWeight: 'bold' }}>⏳ Pending</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        {platformStatusMap[tournament.tournamentId] ? (
                          <span title={platformStatusMap[tournament.tournamentId].lastError ?? ''}>
                            {platformStatusMap[tournament.tournamentId].state === 'COMPLETED' && '✅ Completed'}
                            {platformStatusMap[tournament.tournamentId].state === 'EXECUTING' && '🔄 Executing'}
                            {platformStatusMap[tournament.tournamentId].state === 'SCHEDULED' && '📋 Scheduled'}
                            {platformStatusMap[tournament.tournamentId].state === 'FAILED' && (
                              <>❌ Failed{platformStatusMap[tournament.tournamentId].retryCount != null ? ` (${platformStatusMap[tournament.tournamentId].retryCount})` : ''}</>
                            )}
                            {platformStatusMap[tournament.tournamentId].state === 'PENDING' && '⏳ Pending'}
                          </span>
                        ) : (
                          <span style={{ color: styles.textSecondary }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openOverrideModal(tournament.tournamentId)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: styles.bgTertiary,
                            color: styles.text,
                            border: `1px solid ${styles.border}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Edit
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => distributeRewards(tournament.tournamentId)}
                            disabled={tournament.distributionStatus > 0 || distributingRewards === tournament.tournamentId}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: (tournament.distributionStatus > 0 || distributingRewards === tournament.tournamentId) 
                                ? styles.buttonDisabled 
                                : styles.buttonPrimary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: (tournament.distributionStatus > 0 || distributingRewards === tournament.tournamentId) 
                                ? 'not-allowed' 
                                : 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                            }}
                          >
                            {distributingRewards === tournament.tournamentId 
                              ? 'Distributing...' 
                              : tournament.distributionStatus > 0
                              ? 'Already Processed' 
                              : 'Distribute Rewards'}
                          </button>
                          {tournament.distributionStatus === 0 && (platformStatusMap[tournament.tournamentId]?.state === 'FAILED' || platformStatusMap[tournament.tournamentId]?.state === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => retryDistributionForTournament(tournament.tournamentId)}
                              disabled={retryingTournamentId === tournament.tournamentId || !isAdminWalletConnected}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: (retryingTournamentId === tournament.tournamentId || !isAdminWalletConnected) ? styles.buttonDisabled : '#FF9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (retryingTournamentId === tournament.tournamentId || !isAdminWalletConnected) ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                              }}
                            >
                              {retryingTournamentId === tournament.tournamentId ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-tournament overrides modal */}
          {overrideEditTournamentId != null && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => !loadingOverrides && !savingOverrides && setOverrideEditTournamentId(null)}
            >
              <div
                style={{
                  backgroundColor: styles.bgSecondary,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '8px',
                  padding: '1.5rem',
                  minWidth: '320px',
                  maxWidth: '90vw',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginBottom: '1rem', color: styles.text }}>Distribution overrides — Tournament #{overrideEditTournamentId}</h3>
                {loadingOverrides ? (
                  <p style={{ color: styles.textSecondary }}>Loading...</p>
                ) : (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: styles.text, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={overrideForm.override_auto_distribute}
                        onChange={(e) => setOverrideForm((f) => ({ ...f, override_auto_distribute: e.target.checked }))}
                        style={{ width: '1.1rem', height: '1.1rem' }}
                      />
                      <span>Disable auto-distribute for this tournament</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: styles.text }}>
                      <span style={{ fontSize: '0.9rem', minWidth: '140px' }}>Override grace period (min):</span>
                      <input
                        type="number"
                        min={0}
                        max={10080}
                        value={overrideForm.override_grace_period_minutes === '' ? '' : overrideForm.override_grace_period_minutes}
                        onChange={(e) =>
                          setOverrideForm((f) => ({
                            ...f,
                            override_grace_period_minutes: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        placeholder="App default"
                        style={{ width: '6rem', padding: '0.35rem', borderRadius: '4px', border: `1px solid ${styles.border}`, backgroundColor: styles.bgTertiary, color: styles.text }}
                      />
                      <span style={{ fontSize: '0.85rem', color: styles.textSecondary }}>Leave empty for app default</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setOverrideEditTournamentId(null)}
                        disabled={savingOverrides}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: styles.bgTertiary,
                          color: styles.text,
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                          cursor: savingOverrides ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveOverrideForTournament}
                        disabled={savingOverrides || !isAdminWalletConnected}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: (savingOverrides || !isAdminWalletConnected) ? styles.buttonDisabled : styles.buttonPrimary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (savingOverrides || !isAdminWalletConnected) ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {savingOverrides ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Individual Distribution Result */}
          {distributionResult && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              backgroundColor: distributionResult.success ? '#4CAF5020' : '#F4433620', 
              borderRadius: '4px', 
              border: `1px solid ${distributionResult.success ? '#4CAF50' : '#F44336'}` 
            }}>
              <h4 style={{ marginBottom: '0.5rem', color: styles.text }}>
                {distributionResult.success ? '✅ Rewards Distributed Successfully' : '❌ Distribution Failed'}
              </h4>
              {distributionResult.success && distributionResult.distributions && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: styles.text }}>Distributed to {distributionResult.distributions.length} players:</strong>
                  <div style={{ marginTop: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {distributionResult.distributions.map((dist, index) => (
                      <div key={index} style={{ 
                        padding: '0.5rem', 
                        marginBottom: '0.5rem', 
                        backgroundColor: styles.bgTertiary, 
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}>
                        <strong style={{ color: styles.text }}>Rank #{dist.rank}:</strong> {dist.playerName || dist.playerAddress}
                        <br />
                        <span style={{ color: styles.textSecondary }}>
                          Items: {dist.items.map((item: any) => `${item.quantity}x ${item.itemId} (L${item.level})`).join(', ')}
                        </span>
                        <br />
                        <span style={{ color: styles.textSecondary }}>
                          Value: ${(dist.rewardValueUsdCents / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {distributionResult.digest && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: styles.textSecondary }}>
                  <strong>Transaction Digest:</strong> {distributionResult.digest}
                </div>
              )}
              {distributionResult.error && (
                <div style={{ marginTop: '0.5rem', color: '#F44336', fontSize: '0.9rem' }}>
                  <strong>Error:</strong> {distributionResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tournament Event Management Section */}
      {activeSection === 'manage' && (
        <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
          <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>📋 Tournament Event Management</h2>
          
          {/* Contract Selection */}
          <ContractSelectionUI
            styles={styles}
            contractSelection={contractSelection}
            setContractSelection={setContractSelection}
            envVarName="OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET"
          />

          {/* Filter and Refresh Controls */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => loadAllTournaments()}
              disabled={loadingAllTournaments}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loadingAllTournaments ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingAllTournaments ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              {loadingAllTournaments ? 'Loading...' : '🔄 Refresh'}
            </button>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: styles.text, fontWeight: 'bold' }}>Filter:</span>
              {([
                { id: 'all', label: 'All' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'active', label: 'Active' },
                { id: 'pending_distribution', label: 'Pending distribution' },
                { id: 'ended', label: 'Ended' },
              ] as const).map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setTournamentFilter(filter.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: tournamentFilter === filter.id ? styles.buttonPrimary : styles.bgTertiary,
                    color: tournamentFilter === filter.id ? 'white' : styles.text,
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tournament List */}
          {loadingAllTournaments ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
              Loading tournaments...
            </div>
          ) : allTournaments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
              No tournaments found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${styles.border}` }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Schedule</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', color: styles.text }}>Prize Pool</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Participants</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Distribution</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Pool vault</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allTournaments
                    .filter(matchesTournamentFilter)
                    .map((tournament) => (
                    <tr id={tournament.objectId ? `tournament-row-${tournament.objectId}` : undefined} key={tournament.tournamentId} style={{ borderBottom: `1px solid ${styles.border}` }}>
                      <td style={{ padding: '0.75rem', color: styles.text, fontWeight: 'bold' }}>
                        #{tournament.tournamentId}
                        {tournament.isOldContract && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#FF9800', fontWeight: 'normal' }}>
                            (Old)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', color: styles.text }}>
                        {tournament.name}
                        {tournament.isOldContract && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: styles.textSecondary, fontStyle: 'italic' }}>
                            (Limited details - use migration tab for full info)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', color: styles.textSecondary, textTransform: 'capitalize' }}>
                        {tournament.isOldContract ? 'N/A' : tournament.category}
                      </td>
                      <td style={{ padding: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                        {tournament.isOldContract ? (
                          <span style={{ fontStyle: 'italic', color: styles.textSecondary }}>N/A</span>
                        ) : (
                          <>
                            <div>{new Date(tournament.startTime).toLocaleDateString()}</div>
                            <div style={{ fontSize: '0.85rem', color: styles.textSecondary }}>
                              {new Date(tournament.startTime).toLocaleTimeString()} - {new Date(tournament.endTime).toLocaleTimeString()}
                            </div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: styles.text, fontWeight: 'bold' }}>
                        {tournament.isOldContract ? (
                          <span style={{ fontStyle: 'italic', color: styles.textSecondary }}>N/A</span>
                        ) : (
                          <>
                            ${(tournament.prizePoolUsdCents / 100).toFixed(2)}
                            {tournament.rewardToken && (
                              <div style={{ fontSize: '0.85rem', color: styles.textSecondary, fontWeight: 'normal' }}>
                                ({tournament.rewardToken})
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>
                        {tournament.isOldContract ? (
                          <span style={{ fontStyle: 'italic', color: styles.textSecondary }}>N/A</span>
                        ) : (
                          tournament.participants
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {tournament.status === 'upcoming' && (
                          <span style={{ color: '#2196F3', fontWeight: 'bold' }}>⏰ Upcoming</span>
                        )}
                        {tournament.status === 'active' && (
                          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>🟢 Active</span>
                        )}
                        {tournament.status === 'ended' && (
                          <span style={{ color: tournament.distributionStatus === 1 ? '#4CAF50' : tournament.distributionStatus > 0 ? '#9E9E9E' : '#FF9800', fontWeight: 'bold' }}>
                            {tournament.distributionStatus === 1 ? '✅ Distributed' : 
                             tournament.distributionStatus === 2 ? '👥 No Participants' :
                             tournament.distributionStatus === 3 ? '🎁 No Rewards' : '⏳ Pending'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        {tournament.isOldContract ? (
                          <span style={{ color: styles.textSecondary }}>—</span>
                        ) : (
                          (() => {
                            const state = getPlatformDistributionState(tournament.tournamentId, tournament.distributionStatus);
                            const title = platformStatusMap[tournament.tournamentId]?.lastError ?? '';
                            return (
                              <span title={title}>
                                {state === 'COMPLETED' && '✅ Completed'}
                                {state === 'EXECUTING' && '🔄 Executing'}
                                {state === 'SCHEDULED' && '📋 Scheduled'}
                                {state === 'FAILED' && (
                                  <>❌ Failed{platformStatusMap[tournament.tournamentId]?.retryCount != null ? ` (${platformStatusMap[tournament.tournamentId].retryCount})` : ''}</>
                                )}
                                {state === 'PENDING' && '⏳ Pending'}
                              </span>
                            );
                          })()
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: styles.textSecondary }}>
                        {tournament.isOldContract ? (
                          '—'
                        ) : tournament.poolVaultId ? (
                          <CopyableAddress value={tournament.poolVaultId} styles={styles} compact />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {tournament.isOldContract ? (
                            <span style={{ fontSize: '0.85rem', color: styles.textSecondary, fontStyle: 'italic' }}>
                              Use Migration tab for details
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                loadTournamentDetails(tournament.objectId);
                                loadTournamentLeaderboard(tournament.objectId);
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: styles.buttonPrimary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                              }}
                            >
                              View Details
                            </button>
                          )}
                          {tournament.status === 'upcoming' && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditTournament(tournament)}
                                disabled={editingTournament === tournament.tournamentId || deletingTournament === tournament.tournamentId}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: (editingTournament === tournament.tournamentId || deletingTournament === tournament.tournamentId)
                                    ? styles.buttonDisabled
                                    : '#2196F3',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: (editingTournament === tournament.tournamentId || deletingTournament === tournament.tournamentId) ? 'not-allowed' : 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.9rem',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTournament(tournament.tournamentId, tournament.objectId)}
                                disabled={editingTournament === tournament.tournamentId || deletingTournament === tournament.tournamentId}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: (editingTournament === tournament.tournamentId || deletingTournament === tournament.tournamentId)
                                    ? styles.buttonDisabled
                                    : '#f44336',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: (editingTournament === tournament.tournamentId || deletingTournament === tournament.tournamentId) ? 'not-allowed' : 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.9rem',
                                }}
                              >
                                {deletingTournament === tournament.tournamentId ? 'Deleting...' : 'Delete'}
                              </button>
                            </>
                          )}
                          {tournament.status === 'ended' && tournament.distributionStatus === 0 && (
                            <button
                              type="button"
                              onClick={() => distributeRewards(tournament.tournamentId)}
                              disabled={distributingRewards === tournament.tournamentId}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: distributingRewards === tournament.tournamentId 
                                  ? styles.buttonDisabled 
                                  : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: distributingRewards === tournament.tournamentId ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                              }}
                            >
                              {distributingRewards === tournament.tournamentId ? 'Distributing...' : 'Distribute'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit Tournament Modal */}
          {editingTournament !== null && (() => {
            const tournament = allTournaments.find(t => t.tournamentId === editingTournament);
            if (!tournament) return null;
            
            return (
              <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                backgroundColor: styles.bgTertiary, 
                borderRadius: '8px', 
                border: `1px solid ${styles.border}` 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: styles.text, fontSize: '1.25rem' }}>Edit Tournament #{tournament.tournamentId}</h3>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: styles.bgSecondary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                      Tournament Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                      Category
                    </label>
                    <select
                      value={editFormData.category || tournament.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                      }}
                    >
                      <option value="highestScore">Highest Score</option>
                      <option value="totalCoins">Total Coins</option>
                      <option value="longestStreak">Longest Streak</option>
                      <option value="longestDistance">Longest Distance</option>
                      <option value="mostBosses">Most Bosses</option>
                      <option value="mostEnemies">Most Enemies</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editFormData.startDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        colorScheme: styles.colorScheme,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={editFormData.startTime || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        colorScheme: styles.colorScheme,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editFormData.endDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        colorScheme: styles.colorScheme,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                      End Time
                    </label>
                    <input
                      type="time"
                      value={editFormData.endTime || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        colorScheme: styles.colorScheme,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
                      Entry Fee (Tickets)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.entryFeeTickets || 1}
                      onChange={(e) => setEditFormData({ ...editFormData, entryFeeTickets: parseInt(e.target.value) || 1 })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.bgSecondary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEditTournament(tournament.tournamentId, tournament.objectId)}
                    disabled={editingTournament === tournament.tournamentId}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: editingTournament === tournament.tournamentId
                        ? styles.buttonDisabled
                        : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: editingTournament === tournament.tournamentId ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {editingTournament === tournament.tournamentId ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Tournament Details Modal */}
          {selectedTournament && tournamentDetails && (
            <div style={{ 
              marginTop: '2rem', 
              padding: '1.5rem', 
              backgroundColor: styles.bgTertiary, 
              borderRadius: '8px', 
              border: `1px solid ${styles.border}` 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: styles.text, fontSize: '1.25rem' }}>Tournament Details</h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTournament(null);
                    setTournamentDetails(null);
                    setTournamentLeaderboard([]);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: styles.bgSecondary,
                    color: styles.text,
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>

              {/* Tournament Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <strong style={{ color: styles.textSecondary }}>Tournament ID:</strong>
                  <div style={{ color: styles.text }}>#{tournamentDetails.tournamentId}</div>
                </div>
                {selectedTournament && (
                  <div>
                    <strong style={{ color: styles.textSecondary }}>Event Object ID:</strong>
                    <div style={{ color: styles.text }}>
                      <CopyableAddress value={selectedTournament} styles={styles} />
                    </div>
                  </div>
                )}
                <div>
                  <strong style={{ color: styles.textSecondary }}>Name:</strong>
                  <div style={{ color: styles.text }}>{tournamentDetails.name}</div>
                </div>
                <div>
                  <strong style={{ color: styles.textSecondary }}>Category:</strong>
                  <div style={{ color: styles.text, textTransform: 'capitalize' }}>{tournamentDetails.category}</div>
                </div>
                <div>
                  <strong style={{ color: styles.textSecondary }}>Status:</strong>
                  <div style={{ color: styles.text }}>
                    {tournamentDetails.status === 'upcoming' && '⏰ Upcoming'}
                    {tournamentDetails.status === 'active' && '🟢 Active'}
                    {tournamentDetails.status === 'ended' && '✅ Ended'}
                  </div>
                </div>
                <div>
                  <strong style={{ color: styles.textSecondary }}>Start Time:</strong>
                  <div style={{ color: styles.text }}>{new Date(tournamentDetails.startTime).toLocaleString()}</div>
                </div>
                <div>
                  <strong style={{ color: styles.textSecondary }}>End Time:</strong>
                  <div style={{ color: styles.text }}>{new Date(tournamentDetails.endTime).toLocaleString()}</div>
                </div>
                <div>
                  <strong style={{ color: styles.textSecondary }}>Participants:</strong>
                  <div style={{ color: styles.text }}>{tournamentDetails.participants || 0}</div>
                </div>
                <div>
                  <strong style={{ color: styles.textSecondary }}>Prize Pool:</strong>
                  <div style={{ color: styles.text, fontWeight: 'bold' }}>
                    ${((tournamentDetails.prizePoolUSDCents || 0) / 100).toFixed(2)}
                    {tournamentDetails.rewardToken && ` (${tournamentDetails.rewardToken})`}
                  </div>
                </div>
                {tournamentDetails.createdBy && (
                  <div>
                    <strong style={{ color: styles.textSecondary }}>Created By:</strong>
                    <div style={{ color: styles.text, fontSize: '0.9rem' }}>
                      <CopyableAddress value={tournamentDetails.createdBy} styles={styles} />
                    </div>
                  </div>
                )}
                {tournamentDetails.startingAnteUSDCents && tournamentDetails.startingAnteUSDCents > 0 && (
                  <div>
                    <strong style={{ color: styles.textSecondary }}>Starting Ante:</strong>
                    <div style={{ color: styles.text }}>
                      ${(tournamentDetails.startingAnteUSDCents / 100).toFixed(2)}
                    </div>
                  </div>
                )}
                {tournamentDetails.poolVaultId && (
                  <div>
                    <strong style={{ color: styles.textSecondary }}>Pool vault:</strong>
                    <div style={{ color: styles.text, fontSize: '0.9rem' }}>
                      <CopyableAddress value={tournamentDetails.poolVaultId} styles={styles} />
                      {tournamentDetails.poolVaultBalanceRaw != null && (
                        <div style={{ marginTop: '0.25rem', color: styles.textSecondary }}>
                          {tournamentDetails.rewardToken === 'SUI'
                            ? `(${(Number(tournamentDetails.poolVaultBalanceRaw) / 1e9).toFixed(4)} SUI)`
                            : tournamentDetails.rewardToken
                              ? `(${Number(tournamentDetails.poolVaultBalanceRaw).toLocaleString()} raw ${tournamentDetails.rewardToken})`
                              : `(${Number(tournamentDetails.poolVaultBalanceRaw).toLocaleString()} raw)`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <strong style={{ color: styles.textSecondary }}>Distribution Status:</strong>
                  <div style={{ color: styles.text }}>
                    {tournamentDetails.distributionStatus === 1 ? '✅ Distributed' :
                     tournamentDetails.distributionStatus === 2 ? '👥 No Participants' :
                     tournamentDetails.distributionStatus === 3 ? '🎁 No Rewards' :
                     '⏳ Pending'}
                  </div>
                </div>
              </div>

              {/* Reward Items Section */}
              {tournamentDetails.rewardConfig && tournamentDetails.rewardConfig.itemRewards && Object.keys(tournamentDetails.rewardConfig.itemRewards).length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                  <h4 style={{ color: styles.text, marginBottom: '1rem' }}>🎁 Custom Reward Items</h4>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.entries(tournamentDetails.rewardConfig.itemRewards)
                      .sort(([rankA], [rankB]) => Number(rankA) - Number(rankB))
                      .map(([rank, items]: [string, any]) => (
                        <div key={rank} style={{ padding: '0.75rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                          <div style={{ fontWeight: 'bold', color: styles.text, marginBottom: '0.5rem' }}>
                            Rank #{rank} Rewards:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {Array.isArray(items) ? items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '0.5rem',
                                  backgroundColor: styles.bgPrimary,
                                  borderRadius: '4px',
                                  border: `1px solid ${styles.border}`,
                                  fontSize: '0.9rem',
                                }}
                              >
                                <span style={{ color: styles.text, fontWeight: 'bold' }}>
                                  {item.itemId || 'Unknown'}
                                </span>
                                {item.level && (
                                  <span style={{ color: styles.textSecondary, marginLeft: '0.25rem' }}>
                                    Lv{item.level}
                                  </span>
                                )}
                                {item.quantity > 1 && (
                                  <span style={{ color: styles.textSecondary, marginLeft: '0.25rem' }}>
                                    ×{item.quantity}
                                  </span>
                                )}
                              </div>
                            )) : (
                              <div style={{ color: styles.textSecondary }}>No items configured</div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {tournamentDetails.rewardConfig.rewardDepth && (
                    <div style={{ marginTop: '1rem', padding: '0.5rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                      Reward Depth: {tournamentDetails.rewardConfig.rewardDepth} players
                      {tournamentDetails.rewardConfig.poolDepth && (
                        <> | Pool Depth: {tournamentDetails.rewardConfig.poolDepth} players</>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard */}
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: styles.text, marginBottom: '1rem' }}>Leaderboard</h4>
                {loadingLeaderboard ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: styles.textSecondary }}>
                    Loading leaderboard...
                  </div>
                ) : tournamentLeaderboard.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: styles.textSecondary }}>
                    No leaderboard data available yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${styles.border}`, position: 'sticky', top: 0, backgroundColor: styles.bgTertiary }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Rank</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: styles.text }}>Player</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: styles.text }}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournamentLeaderboard.map((entry) => (
                          <tr key={entry.rank} style={{ borderBottom: `1px solid ${styles.border}` }}>
                            <td style={{ padding: '0.75rem', color: styles.text, fontWeight: 'bold' }}>
                              #{entry.rank}
                            </td>
                            <td style={{ padding: '0.75rem', color: styles.text }}>
                              {entry.playerName || (
                                <CopyableAddress value={entry.playerAddress} styles={styles} compact />
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: styles.text, fontWeight: 'bold' }}>
                              {entry.displayValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Default Sustain Config (Sustain Rain) Section */}
      {activeSection === 'defaultRewards' && (
        <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
          <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>⚙️ Default Sustain Config (Sustain Rain)</h2>
          <p style={{ color: styles.textSecondary, marginBottom: '1.5rem' }}>
            Configure the default sustain (reward) structure that will be used when users create tournaments without custom rewards.
            Values are read from the platform (on-chain). Initialize pushes code defaults on-chain.
          </p>

          {!loadingDefaultRewards && defaultRewardsFromChain === false && (
            <p style={{ padding: '0.75rem 1rem', background: '#3d2c1a', border: '1px solid #8b6914', borderRadius: '4px', color: '#e6c84a', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Not initialized on-chain. Click Initialize (defaults) above to push code defaults to the platform.
            </p>
          )}

          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleInitializeDefaultRewards}
              disabled={initDefaultRewardsLoading || !connectedAddress}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: initDefaultRewardsLoading || !connectedAddress ? styles.buttonDisabled : '#2E7D32',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: initDefaultRewardsLoading || !connectedAddress ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {initDefaultRewardsLoading ? 'Initializing...' : 'Initialize (defaults)'}
            </button>
            <button
              type="button"
              onClick={handleSaveDefaultRewards}
              disabled={saveDefaultRewardsLoading || !connectedAddress || !defaultRewardConfig}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: saveDefaultRewardsLoading || !connectedAddress || !defaultRewardConfig ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saveDefaultRewardsLoading || !connectedAddress || !defaultRewardConfig ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {saveDefaultRewardsLoading ? 'Saving...' : 'Save to Chain'}
            </button>
            {initDefaultRewardsResult && (
              <span style={{
                padding: '0.5rem 0.75rem',
                background: initDefaultRewardsResult.success ? styles.bgSuccess : styles.bgError,
                color: initDefaultRewardsResult.success ? styles.textSuccess : styles.textError,
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}>
                {initDefaultRewardsResult.success ? `✅ ${initDefaultRewardsResult.message}` : `❌ ${initDefaultRewardsResult.error}`}
              </span>
            )}
            {saveDefaultRewardsResult && (
              <span style={{
                padding: '0.5rem 0.75rem',
                background: saveDefaultRewardsResult.success ? styles.bgSuccess : styles.bgError,
                color: saveDefaultRewardsResult.success ? styles.textSuccess : styles.textError,
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}>
                {saveDefaultRewardsResult.success ? `✅ ${saveDefaultRewardsResult.message}` : `❌ ${saveDefaultRewardsResult.error}`}
              </span>
            )}
          </div>

          {loadingDefaultRewards ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
              Loading default sustain config...
            </div>
          ) : defaultRewardConfig ? (
            <DefaultRewardsConfigEditor
              config={defaultRewardConfig}
              onConfigChange={setDefaultRewardConfig}
              styles={styles}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
              No default rewards on-chain. Click Initialize (defaults) above to push code defaults to the platform.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Default Rewards Configuration Editor Component
function DefaultRewardsConfigEditor({
  config,
  onConfigChange,
  styles,
}: {
  config: {
    rewardDepth: number;
    poolDepth: number;
    poolDistribution: number[];
    poolSource: number;
    itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
  } | null;
  onConfigChange: (config: any) => void;
  styles: AdminStyles;
}) {
  // Normalize so poolDistribution and other fields are always defined (avoids .reduce on undefined)
  const currentConfig = normalizeDefaultRewardConfig(config ?? null);

  const availableItems = [
    { id: 'random', name: 'Random Level 1 Item', levels: [1] }, // Resolved at distribution time
    { id: 'orb_level', name: 'Orb Level', levels: [1, 2, 3] },
    { id: 'force_field', name: 'Force Field', levels: [1, 2, 3] },
    { id: 'extra_lives', name: 'Extra Lives', levels: [1, 2, 3] },
    { id: 'slow_time', name: 'Slow Time', levels: [1, 2, 3] },
    { id: 'coin_tractor_beam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
    { id: 'destroy_all', name: 'Destroy All Enemies', levels: [] },
    { id: 'boss_kill_shot', name: 'Boss Kill Shot', levels: [] },
  ];

  const getAvailableItem = (itemId: string) => {
    return availableItems.find((item) => item.id === toDynamicProvisionKey(itemId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Reward Depth */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
          Reward Depth (how many players get items)
        </label>
        <input
          type="number"
          min="1"
          max="255"
          value={currentConfig.rewardDepth}
          onChange={(e) => {
            const newDepth = parseInt(e.target.value) || 10;
            const newConfig = { ...currentConfig, rewardDepth: newDepth };
            // Adjust itemRewards to match new depth
            const newItemRewards = { ...currentConfig.itemRewards };
            if (newDepth > currentConfig.rewardDepth) {
              // Add new ranks with random item (resolved at distribution time)
              for (let rank = currentConfig.rewardDepth + 1; rank <= newDepth; rank++) {
                newItemRewards[rank] = [{ itemId: 'random', level: 1, quantity: 1 }];
              }
            } else if (newDepth < currentConfig.rewardDepth) {
              // Remove excess ranks
              for (let rank = newDepth + 1; rank <= currentConfig.rewardDepth; rank++) {
                delete newItemRewards[rank];
              }
            }
            newConfig.itemRewards = newItemRewards;
            onConfigChange(newConfig);
          }}
          style={{
            width: '100%',
            maxWidth: '200px',
            padding: '0.5rem',
            backgroundColor: styles.bgTertiary,
            color: styles.text,
            border: `1px solid ${styles.border}`,
            borderRadius: '4px',
          }}
        />
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              const nextDepth = Math.min(255, currentConfig.rewardDepth + 1);
              if (nextDepth === currentConfig.rewardDepth) return;
              const newItemRewards = { ...currentConfig.itemRewards };
              if (!newItemRewards[nextDepth]) {
                newItemRewards[nextDepth] = [{ itemId: 'random', level: 1, quantity: 1 }];
              }
              onConfigChange({
                ...currentConfig,
                rewardDepth: nextDepth,
                itemRewards: newItemRewards,
              });
            }}
            disabled={currentConfig.rewardDepth >= 255}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: currentConfig.rewardDepth >= 255 ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentConfig.rewardDepth >= 255 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
            }}
          >
            + Add Rank
          </button>
          <button
            type="button"
            onClick={() => {
              const nextDepth = Math.max(1, currentConfig.rewardDepth - 1);
              if (nextDepth === currentConfig.rewardDepth) return;
              const newItemRewards = { ...currentConfig.itemRewards };
              delete newItemRewards[currentConfig.rewardDepth];
              onConfigChange({
                ...currentConfig,
                rewardDepth: nextDepth,
                itemRewards: newItemRewards,
              });
            }}
            disabled={currentConfig.rewardDepth <= 1}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: currentConfig.rewardDepth <= 1 ? styles.buttonDisabled : '#f57c00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentConfig.rewardDepth <= 1 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
            }}
          >
            - Remove Last Rank
          </button>
        </div>
      </div>

      {/* Pool Depth */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
          Pool Depth (how many players get MEWS tokens)
        </label>
        <input
          type="number"
          min="1"
          max="255"
          value={currentConfig.poolDepth}
          onChange={(e) => {
            const newDepth = parseInt(e.target.value) || 3;
            const newConfig = { ...currentConfig, poolDepth: newDepth };
            // Adjust pool distribution
            if (newDepth > currentConfig.poolDepth) {
              // Add default percentages
              const defaultPct = Math.floor(100 / newDepth);
              const remainder = 100 - (defaultPct * newDepth);
              const newDistribution = Array.from({ length: newDepth }, (_, i) => 
                i === 0 ? defaultPct + remainder : defaultPct
              );
              newConfig.poolDistribution = newDistribution;
            } else if (newDepth < currentConfig.poolDepth) {
              // Remove excess
              const pd = currentConfig.poolDistribution ?? [];
              newConfig.poolDistribution = pd.slice(0, newDepth);
              // Re-normalize to 100%
              const sum = (newConfig.poolDistribution ?? []).reduce((a, b) => a + b, 0);
              if (sum > 0) {
                newConfig.poolDistribution = newConfig.poolDistribution!.map(p => 
                  Math.round((p / sum) * 100)
                );
              }
            }
            onConfigChange(newConfig);
          }}
          style={{
            width: '100%',
            maxWidth: '200px',
            padding: '0.5rem',
            backgroundColor: styles.bgTertiary,
            color: styles.text,
            border: `1px solid ${styles.border}`,
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Pool Distribution */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
          Pool Distribution (%)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(currentConfig.poolDistribution ?? []).map((pct, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.85rem', color: styles.textSecondary }}>Rank {idx + 1}</label>
              <input
                type="number"
                min="0"
                max="100"
                value={pct}
                onChange={(e) => {
                  const newPct = parseInt(e.target.value) || 0;
                  const newDistribution = [...currentConfig.poolDistribution];
                  newDistribution[idx] = newPct;
                  // Re-normalize to 100%
                  const sum = newDistribution.reduce((a, b) => a + b, 0);
                  if (sum > 0) {
                    const normalized = newDistribution.map(p => Math.round((p / sum) * 100));
                    const normalizedSum = normalized.reduce((a, b) => a + b, 0);
                    const diff = 100 - normalizedSum;
                    if (diff !== 0) {
                      normalized[0] += diff; // Adjust first rank to make it exactly 100
                    }
                    onConfigChange({ ...currentConfig, poolDistribution: normalized });
                  }
                }}
                style={{
                  width: '80px',
                  padding: '0.5rem',
                  backgroundColor: styles.bgTertiary,
                  color: styles.text,
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                }}
              />
            </div>
          ))}
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: styles.textSecondary }}>
          Sum: {(currentConfig.poolDistribution ?? []).reduce((a, b) => a + b, 0)}% (must equal 100%)
        </p>
      </div>

      {/* Item Rewards */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: styles.text, fontWeight: 'bold' }}>
          Item Rewards (per rank)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
          {Array.from({ length: currentConfig.rewardDepth }, (_, i) => i + 1).map((rank) => (
            <div key={rank} style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
              <h5 style={{ marginTop: 0, marginBottom: '0.75rem', color: styles.text }}>Rank {rank} Rewards</h5>
              <div style={{ marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const newItemRewards = { ...currentConfig.itemRewards };
                    delete newItemRewards[rank];
                    onConfigChange({ ...currentConfig, itemRewards: newItemRewards });
                  }}
                  style={{
                    padding: '0.35rem 0.7rem',
                    backgroundColor: '#6d4c41',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Clear Rank {rank}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(currentConfig.itemRewards[rank] || []).map((item, itemIdx) => (
                  <div key={itemIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={toDynamicProvisionKey(item.itemId)}
                      onChange={(e) => {
                        const newItemId = e.target.value;
                        const newItemRewards = { ...currentConfig.itemRewards };
                        newItemRewards[rank] = [...(newItemRewards[rank] || [])];
                        const draft = {
                          ...item,
                          itemId: newItemId,
                          level: isLeveledProvisionItem(newItemId) || newItemId === 'random'
                            ? (item.level ?? 1)
                            : undefined,
                        };
                        newItemRewards[rank][itemIdx] = serializeAdminInventoryItem(draft);
                        onConfigChange({ ...currentConfig, itemRewards: newItemRewards });
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                      }}
                    >
                      {availableItems.map((availItem) => (
                        <option key={availItem.id} value={availItem.id}>
                          {availItem.name}
                        </option>
                      ))}
                    </select>
                    {(getAvailableItem(item.itemId)?.levels?.length ?? 0) > 0 && (
                      <select
                        value={item.level ?? 1}
                        onChange={(e) => {
                          const newItemRewards = { ...currentConfig.itemRewards };
                          newItemRewards[rank] = [...(newItemRewards[rank] || [])];
                          newItemRewards[rank][itemIdx] = {
                            ...item,
                            level: parseInt(e.target.value, 10) || 1,
                          };
                          onConfigChange({ ...currentConfig, itemRewards: newItemRewards });
                        }}
                        style={{
                          width: '100px',
                          padding: '0.5rem',
                          backgroundColor: styles.bgSecondary,
                          color: styles.text,
                          border: `1px solid ${styles.border}`,
                          borderRadius: '4px',
                        }}
                      >
                        {(getAvailableItem(item.itemId)?.levels ?? []).map((level) => (
                          <option key={level} value={level}>Level {level}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItemRewards = { ...currentConfig.itemRewards };
                        newItemRewards[rank] = [...(newItemRewards[rank] || [])];
                        newItemRewards[rank][itemIdx] = { ...item, quantity: parseInt(e.target.value) || 1 };
                        onConfigChange({ ...currentConfig, itemRewards: newItemRewards });
                      }}
                      style={{
                        width: '80px',
                        padding: '0.5rem',
                        backgroundColor: styles.bgSecondary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newItemRewards = { ...currentConfig.itemRewards };
                        newItemRewards[rank] = (newItemRewards[rank] || []).filter((_, idx) => idx !== itemIdx);
                        if (newItemRewards[rank].length === 0) {
                          delete newItemRewards[rank];
                        }
                        onConfigChange({ ...currentConfig, itemRewards: newItemRewards });
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newItemRewards = { ...currentConfig.itemRewards };
                    if (!newItemRewards[rank]) {
                      newItemRewards[rank] = [];
                    }
                    newItemRewards[rank].push({ itemId: 'orb_level', level: 1, quantity: 1 });
                    onConfigChange({ ...currentConfig, itemRewards: newItemRewards });
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: styles.buttonPrimary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  + Add Item
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

