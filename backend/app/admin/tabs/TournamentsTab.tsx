// ==========================================
// Admin Page - Tournaments Tab Component
// ==========================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { TournamentWizardStep, AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { TicketManagement } from '../components/TicketManagement';

// Helper function to get system default rewards based on documented structure
// 1st: Destroy All + Boss Kill Shot + Random L1
// 2nd: Boss Kill Shot + Random L1
// 3rd: Destroy All + Random L1
// 4th-10th: Random L1 each
// "random" is resolved at distribution time to a random basic L1 item
function getVariedSystemDefaults() {
  return {
    rewardDepth: 10,
    poolDepth: 3,
    poolDistribution: [50, 30, 20],
    poolSource: 0,
    itemRewards: {
      1: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      2: [
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      3: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      4: [{ itemId: 'random', level: 1, quantity: 1 }],
      5: [{ itemId: 'random', level: 1, quantity: 1 }],
      6: [{ itemId: 'random', level: 1, quantity: 1 }],
      7: [{ itemId: 'random', level: 1, quantity: 1 }],
      8: [{ itemId: 'random', level: 1, quantity: 1 }],
      9: [{ itemId: 'random', level: 1, quantity: 1 }],
      10: [{ itemId: 'random', level: 1, quantity: 1 }],
    } as Record<number, Array<{ itemId: string; level: number; quantity: number }>>,
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
  const [savingDefaultRewards, setSavingDefaultRewards] = useState(false);
  
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
  const [tournamentFilter, setTournamentFilter] = useState<'all' | 'upcoming' | 'active' | 'ended'>('all');
  
  // Rewards management state
  const [tournamentsList, setTournamentsList] = useState<Array<{
    tournamentId: number;
    name: string;
    category: string;
    endTime: number;
    prizePoolUsdCents: number;
    distributionStatus: number;
  }>>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [distributingRewards, setDistributingRewards] = useState<number | null>(null);
  const [distributionResult, setDistributionResult] = useState<{
    tournamentId: number;
    success: boolean;
    distributions?: any[];
    digest?: string;
    error?: string;
  } | null>(null);
  const [autoDistributing, setAutoDistributing] = useState(false);
  const [autoDistributionResult, setAutoDistributionResult] = useState<{
    success: boolean;
    processed?: number;
    successful?: number;
    failed?: number;
    results?: any[];
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

  // Load tournaments for rewards section
  const loadTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const response = await fetch(getApiUrl('api/tournaments'));
      const data = await response.json();
      if (data.success && data.tournaments) {
        // Filter for ended tournaments and sort by end time (most recent first)
        const now = Date.now();
        const endedTournaments = data.tournaments
          .filter((t: any) => t.endTime < now)
          .sort((a: any, b: any) => b.endTime - a.endTime)
          .map((t: any) => ({
            tournamentId: t.tournamentId,
            name: t.name,
            category: t.category,
            endTime: t.endTime,
            prizePoolUsdCents: t.prizePoolUsdCents || 0,
            distributionStatus: t.distributionStatus ?? 0,
          }));
        setTournamentsList(endedTournaments);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load tournaments');
    } finally {
      setLoadingTournaments(false);
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
        body: JSON.stringify({ tournamentObjectId }),
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
        // Reload tournaments to update distributionStatus
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

  // Auto-distribute rewards for all ended tournaments
  const autoDistributeRewards = async () => {
    if (!confirm('This will automatically distribute rewards for ALL ended tournaments that haven\'t received rewards yet. Continue?')) {
      return;
    }

    setAutoDistributing(true);
    setAutoDistributionResult(null);

    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/auto-distribute-rewards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      setAutoDistributionResult(data);

      if (data.success) {
        // Reload tournaments to update distributionStatus
        await loadTournaments();
      } else {
        alert(data.error || 'Failed to auto-distribute rewards');
      }
    } catch (error) {
      setAutoDistributionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      alert(error instanceof Error ? error.message : 'Failed to auto-distribute rewards');
    } finally {
      setAutoDistributing(false);
    }
  };

  // Load all tournaments (active, upcoming, ended)
  const loadAllTournaments = async () => {
    setLoadingAllTournaments(true);
    try {
      // Fetch both active and past tournaments
      const [activeResponse, pastResponse] = await Promise.all([
        fetch(getApiUrl('api/tournaments')),
        fetch(getApiUrl('api/tournaments/past?limit=100')),
      ]);
      
      const activeData = await activeResponse.json();
      const pastData = await pastResponse.json();
      
      const now = Date.now();
      const allTournamentsList: any[] = [];
      
      // Process active tournaments
      if (activeData.success && activeData.tournaments) {
        activeData.tournaments.forEach((t: any) => {
          allTournamentsList.push({
            tournamentId: t.tournamentId,
            name: t.name,
            category: t.category,
            startTime: t.startTime,
            endTime: t.endTime,
            status: now < t.startTime ? 'upcoming' : now <= t.endTime ? 'active' : 'ended',
            participants: t.participants || 0,
            prizePoolUsdCents: t.prizePoolUSDCents || 0,
            distributionStatus: t.distributionStatus ?? 0,
            objectId: t.objectId,
            rewardToken: t.rewardToken,
            createdBy: t.createdBy,
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
          });
        });
      }
      
      // Sort by tournament ID (newest first)
      allTournamentsList.sort((a, b) => b.tournamentId - a.tournamentId);
      setAllTournaments(allTournamentsList);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load tournaments');
    } finally {
      setLoadingAllTournaments(false);
    }
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

  // Load default rewards configuration
  const loadDefaultRewards = async () => {
    setLoadingDefaultRewards(true);
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/default-rewards'));
      const data = await response.json();
      
      if (data.success && data.config) {
        setDefaultRewardConfig(data.config);
      } else {
        // Use system defaults if not configured (varied rewards by rank)
        setDefaultRewardConfig(getVariedSystemDefaults());
      }
    } catch (error) {
      console.error('Failed to load default rewards:', error);
      // Use system defaults on error (varied rewards by rank)
      setDefaultRewardConfig(getVariedSystemDefaults());
    } finally {
      setLoadingDefaultRewards(false);
    }
  };

  // Save default rewards configuration
  const saveDefaultRewards = async () => {
    if (!defaultRewardConfig) return;

    // Validate pool distribution sums to 100
    const poolSum = defaultRewardConfig.poolDistribution.reduce((a, b) => a + b, 0);
    if (Math.abs(poolSum - 100) > 0.01) {
      alert(`Pool distribution must sum to 100% (currently ${poolSum}%)`);
      return;
    }

    if (!connectedAddress) {
      alert('Please connect your admin wallet to save default rewards configuration');
      return;
    }

    setSavingDefaultRewards(true);
    try {
      const response = await fetch(getApiUrl('api/admin/tournaments/default-rewards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: defaultRewardConfig,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Default rewards configuration saved successfully!');
      } else {
        alert(data.error || 'Failed to save default rewards configuration');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save default rewards configuration');
    } finally {
      setSavingDefaultRewards(false);
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
            setActiveSection('rewards');
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
          🎁 Reward Distribution
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSection('manage');
            // Load all tournaments when switching to manage section
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
          onClick={() => {
            setActiveSection('defaultRewards');
            // Load default rewards when switching to this section
            if (!defaultRewardConfig) {
              loadDefaultRewards();
            }
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
          ⚙️ Default Rewards
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
                              [rank]: [...current, { itemId: 'extraLives', level: 1, quantity: 1 }],
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
                            value={item.itemId}
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
                            <option value="extraLives">❤️ Extra Lives</option>
                            <option value="forceField">🛡️ Force Field</option>
                            <option value="orbLevel">🔮 Orb Level</option>
                            <option value="coinTractorBeam">🧲 Coin Tractor Beam</option>
                            <option value="slowTime">⏱️ Slow Time</option>
                            <option value="destroyAll">💥 Destroy All</option>
                            <option value="bossKillShot">🎯 Boss Kill Shot</option>
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
                    <div>Object ID: {tournamentResult.tournament.objectId?.substring(0, 20)}...</div>
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

                  const response = await fetch(getApiUrl('api/admin/tournaments/query-old-tickets'), {
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
                  <strong>Package ID:</strong> {oldTicketQueryResult.oldPackageId}<br />
                  <strong>System ID:</strong> {oldTicketQueryResult.oldGamePassSystemId}<br />
                  <strong>Ticket ID:</strong> {oldTicketQueryResult.ticketId}<br />
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
              onClick={autoDistributeRewards}
              disabled={autoDistributing}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: autoDistributing ? styles.buttonDisabled : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: autoDistributing ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              {autoDistributing ? '⏳ Distributing...' : '🤖 Auto-Distribute All Rewards'}
            </button>
            <span style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
              Showing ended tournaments only | Auto-distribution runs hourly via cron
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
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Auto-Distribution Result */}
          {autoDistributionResult && (
            <div style={{ 
              marginTop: '1.5rem', 
              marginBottom: '1.5rem',
              padding: '1rem', 
              backgroundColor: autoDistributionResult.success ? '#4CAF5020' : '#F4433620', 
              borderRadius: '4px', 
              border: `1px solid ${autoDistributionResult.success ? '#4CAF50' : '#F44336'}` 
            }}>
              <h4 style={{ marginBottom: '0.5rem', color: styles.text }}>
                {autoDistributionResult.success ? '✅ Auto-Distribution Complete' : '❌ Auto-Distribution Failed'}
              </h4>
              {autoDistributionResult.success && (
                <div style={{ marginBottom: '0.5rem', color: styles.text }}>
                  <strong>Processed:</strong> {autoDistributionResult.processed} tournament(s)<br />
                  <strong>Successful:</strong> {autoDistributionResult.successful}<br />
                  <strong>Failed:</strong> {autoDistributionResult.failed}
                </div>
              )}
              {autoDistributionResult.results && autoDistributionResult.results.length > 0 && (
                <div style={{ marginTop: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                  <strong style={{ color: styles.text }}>Results:</strong>
                  {autoDistributionResult.results.map((result: any, index: number) => (
                    <div key={index} style={{ 
                      padding: '0.5rem', 
                      marginTop: '0.5rem', 
                      backgroundColor: result.success ? '#4CAF5020' : '#F4433620', 
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      <strong style={{ color: styles.text }}>Tournament #{result.tournamentId}:</strong> {result.success ? '✅ Success' : `❌ Failed: ${result.error}`}
                      {result.digest && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>
                          Digest: {result.digest}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {autoDistributionResult.error && (
                <div style={{ marginTop: '0.5rem', color: '#F44336', fontSize: '0.9rem' }}>
                  <strong>Error:</strong> {autoDistributionResult.error}
                </div>
              )}
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
          
          {/* Filter and Refresh Controls */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadAllTournaments}
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
              {(['all', 'upcoming', 'active', 'ended'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTournamentFilter(filter)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: tournamentFilter === filter ? styles.buttonPrimary : styles.bgTertiary,
                    color: tournamentFilter === filter ? 'white' : styles.text,
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    textTransform: 'capitalize',
                  }}
                >
                  {filter}
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
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allTournaments
                    .filter(t => tournamentFilter === 'all' || t.status === tournamentFilter)
                    .map((tournament) => (
                    <tr key={tournament.tournamentId} style={{ borderBottom: `1px solid ${styles.border}` }}>
                      <td style={{ padding: '0.75rem', color: styles.text, fontWeight: 'bold' }}>
                        #{tournament.tournamentId}
                      </td>
                      <td style={{ padding: '0.75rem', color: styles.text }}>{tournament.name}</td>
                      <td style={{ padding: '0.75rem', color: styles.textSecondary, textTransform: 'capitalize' }}>
                        {tournament.category}
                      </td>
                      <td style={{ padding: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                        <div>{new Date(tournament.startTime).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.85rem', color: styles.textSecondary }}>
                          {new Date(tournament.startTime).toLocaleTimeString()} - {new Date(tournament.endTime).toLocaleTimeString()}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: styles.text, fontWeight: 'bold' }}>
                        ${(tournament.prizePoolUsdCents / 100).toFixed(2)}
                        {tournament.rewardToken && (
                          <div style={{ fontSize: '0.85rem', color: styles.textSecondary, fontWeight: 'normal' }}>
                            ({tournament.rewardToken})
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: styles.text }}>
                        {tournament.participants}
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
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                    <div style={{ color: styles.text, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {tournamentDetails.createdBy.substring(0, 8)}...{tournamentDetails.createdBy.substring(tournamentDetails.createdBy.length - 6)}
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
                                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                  {entry.playerAddress.substring(0, 8)}...{entry.playerAddress.substring(entry.playerAddress.length - 6)}
                                </span>
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

      {/* Default Rewards Configuration Section */}
      {activeSection === 'defaultRewards' && (
        <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
          <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>⚙️ Default Rewards Configuration</h2>
          <p style={{ color: styles.textSecondary, marginBottom: '1.5rem' }}>
            Configure the default reward structure that will be used when users create tournaments without custom rewards.
            These defaults are applied automatically and cannot be edited by users.
          </p>

          {loadingDefaultRewards ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
              Loading default rewards configuration...
            </div>
          ) : (
            <DefaultRewardsConfigEditor
              config={defaultRewardConfig}
              onConfigChange={setDefaultRewardConfig}
              onSave={saveDefaultRewards}
              saving={savingDefaultRewards}
              styles={styles}
            />
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
  onSave,
  saving,
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
  onSave: () => void;
  saving: boolean;
  styles: AdminStyles;
}) {
  // Initialize with varied default values if config is null
  const currentConfig = config || getVariedSystemDefaults();

  // Initialize itemRewards if empty (shouldn't happen with getVariedSystemDefaults, but just in case)
  if (Object.keys(currentConfig.itemRewards).length === 0) {
    const defaults = getVariedSystemDefaults();
    currentConfig.itemRewards = defaults.itemRewards;
  }

  const availableItems = [
    { id: 'random', name: 'Random Level 1 Item', levels: [1] }, // Resolved at distribution time
    { id: 'orbLevel', name: 'Orb Level', levels: [1, 2, 3] },
    { id: 'forceField', name: 'Force Field', levels: [1, 2, 3] },
    { id: 'extraLives', name: 'Extra Lives', levels: [1, 2, 3] },
    { id: 'slowTime', name: 'Slow Time', levels: [1, 2, 3] },
    { id: 'coinTractorBeam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
    { id: 'destroyAll', name: 'Destroy All Enemies', levels: [1] },
    { id: 'bossKillShot', name: 'Boss Kill Shot', levels: [1] },
  ];

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
              newConfig.poolDistribution = currentConfig.poolDistribution.slice(0, newDepth);
              // Re-normalize to 100%
              const sum = newConfig.poolDistribution.reduce((a, b) => a + b, 0);
              newConfig.poolDistribution = newConfig.poolDistribution.map(p => 
                Math.round((p / sum) * 100)
              );
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
          {currentConfig.poolDistribution.map((pct, idx) => (
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
          Sum: {currentConfig.poolDistribution.reduce((a, b) => a + b, 0)}% (must equal 100%)
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(currentConfig.itemRewards[rank] || []).map((item, itemIdx) => (
                  <div key={itemIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={item.itemId}
                      onChange={(e) => {
                        const newItemRewards = { ...currentConfig.itemRewards };
                        newItemRewards[rank] = [...(newItemRewards[rank] || [])];
                        newItemRewards[rank][itemIdx] = { ...item, itemId: e.target.value };
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
                    <select
                      value={item.level}
                      onChange={(e) => {
                        const newItemRewards = { ...currentConfig.itemRewards };
                        newItemRewards[rank] = [...(newItemRewards[rank] || [])];
                        newItemRewards[rank][itemIdx] = { ...item, level: parseInt(e.target.value) };
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
                      {availableItems.find(i => i.id === item.itemId)?.levels.map((level) => (
                        <option key={level} value={level}>Level {level}</option>
                      ))}
                    </select>
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
                    newItemRewards[rank].push({ itemId: 'orbLevel', level: 1, quantity: 1 });
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

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: saving ? styles.buttonDisabled : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          {saving ? 'Saving...' : '💾 Save Default Rewards'}
        </button>
      </div>
    </div>
  );
}

