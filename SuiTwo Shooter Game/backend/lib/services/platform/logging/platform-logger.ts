// ==========================================
// Platform logger for game backend (game-owned; no platform dependency)
// ==========================================

const debugEnabled = (): boolean =>
  process.env.DEBUG_PLATFORM === 'true' ||
  process.env.DEBUG_BADGE === 'true' ||
  process.env.DEBUG_BADGE_LOOKUP === 'true';

export class PlatformLogger {
  static debug(message: string, data?: unknown): void {
    if (debugEnabled()) {
      if (data !== undefined) console.debug(`[PLATFORM] ${message}`, data);
      else console.debug(`[PLATFORM] ${message}`);
    }
  }

  static info(message: string, data?: unknown): void {
    if (data !== undefined) console.info(`[PLATFORM] ${message}`, data);
    else console.info(`[PLATFORM] ${message}`);
  }

  static warn(message: string, data?: unknown): void {
    if (data !== undefined) console.warn(`[PLATFORM] ${message}`, data);
    else console.warn(`[PLATFORM] ${message}`);
  }

  static error(message: string, error?: unknown): void {
    if (error !== undefined) console.error(`[PLATFORM] ${message}`, error);
    else console.error(`[PLATFORM] ${message}`);
  }

  static transaction(message: string, data?: unknown): void {
    if (data !== undefined) console.info(`[PLATFORM TX] ${message}`, data);
    else console.info(`[PLATFORM TX] ${message}`);
  }

  static isDebugEnabled(): boolean {
    return debugEnabled();
  }
}
