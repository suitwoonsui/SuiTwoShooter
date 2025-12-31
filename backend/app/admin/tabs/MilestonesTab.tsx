// ==========================================
// Admin Page - Milestones Tab Component
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { useWalletDiscovery } from '../hooks/useWalletDiscovery';
import { WalletDiscoveryUI } from '../components/WalletDiscoveryUI';
import { WalletList } from '../components/WalletList';

interface MilestoneDefinition {
  milestoneId?: number; // Stable unique identifier
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
  level?: number; // Optional: actual on-chain level number
}

interface MilestonesTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

const CATEGORIES = [
  { key: 'gamesPlayed', label: 'Games Played' },
  { key: 'bossesPerGame', label: 'Bosses Per Game' },
  { key: 'bossesCumulative', label: 'Bosses Cumulative' },
  { key: 'scorePerGame', label: 'Score Per Game' },
  { key: 'scoreCumulative', label: 'Score Cumulative' },
  { key: 'distancePerGame', label: 'Distance Per Game' },
  { key: 'distanceCumulative', label: 'Distance Cumulative' },
  { key: 'coinsPerGame', label: 'Coins Per Game' },
  { key: 'coinsCumulative', label: 'Coins Cumulative' },
  { key: 'enemiesPerGame', label: 'Enemies Per Game' },
  { key: 'enemiesCumulative', label: 'Enemies Cumulative' },
  { key: 'coinStreak', label: 'Coin Streak' },
];

const ITEM_TYPES = [
  { id: 'orbLevel', label: 'Orb Level' },
  { id: 'forceField', label: 'Force Field' },
  { id: 'extraLives', label: 'Extra Lives' },
  { id: 'slowTime', label: 'Slow Time' },
  { id: 'coinTractorBeam', label: 'Coin Tractor Beam' },
  { id: 'destroyAll', label: 'Destroy All' },
  { id: 'bossKillShot', label: 'Boss Kill Shot' },
];

