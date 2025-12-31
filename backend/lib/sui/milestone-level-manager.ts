// ==========================================
// Milestone Level Manager
// ==========================================
// Manages milestone levels based on threshold ordering
// Ensures levels are always 1, 2, 3... in threshold order

import { BadgeLogger } from './badge-logger';

export interface MilestoneDefinition {
  milestoneId?: number; // Stable unique identifier (never changes)
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
  level?: number; // Current on-chain level (may not match threshold order)
}

export interface LevelReorganization {
  milestoneId?: number; // Stable ID (if available)
  oldLevel: number;
  newLevel: number;
  threshold: number;
}

/**
 * Calculate what level a milestone should have based on its threshold position
 * Levels are assigned 1, 2, 3... in ascending threshold order
 */
export function calculateLevelForThreshold(
  threshold: number,
  existingDefinitions: MilestoneDefinition[]
): number {
  // Sort existing definitions by threshold
  const sorted = [...existingDefinitions].sort((a, b) => a.threshold - b.threshold);
  
  // Find position where this threshold should be inserted
  let position = 0;
  for (const def of sorted) {
    if (threshold > def.threshold) {
      position++;
    } else if (threshold === def.threshold) {
      // If threshold already exists, return its current position
      return position + 1;
    } else {
      break;
    }
  }
  
  // Level is 1-indexed
  return position + 1;
}

/**
 * Calculate what level a milestone should have, excluding a specific milestone
 * (useful when updating an existing milestone)
 */
export function calculateLevelForThresholdExcluding(
  threshold: number,
  existingDefinitions: MilestoneDefinition[],
  excludeLevel: number
): number {
  // Filter out the milestone we're updating
  const filtered = existingDefinitions.filter(def => def.level !== excludeLevel);
  return calculateLevelForThreshold(threshold, filtered);
}

/**
 * Check if levels need to be reorganized for a category
 * Returns a map of old level -> new level assignments
 */
export function calculateLevelReorganization(
  definitions: MilestoneDefinition[]
): Map<number, number> {
  const reorganization = new Map<number, number>();
  
  // Sort definitions by threshold
  const sorted = [...definitions].sort((a, b) => a.threshold - b.threshold);
  
  // Assign new levels based on threshold order
  sorted.forEach((def, index) => {
    const newLevel = index + 1; // 1-indexed
    const oldLevel = def.level;
    
    if (oldLevel !== undefined && oldLevel !== newLevel) {
      reorganization.set(oldLevel, newLevel);
      BadgeLogger.debug('Level reorganization needed', {
        threshold: def.threshold,
        oldLevel,
        newLevel,
      });
    }
  });
  
  return reorganization;
}

/**
 * Get the reorganization plan for a category
 * Returns array of changes needed
 * Uses milestone_id for stable tracking when available
 */
export function getReorganizationPlan(
  definitions: MilestoneDefinition[]
): LevelReorganization[] {
  const plan: LevelReorganization[] = [];
  
  // Sort definitions by threshold
  const sorted = [...definitions].sort((a, b) => a.threshold - b.threshold);
  
  // Assign new levels based on threshold order
  sorted.forEach((def, index) => {
    const newLevel = index + 1; // 1-indexed
    const oldLevel = def.level;
    
    if (oldLevel !== undefined && oldLevel !== newLevel) {
      plan.push({
        milestoneId: def.milestoneId, // Include stable ID for tracking
        oldLevel,
        newLevel,
        threshold: def.threshold,
      });
    }
  });
  
  return plan;
}

/**
 * Check if adding a milestone with a given threshold would require reorganization
 */
export function wouldRequireReorganization(
  newThreshold: number,
  existingDefinitions: MilestoneDefinition[]
): boolean {
  const sorted = [...existingDefinitions].sort((a, b) => a.threshold - b.threshold);
  
  // Find where this threshold would fit
  let position = 0;
  for (const def of sorted) {
    if (newThreshold > def.threshold) {
      position++;
    } else {
      break;
    }
  }
  
  const expectedLevel = position + 1;
  const lastLevel = sorted.length;
  
  // If inserting in the middle or at the end, existing milestones after this position
  // would need their levels incremented
  // If inserting at the beginning, all existing milestones would need their levels incremented
  return expectedLevel <= lastLevel;
}

/**
 * Get the level that should be assigned to a new milestone
 */
export function getLevelForNewMilestone(
  threshold: number,
  existingDefinitions: MilestoneDefinition[]
): number {
  return calculateLevelForThreshold(threshold, existingDefinitions);
}

/**
 * Get the level that should be assigned when updating a milestone's threshold
 */
export function getLevelForUpdatedMilestone(
  newThreshold: number,
  oldLevel: number,
  existingDefinitions: MilestoneDefinition[]
): number {
  return calculateLevelForThresholdExcluding(newThreshold, existingDefinitions, oldLevel);
}

/**
 * Check if updating a milestone's threshold would require level changes
 */
export function wouldThresholdChangeRequireReorganization(
  oldLevel: number,
  oldThreshold: number,
  newThreshold: number,
  existingDefinitions: MilestoneDefinition[]
): boolean {
  // If threshold doesn't change, no reorganization needed
  if (oldThreshold === newThreshold) {
    return false;
  }
  
  // Calculate what the new level should be
  const newLevel = getLevelForUpdatedMilestone(newThreshold, oldLevel, existingDefinitions);
  
  // If new level is different from old level, reorganization is needed
  return newLevel !== oldLevel;
}
