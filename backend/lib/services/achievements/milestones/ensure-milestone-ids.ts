// ==========================================
// Ensure every milestone row has a stable numeric milestoneId (Aquifer / API normalization).
// 1) Copy milestoneId from defaults when category + threshold match.
// 2) Assign globally unique append-only ids (max existing + 1) for any still missing.
// Does not mutate the input object graph (returns new structure).
// ==========================================

export type MilestoneRowLike = {
  milestoneId?: number;
  threshold: number;
  credits: number;
  items?: Array<{ itemId: string; level: number; quantity: number }>;
  level?: number;
};

function isValidMilestoneId(mid: unknown): mid is number {
  return typeof mid === 'number' && Number.isFinite(mid);
}

function maxMilestoneIdAcross(definitions: Record<string, MilestoneRowLike[]>): number {
  let maxId = 0;
  for (const list of Object.values(definitions)) {
    if (!Array.isArray(list)) continue;
    for (const m of list) {
      if (isValidMilestoneId(m?.milestoneId)) maxId = Math.max(maxId, m.milestoneId);
    }
  }
  return maxId;
}

/**
 * Returns a deep-cloned definitions map with every row guaranteed a numeric milestoneId.
 */
export function ensureMilestoneIds<T extends MilestoneRowLike>(
  definitions: Record<string, T[]>,
  defaults?: Record<string, MilestoneRowLike[]>
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const [cat, listRaw] of Object.entries(definitions)) {
    if (!Array.isArray(listRaw)) continue;
    out[cat] = listRaw.map((row) => {
      const clone = {
        ...row,
        items: row.items ? row.items.map((it) => ({ ...it })) : [],
      } as T;
      return clone;
    });
  }

  if (defaults) {
    for (const [cat, rows] of Object.entries(out)) {
      const defRows = defaults[cat];
      if (!Array.isArray(defRows)) continue;
      for (const row of rows) {
        if (isValidMilestoneId(row.milestoneId)) continue;
        const match = defRows.find((d) => d.threshold === row.threshold);
        if (match && isValidMilestoneId(match.milestoneId)) {
          (row as MilestoneRowLike).milestoneId = match.milestoneId;
        }
      }
    }
  }

  let nextId = maxMilestoneIdAcross(out) + 1;
  const catKeys = Object.keys(out).sort();
  for (const cat of catKeys) {
    const rows = out[cat];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (isValidMilestoneId(row.milestoneId)) continue;
      (row as MilestoneRowLike).milestoneId = nextId++;
    }
  }

  return out;
}
