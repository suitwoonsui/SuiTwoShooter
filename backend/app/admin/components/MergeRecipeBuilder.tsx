// ==========================================
// Admin UI - Merge Recipe Builder
// Defines merge recipes in Aquifer (admin-only).
// ==========================================

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { bcs } from '@mysten/bcs';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { deriveItemOrderFromOfferOrder, sortItemsByStockroomOrder } from '../utils/stockroom-item-order';
import { isLeveledProvisionItem } from '@/lib/services/inventory/admin-inventory-item';

type ItemChoice = { id: string; name: string; levels: number[] };
type KeyRow = { itemId: string; level?: number; qty: number };

type SavedRecipe = {
  key: string;
  recipeId: string;
  inputs: Array<{ key: string; qty: number }>;
  outputs: Array<{ key: string; qty: number }>;
  rawBase64: string;
};

function toBalanceKey(itemId: string, level?: number): string {
  return level != null && level > 0 ? `${itemId}_${level}` : itemId;
}

function parseBalanceKey(k: string): { itemId: string; level?: number } {
  const raw = String(k || '');
  const m = /^(.+)_([0-9]+)$/.exec(raw);
  if (m) {
    const itemId = m[1];
    const level = Number(m[2]);
    if (!isLeveledProvisionItem(itemId)) return { itemId: raw };
    return { itemId, level };
  }
  return { itemId: raw };
}

