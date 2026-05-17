// ==========================================
// Admin Page - Game Config Management Tab
// Manage pack configurations, thresholds, and other game settings
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { TournamentCreationFeeEditor } from '../components/TournamentCreationFeeEditor';

interface GameConfigTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

type StoreSku = {
  offerId?: string;
  priceUsdCents?: number;
  amount?: number;
  description?: string;
  additionalData?: string;
  listingSource?: string;
  itemKey?: string;
  level?: number;
  active?: boolean;
  bundleLines?: Array<{ balanceKey: string; amount: number }>;
};

function parseSkuDisplayName(sku: StoreSku, fallbackId: string): string {
  const additionalData = typeof sku?.additionalData === 'string' ? sku.additionalData : '';
  try {
    const j = JSON.parse(additionalData) as { name?: string };
    if (typeof j?.name === 'string' && j.name.trim()) return j.name.trim();
  } catch {
    /* ignore */
  }
  const desc = typeof sku?.description === 'string' ? sku.description.trim() : '';
  return desc || fallbackId;
}

interface BadgeConfig {
  storeDiscounts: number[];
  gameplayDiscounts: number[];
  thresholds: number[];
  mintingFeeUsdCents: number;
  version: number;
}

// Ticket bundles and credit packs are represented as Stockroom SKUs now (no packType).

/** Legacy on-chain pack row shape (admin pack API); UI mostly defers to Stockroom SKUs. */
interface PackConfig {
  packType: number;
  priceUsdCents: number;
  games: number;
  name: string;
  description: string;
}

/** Legacy ticket bundle row (admin ticket-bundle API); optional packType for on-chain rows. */
interface TicketBundle {
  quantity: number;
  priceUsdCents: number;
  name: string;
  description: string;
  packType?: number;
}

interface GameConfig {
  version: number;
  /** Stockroom SKU map (source-of-truth for store pricing). */
  storeSkus: Record<string, StoreSku>;
  badgeConfig?: BadgeConfig;
  minTokenBalance?: number; // Minimum token balance required to play (in smallest unit with 6 decimals)
  /** Tournament creation fee — app fee in USD cents. From Helm. */
  tournamentCreationFeeUsdCents?: number;
  /** Optional token-denominated tournament fee source. */
  tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
  tournamentCreationFeeTokenAmount?: number;
  /** When 'none', registry is not configured; when 'registry', config was read from chain; when 'platform', from platform app-config. */
  configSource?: 'none' | 'registry' | 'platform';
  /** Legacy on-chain rows only; storefront uses Stockroom SKUs. */
  ticketBundles?: TicketBundle[];
}

/** From platform when app-config is empty; helps diagnose why credit packs don't show. */
interface PlatformAppConfigDebug {
  appIdTruncated: string;
  appsTableDynamicFieldCount?: number;
  ecosystemsTableDynamicFieldCount?: number;
  storeFound: boolean;
  entryCount?: number;
  /** True when platform used the cap's on-chain identity for lookup. */
  usedCapIdentity?: boolean;
  lookupEcosystemIdTruncated?: string;
  lookupAppIdTruncated?: string;
}


