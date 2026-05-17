// ==========================================
// Merge default milestone rewards (credits + items) onto live Aquifer definitions.
// Preserves milestoneId, threshold, and category ordering; only overwrites credits/items.
// ==========================================

export type MilestoneRow = {
  milestoneId?: number;
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
  level?: number;
};

/**
 * For each category present in `current`, set credits/items from `defaults` by:
 * 1) same threshold in that category, else 2) same index after sorting both lists by threshold.
 * Categories only in `current` are unchanged. Order of rows within each category is preserved.
 */
export function mergeDefaultMilestoneRewards(
  current: Record<string, MilestoneRow[]>,
  defaults: Record<string, MilestoneRow[]>
): Record<string, MilestoneRow[]> {
  const out: Record<string, MilestoneRow[]> = {};
  for (const [cat, liveListRaw] of Object.entries(current)) {
    if (!Array.isArray(liveListRaw)) continue;
    const defSorted = (defaults[cat] || []).slice().sort((a, b) => a.threshold - b.threshold);
    const merged = liveListRaw.map((row, idx) => {
      const copy: MilestoneRow = {
        ...row,
        items: row.items ? row.items.map((it) => ({ ...it })) : [],
      };
      const byThreshold = defSorted.find((d) => d.threshold === copy.threshold);
      const byIndex = defSorted[idx];
      const src = byThreshold ?? byIndex;
      if (src) {
        copy.credits = src.credits;
        copy.items = src.items ? src.items.map((it) => ({ ...it })) : [];
      }
      return copy;
    });
    out[cat] = merged;
  }
  return out;
}