function canonicalRecipeIdFromRows(inRows: KeyRow[], outRows: KeyRow[]): string {
  const norm = (rows: KeyRow[]) =>
    rows
      .map((r) => ({
        key: toBalanceKey(r.itemId, r.level),
        qty: Math.max(1, Math.trunc(Number(r.qty) || 1)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  const inP = norm(inRows).map((x) => `${x.qty}x${x.key}`).join('+') || 'none';
  const outP = norm(outRows).map((x) => `${x.qty}x${x.key}`).join('+') || 'none';
  return `inventory_merge:in=${inP}:out=${outP}`;
}

function canonicalIoSignature(args: { inputs: Array<{ key: string; qty: number }>; outputs: Array<{ key: string; qty: number }> }): string {
  const norm = (rows: Array<{ key: string; qty: number }>) =>
    rows
      .map((r) => ({
        key: String(r.key || '').trim(),
        qty: Math.max(1, Math.trunc(Number(r.qty) || 1)),
      }))
      .filter((r) => r.key.length > 0)
      .sort((a, b) => a.key.localeCompare(b.key));
  const inP = norm(args.inputs).map((x) => `${x.qty}x${x.key}`).join('+') || 'none';
  const outP = norm(args.outputs).map((x) => `${x.qty}x${x.key}`).join('+') || 'none';
  return `in=${inP}:out=${outP}`;
}

const BalanceQtyBcs = bcs.struct('BalanceQty', {
  balance_key: bcs.vector(bcs.u8()),
  qty: bcs.u64(),
});

const MergeRecipeBcs = bcs.struct('MergeRecipe', {
  inputs: bcs.vector(BalanceQtyBcs),
  outputs: bcs.vector(BalanceQtyBcs),
});

const MERGE_RECIPE_KEY_PREFIX = 'reservoir_merge_recipe:';

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function setDragCardImage(e: React.DragEvent, args: { title: string; subtitle: string }) {
  try {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.top = '-10000px';
    el.style.left = '-10000px';
    el.style.width = '260px';
    el.style.padding = '12px';
    el.style.borderRadius = '10px';
    el.style.border = '1px solid rgba(255,255,255,0.2)';
    el.style.background = '#0b0f17';
    el.style.color = 'white';
    el.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    el.style.boxShadow = '0 8px 22px rgba(0,0,0,0.45)';
    el.innerHTML = `<div style="font-weight:700">${args.title}</div><div style="opacity:.8;font-size:12px;margin-top:4px">${args.subtitle}</div>`;
    document.body.appendChild(el);
    e.dataTransfer.setDragImage(el, 16, 16);
    setTimeout(() => {
      try {
        document.body.removeChild(el);
      } catch {
        /* ignore */
      }
    }, 0);
  } catch {
    /* ignore */
  }
}

function setDragPayload(e: React.DragEvent, payload: { itemId: string; level: number }) {
  const json = JSON.stringify(payload);
  e.dataTransfer.setData('application/json', json);
  e.dataTransfer.setData('text/plain', json);
  e.dataTransfer.effectAllowed = 'copy';
}

function parseDragPayload(e: React.DragEvent): { itemId: string; level: number } | null {
  const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j.itemId !== 'string') return null;
    return { itemId: j.itemId, level: Math.max(0, Math.floor(Number(j.level) || 0)) };
  } catch {
    return null;
  }
}

export function MergeRecipeBuilder(props: {
  styles: AdminStyles;
  isAdminWalletConnected: boolean;
  adminAddress: string | null;
  // Kept for backwards compatibility; not used (no fallback).
  itemChoices: ItemChoice[];
}) {
  const { styles, isAdminWalletConnected, adminAddress } = props;

  const [leftTab, setLeftTab] = useState<'items' | 'saved'>('items');
  const [dragOverZone, setDragOverZone] = useState<'inputs' | 'outputs' | null>(null);
  const [armedPick, setArmedPick] = useState<{ itemId: string; level: number } | null>(null);
  const [isDraggingItem, setIsDraggingItem] = useState(false);

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoadedOnce, setCatalogLoadedOnce] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogOrderError, setCatalogOrderError] = useState<string | null>(null);
  const [catalogItemCount, setCatalogItemCount] = useState<number | null>(null);
  const [catalogChoices, setCatalogChoices] = useState<ItemChoice[]>([]);

  const [recipeIdMode, setRecipeIdMode] = useState<'auto' | 'manual'>('auto');
  const [recipeId, setRecipeId] = useState<string>('inventory_merge:custom');
  const [inputs, setInputs] = useState<KeyRow[]>([]);
  const [outputs, setOutputs] = useState<KeyRow[]>([]);
  const [gasBudgetMist, setGasBudgetMist] = useState<number>(250_000_000);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; digest?: string; error?: string } | null>(null);

  const [initLoading, setInitLoading] = useState(false);
  const [initResult, setInitResult] = useState<{ success: boolean; message?: string; digests?: string[]; error?: string } | null>(null);

  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [savedLoadedOnce, setSavedLoadedOnce] = useState(false);

  const choices = catalogChoices; // explicit (no fallback)

  const itemById = useMemo(() => {
    const m = new Map<string, ItemChoice>();
    for (const it of choices) m.set(it.id, it);
    return m;
  }, [choices]);

  const defaultLevelForItem = (itemId: string): number => {
    const it = itemById.get(itemId);
    if (!it) return 0;
    if (!Array.isArray(it.levels) || it.levels.length === 0) return 0;
    return it.levels[0] ?? 1;
  };

  const normalizeRow = (row: KeyRow): KeyRow => {
    const it = itemById.get(row.itemId);
    const hasLevels = it && Array.isArray(it.levels) && it.levels.length > 0;
    const level = hasLevels ? Math.max(1, Math.floor(Number(row.level) || 1)) : 0;
    return { ...row, level };
  };

  useEffect(() => {
    if (recipeIdMode !== 'auto') return;
    setRecipeId(canonicalRecipeIdFromRows(inputs, outputs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeIdMode, inputs, outputs]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      setCatalogOrderError(null);
      try {
        const [catalogRes, offersRes] = await Promise.all([
          fetch(getApiUrl('api/store/admin/catalog'), { method: 'GET', cache: 'no-store' }),
          fetch(getApiUrl('api/store/admin/stockroom/offers'), { method: 'GET', cache: 'no-store' }),
        ]);

        const catalogData = await catalogRes.json().catch(() => ({}));
        const catalog = (catalogData?.catalog ?? null) as Record<string, any> | null;
        const itemCount = typeof catalogData?.itemCount === 'number' ? catalogData.itemCount : null;
        if (!cancelled) setCatalogItemCount(itemCount);

        let orderKeys: string[] | null = null;
        try {
          const offersData = await offersRes.json().catch(() => ({}));
          if (offersRes.ok && offersData?.success && Array.isArray(offersData?.offerOrder)) {
            orderKeys = deriveItemOrderFromOfferOrder(offersData.offerOrder);
          } else if (!offersRes.ok) {
            if (!cancelled) setCatalogOrderError(`Failed to load Stockroom ordering (HTTP ${offersRes.status})`);
          } else if (offersData?.success && !Array.isArray(offersData?.offerOrder)) {
            if (!cancelled) setCatalogOrderError('Stockroom ordering not present; using id sort.');
          }
        } catch (e) {
          if (!cancelled) setCatalogOrderError(e instanceof Error ? e.message : 'Failed to load Stockroom ordering');
        }

        if (!catalogRes.ok || !catalogData?.success || !catalog || typeof catalog !== 'object') {
          const msg = catalogData?.error || `Failed to load catalog (HTTP ${catalogRes.status})`;
          if (!cancelled) setCatalogError(msg);
          return;
        }

        const built: ItemChoice[] = Object.entries(catalog)
          .map(([id, item]) => {
            const name = typeof item?.name === 'string' ? String(item.name) : id;
            const levelsRaw: unknown[] = Array.isArray(item?.levels) ? (item.levels as unknown[]) : [];
            const levels: number[] = levelsRaw
              .map((l) => Number((l as any)?.level))
              .filter((n): n is number => Number.isFinite(n) && n > 0);
            const uniq: number[] = Array.from(new Set<number>(levels)).sort((a, b) => a - b);
            return { id, name, levels: uniq };
          })
          .filter((c) => c.id && c.id !== 'credits' && c.id !== 'tickets');

        const sorted = sortItemsByStockroomOrder(built, orderKeys);
        if (!cancelled) setCatalogChoices(sorted);
      } catch (e) {
        if (!cancelled) setCatalogError(e instanceof Error ? e.message : 'Failed to load catalog');
      } finally {
        if (!cancelled) setCatalogLoading(false);
        if (!cancelled) setCatalogLoadedOnce(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAdminWalletConnected) {
      setSavedRecipes([]);
      setSavedLoadedOnce(false);
      setSavedError(null);
      return;
    }
    void loadSavedRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminWalletConnected, adminAddress]);

  useEffect(() => {
    if (leftTab === 'saved' && isAdminWalletConnected && !savedLoadedOnce && !savedLoading) {
      void loadSavedRecipes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftTab, isAdminWalletConnected]);

  const loadSavedRecipes = async () => {
    if (!isAdminWalletConnected) return;
    setSavedLoading(true);
    setSavedError(null);
    try {
      const res = await fetch(getApiUrl('api/aquifer/definitions'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(adminAddress ? { 'X-Admin-Wallet': adminAddress } : {}) },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to load Aquifer definitions (HTTP ${res.status})`);
      }
      const defs = (data?.definitions ?? []) as Array<{ key?: string; value?: string }>;
      const filtered = defs
        .filter(
          (d) =>
            typeof d.key === 'string' &&
            d.key.startsWith(MERGE_RECIPE_KEY_PREFIX) &&
            typeof d.value === 'string' &&
            d.value.length > 0
        )
        .map((d) => ({ key: d.key as string, value: d.value as string }));

      const decoded: SavedRecipe[] = [];
      let parseFailures = 0;
      for (const d of filtered) {
        try {
          const bytes = base64ToBytes(d.value);
          const parsed = MergeRecipeBcs.parse(bytes) as unknown as {
            inputs: Array<{ balance_key: number[]; qty: bigint | string }>;
            outputs: Array<{ balance_key: number[]; qty: bigint | string }>;
          };
          const inputsParsed = parsed.inputs.map((i) => ({
            key: new TextDecoder().decode(new Uint8Array(i.balance_key)),
            qty: Number(i.qty),
          }));
          const outputsParsed = parsed.outputs.map((o) => ({
            key: new TextDecoder().decode(new Uint8Array(o.balance_key)),
            qty: Number(o.qty),
          }));
          const recipeId = d.key.slice(MERGE_RECIPE_KEY_PREFIX.length);
          decoded.push({ key: d.key, recipeId, inputs: inputsParsed, outputs: outputsParsed, rawBase64: d.value });
        } catch {
          parseFailures += 1;
        }
      }
      decoded.sort((a, b) => a.recipeId.localeCompare(b.recipeId));
      setSavedRecipes(decoded);
      setSavedLoadedOnce(true);
      if (parseFailures > 0 && decoded.length === 0) {
        setSavedError(`${parseFailures} recipe definition(s) could not be decoded (BCS format mismatch).`);
      } else if (parseFailures > 0) {
        setSavedError(`Loaded ${decoded.length} recipe(s); skipped ${parseFailures} with invalid format.`);
      }
    } catch (e) {
      setSavedError(e instanceof Error ? e.message : 'Failed to load Aquifer definitions');
      setSavedRecipes([]);
      setSavedLoadedOnce(true);
    } finally {
      setSavedLoading(false);
    }
  };

  const loadRecipeIntoEditor = (r: SavedRecipe) => {
    setRecipeIdMode('manual');
    setRecipeId(r.recipeId);
    setInputs(
      r.inputs.map((it) => {
        const p = parseBalanceKey(it.key);
        return normalizeRow({ itemId: p.itemId, level: p.level, qty: Math.max(1, Math.trunc(Number(it.qty) || 1)) });
      })
    );
    setOutputs(
      r.outputs.map((it) => {
        const p = parseBalanceKey(it.key);
        return normalizeRow({ itemId: p.itemId, level: p.level, qty: Math.max(1, Math.trunc(Number(it.qty) || 1)) });
      })
    );
    setResult(null);
    setArmedPick(null);
  };

  const saveRecipeToAquifer = async () => {
    if (!isAdminWalletConnected) return;
    // Guard against accidental duplicates/overwrites: ensure we have a recent list first.
    if (!savedLoadedOnce && !savedLoading) {
      await loadSavedRecipes();
    }

    const trimmedRecipeId = recipeId.trim();
    const existing = savedRecipes.find((r) => r.recipeId === trimmedRecipeId);

    // Validate duplicate *contents* (inputs/outputs) even if the Recipe ID is different.
    const currentSig = canonicalIoSignature({
      inputs: inputs.map((r) => ({ key: toBalanceKey(r.itemId, r.level), qty: r.qty })),
      outputs: outputs.map((r) => ({ key: toBalanceKey(r.itemId, r.level), qty: r.qty })),
    });
    const dupByContents = savedRecipes.find((r) => canonicalIoSignature({ inputs: r.inputs, outputs: r.outputs }) === currentSig);
    if (dupByContents && dupByContents.recipeId !== trimmedRecipeId) {
      const ok = confirm(
        [
          'A recipe with the same Inputs/Outputs already exists in Aquifer (under a different Recipe ID).',
          '',
          `Existing Recipe ID: ${dupByContents.recipeId}`,
          `This Recipe ID: ${trimmedRecipeId || '(empty)'}`,
          '',
          'Do you want to continue saving anyway?',
        ].join('\\n')
      );
      if (!ok) {
        setResult({ success: false, error: `Save cancelled: identical recipe already exists (${dupByContents.recipeId}).` });
        return;
      }
    }

    if (existing) {
      const ok = confirm(
        [
          'A recipe with this Recipe ID already exists in Aquifer.',
          '',
          `Recipe ID: ${trimmedRecipeId}`,
          '',
          'Do you want to OVERWRITE it?',
        ].join('\n')
      );
      if (!ok) {
        setResult({ success: false, error: 'Save cancelled: recipe already exists. Load it from Saved recipes to edit, or confirm overwrite.' });
        return;
      }
    }

    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        recipeId: trimmedRecipeId,
        inputKeys: inputs.map((r) => toBalanceKey(r.itemId, r.level)),
        inputQuantities: inputs.map((r) => Math.trunc(Number(r.qty) || 0)),
        outputKeys: outputs.map((r) => toBalanceKey(r.itemId, r.level)),
        outputQuantities: outputs.map((r) => Math.trunc(Number(r.qty) || 0)),
        gasBudgetMist: Math.trunc(Number(gasBudgetMist) || 0),
        adminWalletAddress: adminAddress || undefined,
      };

      const res = await fetch(getApiUrl('api/inventory/admin/merge-recipes/define'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(adminAddress ? { 'X-Admin-Wallet': adminAddress } : {}) },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setResult({ success: true, digest: data.digest });
        await loadSavedRecipes();
        setLeftTab('saved');
      } else {
        setResult({ success: false, error: data?.error || 'Failed to save recipe definition' });
      }
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const initializeDefaultRecipes = async () => {
    if (!isAdminWalletConnected) return;
    const ok = confirm(
      [
        'Initialize default merge recipes?',
        '',
        'This is intended as a one-time bootstrap (or extremely rare re-run).',
        'It will write/overwrite the default recipes in Aquifer, including hyper merges (9→1).',
        '',
        'You can delete or edit individual recipes later.',
      ].join('\n')
    );
    if (!ok) return;
    setInitLoading(true);
    setInitResult(null);
    try {
      const res = await fetch(getApiUrl('api/inventory/admin/merge-recipes/initialize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(adminAddress ? { 'X-Admin-Wallet': adminAddress } : {}) },
        body: JSON.stringify({
          includeHyper: true,
          gasBudgetMist: Math.trunc(Number(gasBudgetMist) || 0),
          adminWalletAddress: adminAddress || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setInitResult({ success: true, message: data?.message, digests: data?.digests });
        // Refresh saved list so the admin immediately sees what was created.
        await loadSavedRecipes();
        setLeftTab('saved');
      } else {
        setInitResult({ success: false, error: data?.error || data?.message || 'Failed to initialize default recipes' });
      }
    } catch (e) {
      setInitResult({ success: false, error: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setInitLoading(false);
    }
  };

  const addArmedTo = (kind: 'inputs' | 'outputs') => {
    if (!armedPick) return;
    const row = normalizeRow({ itemId: armedPick.itemId, level: armedPick.level, qty: 1 });
    if (kind === 'inputs') setInputs((p) => [...p, row]);
    else setOutputs((p) => [...p, row]);
    setArmedPick(null);
  };

  const onDropZone = (kind: 'inputs' | 'outputs', e: React.DragEvent) => {
    e.preventDefault();
    const payload = parseDragPayload(e);
    if (!payload) return;
    const row = normalizeRow({ itemId: payload.itemId, level: payload.level, qty: 1 });
    if (kind === 'inputs') setInputs((p) => [...p, row]);
    else setOutputs((p) => [...p, row]);
    setIsDraggingItem(false);
    setDragOverZone(null);
    setArmedPick(null);
  };

  const clearBuilder = () => {
    setInputs([]);
    setOutputs([]);
    setRecipeIdMode('auto');
    setResult(null);
    setArmedPick(null);
  };

  const renderRowCard = (row: KeyRow, idx: number, kind: 'inputs' | 'outputs') => {
    const item = itemById.get(row.itemId);
    const hasLevels = item && item.levels.length > 0;
    return (
      <div
        key={`${kind}-${idx}`}
        style={{
          padding: '0.75rem',
          borderRadius: 10,
          border: `1px solid ${styles.border}`,
          background: styles.bgSecondary,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', color: styles.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {kind === 'inputs' ? 'Input' : 'Output'} #{idx + 1}
            </div>
            <div style={{ fontSize: '0.85rem', color: styles.textSecondary }}>
              {row.itemId}
              {hasLevels ? ` • L${row.level}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (kind === 'inputs') setInputs((p) => p.filter((_, i) => i !== idx));
              else setOutputs((p) => p.filter((_, i) => i !== idx));
            }}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              border: `1px solid ${styles.border}`,
              background: styles.bgTertiary,
              color: styles.text,
              cursor: 'pointer',
            }}
            title="Remove"
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <select
            value={row.itemId}
            onChange={(e) => {
              const itemId = e.target.value;
              const next = normalizeRow({ ...row, itemId, level: defaultLevelForItem(itemId) });
              if (kind === 'inputs') setInputs((p) => p.map((r, i) => (i === idx ? next : r)));
              else setOutputs((p) => p.map((r, i) => (i === idx ? next : r)));
            }}
            disabled={catalogLoading || !!catalogError || choices.length === 0}
            style={{
              padding: '0.6rem',
              borderRadius: '8px',
              border: `1px solid ${styles.border}`,
              background: styles.bgTertiary,
              color: styles.text,
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            step={1}
            value={row.qty}
            onChange={(e) => {
              const next = normalizeRow({ ...row, qty: Number(e.target.value) });
              if (kind === 'inputs') setInputs((p) => p.map((r, i) => (i === idx ? next : r)));
              else setOutputs((p) => p.map((r, i) => (i === idx ? next : r)));
            }}
            style={{
              width: '90px',
              padding: '0.6rem',
              borderRadius: '8px',
              border: `1px solid ${styles.border}`,
              background: styles.bgTertiary,
              color: styles.text,
              textAlign: 'center',
              fontWeight: 'bold',
            }}
            title="Quantity"
          />
        </div>

        {hasLevels && (
          <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {(item?.levels ?? []).map((lvl) => (
              <button
                key={`${row.itemId}-lvl-${lvl}`}
                type="button"
                onClick={() => {
                  const next = normalizeRow({ ...row, level: lvl });
                  if (kind === 'inputs') setInputs((p) => p.map((r, i) => (i === idx ? next : r)));
                  else setOutputs((p) => p.map((r, i) => (i === idx ? next : r)));
                }}
                style={{
                  padding: '0.35rem 0.55rem',
                  borderRadius: '6px',
                  border: `1px solid ${styles.border}`,
                  background: row.level === lvl ? styles.buttonPrimary : styles.bgTertiary,
                  color: row.level === lvl ? 'white' : styles.text,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                }}
              >
                L{lvl}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderKeyChip = (entry: { key: string; qty: number }) => {
    const parsed = parseBalanceKey(entry.key);
    const item = itemById.get(parsed.itemId);
    const name = item?.name || parsed.itemId;
    const hasLevels = item && item.levels.length > 0;
    const lvlLabel = hasLevels ? `L${parsed.level}` : 'Base';
    const qty = Math.max(1, Math.trunc(Number(entry.qty) || 1));
    return (
      <span
        key={`${entry.key}:${qty}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.45rem',
          borderRadius: 999,
          border: `1px solid ${styles.border}`,
          background: styles.bgTertiary,
          color: styles.text,
          fontSize: '0.8rem',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
        title={`${qty}× ${name} ${lvlLabel} (${entry.key})`}
      >
        <strong style={{ color: styles.text }}>{qty}×</strong>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        <span style={{ color: styles.textSecondary, fontWeight: 700 }}>{lvlLabel}</span>
      </span>
    );
  };

  const canInteractWithCatalog = !catalogLoading && !catalogError && choices.length > 0;
  const highlightTargets = !!armedPick || isDraggingItem;

  return (
    <div>
      <style>{`
        @keyframes mrPulse {
          0% { box-shadow: 0 0 0 0 rgba(65, 197, 116, 0.35); }
          70% { box-shadow: 0 0 0 12px rgba(65, 197, 116, 0); }
          100% { box-shadow: 0 0 0 0 rgba(65, 197, 116, 0); }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '1rem', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ border: `1px solid ${styles.border}`, borderRadius: 8, padding: '0.75rem', background: styles.bgPrimary, minHeight: 220 }}>
          <div style={{ padding: '0.75rem', background: styles.bgSecondary, borderRadius: 8, border: `1px solid ${styles.border}`, marginBottom: '0.75rem' }}>
            <strong style={{ color: styles.text }}>Recipe inputs & outputs</strong>
            <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              Drag an item card into <strong>Inputs</strong> / <strong>Outputs</strong>.
              <br />
              Or click a level to arm it, then click <strong>Inputs</strong> / <strong>Outputs</strong> to place it. Click the armed level again to cancel.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: `2px solid ${styles.border}` }}>
            <button
              type="button"
              onClick={() => setLeftTab('items')}
              style={{
                padding: '0.6rem 0.9rem',
                backgroundColor: leftTab === 'items' ? styles.buttonPrimary : styles.bgSecondary,
                color: leftTab === 'items' ? 'white' : styles.text,
                border: 'none',
                borderBottom: leftTab === 'items' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🧩 Available items
            </button>
            <button
              type="button"
              onClick={() => {
                setLeftTab('saved');
                if (isAdminWalletConnected && !savedLoading) void loadSavedRecipes();
              }}
              style={{
                padding: '0.6rem 0.9rem',
                backgroundColor: leftTab === 'saved' ? styles.buttonPrimary : styles.bgSecondary,
                color: leftTab === 'saved' ? 'white' : styles.text,
                border: 'none',
                borderBottom: leftTab === 'saved' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              📚 Saved recipes
            </button>
          </div>

          {leftTab === 'items' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <strong style={{ color: styles.text }}>Select an item level</strong>
                <button
                  type="button"
                  onClick={initializeDefaultRecipes}
                  disabled={!isAdminWalletConnected || initLoading}
                  style={{
                    ...(styles as any).button,
                    backgroundColor: styles.buttonSuccess,
                    color: 'white',
                    opacity: !isAdminWalletConnected || initLoading ? 0.6 : 1,
                    cursor: !isAdminWalletConnected || initLoading ? 'not-allowed' : 'pointer',
                  }}
                  title={!isAdminWalletConnected ? 'Connect admin wallet' : 'Seed standard merge recipes into Aquifer'}
                >
                  {initLoading ? 'Initializing...' : '⚙️ Initialize default recipes'}
                </button>
              </div>

              {initResult && (
                <div style={{ marginTop: '0.5rem', color: initResult.success ? styles.textSuccess : styles.textError, fontSize: '0.9rem' }}>
                  {initResult.success ? (initResult.message || 'Initialized default recipes.') : `Error: ${initResult.error || 'Unknown error'}`}
                </div>
              )}

              {catalogError && (
                <div style={{ marginTop: '0.75rem', color: styles.textSecondary, fontSize: '0.85rem' }}>
                  Failed to load catalog: {catalogError}
                </div>
              )}

              {!catalogError && catalogOrderError && (
                <div style={{ marginTop: '0.5rem', color: styles.textSecondary, fontSize: '0.85rem' }}>
                  Order warning: {catalogOrderError}
                </div>
              )}

              {!catalogError && catalogLoadedOnce && !catalogLoading && choices.length === 0 && (
                <div style={{ marginTop: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                  Catalog loaded{typeof catalogItemCount === 'number' ? ` (itemCount=${catalogItemCount})` : ''}, but returned 0 items.
                </div>
              )}

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                {choices.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: `1px solid ${styles.border}`,
                      background: styles.bgSecondary,
                      cursor: 'grab',
                      opacity: catalogLoading ? 0.85 : 1,
                    }}
                    draggable
                    onDragStart={(e) => {
                      setArmedPick(null);
                      setIsDraggingItem(true);
                      setDragPayload(e, { itemId: c.id, level: defaultLevelForItem(c.id) });
                      setDragCardImage(e, { title: c.name, subtitle: c.id });
                    }}
                    onDragEnd={() => {
                      setIsDraggingItem(false);
                      setDragOverZone(null);
                    }}
                    title="Drag this card into Inputs/Outputs"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 'bold', color: styles.text }}>{c.name}</div>
                      <div style={{ fontSize: '0.85rem', color: styles.textSecondary }}>{c.id}</div>
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {(c.levels.length > 0 ? c.levels : [0]).map((lvl) => (
                        <button
                          key={`${c.id}-${lvl}`}
                          type="button"
                          onClick={() => {
                            if (!canInteractWithCatalog) return;
                            if (armedPick && armedPick.itemId === c.id && armedPick.level === lvl) {
                              setArmedPick(null);
                              return;
                            }
                            setArmedPick({ itemId: c.id, level: lvl });
                          }}
                          style={{
                            padding: '0.35rem 0.55rem',
                            borderRadius: '6px',
                            border: `1px solid ${styles.border}`,
                            background: armedPick && armedPick.itemId === c.id && armedPick.level === lvl ? styles.buttonPrimary : styles.bgTertiary,
                            color: armedPick && armedPick.itemId === c.id && armedPick.level === lvl ? 'white' : styles.text,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                          }}
                          title="Arm this level, then click Inputs/Outputs"
                        >
                          {lvl === 0 ? 'Base' : `L${lvl}`}
                        </button>
                      ))}
                    </div>

                    {armedPick && armedPick.itemId === c.id && (
                      <div
                        style={{
                          marginTop: '0.65rem',
                          padding: '0.65rem 0.75rem',
                          borderRadius: 10,
                          border: `1px solid ${styles.buttonSuccess}`,
                          background: styles.bgSecondary,
                          color: styles.text,
                          fontSize: '0.9rem',
                          animation: 'mrPulse 1.35s ease-out infinite',
                        }}
                      >
                        <strong>Next step:</strong> click <strong>Inputs</strong> or <strong>Outputs</strong> on the right to place{' '}
                        <strong>
                          {armedPick.level > 0 ? `L${armedPick.level}` : 'Base'} {c.name}
                        </strong>
                        .
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {leftTab === 'saved' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <strong style={{ color: styles.text }}>Saved merge recipes (Aquifer)</strong>
                <button
                  type="button"
                  onClick={loadSavedRecipes}
                  disabled={!isAdminWalletConnected || savedLoading}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: !isAdminWalletConnected || savedLoading ? styles.buttonDisabled : styles.buttonPrimary,
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: !isAdminWalletConnected || savedLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savedLoading ? 'Loading...' : '🔄 Refresh list'}
                </button>
              </div>

              {savedError && <div style={{ marginTop: '0.75rem', color: styles.textError }}>{savedError}</div>}
              {savedLoading && (
                <div style={{ marginTop: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                  Loading saved recipes from Aquifer…
                </div>
              )}
              {!savedLoading && savedLoadedOnce && !savedError && savedRecipes.length === 0 && (
                <div style={{ marginTop: '0.75rem', color: styles.textSecondary, fontSize: '0.9rem' }}>
                  No saved recipes found yet. (Looking for keys with prefix <code>{MERGE_RECIPE_KEY_PREFIX}</code>)
                </div>
              )}

              {savedRecipes.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {savedRecipes.slice(0, 50).map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => loadRecipeIntoEditor(r)}
                      style={{
                        textAlign: 'left',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: `1px solid ${styles.border}`,
                        background: styles.bgSecondary,
                        color: styles.text,
                        cursor: 'pointer',
                      }}
                      title="Load into editor"
                    >
                      <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.recipeId}</span>
                        <span style={{ fontSize: '0.8rem', color: styles.textSecondary, flex: '0 0 auto' }}>
                          {r.inputs.length} in → {r.outputs.length} out
                        </span>
                      </div>

                      <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: styles.textSecondary, fontWeight: 700, marginBottom: '0.25rem' }}>Inputs</div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {r.inputs.map((i) => renderKeyChip(i))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: styles.textSecondary, fontWeight: 700, marginBottom: '0.25rem' }}>Outputs</div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {r.outputs.map((o) => renderKeyChip(o))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {savedRecipes.length > 50 && <div style={{ color: styles.textSecondary, fontSize: '0.85rem' }}>Showing first 50 recipes.</div>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column */}
        <div style={{ border: `1px solid ${styles.border}`, borderRadius: 8, padding: '0.75rem', background: styles.bgPrimary, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: styles.bgSecondary, borderRadius: 8, border: `1px solid ${styles.border}` }}>
            <strong style={{ color: styles.text }}>Merge recipe builder</strong>
            <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              Build your inputs/outputs, then click <strong>Save recipe to Aquifer</strong>.
              <br />
              Use <strong>Auto</strong> Recipe ID (recommended) or switch to <strong>Manual</strong>.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: 'bold', color: styles.text }}>Recipe ID</label>
              <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setRecipeIdMode('auto')}
                  style={{
                    padding: '0.3rem 0.55rem',
                    borderRadius: 6,
                    border: `1px solid ${styles.border}`,
                    background: recipeIdMode === 'auto' ? styles.buttonPrimary : styles.bgSecondary,
                    color: recipeIdMode === 'auto' ? 'white' : styles.text,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                  }}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setRecipeIdMode('manual')}
                  style={{
                    padding: '0.3rem 0.55rem',
                    borderRadius: 6,
                    border: `1px solid ${styles.border}`,
                    background: recipeIdMode === 'manual' ? styles.buttonPrimary : styles.bgSecondary,
                    color: recipeIdMode === 'manual' ? 'white' : styles.text,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                  }}
                >
                  Manual
                </button>
                {recipeIdMode === 'auto' && <span style={{ fontSize: '0.8rem', color: styles.textSecondary }}>Updates when inputs/outputs change</span>}
              </div>
              <input
                value={recipeId}
                onChange={(e) => {
                  setRecipeIdMode('manual');
                  setRecipeId(e.target.value);
                }}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: `1px solid ${styles.border}`,
                  background: styles.bgTertiary,
                  color: styles.text,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: styles.text }}>Gas budget (mist)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={gasBudgetMist}
                onChange={(e) => setGasBudgetMist(Number(e.target.value))}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: `1px solid ${styles.border}`,
                  background: styles.bgTertiary,
                  color: styles.text,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={clearBuilder}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '6px',
                border: `1px solid ${styles.border}`,
                background: styles.bgSecondary,
                color: styles.text,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              title="Clear inputs/outputs and reset Recipe ID to Auto"
            >
              🗑️ Clear builder
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverZone('inputs');
              }}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={(e) => onDropZone('inputs', e)}
              onClick={() => addArmedTo('inputs')}
              style={{
                padding: '0.75rem',
                borderRadius: 10,
                border: `2px dashed ${highlightTargets && (dragOverZone === 'inputs') ? styles.buttonSuccess : styles.border}`,
                background: styles.bgPrimary,
                cursor: armedPick ? 'pointer' : 'default',
                animation: highlightTargets ? 'mrPulse 1.35s ease-out infinite' : undefined,
              }}
              title={armedPick ? 'Click to place armed item in Inputs' : 'Drop items here'}
            >
              <div style={{ fontWeight: 'bold', color: styles.text }}>Inputs</div>
              <div style={{ marginTop: '0.35rem', color: styles.textSecondary, fontSize: '0.85rem' }}>
                Drop here or click to place the armed item.
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {inputs.length === 0 && <div style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>Empty. Add items from the left.</div>}
                {inputs.map((r, i) => renderRowCard(r, i, 'inputs'))}
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverZone('outputs');
              }}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={(e) => onDropZone('outputs', e)}
              onClick={() => addArmedTo('outputs')}
              style={{
                padding: '0.75rem',
                borderRadius: 10,
                border: `2px dashed ${highlightTargets && (dragOverZone === 'outputs') ? styles.buttonSuccess : styles.border}`,
                background: styles.bgPrimary,
                cursor: armedPick ? 'pointer' : 'default',
                animation: highlightTargets ? 'mrPulse 1.35s ease-out infinite' : undefined,
              }}
              title={armedPick ? 'Click to place armed item in Outputs' : 'Drop items here'}
            >
              <div style={{ fontWeight: 'bold', color: styles.text }}>Outputs</div>
              <div style={{ marginTop: '0.35rem', color: styles.textSecondary, fontSize: '0.85rem' }}>
                Drop here or click to place the armed item.
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {outputs.length === 0 && <div style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>Empty. Add items from the left.</div>}
                {outputs.map((r, i) => renderRowCard(r, i, 'outputs'))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={saveRecipeToAquifer}
              disabled={!isAdminWalletConnected || submitting || !canInteractWithCatalog}
              style={{
                padding: '0.7rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: !isAdminWalletConnected || submitting || !canInteractWithCatalog ? styles.buttonDisabled : styles.buttonPrimary,
                color: 'white',
                fontWeight: 'bold',
                cursor: !isAdminWalletConnected || submitting || !canInteractWithCatalog ? 'not-allowed' : 'pointer',
              }}
              title={!isAdminWalletConnected ? 'Connect admin wallet' : (!canInteractWithCatalog ? 'Catalog must load to build recipes' : 'Save recipe to Aquifer')}
            >
              {submitting ? 'Saving...' : '💾 Save recipe to Aquifer'}
            </button>
            {result && (
              <div style={{ color: result.success ? styles.textSuccess : styles.textError }}>
                {result.success ? `Saved. Digest: ${result.digest || '(no digest)'}` : `Error: ${result.error || 'Unknown error'}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