export function MilestonesTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: MilestonesTabProps) {
  const [definitions, setDefinitions] = useState<Record<string, MilestoneDefinition[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('gamesPlayed');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<{ category: string; level: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<number, Partial<MilestoneDefinition>>>>({});
  const [pendingNewMilestones, setPendingNewMilestones] = useState<Record<string, MilestoneDefinition[]>>({});
  const [pendingDeletions, setPendingDeletions] = useState<Record<string, Set<number>>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [initializationProgress, setInitializationProgress] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearProgress, setClearProgress] = useState<string | null>(null);

  // User management state
  const [activeTab, setActiveTab] = useState<'definitions' | 'users'>('definitions');
  const [walletUserData, setWalletUserData] = useState<Record<string, {
    data: {
      stats?: any;
      claimed?: number[];
      eligible?: any[];
    } | null;
    loading: boolean;
    error: string | null;
  }>>({});
  const [claimingMilestone, setClaimingMilestone] = useState<string | null>(null);
  const [unclaimingMilestone, setUnclaimingMilestone] = useState<Record<string, string>>({});
  const [clearingAllClaims, setClearingAllClaims] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, Set<string>>>({});
  const [milestoneDetails, setMilestoneDetails] = useState<Record<number, any>>({});

  // Check if wallet has milestone claims
  const checkWalletExists = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch(getApiUrl(`/api/admin/milestones/users/${address}`));
      const data = await response.json();
      return response.ok && data.success;
    } catch {
      return false;
    }
  };

  // Refresh user data for a specific wallet
  const refreshUserData = async (address: string) => {
    setWalletUserData(prev => ({
      ...prev,
      [address]: { ...prev[address], loading: true, error: null }
    }));

    try {
      const timestamp = Date.now();
      const response = await fetch(getApiUrl(`/api/admin/milestones/users/${address}?clearCache=true&_t=${timestamp}`));
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load user data');
      }

      const data = await response.json();
      if (data.success) {
        setWalletUserData(prev => ({
          ...prev,
          [address]: {
            data: {
              stats: data.stats,
              claimed: data.claimed,
              eligible: data.eligible,
            },
            loading: false,
            error: null
          }
        }));
      } else {
        throw new Error(data.error || 'Failed to load user data');
      }
    } catch (error) {
      setWalletUserData(prev => ({
        ...prev,
        [address]: {
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };

  // Wallet discovery hook
  const walletDiscovery = useWalletDiscovery({
    isAdminWalletConnected,
    connectedAddress,
    adminAddress,
    discoveryType: 'milestones',
    checkWalletExists,
    onWalletsDiscovered: () => {
      setWalletUserData({});
    },
    onWalletExpanded: (address) => {
      // Load user data if not already loaded
      if (!walletUserData[address] || walletUserData[address].data === null) {
        refreshUserData(address);
      }
    },
  });

  // Toggle wallet expansion with data loading
  const toggleWalletExpansion = (address: string) => {
    walletDiscovery.toggleWalletExpansion(address);
    // Load user data if not already loaded
    if (!walletUserData[address] || walletUserData[address].data === null) {
      refreshUserData(address);
    }
  };

  // Form state
  const [formThreshold, setFormThreshold] = useState<number>(0);
  const [formCredits, setFormCredits] = useState<number>(0);
  const [formItems, setFormItems] = useState<Array<{ itemId: string; level: number; quantity: number }>>([]);

  // Show notification and auto-hide
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load milestones
  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(getApiUrl('/api/admin/milestones'));
      if (!response.ok) {
        throw new Error('Failed to load milestones');
      }
      const data = await response.json();
      if (data.success) {
        setDefinitions(data.definitions || {});
      } else {
        throw new Error(data.error || 'Failed to load milestones');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = () => {
    if (!connectedAddress) {
      alert('Please connect admin wallet');
      return;
    }
    setFormThreshold(0);
    setFormCredits(0);
    setFormItems([]);
    setShowAddForm(true);
    setEditingMilestone(null);
  };

  const handleEditMilestone = (category: string, level: number) => {
    const categoryDefs = definitions[category] || [];
    // Find milestone by actual level number (if available) or by array index
    const milestone = categoryDefs.find(d => d.level === level) || categoryDefs[level - 1];
    if (!milestone) return;

    // Check if there are pending changes for this milestone
    const pending = pendingChanges[category]?.[level];
    
    // Use pending changes if they exist, otherwise use current definition
    setFormThreshold(pending?.threshold !== undefined ? pending.threshold : milestone.threshold);
    setFormCredits(pending?.credits !== undefined ? pending.credits : milestone.credits);
    setFormItems(pending?.items !== undefined ? [...pending.items] : [...milestone.items]);
    setSelectedCategory(category);
    setShowAddForm(true);
    setEditingMilestone({ category, level });
  };

  const handleDeleteMilestone = (category: string, level: number) => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    if (!confirm(`Add milestone level ${level} to deletion batch?`)) {
      return;
    }

    // Add to pending deletions batch
    setPendingDeletions(prev => {
      const categoryDeletions = prev[category] || new Set<number>();
      return {
        ...prev,
        [category]: new Set([...categoryDeletions, level]),
      };
    });

    // Also remove from pending changes if it exists there
    setPendingChanges(prev => {
      const categoryChanges = prev[category];
      if (categoryChanges && categoryChanges[level]) {
        const newCategoryChanges = { ...categoryChanges };
        delete newCategoryChanges[level];
        return {
          ...prev,
          [category]: newCategoryChanges,
        };
      }
      return prev;
    });

    showNotification('info', `Deletion added to batch. Click "Save All Changes" to submit.`);
  };

  const handleSaveMilestone = async () => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    if (formThreshold <= 0) {
      showNotification('error', 'Threshold must be greater than 0');
      return;
    }

      const category = editingMilestone ? editingMilestone.category : selectedCategory;
      // For editing, use the actual level from editingMilestone
      // For new milestones, calculate based on current count + pending deletions
      let milestoneLevel: number;
      if (editingMilestone) {
        milestoneLevel = editingMilestone.level;
      } else {
        const categoryDefs = definitions[category] || [];
        const pendingDeletionsForCategory = pendingDeletions[category] || new Set<number>();
        const remainingCount = categoryDefs.filter(d => {
          const defLevel = d.level !== undefined ? d.level : (categoryDefs.indexOf(d) + 1);
          return !pendingDeletionsForCategory.has(defLevel);
        }).length;
        milestoneLevel = remainingCount + 1;
      }

      if (editingMilestone) {
        // Add to pending changes batch instead of submitting immediately
        setPendingChanges(prev => {
          const categoryChanges = prev[category] || {};
          return {
            ...prev,
            [category]: {
              ...categoryChanges,
              [milestoneLevel]: {
                threshold: formThreshold,
                credits: formCredits,
                items: formItems,
              },
            },
          };
        });
      
      setShowAddForm(false);
      setEditingMilestone(null);
      showNotification('info', `Changes added to batch. Click "Save All Changes" to submit.`);
    } else {
      // Add new milestone to batch instead of submitting immediately
      setPendingNewMilestones(prev => {
        const categoryNew = prev[selectedCategory] || [];
        return {
          ...prev,
          [selectedCategory]: [
            ...categoryNew,
            {
              threshold: formThreshold,
              credits: formCredits,
              items: formItems,
            },
          ],
        };
      });
      
      setShowAddForm(false);
      showNotification('info', `New milestone added to batch. Click "Save All Changes" to submit.`);
    }
  };

  const addFormItem = () => {
    setFormItems([...formItems, { itemId: 'orbLevel', level: 1, quantity: 1 }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: string, value: any) => {
    const newItems = [...formItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormItems(newItems);
  };

  // Batch edit mode handlers
  const handleInlineEdit = (category: string, level: number, field: string, value: any) => {
    if (!editMode) return;
    
    setPendingChanges(prev => {
      const categoryChanges = prev[category] || {};
      const levelChanges = categoryChanges[level] || {};
      
      // Get current definition by actual level number if available, otherwise use array index
      const categoryDefs = definitions[category] || [];
      const currentDef = categoryDefs.find(d => d.level === level) || categoryDefs[level - 1];
      if (!currentDef) return prev;
      
      // Update the specific field
      const updated = { ...levelChanges };
      if (field === 'threshold') {
        updated.threshold = typeof value === 'string' ? parseInt(value) || 0 : value;
      } else if (field === 'credits') {
        updated.credits = typeof value === 'string' ? parseInt(value) || 0 : value;
      } else if (field === 'items') {
        updated.items = value;
      }
      
      return {
        ...prev,
        [category]: {
          ...categoryChanges,
          [level]: updated,
        },
      };
    });
  };

  const getDisplayValue = (category: string, level: number, field: 'threshold' | 'credits' | 'items'): any => {
    const pending = pendingChanges[category]?.[level];
    if (pending && pending[field] !== undefined) {
      return pending[field];
    }
    // Find by actual level number if available, otherwise use array index
    const categoryDefs = definitions[category] || [];
    const def = categoryDefs.find(d => d.level === level) || categoryDefs[level - 1];
    return def ? def[field] : (field === 'items' ? [] : 0);
  };

  const hasPendingChanges = () => {
    const hasUpdates = Object.keys(pendingChanges).some(category => 
      Object.keys(pendingChanges[category] || {}).length > 0
    );
    const hasNew = Object.keys(pendingNewMilestones).some(category =>
      (pendingNewMilestones[category] || []).length > 0
    );
    const hasDeletions = Object.keys(pendingDeletions).some(category =>
      (pendingDeletions[category] || new Set()).size > 0
    );
    return hasUpdates || hasNew || hasDeletions;
  };

  const handleSaveAllChanges = async () => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    if (!hasPendingChanges()) {
      showNotification('info', 'No changes to save');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare batch operations
      const deletions: Array<{ category: string; level: number }> = [];
      for (const [category, levelSet] of Object.entries(pendingDeletions)) {
        for (const level of levelSet) {
          deletions.push({ category, level });
        }
      }


      const updates: Array<{
        category: string;
        level: number;
        threshold: number;
        credits: number;
        items: Array<{ itemId: string; level: number; quantity: number }>;
      }> = [];
      for (const [category, levelChanges] of Object.entries(pendingChanges)) {
        for (const [levelStr, changes] of Object.entries(levelChanges)) {
          const level = parseInt(levelStr, 10);
          
          // Check if this level is also being deleted - if so, skip the update
          const pendingDeletionsForCategory = pendingDeletions[category] || new Set<number>();
          if (pendingDeletionsForCategory.has(level)) {
            // Skip update if it's being deleted - the deletion will handle it
            continue;
          }
          
          // Find milestone by actual level number (if available) or by array index
          const categoryDefs = definitions[category] || [];
          const currentDef = categoryDefs.find(d => d.level === level) || categoryDefs[level - 1];
          
          if (!currentDef) {
            showNotification('error', `Milestone ${category} level ${level} not found. It may have been deleted. Please refresh and try again.`);
            setSaving(false);
            return;
          }

          // Merge changes with current definition
          updates.push({
            category,
            level,
            threshold: changes.threshold !== undefined ? changes.threshold : currentDef.threshold,
            credits: changes.credits !== undefined ? changes.credits : currentDef.credits,
            items: changes.items !== undefined ? changes.items : currentDef.items,
          });
        }
      }

      const additions: Array<{
        category: string;
        milestoneLevel: number;
        threshold: number;
        credits: number;
        items: Array<{ itemId: string; level: number; quantity: number }>;
      }> = [];
      for (const [category, newMilestones] of Object.entries(pendingNewMilestones)) {
        if (newMilestones.length === 0) continue;
        
        // Get current count from on-chain
        const currentCount = definitions[category]?.length || 0;
        
        // Account for pending deletions in this category
        const pendingDeletionsForCategory = pendingDeletions[category] || new Set<number>();
        
        // Build a set of levels that will exist after deletions
        const remainingLevels = new Set<number>();
        for (let i = 1; i <= currentCount; i++) {
          if (!pendingDeletionsForCategory.has(i)) {
            remainingLevels.add(i);
          }
        }
        
        // Find the first available level(s) for new additions
        // Start from 1 and find gaps or continue after the highest existing level
        const availableLevels: number[] = [];
        let levelToCheck = 1;
        let addedCount = 0;
        
        while (addedCount < newMilestones.length) {
          if (!remainingLevels.has(levelToCheck) && !availableLevels.includes(levelToCheck)) {
            availableLevels.push(levelToCheck);
            addedCount++;
          }
          levelToCheck++;
        }
        
        for (let i = 0; i < newMilestones.length; i++) {
          additions.push({
            category,
            milestoneLevel: availableLevels[i],
            threshold: newMilestones[i].threshold,
            credits: newMilestones[i].credits,
            items: newMilestones[i].items,
          });
        }
      }

      // Execute all operations in a single batch transaction
      const response = await fetch(getApiUrl('/api/admin/milestones/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletions,
          updates,
          additions,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const totalOps = deletions.length + updates.length + additions.length;
        showNotification('success', `All ${totalOps} operation${totalOps !== 1 ? 's' : ''} saved in a single transaction!`);
        setPendingChanges({});
        setPendingNewMilestones({});
        setPendingDeletions({});
        setEditMode(false);
        await loadMilestones();
      } else {
        // If the error mentions milestones not found, refresh the data
        const errorMsg = data.error || 'Failed to save batch changes';
        if (errorMsg.includes('not exist') || errorMsg.includes('already been deleted')) {
          showNotification('info', `${errorMsg} Refreshing milestone list...`);
          await loadMilestones();
        } else {
          throw new Error(errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save changes';
      showNotification('error', errorMsg);
      // Refresh data on error to ensure we have the latest state
      await loadMilestones();
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (confirm('Discard all unsaved changes?')) {
      setPendingChanges({});
      setPendingNewMilestones({});
      setPendingDeletions({});
      setEditMode(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px' }}>Loading milestones...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px' }}>
        <div style={{ color: 'red' }}>Error: {error}</div>
        <button onClick={loadMilestones} style={styles.button}>Retry</button>
      </div>
    );
  }

  const categoryDefs = definitions[selectedCategory] || [];
  const totalMilestones = Object.values(definitions).reduce((sum, defs) => sum + defs.length, 0);
  const pendingUpdateCount = Object.values(pendingChanges).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
  const pendingNewCount = Object.values(pendingNewMilestones).reduce((sum, cat) => sum + cat.length, 0);
  const pendingDeleteCount = Object.values(pendingDeletions).reduce((sum, cat) => sum + (cat?.size || 0), 0);
  const pendingCount = pendingUpdateCount + pendingNewCount + pendingDeleteCount;

  // Combine existing milestones with pending new ones for display
  // Keep all milestones visible, including pending deletions (they'll be greyed out)
  const pendingDeletionsForCategory = pendingDeletions[selectedCategory] || new Set<number>();
  const pendingNewForCategory = pendingNewMilestones[selectedCategory] || [];
  // Include all existing milestones (don't filter out pending deletions)
  const allDefs = [...categoryDefs, ...pendingNewForCategory];
  
  // Filter milestones by search term
  const filteredDefs = allDefs.filter(def => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      def.threshold.toString().includes(searchLower) ||
      def.credits.toString().includes(searchLower) ||
      def.items.some(item => 
        ITEM_TYPES.find(t => t.id === item.itemId)?.label.toLowerCase().includes(searchLower)
      )
    );
  });

  // Helper to format item display
  const formatItem = (item: { itemId: string; level: number; quantity: number }) => {
    const itemType = ITEM_TYPES.find(t => t.id === item.itemId);
    return itemType ? `${itemType.label} L${item.level} ×${item.quantity}` : item.itemId;
  };

  const handleInitializeMilestones = async () => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    if (!confirm('This will initialize milestone definitions from factory defaults to on-chain. Existing milestones will be skipped unless you force. Continue?')) {
      return;
    }

    try {
      setInitializing(true);
      setInitializationProgress('Initializing milestone definitions...');

      const response = await fetch(getApiUrl('/api/admin/milestones/initialize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress,
          force: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Initialization failed');
      }

      const data = await response.json();

      if (data.success) {
        const { totalAdded, totalSkipped, successCount, errorCount } = data.summary;
        showNotification(
          'success',
          `Initialization completed! Added: ${totalAdded}, Skipped: ${totalSkipped}, Success: ${successCount}, Errors: ${errorCount}`
        );
        
        // Reload milestones to show updated data
        await loadMilestones();
      } else {
        const errorCount = data.summary?.errorCount || 0;
        showNotification('error', `Initialization completed with ${errorCount} error(s). Check results for details.`);
      }

      setInitializationProgress(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      showNotification('error', `Initialization failed: ${errorMsg}`);
      setInitializationProgress(null);
    } finally {
      setInitializing(false);
    }
  };

  const handleClearMilestones = async () => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    if (!confirm('⚠️ WARNING: This will DELETE ALL milestone definitions from the blockchain. This action cannot be undone. Are you absolutely sure you want to continue?')) {
      return;
    }

    // Double confirmation
    if (!confirm('This is your last chance. All milestones will be permanently deleted. Continue?')) {
      return;
    }

    try {
      setClearing(true);
      setClearProgress('Clearing milestone definitions from blockchain...');

      const response = await fetch(getApiUrl('/api/admin/milestones/clear'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Clear operation failed');
      }

      const data = await response.json();

      if (data.success) {
        showNotification(
          'success',
          `Successfully cleared ${data.deleted} milestone definition(s) from the blockchain`
        );
        
        // Reload milestones to show updated data (should be empty now)
        await loadMilestones();
      } else {
        showNotification('error', `Clear operation completed with ${data.errors || 0} error(s). ${data.deleted || 0} milestone(s) were deleted.`);
      }

      setClearProgress(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      showNotification('error', `Clear operation failed: ${errorMsg}`);
      setClearProgress(null);
    } finally {
      setClearing(false);
    }
  };

  const handleClaimMilestone = async (address: string, milestone: any) => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    const claimKey = `${address}-${milestone.category}-${milestone.threshold}`;
    try {
      setClaimingMilestone(claimKey);

      // Use milestoneId if available (stable tracking), otherwise fall back to category/threshold
      const requestBody: any = {};
      
      if (milestone.milestoneId !== undefined && milestone.milestoneId !== null) {
        // Prefer milestoneId for stable tracking
        requestBody.milestoneId = milestone.milestoneId;
      } else {
        // Fallback to category/threshold for backward compatibility
        const categoryCodeMap: Record<string, number> = {
          gamesPlayed: 1,
          bossesPerGame: 2,
          bossesCumulative: 3,
          scorePerGame: 4,
          scoreCumulative: 5,
          distancePerGame: 6,
          distanceCumulative: 7,
          coinsPerGame: 8,
          coinsCumulative: 9,
          enemiesPerGame: 10,
          enemiesCumulative: 11,
          coinStreak: 12,
        };
        requestBody.category = categoryCodeMap[milestone.category];
        requestBody.threshold = milestone.threshold;
      }

      const response = await fetch(getApiUrl(`/api/admin/milestones/users/${address}/claim`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim milestone');
      }

      const data = await response.json();
      if (data.success) {
        showNotification('success', data.message || 'Milestone claimed successfully');
        // Wait for blockchain transaction to finalize before reloading
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        // Clear any caches and reload user data to refresh the list
        await refreshUserData(address);
      } else {
        throw new Error(data.error || 'Failed to claim milestone');
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setClaimingMilestone(null);
    }
  };

  const handleUnclaimMilestone = async (address: string, milestoneId: number) => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    if (!confirm(`Are you sure you want to unclaim milestone ID ${milestoneId}?`)) {
      return;
    }

    try {
      setUnclaimingMilestone(prev => ({ ...prev, [address]: String(milestoneId) }));

      const response = await fetch(getApiUrl(`/api/admin/milestones/users/${address}/unclaim`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestoneId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unclaim milestone');
      }

      const data = await response.json();
      if (data.success) {
        showNotification('success', data.message || 'Milestone unclaimed successfully');
        // Wait for blockchain transaction to finalize before reloading
        await new Promise(resolve => setTimeout(resolve, 3000));
        await refreshUserData(address);
      } else {
        throw new Error(data.error || 'Failed to unclaim milestone');
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUnclaimingMilestone(prev => {
        const newState = { ...prev };
        delete newState[address];
        return newState;
      });
    }
  };

  const handleClearAllClaims = async (address: string) => {
    if (!connectedAddress) {
      showNotification('error', 'Please connect admin wallet');
      return;
    }

    if (!confirm(`⚠️ WARNING: This will unclaim ALL milestones for ${address}. This action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    // Double confirmation
    if (!confirm('This is your last chance. All claims will be permanently removed. Continue?')) {
      return;
    }

    try {
      setClearingAllClaims(prev => ({ ...prev, [address]: true }));

      const response = await fetch(getApiUrl(`/api/admin/milestones/users/${address}/clear-claims`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear all claims');
      }

      const data = await response.json();
      if (data.success) {
        showNotification('success', data.message || `Cleared ${data.clearedCount || 0} claim(s) successfully`);
        if (data.errors && data.errors.length > 0) {
          showNotification('error', `Some claims could not be cleared: ${data.errors.join(', ')}`);
        }
        // Wait for blockchain transactions to finalize
        await new Promise(resolve => setTimeout(resolve, 3000));
        await refreshUserData(address);
      } else {
        throw new Error(data.error || 'Failed to clear all claims');
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setClearingAllClaims(prev => {
        const newState = { ...prev };
        delete newState[address];
        return newState;
      });
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px' }}>
        {/* Notification Toast */}
        {notification && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '12px 20px',
              borderRadius: '8px',
              backgroundColor: 
                notification.type === 'success' ? '#4caf50' :
                notification.type === 'error' ? '#f44336' : '#2196F3',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '250px',
              animation: 'slideIn 0.3s ease-out',
            }}
          >
          <span>{notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}</span>
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: styles.heading }}>Milestone Management</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {activeTab === 'definitions' && (
            <div style={{ 
              padding: '8px 16px', 
              backgroundColor: styles.bgSecondary, 
              borderRadius: '6px',
              fontSize: '0.9em',
              color: styles.textSecondary
            }}>
              {totalMilestones} total milestones
            </div>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        borderBottom: `2px solid ${styles.border}`,
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('definitions')}
          style={{
            ...styles.button,
            backgroundColor: activeTab === 'definitions' ? styles.buttonPrimary : 'transparent',
            color: activeTab === 'definitions' ? 'white' : styles.text,
            border: `1px solid ${activeTab === 'definitions' ? styles.buttonPrimary : styles.border}`,
            padding: '10px 20px',
            borderRadius: '6px 6px 0 0',
            fontWeight: activeTab === 'definitions' ? '600' : '400',
            cursor: 'pointer',
          }}
        >
          📋 Milestone Definitions
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            ...styles.button,
            backgroundColor: activeTab === 'users' ? styles.buttonPrimary : 'transparent',
            color: activeTab === 'users' ? 'white' : styles.text,
            border: `1px solid ${activeTab === 'users' ? styles.buttonPrimary : styles.border}`,
            padding: '10px 20px',
            borderRadius: '6px 6px 0 0',
            fontWeight: activeTab === 'users' ? '600' : '400',
            cursor: 'pointer',
          }}
        >
          👤 User Management
        </button>
      </div>

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div>
          <WalletDiscoveryUI
            styles={styles}
            title="🔍 Discover Wallets with Milestone Claims"
            discoverButtonText="🔍 Discover All Wallets with Milestone Claims"
            searchAddress={walletDiscovery.searchAddress}
            setSearchAddress={walletDiscovery.setSearchAddress}
            onSearch={walletDiscovery.handleSearchWallet}
            onDiscover={walletDiscovery.handleDiscoverWallets}
            searchingWallet={walletDiscovery.searchingWallet}
            discoveringWallets={walletDiscovery.discoveringWallets}
            discoveredWalletsCount={walletDiscovery.discoveredWallets.length}
          />

          <WalletList
            styles={styles}
            wallets={walletDiscovery.discoveredWallets}
            filteredWallets={walletDiscovery.filteredWallets}
            searchAddress={walletDiscovery.searchAddress}
            expandedWallets={walletDiscovery.expandedWallets}
            onToggleExpansion={toggleWalletExpansion}
            getWalletData={(address) => walletUserData[address] || { data: null, loading: false, error: null }}
            renderWalletContent={(address, isExpanded, walletData) => {
              if (walletData.loading) {
                return (
                  <div style={{ padding: '2rem', textAlign: 'center', color: styles.textSecondary }}>
                    Loading user data...
                  </div>
                );
              }

              if (walletData.error) {
                return (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '4px',
                      backgroundColor: styles.bgError,
                      border: `1px solid ${styles.borderError}`,
                      color: styles.textError,
                      marginBottom: '1.5rem',
                    }}
                  >
                    <strong>❌ Error:</strong> {walletData.error}
                  </div>
                );
              }

              if (walletData.data === null) {
                return null;
              }

              const userData = walletData.data;
              const walletExpandedCategories = expandedCategories[address] || new Set();

              const toggleCategory = (category: string) => {
                setExpandedCategories(prev => {
                  const walletCategories = prev[address] || new Set();
                  const newSet = new Set(walletCategories);
                  if (newSet.has(category)) {
                    newSet.delete(category);
                  } else {
                    newSet.add(category);
                  }
                  return { ...prev, [address]: newSet };
                });
              };

              return (
                <div>
                  {/* User Stats */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: styles.bgSecondary,
                    border: `1px solid ${styles.border}`,
                    borderRadius: '8px',
                    marginBottom: '1rem',
                  }}>
                    <h3 style={{ color: styles.heading, fontSize: '1.1em', marginBottom: '1rem' }}>Player Statistics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {userData.stats && Object.entries(userData.stats).map(([key, value]) => (
                        <div key={key} style={{
                          padding: '12px',
                          backgroundColor: styles.bgPrimary,
                          borderRadius: '6px',
                          border: `1px solid ${styles.border}`,
                        }}>
                          <div style={{ fontSize: '0.85em', color: styles.textSecondary, marginBottom: '0.25rem' }}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </div>
                          <div style={{ fontSize: '1.2em', fontWeight: '600', color: styles.text }}>
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Claimed Milestones */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: styles.bgSecondary,
                    border: `1px solid ${styles.border}`,
                    borderRadius: '8px',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ color: styles.heading, fontSize: '1.1em', margin: 0 }}>
                        Claimed Milestones ({userData.claimed?.length || 0})
                      </h3>
                      {userData.claimed && userData.claimed.length > 0 && (
                        <button
                          onClick={() => handleClearAllClaims(address)}
                          disabled={!isAdminWalletConnected || clearingAllClaims[address] || !!unclaimingMilestone[address]}
                          style={{
                            ...styles.button,
                            backgroundColor: (clearingAllClaims[address] || !!unclaimingMilestone[address]) ? '#9e9e9e' : '#f44336',
                            color: 'white',
                            padding: '8px 16px',
                            fontSize: '0.9em',
                            cursor: (!isAdminWalletConnected || clearingAllClaims[address] || !!unclaimingMilestone[address]) ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {clearingAllClaims[address] ? '⏳ Clearing...' : unclaimingMilestone[address] ? '⏳ Unclaiming...' : '🗑️ Clear All Claims'}
                        </button>
                      )}
                    </div>
                    {userData.claimed && userData.claimed.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {userData.claimed.map((milestoneId: number) => (
                          <div
                            key={milestoneId}
                            style={{
                              padding: '12px',
                              backgroundColor: styles.bgPrimary,
                              borderRadius: '6px',
                              border: `1px solid ${styles.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                Milestone ID: {milestoneId}
                              </div>
                              <div style={{ fontSize: '0.85em', color: styles.textSecondary }}>
                                {milestoneDetails[milestoneId] ? (
                                  <>
                                    Category: {milestoneDetails[milestoneId].category} | 
                                    Threshold: {milestoneDetails[milestoneId].threshold?.toLocaleString() || 'N/A'} | 
                                    Credits: {milestoneDetails[milestoneId].credits?.toLocaleString() || '0'}
                                  </>
                                ) : (
                                  'Loading details...'
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnclaimMilestone(address, milestoneId)}
                              disabled={!isAdminWalletConnected || unclaimingMilestone[address] === String(milestoneId) || clearingAllClaims[address]}
                              style={{
                                ...styles.button,
                                backgroundColor: (!isAdminWalletConnected || unclaimingMilestone[address] === String(milestoneId) || clearingAllClaims[address]) ? '#9e9e9e' : '#ff9800',
                                color: 'white',
                                padding: '8px 16px',
                                fontSize: '0.9em',
                                cursor: (!isAdminWalletConnected || unclaimingMilestone[address] === String(milestoneId) || clearingAllClaims[address]) ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {unclaimingMilestone[address] === String(milestoneId) ? '⏳ Unclaiming...' : clearingAllClaims[address] ? '⏳ Clearing All...' : '❌ Unclaim'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: styles.textSecondary, fontStyle: 'italic' }}>
                        No milestones claimed yet
                      </div>
                    )}
                  </div>

                  {/* Eligible Milestones */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: styles.bgSecondary,
                    border: `1px solid ${styles.border}`,
                    borderRadius: '8px',
                    marginBottom: '1rem',
                  }}>
                    <h3 style={{ color: styles.heading, fontSize: '1.1em', marginBottom: '1rem' }}>
                      Eligible Milestones ({userData.eligible?.length || 0})
                    </h3>
                    {userData.eligible && userData.eligible.length > 0 ? (
                      (() => {
                        // Group eligible milestones by category
                        const groupedByCategory = userData.eligible.reduce((acc: Record<string, any[]>, milestone: any) => {
                          const category = milestone.category || 'unknown';
                          if (!acc[category]) {
                            acc[category] = [];
                          }
                          acc[category].push(milestone);
                          return acc;
                        }, {});

                        // Sort milestones within each category by threshold
                        Object.keys(groupedByCategory).forEach(category => {
                          groupedByCategory[category].sort((a: MilestoneDefinition, b: MilestoneDefinition) => a.threshold - b.threshold);
                        });

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(Object.entries(groupedByCategory) as [string, any[]][]).map(([category, milestones]) => {
                              const categoryInfo = CATEGORIES.find(c => c.key === category);
                              const isExpanded = walletExpandedCategories.has(category);
                              return (
                                <div key={category} style={{
                                  border: `1px solid ${styles.border}`,
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                }}>
                                  <div 
                                    onClick={() => toggleCategory(category)}
                                    style={{
                                      padding: '12px 16px',
                                      backgroundColor: styles.bgPrimary,
                                      borderBottom: isExpanded ? `1px solid ${styles.border}` : 'none',
                                      fontWeight: '600',
                                      fontSize: '1em',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      userSelect: 'none',
                                      transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = styles.bgSecondary;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = styles.bgPrimary;
                                    }}
                                  >
                                    <span>
                                      {categoryInfo?.label || category} ({milestones.length})
                                    </span>
                                    <span style={{ fontSize: '0.9em', marginLeft: '8px' }}>
                                      {isExpanded ? '▼' : '▶'}
                                    </span>
                                  </div>
                                  {isExpanded && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '12px' }}>
                                      {milestones.map((milestone: any, index: number) => (
                                        <div key={index} style={{
                                          padding: '12px',
                                          backgroundColor: styles.bgSecondary,
                                          borderRadius: '6px',
                                          border: `1px solid ${styles.border}`,
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}>
                                          <div>
                                            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                              Threshold: {milestone.threshold.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '0.85em', color: styles.textSecondary }}>
                                              Credits: {milestone.credits.toLocaleString()} | 
                                              Items: {milestone.items?.length || 0}
                                              {milestone.items && milestone.items.length > 0 && (
                                                <span style={{ marginLeft: '0.5rem' }}>
                                                  ({milestone.items.map((item: any) => 
                                                    `${ITEM_TYPES.find(t => t.id === item.itemId)?.label || item.itemId} L${item.level} x${item.quantity}`
                                                  ).join(', ')})
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleClaimMilestone(address, milestone)}
                                            disabled={!isAdminWalletConnected || claimingMilestone === `${address}-${milestone.category}-${milestone.threshold}`}
                                            style={{
                                              ...styles.button,
                                              backgroundColor: (!isAdminWalletConnected || claimingMilestone === `${address}-${milestone.category}-${milestone.threshold}`) ? '#9e9e9e' : '#4caf50',
                                              color: 'white',
                                              padding: '8px 16px',
                                              fontSize: '0.9em',
                                              cursor: (!isAdminWalletConnected || claimingMilestone === `${address}-${milestone.category}-${milestone.threshold}`) ? 'not-allowed' : 'pointer',
                                            }}
                                          >
                                            {claimingMilestone === `${address}-${milestone.category}-${milestone.threshold}` ? '⏳ Claiming...' : '✅ Claim'}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ color: styles.textSecondary, fontStyle: 'italic' }}>
                        No eligible milestones
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}

      {/* Milestone Definitions Tab */}
      {activeTab === 'definitions' && (
        <div>

      {!isAdminWalletConnected && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '6px',
          marginBottom: '1rem',
          color: '#856404'
        }}>
          ⚠️ Please connect admin wallet to manage milestones
        </div>
      )}

      {/* Initialize Section */}
      <div style={{
        padding: '16px',
        backgroundColor: styles.bgSecondary,
        border: '1px solid ' + (styles.border || '#e0e0e0'),
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ color: styles.heading, fontSize: '1.1em', margin: 0 }}>Initialize Milestones (Factory Default)</h3>
          <button
            onClick={handleInitializeMilestones}
            disabled={!isAdminWalletConnected || initializing || clearing}
            style={{
              ...styles.button,
              backgroundColor: initializing ? '#9e9e9e' : '#4caf50',
              color: 'white',
              padding: '10px 20px',
              fontSize: '0.95em',
              cursor: (!isAdminWalletConnected || initializing || clearing) ? 'not-allowed' : 'pointer',
              opacity: (!isAdminWalletConnected || initializing || clearing) ? 0.6 : 1,
            }}
          >
            {initializing ? '🔄 Initializing...' : '⚙️ Initialize'}
          </button>
        </div>
        <p style={{ 
          margin: 0, 
          fontSize: '0.9em', 
          color: styles.textSecondary,
          lineHeight: '1.5'
        }}>
          Initialize milestone definitions from factory defaults (hardcoded values) to on-chain storage. 
          Existing milestones will be skipped automatically. Use this for first-time setup.
        </p>
        {initializationProgress && initializing && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '0.85em',
            color: '#1976d2',
          }}>
            {initializationProgress}
          </div>
        )}
      </div>

      {/* Clear All Milestones Section */}
      <div style={{
        padding: '16px',
        backgroundColor: '#fff3cd',
        border: '2px solid #ff9800',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ color: '#856404', fontSize: '1.1em', margin: 0 }}>⚠️ Clear All Milestones</h3>
          <button
            onClick={handleClearMilestones}
            disabled={!isAdminWalletConnected || clearing || initializing}
            style={{
              ...styles.button,
              backgroundColor: clearing ? '#9e9e9e' : '#f44336',
              color: 'white',
              padding: '10px 20px',
              fontSize: '0.95em',
              cursor: (!isAdminWalletConnected || clearing || initializing) ? 'not-allowed' : 'pointer',
              opacity: (!isAdminWalletConnected || clearing || initializing) ? 0.6 : 1,
            }}
          >
            {clearing ? '🔄 Clearing...' : '🗑️ Clear All'}
          </button>
        </div>
        <p style={{ 
          margin: 0, 
          fontSize: '0.9em', 
          color: '#856404',
          lineHeight: '1.5'
        }}>
          <strong>DANGER:</strong> This will permanently delete ALL milestone definitions from the blockchain. 
          This action cannot be undone. Use this to reset the milestone system or for testing purposes.
        </p>
        {clearProgress && clearing && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            fontSize: '0.85em',
            color: '#c62828',
          }}>
            {clearProgress}
          </div>
        )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: editMode ? '1fr' : '1fr 1fr', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        alignItems: 'end'
      }}>
        <div>
          <label style={{ color: styles.text, display: 'block', marginBottom: '0.5rem' }}>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              if (editMode && hasPendingChanges()) {
                if (!confirm('You have unsaved changes. Switch category anyway?')) {
                  return;
                }
              }
              setSelectedCategory(e.target.value);
              setSearchTerm(''); // Clear search when switching categories
            }}
            style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text, width: '100%' }}
            disabled={(showAddForm && !editingMilestone) || editMode}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
          {editMode && (
            <div style={{ color: '#666', fontSize: '0.85em', marginTop: '0.25rem' }}>
              🔒 Category locked in edit mode
            </div>
          )}
        </div>
        {!editMode && (
          <div>
            <label style={{ color: styles.text, display: 'block', marginBottom: '0.5rem' }}>Search:</label>
            <input
              type="text"
              placeholder="Search by threshold, credits, or items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text, width: '100%' }}
            />
          </div>
        )}
      </div>

      {!showAddForm && (
        <div style={{ 
          marginBottom: '1.5rem', 
          display: 'flex', 
          gap: '0.75rem', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleAddMilestone}
            style={{ 
              ...styles.button, 
              backgroundColor: styles.buttonPrimary,
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
            disabled={!isAdminWalletConnected || editMode}
          >
            ➕ Add Milestone
          </button>
          <button 
            onClick={() => {
              if (editMode && hasPendingChanges()) {
                if (!confirm('Exit edit mode? Unsaved changes will be lost.')) return;
                setPendingChanges({});
                setPendingNewMilestones({});
                setPendingDeletions({});
              }
              setEditMode(!editMode);
            }}
            style={{ 
              ...styles.button, 
              backgroundColor: editMode ? '#ff6b6b' : '#4caf50',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
            disabled={!isAdminWalletConnected}
          >
            {editMode ? '✕ Exit Edit Mode' : '✏️ Edit Mode'}
          </button>
          {hasPendingChanges() && (
            <>
              <button
                onClick={handleSaveAllChanges}
                style={{ 
                  ...styles.button, 
                  backgroundColor: '#2196F3',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontWeight: '500'
                }}
                disabled={saving || !isAdminWalletConnected}
              >
                {saving ? '⏳ Saving...' : '💾 Save All Changes'}
              </button>
              <button
                onClick={handleCancelEdit}
                style={{ 
                  ...styles.button,
                  padding: '10px 20px',
                  borderRadius: '6px'
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          )}
          <button 
            onClick={loadMilestones} 
            style={{ 
              ...styles.button,
              padding: '10px 20px',
              borderRadius: '6px'
            }} 
            disabled={editMode}
          >
            🔄 Refresh
          </button>
          {editMode && pendingCount > 0 && (
            <div style={{ 
              padding: '8px 16px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '6px',
              fontSize: '0.9em',
              color: '#856404',
              border: '1px solid #ffc107'
            }}>
              ⚠️ {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending
              {pendingUpdateCount > 0 && ` (${pendingUpdateCount} update${pendingUpdateCount !== 1 ? 's' : ''})`}
              {pendingNewCount > 0 && ` (${pendingNewCount} new)`}
              {pendingDeleteCount > 0 && ` (${pendingDeleteCount} delete${pendingDeleteCount !== 1 ? 's' : ''})`}
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <div style={{ 
          border: `2px solid ${styles.border}`, 
          padding: '1.5rem', 
          marginTop: '1rem', 
          marginBottom: '1.5rem',
          borderRadius: '8px',
          backgroundColor: styles.bgSecondary
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0, margin: 0 }}>
              {editingMilestone ? '✏️ Edit Milestone' : '➕ Add Milestone'}
            </h3>
            <div style={{ 
              padding: '6px 12px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px',
              fontSize: '0.85em',
              color: '#1976d2',
              border: '1px solid #90caf9'
            }}>
              ℹ️ {editingMilestone ? 'Changes will be added to batch' : 'New milestone will be added to batch'}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ color: styles.text, display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Threshold: <span style={{ color: styles.textError }}>*</span>
              </label>
              <input
                type="number"
                value={formThreshold}
                onChange={(e) => setFormThreshold(parseInt(e.target.value) || 0)}
                style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text, width: '100%' }}
                min="1"
                required
              />
            </div>

            <div>
              <label style={{ color: styles.text, display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Credits:
              </label>
              <input
                type="number"
                value={formCredits}
                onChange={(e) => setFormCredits(parseInt(e.target.value) || 0)}
                style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text, width: '100%' }}
                min="0"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: styles.text, display: 'block', marginBottom: '0.75rem', fontWeight: '500' }}>
              Items:
            </label>
            <div style={{ 
              border: `1px solid ${styles.border}`, 
              borderRadius: '6px', 
              padding: '1rem',
              backgroundColor: styles.bgPrimary
            }}>
              {formItems.length === 0 ? (
                <div style={{ color: styles.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                  No items added. Click "Add Item" to add rewards.
                </div>
              ) : (
                formItems.map((item, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 80px 80px auto',
                      gap: '0.75rem', 
                      marginBottom: '0.75rem', 
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: index % 2 === 0 ? 'transparent' : styles.bgSecondary,
                      borderRadius: '4px'
                    }}
                  >
                    <select
                      value={item.itemId}
                      onChange={(e) => updateFormItem(index, 'itemId', e.target.value)}
                      style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text }}
                    >
                      {ITEM_TYPES.map(type => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.level}
                      onChange={(e) => updateFormItem(index, 'level', parseInt(e.target.value) || 1)}
                      style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text }}
                      min="1"
                      max="3"
                      placeholder="Level"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateFormItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text }}
                      min="1"
                      placeholder="Qty"
                    />
                    <button 
                      onClick={() => removeFormItem(index)} 
                      style={{ 
                        ...styles.button, 
                        backgroundColor: styles.buttonDanger,
                        color: 'white',
                        padding: '6px 12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
              <button 
                onClick={addFormItem} 
                style={{ 
                  ...styles.button,
                  width: '100%',
                  marginTop: formItems.length > 0 ? '0.5rem' : 0
                }}
              >
                ➕ Add Item
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAddForm(false)}
              style={styles.button}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMilestone}
              style={{ 
                ...styles.button,
                backgroundColor: styles.buttonPrimary,
                padding: '10px 24px',
                fontWeight: '500'
              }}
              disabled={saving || !isAdminWalletConnected || formThreshold <= 0}
            >
              {saving ? '⏳ Saving...' : (editingMilestone ? '📝 Add to Batch' : '📝 Add to Batch')}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>
            {CATEGORIES.find(c => c.key === selectedCategory)?.label} Milestones
            {searchTerm && (
              <span style={{ fontSize: '0.8em', color: styles.textSecondary, marginLeft: '0.5rem' }}>
                ({filteredDefs.length} of {allDefs.length})
              </span>
            )}
          </h3>
          {allDefs.length > 0 && (
            <div style={{ fontSize: '0.9em', color: styles.textSecondary }}>
              {categoryDefs.length} existing
              {pendingNewForCategory.length > 0 && ` + ${pendingNewForCategory.length} pending new`}
              {pendingDeletionsForCategory.size > 0 && ` - ${pendingDeletionsForCategory.size} pending delete`}
            </div>
          )}
        </div>
        {allDefs.length === 0 ? (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center', 
            color: styles.textSecondary,
            backgroundColor: styles.bgSecondary,
            borderRadius: '8px',
            border: `1px dashed ${styles.border}`
          }}>
            <div style={{ fontSize: '2em', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontSize: '1.1em', marginBottom: '0.25rem' }}>No milestones defined</div>
            <div style={{ fontSize: '0.9em' }}>Click "Add Milestone" to create one</div>
          </div>
        ) : filteredDefs.length === 0 ? (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: styles.textSecondary,
            backgroundColor: styles.bgSecondary,
            borderRadius: '8px'
          }}>
            No milestones match your search "{searchTerm}"
          </div>
        ) : (
          <div style={{ 
            border: `1px solid ${styles.border}`, 
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: styles.bgSecondary }}>
                  <th style={{ padding: '12px', textAlign: 'left' as const, fontWeight: '600', color: styles.text, borderBottom: `2px solid ${styles.border}`, width: '100px' }}>Milestone ID</th>
                  <th style={{ padding: '12px', textAlign: 'left' as const, fontWeight: '600', color: styles.text, borderBottom: `2px solid ${styles.border}`, width: '80px' }}>Level</th>
                  <th style={{ padding: '12px', textAlign: 'left' as const, fontWeight: '600', color: styles.text, borderBottom: `2px solid ${styles.border}`, width: '150px' }}>Threshold</th>
                  <th style={{ padding: '12px', textAlign: 'left' as const, fontWeight: '600', color: styles.text, borderBottom: `2px solid ${styles.border}`, width: '120px' }}>Credits</th>
                  <th style={{ padding: '12px', textAlign: 'left' as const, fontWeight: '600', color: styles.text, borderBottom: `2px solid ${styles.border}` }}>Items</th>
                  <th style={{ padding: '12px', textAlign: 'left' as const, fontWeight: '600', color: styles.text, borderBottom: `2px solid ${styles.border}`, width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDefs.map((def, index) => {
                  // Check if this is a new milestone
                  const isNewMilestone = pendingNewForCategory.includes(def);
                  
                  // For existing milestones, use the actual on-chain level if available
                  // Otherwise fall back to array index calculation
                  let level = 0;
                  if (!isNewMilestone) {
                    // Use the actual on-chain level number if it exists in the definition
                    if (def.level !== undefined) {
                      level = def.level;
                    } else {
                      // Fallback: find the index in the original categoryDefs array
                      const originalIndex = categoryDefs.findIndex((d) => 
                        d.threshold === def.threshold && 
                        d.credits === def.credits &&
                        JSON.stringify(d.items) === JSON.stringify(def.items)
                      );
                      level = originalIndex !== -1 ? originalIndex + 1 : index + 1;
                    }
                  } else {
                    // For new milestones, calculate based on current count + pending deletions
                    const pendingDeletionsForCategory = pendingDeletions[selectedCategory] || new Set<number>();
                    const remainingCount = categoryDefs.filter(d => {
                      const defLevel = d.level !== undefined ? d.level : (categoryDefs.indexOf(d) + 1);
                      return !pendingDeletionsForCategory.has(defLevel);
                    }).length;
                    level = remainingCount + pendingNewForCategory.indexOf(def) + 1;
                  }
                  
                  const isPendingDelete = !isNewMilestone && pendingDeletionsForCategory.has(level);
                  const displayThreshold = isNewMilestone ? def.threshold : getDisplayValue(selectedCategory, level, 'threshold');
                  const displayCredits = isNewMilestone ? def.credits : getDisplayValue(selectedCategory, level, 'credits');
                  const displayItems = isNewMilestone ? def.items : (getDisplayValue(selectedCategory, level, 'items') as Array<{ itemId: string; level: number; quantity: number }>);
                  const hasChanges = isNewMilestone ? true : (isPendingDelete ? true : pendingChanges[selectedCategory]?.[level] !== undefined);
                
                return (
                  <tr 
                    key={isNewMilestone ? `new-${index}` : `existing-${level}-${index}`} 
                    style={{ 
                      backgroundColor: isPendingDelete 
                        ? '#f5f5f5' 
                        : (hasChanges 
                          ? (isNewMilestone ? '#e8f5e9' : '#fff9c4')
                          : (index % 2 === 0 ? styles.bgPrimary : styles.bgSecondary)),
                      borderBottom: `1px solid ${isPendingDelete ? '#e0e0e0' : styles.border}`,
                      transition: 'background-color 0.2s',
                      borderLeft: isNewMilestone ? `3px solid #4caf50` : (isPendingDelete ? `3px solid #9e9e9e` : 'none'),
                      opacity: isPendingDelete ? 0.5 : 1,
                      color: isPendingDelete ? '#9e9e9e' : styles.text
                    }}
                    onMouseEnter={(e) => {
                      if (!hasChanges) {
                        e.currentTarget.style.backgroundColor = styles.bgTertiary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!hasChanges) {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? styles.bgPrimary : styles.bgSecondary;
                      }
                    }}
                  >
                    <td style={{ padding: '10px', borderBottom: `1px solid ${styles.border}`, color: styles.text, textAlign: 'center', fontWeight: '600' }}>
                      {def.milestoneId !== undefined && def.milestoneId !== null ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: isNewMilestone ? '#4caf50' : (isPendingDelete ? '#9e9e9e' : '#2196F3'),
                          color: 'white',
                          fontSize: '0.85em',
                          opacity: isPendingDelete ? 0.7 : 1
                        }}>
                          ID: {def.milestoneId}
                        </span>
                      ) : (
                        <span style={{ color: styles.textSecondary, fontStyle: 'italic', fontSize: '0.85em' }}>
                          {isNewMilestone ? '🆕 New' : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${styles.border}`, color: styles.text, textAlign: 'center', fontWeight: '600' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '32px',
                        height: '32px',
                        lineHeight: '32px',
                        borderRadius: '50%',
                        backgroundColor: isNewMilestone ? '#4caf50' : (isPendingDelete ? '#9e9e9e' : (hasChanges ? '#ffc107' : styles.buttonPrimary)),
                        color: 'white',
                        fontSize: '0.9em',
                        opacity: isPendingDelete ? 0.7 : 1
                      }}>
                        {isNewMilestone ? '🆕' : (isPendingDelete ? '🗑️' : level)}
                      </span>
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${styles.border}`, color: isPendingDelete ? '#9e9e9e' : styles.text }}>
                      {editMode && !isNewMilestone && !isPendingDelete ? (
                        <input
                          type="number"
                          value={displayThreshold}
                          onChange={(e) => handleInlineEdit(selectedCategory, level, 'threshold', e.target.value)}
                          style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text, width: '100%', maxWidth: '120px' }}
                          min="0"
                          disabled={isPendingDelete}
                        />
                      ) : (
                        <span style={{ 
                          fontWeight: '500',
                          color: isPendingDelete ? '#9e9e9e' : (isNewMilestone || hasChanges ? '#1b5e20' : styles.text),
                          display: 'inline-block',
                          padding: (isNewMilestone || hasChanges) ? '4px 10px' : '0',
                          backgroundColor: (isNewMilestone || hasChanges) ? '#ffffff' : 'transparent',
                          borderRadius: (isNewMilestone || hasChanges) ? '6px' : '0',
                          border: (isNewMilestone || hasChanges) ? '1px solid #4caf50' : 'none',
                          textDecoration: isPendingDelete ? 'line-through' : 'none'
                        }}>
                          {displayThreshold.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${styles.border}`, color: isPendingDelete ? '#9e9e9e' : styles.text }}>
                      {editMode && !isNewMilestone && !isPendingDelete ? (
                        <input
                          type="number"
                          value={displayCredits}
                          onChange={(e) => handleInlineEdit(selectedCategory, level, 'credits', e.target.value)}
                          style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '8px', color: styles.text, width: '100%', maxWidth: '100px' }}
                          min="0"
                          disabled={isPendingDelete}
                        />
                      ) : (
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: isPendingDelete 
                            ? '#e0e0e0' 
                            : (displayCredits > 0 ? '#2e7d32' : '#f5f5f5'),
                          color: isPendingDelete 
                            ? '#9e9e9e' 
                            : (displayCredits > 0 ? '#ffffff' : styles.text),
                          borderRadius: '6px',
                          fontWeight: displayCredits > 0 && !isPendingDelete ? '600' : 'normal',
                          fontSize: '0.9em',
                          border: displayCredits > 0 && !isPendingDelete ? 'none' : `1px solid ${isPendingDelete ? '#bdbdbd' : styles.border}`,
                          textDecoration: isPendingDelete ? 'line-through' : 'none'
                        }}>
                          {displayCredits > 0 ? `💰 ${displayCredits.toLocaleString()}` : '0'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${styles.border}`, color: isPendingDelete ? '#9e9e9e' : styles.text }}>
                      {editMode && !isNewMilestone && !isPendingDelete ? (
                        <div style={{ fontSize: '0.85em' }}>
                          {displayItems.length === 0 ? (
                            <div style={{ color: styles.textSecondary, fontStyle: 'italic' }}>No items</div>
                          ) : (
                            displayItems.map((item, i) => (
                              <div key={i} style={{ 
                                marginBottom: '0.5rem',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                flexWrap: 'wrap'
                              }}>
                                <select
                                  value={item.itemId}
                                  onChange={(e) => {
                                    const newItems = [...displayItems];
                                    newItems[i] = { ...newItems[i], itemId: e.target.value };
                                    handleInlineEdit(selectedCategory, level, 'items', newItems);
                                  }}
                                  style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '4px', color: styles.text, fontSize: '0.85em', flex: '1', minWidth: '120px' }}
                                >
                                  {ITEM_TYPES.map(type => (
                                    <option key={type.id} value={type.id}>{type.label}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  value={item.level}
                                  onChange={(e) => {
                                    const newItems = [...displayItems];
                                    newItems[i] = { ...newItems[i], level: parseInt(e.target.value) || 1 };
                                    handleInlineEdit(selectedCategory, level, 'items', newItems);
                                  }}
                                  style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '4px', color: styles.text, width: '60px', fontSize: '0.85em' }}
                                  min="1"
                                  max="3"
                                  placeholder="L"
                                />
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...displayItems];
                                    newItems[i] = { ...newItems[i], quantity: parseInt(e.target.value) || 1 };
                                    handleInlineEdit(selectedCategory, level, 'items', newItems);
                                  }}
                                  style={{ backgroundColor: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '4px', color: styles.text, width: '60px', fontSize: '0.85em' }}
                                  min="1"
                                  placeholder="Qty"
                                />
                                <button
                                  onClick={() => {
                                    const newItems = displayItems.filter((_, idx) => idx !== i);
                                    handleInlineEdit(selectedCategory, level, 'items', newItems);
                                  }}
                                  style={{ 
                                    ...styles.button, 
                                    fontSize: '0.8em', 
                                    padding: '4px 8px',
                                    backgroundColor: styles.buttonDanger,
                                    color: 'white'
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                          <button
                            onClick={() => {
                              const newItems = [...displayItems, { itemId: 'orbLevel', level: 1, quantity: 1 }];
                              handleInlineEdit(selectedCategory, level, 'items', newItems);
                            }}
                            style={{ 
                              ...styles.button, 
                              fontSize: '0.85em', 
                              padding: '4px 12px',
                              marginTop: '0.25rem'
                            }}
                          >
                            ➕ Add Item
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {displayItems.length === 0 ? (
                            <span style={{ 
                              color: isPendingDelete ? '#bdbdbd' : styles.textSecondary, 
                              fontStyle: 'italic',
                              textDecoration: isPendingDelete ? 'line-through' : 'none'
                            }}>No items</span>
                          ) : (
                            displayItems.map((item, i) => (
                              <span
                                key={i}
                                style={{
                                  display: 'inline-block',
                                  color: isPendingDelete ? '#9e9e9e' : styles.text,
                                  textDecoration: isPendingDelete ? 'line-through' : 'none',
                                  padding: '4px 10px',
                                  backgroundColor: styles.bgTertiary,
                                  borderRadius: '12px',
                                  fontSize: '0.85em',
                                  border: `1px solid ${styles.border}`
                                }}
                              >
                                {formatItem(item)}
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px', borderBottom: `1px solid ${styles.border}`, color: isPendingDelete ? '#9e9e9e' : styles.text }}>
                      {!editMode && !isNewMilestone && !isPendingDelete && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEditMilestone(selectedCategory, level)}
                            style={{ 
                              ...styles.button,
                              padding: '6px 12px',
                              fontSize: '0.9em',
                              borderRadius: '6px'
                            }}
                            disabled={!isAdminWalletConnected}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMilestone(selectedCategory, level)}
                            style={{ 
                              ...styles.button,
                              backgroundColor: styles.buttonDanger,
                              color: 'white',
                              padding: '6px 12px',
                              fontSize: '0.9em',
                              borderRadius: '6px'
                            }}
                            disabled={!isAdminWalletConnected || saving}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                      {!editMode && isNewMilestone && (
                        <span style={{ 
                          color: '#4caf50', 
                          fontSize: '0.85em',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🆕 Pending
                        </span>
                      )}
                      {!editMode && isPendingDelete && (
                        <span style={{ 
                          color: '#9e9e9e', 
                          fontSize: '0.85em',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🗑️ Pending Delete
                        </span>
                      )}
                      {!editMode && isPendingDelete && (
                        <span style={{ 
                          color: '#9e9e9e', 
                          fontSize: '0.85em',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🗑️ Pending Delete
                        </span>
                      )}
                      {editMode && hasChanges && (
                        <span style={{ 
                          color: isNewMilestone ? '#4caf50' : (isPendingDelete ? '#9e9e9e' : '#ff6b6b'), 
                          fontSize: '0.85em',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isNewMilestone ? '🆕 New' : (isPendingDelete ? '🗑️ Delete' : '✏️ Modified')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
    </>
  );
}