export function GameConfigTab({
  isAdminWalletConnected,
  connectedAddress,
  adminAddress,
  styles,
}: GameConfigTabProps) {
  const [activeSection, setActiveSection] = useState<'credits' | 'tournament-tickets' | 'thresholds' | 'badges'>('credits');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [platformDebug, setPlatformDebug] = useState<PlatformAppConfigDebug | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onChainConfigConfigured, setOnChainConfigConfigured] = useState<boolean | null>(null);
  const [onChainConfigError, setOnChainConfigError] = useState<string | null>(null);
  // Store pricing is sourced from Stockroom SKUs (see Stockroom tab). packType-based editing is deprecated.
  const [editingPack, setEditingPack] = useState<number | null>(null);
  const [packForm, setPackForm] = useState<any>(null);
  const [updateResult, setUpdateResult] = useState<{
    success: boolean;
    message?: string;
    digest?: string;
    error?: string;
  } | null>(null);
  
  // Threshold management
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    minTokenBalanceMews: 250000, // Default: 250,000 MEWS (human-readable, will be converted to raw with 6 decimals)
  });
  const [thresholdUpdateResult, setThresholdUpdateResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Tournament ticket bundles are Stockroom SKUs now (no packType UI here).
  const [editingTicketBundle, setEditingTicketBundle] = useState<number | null>(null);
  const [ticketBundleForm, setTicketBundleForm] = useState<any>(null);
  const [ticketBundleUpdateResult, setTicketBundleUpdateResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Badge configuration management
  const [editingBadgeDiscounts, setEditingBadgeDiscounts] = useState(false);
  const [badgeDiscountForm, setBadgeDiscountForm] = useState({
    storeDiscounts: [0, 5, 10, 15, 20, 25], // [standard, common, uncommon, rare, epic, legendary]
    gameplayDiscounts: [0, 0, 5, 10, 15, 20], // [standard, common, uncommon, rare, epic, legendary]
  });
  const [badgeDiscountUpdateResult, setBadgeDiscountUpdateResult] = useState<{
    success: boolean;
    message?: string;
    digest?: string;
    error?: string;
  } | null>(null);

  const [editingBadgeThresholds, setEditingBadgeThresholds] = useState(false);
  const [badgeThresholdForm, setBadgeThresholdForm] = useState({
    thresholds: [5, 15, 35, 75, 150], // [common, uncommon, rare, epic, legendary] - games required
  });
  const [badgeThresholdUpdateResult, setBadgeThresholdUpdateResult] = useState<{
    success: boolean;
    message?: string;
    digest?: string;
    error?: string;
  } | null>(null);

  const [editingBadgeMintingFee, setEditingBadgeMintingFee] = useState(false);
  const [badgeMintingFeeForm, setBadgeMintingFeeForm] = useState({
    mintingFeeUsdCents: 10,
  });
  const [badgeMintingFeeUpdateResult, setBadgeMintingFeeUpdateResult] = useState<{
    success: boolean;
    message?: string;
    digest?: string;
    error?: string;
  } | null>(null);

  // Initialize defaults (credits, ticket bundles, badges)
  const [initCreditsLoading, setInitCreditsLoading] = useState(false);
  const [initCreditsResult, setInitCreditsResult] = useState<{ success: boolean; message?: string; digest?: string; error?: string; viaPlatform?: boolean } | null>(null);
  const [initTicketsLoading, setInitTicketsLoading] = useState(false);
  const [initTicketsResult, setInitTicketsResult] = useState<{ success: boolean; message?: string; digest?: string; error?: string } | null>(null);
  const [initBadgesLoading, setInitBadgesLoading] = useState(false);
  const [initBadgesResult, setInitBadgesResult] = useState<{ success: boolean; message?: string; digest?: string; error?: string } | null>(null);

  // Add credit pack
  const [showAddPack, setShowAddPack] = useState(false);
  const [addPackForm, setAddPackForm] = useState({ packType: 5, priceUsdCents: 500, games: 60, name: '', description: '' });
  const [addPackResult, setAddPackResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [deletePackResult, setDeletePackResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Add ticket bundle
  const [showAddTicketBundle, setShowAddTicketBundle] = useState(false);
  const [addTicketBundleForm, setAddTicketBundleForm] = useState({ quantity: 10, priceUsdCents: 800, name: '', description: '' });
  const [addTicketBundleResult, setAddTicketBundleResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [deleteTicketBundleResult, setDeleteTicketBundleResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const canWriteOnChain = onChainConfigConfigured !== false;

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    setOnChainConfigError(null);
    try {
      const apiUrl = getApiUrl('api/game-config');
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.success && data.config) {
        setConfig(data.config);
        setPlatformDebug(data.platformDebug ?? null);
        // Initialize threshold form with current value (convert from raw to human-readable)
        if (data.config.minTokenBalance !== undefined) {
          setThresholdForm({ minTokenBalanceMews: rawToMews(data.config.minTokenBalance) });
        }
        // Initialize badge forms with current values
        if (data.config.badgeConfig) {
          setBadgeDiscountForm({
            storeDiscounts: data.config.badgeConfig.storeDiscounts || [0, 5, 10, 15, 20, 25],
            gameplayDiscounts: data.config.badgeConfig.gameplayDiscounts || [0, 0, 5, 10, 15, 20],
          });
          setBadgeThresholdForm({
            thresholds: data.config.badgeConfig.thresholds || [5, 15, 35, 75, 150],
          });
          setBadgeMintingFeeForm({
            mintingFeeUsdCents: data.config.badgeConfig.mintingFeeUsdCents || 10,
          });
        }
      } else {
        setError(data.error || 'Failed to load config');
        setPlatformDebug(null);
      }

      // Also check whether the on-chain game config is configured (registry + admin cap)
      // This endpoint is safe to call without auth and will return { configured: boolean }.
      try {
        const thresholdApiUrl = getApiUrl('api/game-config/admin/threshold');
        const thresholdResp = await fetch(thresholdApiUrl);
        const thresholdData = await thresholdResp.json().catch(() => null);
        if (thresholdData && typeof thresholdData.configured === 'boolean') {
          setOnChainConfigConfigured(thresholdData.configured);
          if (!thresholdData.configured) {
            setOnChainConfigError(
              thresholdData.error ||
                'On-chain game config is not configured (missing registry/admin capability IDs).'
            );
          }
        } else {
          // Unknown shape (older backend) – don't block UI, but don't claim it's configured either.
          setOnChainConfigConfigured(null);
        }
      } catch (e: any) {
        setOnChainConfigConfigured(null);
        setOnChainConfigError(e?.message || 'Failed to check on-chain game config status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const formatApiError = async (response: Response): Promise<string> => {
    const fallback = `Request failed (HTTP ${response.status})`;
    try {
      const data = await response.json().catch(() => null);
      return data?.error || data?.message || fallback;
    } catch {
      return fallback;
    }
  };

  const startEditPack = (pack: PackConfig) => {
    setEditingPack(pack.packType);
    setPackForm({ ...pack });
    setUpdateResult(null);
  };

  const cancelEdit = () => {
    setEditingPack(null);
    setPackForm({
      packType: 1,
      priceUsdCents: 100,
      games: 11,
      name: '',
      description: '',
    });
    setUpdateResult(null);
  };

  const handleUpdatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain) {
      setUpdateResult({
        success: false,
        error: onChainConfigError || 'On-chain game config is not configured on this network.',
      });
      return;
    }
    if (!isAdminWalletConnected || !connectedAddress) {
      setUpdateResult({
        success: false,
        error: 'Admin wallet must be connected',
      });
      return;
    }

    setLoading(true);
    setUpdateResult(null);
    setError(null);

    try {
      const apiUrl = getApiUrl('api/game-config/admin');
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...packForm,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUpdateResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        setEditingPack(null);
        // Reload config
        await loadConfig();
      } else {
        setUpdateResult({
          success: false,
          error: data.error || 'Failed to update pack config',
        });
      }
    } catch (err: any) {
      setUpdateResult({
        success: false,
        error: err.message || 'Failed to update pack config',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain) {
      setThresholdUpdateResult({
        success: false,
        error: onChainConfigError || 'On-chain game config is not configured on this network.',
      });
      return;
    }
    if (!isAdminWalletConnected || !connectedAddress) {
      setThresholdUpdateResult({
        success: false,
        error: 'Admin wallet must be connected',
      });
      return;
    }

    setLoading(true);
    setThresholdUpdateResult(null);
    setError(null);

    try {
      const apiUrl = getApiUrl('api/game-config/admin/threshold');
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          minTokenBalance: mewsToRaw(thresholdForm.minTokenBalanceMews), // Convert human-readable to raw
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setThresholdUpdateResult({
          success: true,
          message: data.message || 'Threshold updated successfully',
        });
        setEditingThreshold(false);
        await loadConfig();
      } else {
        const message = data?.error || (await formatApiError(response));
        setThresholdUpdateResult({
          success: false,
          error: message || 'Failed to update threshold',
        });
      }
    } catch (err: any) {
      setThresholdUpdateResult({
        success: false,
        error: err.message || 'Failed to update threshold',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTokenBalance = (balance: number): string => {
    // Balance is in smallest unit (6 decimals), so divide by 1e6
    const formatted = (balance / 1_000_000).toLocaleString();
    return `${formatted} $MEWS`;
  };

  // Convert raw balance (smallest unit with 6 decimals) to human-readable MEWS
  const rawToMews = (raw: number): number => {
    return raw / 1_000_000;
  };

  // Convert human-readable MEWS to raw balance (smallest unit with 6 decimals)
  const mewsToRaw = (mews: number): number => {
    return Math.round(mews * 1_000_000);
  };

  const startEditTicketBundle = (bundle: TicketBundle, index: number) => {
    setEditingTicketBundle(index);
    setTicketBundleForm({ ...bundle });
    setTicketBundleUpdateResult(null);
  };

  const cancelTicketBundleEdit = () => {
    setEditingTicketBundle(null);
    setTicketBundleForm({
      quantity: 1,
      priceUsdCents: 100,
      name: '',
      description: '',
    });
    setTicketBundleUpdateResult(null);
  };

  const handleUpdateTicketBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain) {
      setTicketBundleUpdateResult({
        success: false,
        error: onChainConfigError || 'On-chain game config is not configured on this network.',
      });
      return;
    }
    if (!isAdminWalletConnected || !connectedAddress) {
      setTicketBundleUpdateResult({
        success: false,
        error: 'Admin wallet must be connected',
      });
      return;
    }

    setLoading(true);
    setTicketBundleUpdateResult(null);
    setError(null);

    try {
      const apiUrl = getApiUrl('api/game-config/admin/ticket-bundle');
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticketBundleForm,
          ...(ticketBundleForm.packType != null && ticketBundleForm.packType >= 10 ? { packType: ticketBundleForm.packType } : {}),
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTicketBundleUpdateResult({
          success: true,
          message: data.message || 'Ticket bundle updated successfully',
        });
        setEditingTicketBundle(null);
        await loadConfig();
      } else {
        setTicketBundleUpdateResult({
          success: false,
          error: data.error || 'Failed to update ticket bundle',
        });
      }
    } catch (err: any) {
      setTicketBundleUpdateResult({
        success: false,
        error: err.message || 'Failed to update ticket bundle',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain || !isAdminWalletConnected || !connectedAddress) {
      setAddPackResult({ success: false, error: 'On-chain config required and admin wallet connected.' });
      return;
    }
    setLoading(true);
    setAddPackResult(null);
    try {
      const res = await fetch(getApiUrl('api/game-config/admin/pack'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addPackForm, adminWalletAddress: connectedAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setAddPackResult({ success: true, message: data.message });
        setShowAddPack(false);
        setAddPackForm({ packType: 5, priceUsdCents: 500, games: 60, name: '', description: '' });
        await loadConfig();
      } else {
        setAddPackResult({ success: false, error: data.error || 'Failed to add pack' });
      }
    } catch (err: any) {
      setAddPackResult({ success: false, error: err.message || 'Failed to add pack' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePack = async (packType: number) => {
    if (!canWriteOnChain || !isAdminWalletConnected || !connectedAddress) {
      setDeletePackResult({ success: false, error: 'On-chain config required and admin wallet connected.' });
      return;
    }
    if (!confirm(`Remove credit pack type ${packType}? This cannot be undone.`)) return;
    setLoading(true);
    setDeletePackResult(null);
    try {
      const url = `${getApiUrl('api/game-config/admin/pack')}?packType=${packType}&adminWalletAddress=${encodeURIComponent(connectedAddress)}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeletePackResult({ success: true, message: data.message });
        await loadConfig();
      } else {
        setDeletePackResult({ success: false, error: data.error || 'Failed to remove pack' });
      }
    } catch (err: any) {
      setDeletePackResult({ success: false, error: err.message || 'Failed to remove pack' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTicketBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain || !isAdminWalletConnected || !connectedAddress) {
      setAddTicketBundleResult({ success: false, error: 'On-chain config required and admin wallet connected.' });
      return;
    }
    setLoading(true);
    setAddTicketBundleResult(null);
    try {
      const res = await fetch(getApiUrl('api/game-config/admin/ticket-bundle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addTicketBundleForm, adminWalletAddress: connectedAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setAddTicketBundleResult({ success: true, message: data.message });
        setShowAddTicketBundle(false);
        setAddTicketBundleForm({ quantity: 10, priceUsdCents: 800, name: '', description: '' });
        await loadConfig();
      } else {
        setAddTicketBundleResult({ success: false, error: data.error || 'Failed to add ticket bundle' });
      }
    } catch (err: any) {
      setAddTicketBundleResult({ success: false, error: err.message || 'Failed to add ticket bundle' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicketBundle = async (packType: number) => {
    if (!canWriteOnChain || !isAdminWalletConnected || !connectedAddress) {
      setDeleteTicketBundleResult({ success: false, error: 'On-chain config required and admin wallet connected.' });
      return;
    }
    if (!confirm(`Remove this ticket bundle? This cannot be undone.`)) return;
    setLoading(true);
    setDeleteTicketBundleResult(null);
    try {
      const url = `${getApiUrl('api/game-config/admin/pack')}?packType=${packType}&adminWalletAddress=${encodeURIComponent(connectedAddress)}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteTicketBundleResult({ success: true, message: data.message });
        await loadConfig();
      } else {
        setDeleteTicketBundleResult({ success: false, error: data.error || 'Failed to remove ticket bundle' });
      }
    } catch (err: any) {
      setDeleteTicketBundleResult({ success: false, error: err.message || 'Failed to remove ticket bundle' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBadgeDiscounts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain) {
      setBadgeDiscountUpdateResult({
        success: false,
        error: onChainConfigError || 'On-chain game config is not configured on this network.',
      });
      return;
    }
    if (!isAdminWalletConnected || !connectedAddress) {
      setBadgeDiscountUpdateResult({
        success: false,
        error: 'Admin wallet must be connected',
      });
      return;
    }

    setLoading(true);
    setBadgeDiscountUpdateResult(null);
    setError(null);

    try {
      const apiUrl = getApiUrl('api/game-config/admin');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'badge-discounts',
          storeDiscounts: badgeDiscountForm.storeDiscounts,
          gameplayDiscounts: badgeDiscountForm.gameplayDiscounts,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBadgeDiscountUpdateResult({
          success: true,
          message: data.message || 'Badge discounts updated successfully',
          digest: data.digest,
        });
        setEditingBadgeDiscounts(false);
        await loadConfig();
      } else {
        setBadgeDiscountUpdateResult({
          success: false,
          error: data.error || 'Failed to update badge discounts',
        });
      }
    } catch (err: any) {
      setBadgeDiscountUpdateResult({
        success: false,
        error: err.message || 'Failed to update badge discounts',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBadgeThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain) {
      setBadgeThresholdUpdateResult({
        success: false,
        error: onChainConfigError || 'On-chain game config is not configured on this network.',
      });
      return;
    }
    if (!isAdminWalletConnected || !connectedAddress) {
      setBadgeThresholdUpdateResult({
        success: false,
        error: 'Admin wallet must be connected',
      });
      return;
    }

    setLoading(true);
    setBadgeThresholdUpdateResult(null);
    setError(null);

    try {
      const apiUrl = getApiUrl('api/game-config/admin');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'badge-thresholds',
          thresholds: badgeThresholdForm.thresholds,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBadgeThresholdUpdateResult({
          success: true,
          message: data.message || 'Badge thresholds updated successfully',
          digest: data.digest,
        });
        setEditingBadgeThresholds(false);
        await loadConfig();
      } else {
        setBadgeThresholdUpdateResult({
          success: false,
          error: data.error || 'Failed to update badge thresholds',
        });
      }
    } catch (err: any) {
      setBadgeThresholdUpdateResult({
        success: false,
        error: err.message || 'Failed to update badge thresholds',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBadgeMintingFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteOnChain) {
      setBadgeMintingFeeUpdateResult({
        success: false,
        error: onChainConfigError || 'On-chain game config is not configured on this network.',
      });
      return;
    }
    if (!isAdminWalletConnected || !connectedAddress) {
      setBadgeMintingFeeUpdateResult({
        success: false,
        error: 'Admin wallet must be connected',
      });
      return;
    }

    setLoading(true);
    setBadgeMintingFeeUpdateResult(null);
    setError(null);

    try {
      const apiUrl = getApiUrl('api/game-config/admin');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'badge-minting-fee',
          mintingFeeUsdCents: badgeMintingFeeForm.mintingFeeUsdCents,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBadgeMintingFeeUpdateResult({
          success: true,
          message: data.message || 'Badge minting fee updated successfully',
          digest: data.digest,
        });
        setEditingBadgeMintingFee(false);
        await loadConfig();
      } else {
        setBadgeMintingFeeUpdateResult({
          success: false,
          error: data.error || 'Failed to update badge minting fee',
        });
      }
    } catch (err: any) {
      setBadgeMintingFeeUpdateResult({
        success: false,
        error: err.message || 'Failed to update badge minting fee',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeCredits = async () => {
    if (!isAdminWalletConnected || !connectedAddress) return;
    setInitCreditsLoading(true);
    setInitCreditsResult(null);
    try {
      const response = await fetch(getApiUrl('api/game-config/admin/initialize/credits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress,
          includePricing: false,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setInitCreditsResult({
          success: true,
          message: data.message,
          digest: data.digest,
          viaPlatform: data.viaPlatform,
        });
        await loadConfig();
      } else {
        setInitCreditsResult({ success: false, error: data.error || 'Initialize failed' });
      }
    } catch (err: any) {
      setInitCreditsResult({ success: false, error: err.message || 'Initialize failed' });
    } finally {
      setInitCreditsLoading(false);
    }
  };

  const handleInitializeTickets = async () => {
    if (!isAdminWalletConnected || !connectedAddress) return;
    setInitTicketsLoading(true);
    setInitTicketsResult(null);
    try {
      const response = await fetch(getApiUrl('api/game-config/admin/initialize/ticket-bundles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress,
          includePricing: false,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setInitTicketsResult({ success: true, message: data.message, digest: data.digest });
        await loadConfig();
      } else {
        setInitTicketsResult({ success: false, error: data.error || 'Initialize failed' });
      }
    } catch (err: any) {
      setInitTicketsResult({ success: false, error: err.message || 'Initialize failed' });
    } finally {
      setInitTicketsLoading(false);
    }
  };

  const handleInitializeBadges = async () => {
    if (!isAdminWalletConnected || !connectedAddress) return;
    setInitBadgesLoading(true);
    setInitBadgesResult(null);
    try {
      const response = await fetch(getApiUrl('api/game-config/admin/initialize/badges'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminWalletAddress: connectedAddress }),
      });
      const data = await response.json();
      if (data.success) {
        setInitBadgesResult({ success: true, message: data.message, digest: data.digest });
        await loadConfig();
      } else {
        setInitBadgesResult({ success: false, error: data.error || 'Initialize failed' });
      }
    } catch (err: any) {
      setInitBadgesResult({ success: false, error: err.message || 'Initialize failed' });
    } finally {
      setInitBadgesLoading(false);
    }
  };

  return (
    <>
      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: `2px solid ${styles.border}` }}>
        <button
          type="button"
          onClick={() => setActiveSection('credits')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'credits' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'credits' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'credits' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          💳 Credits
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('tournament-tickets')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'tournament-tickets' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'tournament-tickets' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'tournament-tickets' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🎫 Tournament Config
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('thresholds')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'thresholds' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'thresholds' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'thresholds' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🚪 Game Thresholds
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('badges')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeSection === 'badges' ? styles.buttonPrimary : styles.bgSecondary,
            color: activeSection === 'badges' ? 'white' : styles.text,
            border: 'none',
            borderBottom: activeSection === 'badges' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          🎖️ Badges
        </button>
      </div>

      {/* Header and Common Elements */}
      <div style={{ marginBottom: '2rem' }}>
        {!isAdminWalletConnected && (
          <div
            style={{
              padding: '1rem',
              background: styles.bgWarning,
              borderRadius: '4px',
              marginBottom: '1rem',
              border: `1px solid ${styles.border}`,
            }}
          >
            <strong>⚠️ Admin wallet required:</strong> Please connect the admin wallet to update configurations.
          </div>
        )}

        {onChainConfigConfigured === false && (
          <div
            style={{
              padding: '1rem',
              background: styles.bgWarning,
              borderRadius: '4px',
              marginBottom: '1rem',
              border: `1px solid ${styles.border}`,
            }}
          >
            <strong>⚠️ Game config (v2 platform) not set up:</strong>{' '}
            {onChainConfigError ||
              'Set PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID, and APP_CAPABILITY_OBJECT_ID in .env, then run Initialize (defaults).'}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, color: styles.heading }}>
            ⚙️ Game Configuration
          </h2>
          <button
            type="button"
            onClick={loadConfig}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Loading...' : '🔄 Refresh Config'}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: styles.bgError,
              borderRadius: '4px',
              marginBottom: '1rem',
              border: `1px solid ${styles.borderError}`,
              color: styles.textError,
            }}
          >
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {updateResult && (
          <div
            style={{
              padding: '1rem',
              background: updateResult.success ? styles.bgSuccess : styles.bgError,
              borderRadius: '4px',
              marginBottom: '1rem',
              border: `1px solid ${updateResult.success ? styles.borderSuccess : styles.borderError}`,
              color: updateResult.success ? styles.textSuccess : styles.textError,
            }}
          >
            {updateResult.success ? (
              <div>
                <strong>✅ Success!</strong>
                <p>{updateResult.message}</p>
                {updateResult.digest && (
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Transaction:{' '}
                    <code
                      style={{
                        backgroundColor: styles.bgTertiary,
                        padding: '0.2rem 0.4rem',
                        borderRadius: '3px',
                      }}
                    >
                      {updateResult.digest}
                    </code>
                  </p>
                )}
              </div>
            ) : (
              <div>
                <strong>❌ Error:</strong>
                <p>{updateResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credits Section */}
      {activeSection === 'credits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">💳 Credits Configuration</h2>
            </div>
            <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Credit pricing is managed in Stockroom. This screen shows a read-only preview of the Stockroom SKU map used by the game.
            </p>

            {canWriteOnChain && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleInitializeCredits}
                  disabled={initCreditsLoading || !isAdminWalletConnected}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: initCreditsLoading || !isAdminWalletConnected ? styles.buttonDisabled : '#2E7D32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: initCreditsLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {initCreditsLoading ? 'Initializing...' : 'Initialize (defaults)'}
                </button>
                {initCreditsResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.5rem 0.75rem',
                      background: initCreditsResult.success ? styles.bgSuccess : styles.bgError,
                      color: initCreditsResult.success ? styles.textSuccess : styles.textError,
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                    }}>
                      {initCreditsResult.success ? `✅ ${initCreditsResult.message}` : `❌ ${initCreditsResult.error}`}
                    </span>
                    {initCreditsResult.success && initCreditsResult.viaPlatform && (
                      <span style={{ fontSize: '0.85rem', color: styles.textSecondary }}>
                        If credit packs don&apos;t appear below: ensure <strong>ECOSYSTEM_ID</strong> and <strong>APP_ID</strong> in the game backend <code>.env</code> exactly match the <code>--ecosystem-id</code> and <code>--app-id</code> used when you ran <code>register-and-mint-app-admin-cap.js</code> (the App Capability stores those; writes use the cap&apos;s identity).
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Credit pack editing removed: pricing is managed in Stockroom */}

        <div
          style={{
            padding: '1rem',
            background: styles.bgTertiary,
            borderRadius: '4px',
            border: `1px solid ${styles.border}`,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Store pricing is managed in Stockroom</div>
          <div style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
            This screen no longer uses <code>packType</code>. Source of truth is the Stockroom SKU map (item listings + bundle offers).
            Use the <strong>Stockroom</strong> tab to edit prices.
          </div>
          <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
            {config?.storeSkus ? (() => {
              const rows = Object.entries(config.storeSkus)
                .filter(([id, sku]) => (id === 'credits' || id.startsWith('credit_pack_')) && Number((sku as any)?.priceUsdCents ?? 0) > 0)
                .slice(0, 30);
              if (rows.length === 0) {
                return <div style={{ color: styles.textSecondary }}>No credit SKUs configured in Stockroom.</div>;
              }
              return rows.map(([id, sku]) => (
                <div key={`sku-${id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ fontWeight: 600 }}>{parseSkuDisplayName(sku, id)}</div>
                  <div style={{ color: styles.textSecondary }}>
                    ${(((sku?.priceUsdCents ?? 0) as number) / 100).toFixed(2)}
                  </div>
                </div>
              ));
            })() : null}
          </div>
        </div>
          </div>
        </div>
      )}

      {/* Tournament Config Section */}
      {activeSection === 'tournament-tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <TournamentCreationFeeEditor
            styles={styles}
            isAdminWalletConnected={isAdminWalletConnected}
            connectedAddress={connectedAddress}
            canWriteOnChain={canWriteOnChain}
            onChainUnavailableMessage={onChainConfigError || 'On-chain game config is not configured on this network.'}
          />

          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">🎫 Tournament Tickets</h2>
            </div>
            <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Tickets are an individual item in Provisions. Pricing is managed in Stockroom (base listing for <code>tickets</code>). Bundle/packs are disabled while tickets are validated.
            </p>

            {canWriteOnChain && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleInitializeTickets}
                  disabled={initTicketsLoading || !isAdminWalletConnected}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: initTicketsLoading || !isAdminWalletConnected ? styles.buttonDisabled : '#2E7D32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: initTicketsLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {initTicketsLoading ? 'Initializing...' : 'Initialize (defaults)'}
                </button>
                {/* Ticket bundle editing removed: pricing is managed in Stockroom */}
                {initTicketsResult && (
                  <span style={{
                    padding: '0.5rem 0.75rem',
                    background: initTicketsResult.success ? styles.bgSuccess : styles.bgError,
                    color: initTicketsResult.success ? styles.textSuccess : styles.textError,
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                  }}>
                    {initTicketsResult.success ? `✅ ${initTicketsResult.message}` : `❌ ${initTicketsResult.error}`}
                  </span>
                )}
                {/* Ticket bundle result banners removed */}
              </div>
            )}

            {false && showAddTicketBundle && canWriteOnChain && (
              <form onSubmit={handleAddTicketBundle} style={{
                padding: '1rem',
                background: styles.bgSecondary,
                borderRadius: '4px',
                border: `1px solid ${styles.border}`,
                marginBottom: '1rem',
              }}>
                <h4 style={{ margin: '0 0 0.75rem', color: styles.heading }}>New ticket bundle</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Quantity (tickets)</label>
                    <input type="number" min={1} value={addTicketBundleForm.quantity} onChange={(e) => setAddTicketBundleForm({ ...addTicketBundleForm, quantity: parseInt(e.target.value, 10) || 1 })} required style={{ width: '100%', padding: '0.5rem', background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', color: styles.text }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Price (USD cents)</label>
                    <input type="number" min={1} value={addTicketBundleForm.priceUsdCents} onChange={(e) => setAddTicketBundleForm({ ...addTicketBundleForm, priceUsdCents: parseInt(e.target.value, 10) || 0 })} required style={{ width: '100%', padding: '0.5rem', background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', color: styles.text }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Name</label>
                    <input type="text" value={addTicketBundleForm.name} onChange={(e) => setAddTicketBundleForm({ ...addTicketBundleForm, name: e.target.value })} required style={{ width: '100%', padding: '0.5rem', background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', color: styles.text }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Description</label>
                    <textarea value={addTicketBundleForm.description} onChange={(e) => setAddTicketBundleForm({ ...addTicketBundleForm, description: e.target.value })} required rows={2} style={{ width: '100%', padding: '0.5rem', background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: '4px', color: styles.text }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: styles.buttonPrimary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add bundle</button>
                  <button type="button" onClick={() => { setShowAddTicketBundle(false); setAddTicketBundleResult(null); }} style={{ padding: '0.5rem 1rem', background: styles.bgTertiary, color: styles.text, border: `1px solid ${styles.border}`, borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}

            {false && (config?.ticketBundles?.length ?? 0) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(config?.ticketBundles ?? []).map((bundle, idx) => (
                  <div
                    key={`ticket-bundle-${idx}`}
                    style={{
                      padding: '1.5rem',
                      background: styles.bgSecondary,
                      borderRadius: '4px',
                      border: `1px solid ${styles.border}`,
                    }}
                  >
                    {editingTicketBundle === idx ? (
                      <form onSubmit={handleUpdateTicketBundle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                              Quantity:
                            </label>
                            <input
                              type="number"
                              value={ticketBundleForm.quantity}
                              disabled
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: styles.inputBg,
                                border: `1px solid ${styles.border}`,
                                borderRadius: '4px',
                                color: styles.textSecondary,
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                              Name:
                            </label>
                            <input
                              type="text"
                              value={ticketBundleForm.name}
                              onChange={(e) => setTicketBundleForm({ ...ticketBundleForm, name: e.target.value })}
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
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                              Price (USD Cents):
                            </label>
                            <input
                              type="number"
                              value={ticketBundleForm.priceUsdCents}
                              onChange={(e) => setTicketBundleForm({ ...ticketBundleForm, priceUsdCents: parseInt(e.target.value) || 0 })}
                              required
                              min="1"
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: styles.inputBg,
                                border: `1px solid ${styles.border}`,
                                borderRadius: '4px',
                                color: styles.text,
                              }}
                            />
                            <small style={{ color: styles.textSecondary }}>
                              ${(ticketBundleForm.priceUsdCents / 100).toFixed(2)}
                            </small>
                          </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            Description:
                          </label>
                          <textarea
                            value={ticketBundleForm.description}
                            onChange={(e) => setTicketBundleForm({ ...ticketBundleForm, description: e.target.value })}
                            required
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              background: styles.inputBg,
                              border: `1px solid ${styles.border}`,
                              borderRadius: '4px',
                              color: styles.text,
                              resize: 'vertical',
                            }}
                          />
                        </div>

                        {ticketBundleUpdateResult && (
                          <div
                            style={{
                              padding: '0.75rem',
                              background: ticketBundleUpdateResult.success ? styles.bgSuccess : styles.bgError,
                              borderRadius: '4px',
                              marginBottom: '1rem',
                              border: `1px solid ${ticketBundleUpdateResult.success ? styles.borderSuccess : styles.borderError}`,
                              color: ticketBundleUpdateResult.success ? styles.textSuccess : styles.textError,
                              fontSize: '0.9rem',
                            }}
                          >
                            {ticketBundleUpdateResult.success ? (
                              <strong>✅ {ticketBundleUpdateResult.message}</strong>
                            ) : (
                              <strong>❌ {ticketBundleUpdateResult.error}</strong>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button
                            type="submit"
                            disabled={loading || !isAdminWalletConnected}
                            style={{
                              padding: '0.75rem 1.5rem',
                              backgroundColor: loading ? styles.buttonDisabled : styles.buttonPrimary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            {loading ? 'Updating...' : '💾 Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelTicketBundleEdit}
                            disabled={loading}
                            style={{
                              padding: '0.75rem 1.5rem',
                              backgroundColor: styles.bgTertiary,
                              color: styles.text,
                              border: `1px solid ${styles.border}`,
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ margin: 0, color: styles.heading }}>
                              {bundle.name} ({bundle.quantity} tickets)
                            </h4>
                            <p style={{ margin: '0.5rem 0', color: styles.textSecondary }}>
                              {bundle.description}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => startEditTicketBundle(bundle, idx)}
                              disabled={!isAdminWalletConnected}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: isAdminWalletConnected ? styles.buttonPrimary : styles.buttonDisabled,
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isAdminWalletConnected ? 'pointer' : 'not-allowed',
                              }}
                            >
                              ✏️ Edit
                            </button>
                            {canWriteOnChain && isAdminWalletConnected && bundle.packType != null && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTicketBundle(bundle.packType!)}
                                disabled={loading}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: styles.bgError || '#5a2c2c',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                }}
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                          <div>
                            <strong>Price:</strong> ${(bundle.priceUsdCents / 100).toFixed(2)} ({bundle.priceUsdCents} cents)
                          </div>
                          <div>
                            <strong>Price per ticket:</strong> ${((bundle.priceUsdCents / bundle.quantity) / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '1rem',
                  background: styles.bgTertiary,
                  borderRadius: '4px',
                  border: `1px solid ${styles.border}`,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Ticket pricing is managed in Stockroom</div>
                <div style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
                  Use the <strong>Stockroom</strong> tab to set the price for <code>tickets</code>. Bundle/packs UI is intentionally disabled for now.
                </div>
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
                  {config?.storeSkus ? (() => {
                    const rows = Object.entries(config.storeSkus)
                      .filter(([id, sku]) => (id === 'tickets' || id.startsWith('ticket_pack_')) && Number((sku as any)?.priceUsdCents ?? 0) > 0)
                      .slice(0, 30);
                    if (rows.length === 0) {
                      return <div style={{ color: styles.textSecondary }}>No ticket SKUs configured in Stockroom.</div>;
                    }
                    return rows.map(([id, sku]) => (
                      <div key={`ticket-sku-${id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{parseSkuDisplayName(sku, id)}</div>
                        <div style={{ color: styles.textSecondary }}>
                          ${(((sku?.priceUsdCents ?? 0) as number) / 100).toFixed(2)}
                        </div>
                      </div>
                    ));
                  })() : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Thresholds Section */}
      {activeSection === 'thresholds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">🚪 Game Play Threshold</h2>
            </div>
            <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Set the minimum token balance required for players to start a game. This acts as a gatekeeping mechanism.
            </p>

            {config && (
              <div
                style={{
                  padding: '1.5rem',
                  background: styles.bgSecondary,
                  borderRadius: '4px',
                  border: `1px solid ${styles.border}`,
                }}
              >
                {editingThreshold ? (
              <form onSubmit={handleUpdateThreshold}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Minimum Token Balance ($MEWS):
                  </label>
                  <input
                    type="number"
                    value={thresholdForm.minTokenBalanceMews}
                    onChange={(e) => setThresholdForm({ minTokenBalanceMews: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    step="1"
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
                    Enter the minimum balance in $MEWS (e.g., 250000 for 250,000 $MEWS)
                    <br />
                    Raw value (6 decimals): {mewsToRaw(thresholdForm.minTokenBalanceMews).toLocaleString()}
                  </small>
                </div>

                {thresholdUpdateResult && (
                  <div
                    style={{
                      padding: '0.75rem',
                      background: thresholdUpdateResult.success ? styles.bgSuccess : styles.bgError,
                      borderRadius: '4px',
                      marginBottom: '1rem',
                      border: `1px solid ${thresholdUpdateResult.success ? styles.borderSuccess : styles.borderError}`,
                      color: thresholdUpdateResult.success ? styles.textSuccess : styles.textError,
                      fontSize: '0.9rem',
                    }}
                  >
                    {thresholdUpdateResult.success ? (
                      <strong>✅ {thresholdUpdateResult.message}</strong>
                    ) : (
                      <strong>❌ {thresholdUpdateResult.error}</strong>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="submit"
                    disabled={loading || !isAdminWalletConnected || !canWriteOnChain}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: loading ? styles.buttonDisabled : styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {loading ? 'Updating...' : '💾 Save Threshold'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingThreshold(false);
                      setThresholdUpdateResult(null);
                      if (config.minTokenBalance !== undefined) {
                        setThresholdForm({ minTokenBalanceMews: rawToMews(config.minTokenBalance) });
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.bgTertiary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, color: styles.heading }}>
                      Minimum Token Balance to Play
                    </h4>
                    <p style={{ margin: '0.5rem 0', color: styles.textSecondary, fontSize: '0.9rem' }}>
                      Players must have at least this amount of tokens to start a game.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingThreshold(true);
                      setThresholdUpdateResult(null);
                      if (config.minTokenBalance !== undefined) {
                        setThresholdForm({ minTokenBalanceMews: rawToMews(config.minTokenBalance) });
                      }
                    }}
                    disabled={!isAdminWalletConnected || !canWriteOnChain}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: isAdminWalletConnected && canWriteOnChain ? styles.buttonPrimary : styles.buttonDisabled,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isAdminWalletConnected && canWriteOnChain ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold', color: styles.buttonPrimary }}>
                    {config.minTokenBalance ? formatTokenBalance(config.minTokenBalance) : 'Not set'}
                  </div>
                  <div style={{ color: styles.textSecondary }}>
                    Raw value (6 decimals): {config.minTokenBalance?.toLocaleString() || 'Not set'}
                  </div>
                </div>
              </div>
            )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Badge Configuration */}
      {activeSection === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {!config?.badgeConfig && (
            <div style={{
              padding: '1rem 1.25rem',
              background: styles.bgWarning,
              borderRadius: '4px',
              border: `1px solid ${styles.border}`,
              color: styles.text,
              fontSize: '0.95rem',
              marginBottom: '0.5rem',
            }}>
              <strong>⚠️ Badge config not on chain.</strong> Aquifer read failed or no definition has been set yet. Use <strong>Initialize (defaults)</strong> below to write badge discounts, thresholds, and minting fee to Aquifer and Helm.
            </div>
          )}
          <p style={{
            padding: '0.75rem 1rem',
            background: styles.bgSecondary,
            borderRadius: '4px',
            border: `1px solid ${styles.border}`,
            color: styles.textSecondary,
            fontSize: '0.9rem',
          }}>
            <strong>Platform:</strong> Badge configuration (discounts, thresholds, minting fee) is stored in platform app-config. Badge NFTs are minted via platform (Shipyard). Initialize sets defaults; edits update the same config.
          </p>

          {canWriteOnChain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={handleInitializeBadges}
                disabled={initBadgesLoading || !isAdminWalletConnected}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: initBadgesLoading || !isAdminWalletConnected ? styles.buttonDisabled : '#2E7D32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: initBadgesLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {initBadgesLoading ? 'Initializing...' : 'Initialize (defaults)'}
              </button>
              {initBadgesResult && (
                <span style={{
                  padding: '0.5rem 0.75rem',
                  background: initBadgesResult.success ? styles.bgSuccess : styles.bgError,
                  color: initBadgesResult.success ? styles.textSuccess : styles.textError,
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}>
                  {initBadgesResult.success ? `✅ ${initBadgesResult.message}` : `❌ ${initBadgesResult.error}`}
                </span>
              )}
            </div>
          )}

          {config?.badgeConfig && (
          <>
          {/* Badge Discounts */}
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">🎖️ Badge Discounts</h2>
            </div>
            <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Configure discount percentages for store purchases and gameplay costs by badge tier.
              <br />
              <strong>Tiers:</strong> Standard (0), Common (1), Uncommon (2), Rare (3), Epic (4), Legendary (5)
            </p>

            {!editingBadgeDiscounts && (
              <div style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, color: styles.heading }}>Current Badge Discounts</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBadgeDiscounts(true)}
                    disabled={!isAdminWalletConnected}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: isAdminWalletConnected ? styles.buttonPrimary : styles.buttonDisabled,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isAdminWalletConnected ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: styles.heading }}>Store Discounts (%)</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                      {['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((tier, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{tier}:</span>
                          <strong>{config.badgeConfig!.storeDiscounts[idx]}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: styles.heading }}>Gameplay Discounts (%)</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                      {['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((tier, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{tier}:</span>
                          <strong>{config.badgeConfig!.gameplayDiscounts[idx]}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {editingBadgeDiscounts && (
              <form onSubmit={handleUpdateBadgeDiscounts} style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <h4 style={{ margin: '0 0 1rem 0', color: styles.heading }}>Edit Badge Discounts</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1rem' }}>
                  <div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: styles.heading }}>Store Discounts (%)</h5>
                    {['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((tier, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                          {tier}:
                        </label>
                        <input
                          type="number"
                          value={badgeDiscountForm.storeDiscounts[idx]}
                          onChange={(e) => {
                            const newDiscounts = [...badgeDiscountForm.storeDiscounts];
                            newDiscounts[idx] = Math.max(0, Math.min(25, parseInt(e.target.value) || 0));
                            setBadgeDiscountForm({ ...badgeDiscountForm, storeDiscounts: newDiscounts });
                          }}
                          min="0"
                          max="25"
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
                      </div>
                    ))}
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: styles.heading }}>Gameplay Discounts (%)</h5>
                    {['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((tier, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                          {tier}:
                        </label>
                        <input
                          type="number"
                          value={badgeDiscountForm.gameplayDiscounts[idx]}
                          onChange={(e) => {
                            const newDiscounts = [...badgeDiscountForm.gameplayDiscounts];
                            newDiscounts[idx] = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                            setBadgeDiscountForm({ ...badgeDiscountForm, gameplayDiscounts: newDiscounts });
                          }}
                          min="0"
                          max="20"
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
                      </div>
                    ))}
                  </div>
                </div>
                {badgeDiscountUpdateResult && (
                  <div
                    style={{
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      background: badgeDiscountUpdateResult.success ? styles.bgSuccess : styles.bgError,
                      borderRadius: '4px',
                      color: badgeDiscountUpdateResult.success ? 'green' : 'red',
                      fontSize: '0.9rem',
                    }}
                  >
                    {badgeDiscountUpdateResult.success ? (
                      <div>
                        ✅ {badgeDiscountUpdateResult.message}
                        {badgeDiscountUpdateResult.digest && (
                          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            Transaction: {badgeDiscountUpdateResult.digest}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>❌ {badgeDiscountUpdateResult.error}</div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={loading || !isAdminWalletConnected}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: loading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {loading ? '⏳ Updating...' : '💾 Save Changes'}
                  </button>
                  {config?.badgeConfig && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBadgeDiscounts(false);
                        setBadgeDiscountUpdateResult(null);
                        const bc = config?.badgeConfig;
                        if (!bc) return;
                        setBadgeDiscountForm({
                          storeDiscounts: bc.storeDiscounts,
                          gameplayDiscounts: bc.gameplayDiscounts,
                        });
                      }}
                      disabled={loading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: styles.bgTertiary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Badge Thresholds */}
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">🎯 Badge Tier Thresholds</h2>
            </div>
            <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Configure the number of games required to unlock each badge tier.
              <br />
              <strong>Tiers:</strong> Common (1), Uncommon (2), Rare (3), Epic (4), Legendary (5)
            </p>

            {!editingBadgeThresholds && (
              <div style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, color: styles.heading }}>Current Badge Thresholds</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBadgeThresholds(true)}
                    disabled={!isAdminWalletConnected}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: isAdminWalletConnected ? styles.buttonPrimary : styles.buttonDisabled,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isAdminWalletConnected ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                  {['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((tier, idx) => (
                    <div key={idx} style={{ textAlign: 'center', padding: '0.5rem', background: styles.bgTertiary, borderRadius: '4px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{tier}</div>
                      <div style={{ fontSize: '1.2rem', color: styles.buttonPrimary }}>
                        {config.badgeConfig!.thresholds[idx]} games
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingBadgeThresholds && (
              <form onSubmit={handleUpdateBadgeThresholds} style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <h4 style={{ margin: '0 0 1rem 0', color: styles.heading }}>Edit Badge Thresholds</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  {['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map((tier, idx) => (
                    <div key={idx}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        {tier}:
                      </label>
                      <input
                        type="number"
                        value={badgeThresholdForm.thresholds[idx]}
                        onChange={(e) => {
                          const newThresholds = [...badgeThresholdForm.thresholds];
                          newThresholds[idx] = Math.max(1, parseInt(e.target.value) || 1);
                          setBadgeThresholdForm({ ...badgeThresholdForm, thresholds: newThresholds });
                        }}
                        min="1"
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
                    </div>
                  ))}
                </div>
                {badgeThresholdUpdateResult && (
                  <div
                    style={{
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      background: badgeThresholdUpdateResult.success ? styles.bgSuccess : styles.bgError,
                      borderRadius: '4px',
                      color: badgeThresholdUpdateResult.success ? 'green' : 'red',
                      fontSize: '0.9rem',
                    }}
                  >
                    {badgeThresholdUpdateResult.success ? (
                      <div>
                        ✅ {badgeThresholdUpdateResult.message}
                        {badgeThresholdUpdateResult.digest && (
                          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            Transaction: {badgeThresholdUpdateResult.digest}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>❌ {badgeThresholdUpdateResult.error}</div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={loading || !isAdminWalletConnected}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: loading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {loading ? '⏳ Updating...' : '💾 Save Changes'}
                  </button>
                  {config?.badgeConfig && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBadgeThresholds(false);
                        setBadgeThresholdUpdateResult(null);
                        setBadgeThresholdForm({ thresholds: config.badgeConfig!.thresholds });
                      }}
                      disabled={loading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: styles.bgTertiary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Badge Minting Fee */}
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">💰 Badge Minting Fee</h2>
            </div>
            <p style={{ color: styles.textSecondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
              Configure the fee charged when players mint a badge.
            </p>

            {!editingBadgeMintingFee && (
              <div style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, color: styles.heading }}>Current Minting Fee</h4>
                    <div style={{ marginTop: '0.5rem', fontSize: '1.2rem', color: styles.buttonPrimary }}>
                      {config.badgeConfig.mintingFeeUsdCents != null
                        ? `$${(config.badgeConfig.mintingFeeUsdCents / 100).toFixed(2)} (${config.badgeConfig.mintingFeeUsdCents} cents)`
                        : 'Not set on Helm'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBadgeMintingFee(true)}
                    disabled={!isAdminWalletConnected}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: isAdminWalletConnected ? styles.buttonPrimary : styles.buttonDisabled,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isAdminWalletConnected ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
                <div style={{ fontSize: '0.9rem', color: styles.textSecondary }}>
                  <strong>Badge Config Version:</strong> {config.badgeConfig.version}
                </div>
              </div>
            )}

            {editingBadgeMintingFee && (
              <form onSubmit={handleUpdateBadgeMintingFee} style={{ padding: '1.5rem', background: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <h4 style={{ margin: '0 0 1rem 0', color: styles.heading }}>Edit Badge Minting Fee</h4>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Minting Fee (USD Cents):
                  </label>
                  <input
                    type="number"
                    value={badgeMintingFeeForm.mintingFeeUsdCents}
                    onChange={(e) => setBadgeMintingFeeForm({ mintingFeeUsdCents: Math.max(1, parseInt(e.target.value) || 1) })}
                    min="1"
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
                    ${(badgeMintingFeeForm.mintingFeeUsdCents / 100).toFixed(2)}
                  </small>
                </div>
                {badgeMintingFeeUpdateResult && (
                  <div
                    style={{
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      background: badgeMintingFeeUpdateResult.success ? styles.bgSuccess : styles.bgError,
                      borderRadius: '4px',
                      color: badgeMintingFeeUpdateResult.success ? 'green' : 'red',
                      fontSize: '0.9rem',
                    }}
                  >
                    {badgeMintingFeeUpdateResult.success ? (
                      <div>
                        ✅ {badgeMintingFeeUpdateResult.message}
                        {badgeMintingFeeUpdateResult.digest && (
                          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            Transaction: {badgeMintingFeeUpdateResult.digest}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>❌ {badgeMintingFeeUpdateResult.error}</div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={loading || !isAdminWalletConnected}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: loading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {loading ? '⏳ Updating...' : '💾 Save Changes'}
                  </button>
                  {config?.badgeConfig && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBadgeMintingFee(false);
                        setBadgeMintingFeeUpdateResult(null);
                        const bc = config?.badgeConfig;
                        setBadgeMintingFeeForm({ mintingFeeUsdCents: bc?.mintingFeeUsdCents ?? 10 });
                      }}
                      disabled={loading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: styles.bgTertiary,
                        color: styles.text,
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
          </>
          )}
        </div>
      )}

      {/* Config Version Footer */}
      {config && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: styles.bgTertiary, borderRadius: '4px', fontSize: '0.9rem' }}>
          <strong>Config Version:</strong> {config.version}
        </div>
      )}
    </>
  );
}
