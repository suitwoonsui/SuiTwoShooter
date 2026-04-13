import { AchievementService } from '@/lib/services/achievements/core/achievement-service';

let singleton: AchievementService | null = null;

export function getAchievementService(): AchievementService {
  if (!singleton) singleton = new AchievementService();
  return singleton;
}

