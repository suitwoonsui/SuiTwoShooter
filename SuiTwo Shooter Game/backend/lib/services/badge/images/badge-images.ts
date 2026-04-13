// ==========================================
// Badge Images - Image loading and management
// ==========================================

import * as fs from 'fs';
import * as path from 'path';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getBadgeImageCache } from '@/lib/services/badge/cache/badge-image-cache';
import { validateAndSanitizeImage, getImageInfo } from '@/lib/services/badge/validation/badge-image-validator';

/**
 * Dependencies needed for badge images (URL and file loading only; no on-chain upload).
 */
export interface BadgeImagesDependencies {
  getConfig: () => {
    server: {
      apiBaseUrl: string;
    };
  };
}

/**
 * Badge Images Module
 * Handles badge image URLs (external) and file loading. On-chain image storage uses platform Shipyard metadata.image_url only.
 */
export class BadgeImages {
  private dependencies: BadgeImagesDependencies;
  private imageCache = getBadgeImageCache();

  constructor(dependencies: BadgeImagesDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Load badge image from file system
   * Falls back to placeholder if image file doesn't exist
   */
  async loadBadgeImage(tier: number): Promise<Uint8Array> {
    // Check cache first (now with TTL support)
    const cached = this.imageCache.get(tier);
    if (cached) {
      return cached;
    }

    // Tier names for file lookup
    const tierNames = ['standard', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
    const tierName = tierNames[tier] || 'standard';
    
    // Try to load actual image file
    const imagePath = path.join(process.cwd(), 'public', 'badges', `${tierName}.webp`);
    
    try {
      if (fs.existsSync(imagePath)) {
        const imageData = fs.readFileSync(imagePath);
        
        // Validate image data before caching
        try {
          const validatedImage = validateAndSanitizeImage(imageData);
          const imageInfo = getImageInfo(validatedImage);
          PlatformLogger.info(`Loaded and validated badge image for tier ${tier} (${tierName})`, {
            size: `${imageInfo.sizeKB}KB`,
            format: imageInfo.format,
            dimensions: imageInfo.width && imageInfo.height ? `${imageInfo.width}x${imageInfo.height}` : 'unknown',
          });
          
          this.imageCache.set(tier, validatedImage);
          return validatedImage;
        } catch (validationError) {
          PlatformLogger.error(`Image validation failed for tier ${tier} (${tierName})`, validationError);
          throw new PlatformError(
            PlatformErrorCode.IMAGE_VALIDATION_FAILED,
            `Invalid badge image file for tier ${tier}: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`,
            { tier, tierName, validationError }
          );
        }
      }
    } catch (error) {
      PlatformLogger.warn(`Failed to load badge image for tier ${tier}`, error);
      throw error; // Re-throw to trigger fallback to placeholder
    }

    // Fall back to placeholder image
    PlatformLogger.info(`Using placeholder image for tier ${tier} (${tierName})`);
    return this.createPlaceholderImage(tier);
  }

  /**
   * Create a simple placeholder image for testing
   * Returns a minimal WebP image (1x1 pixel, transparent)
   */
  private createPlaceholderImage(tier: number): Uint8Array {
    // Minimal WebP image: 1x1 pixel, transparent
    const placeholder = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x1A, 0x00, 0x00, 0x00, // Size
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x20, // VP8 
      0x0A, 0x00, 0x00, 0x00, // Size
      0x00, 0x00, 0x00, 0x00, // Flags
      0x00, 0x00, 0x00, 0x00, // Width/Height (1x1)
      0x00, 0x00, 0x00, 0x00, // Data
    ]);
    
    // Cache placeholder
    this.imageCache.set(tier, placeholder);
    return placeholder;
  }

  /**
   * Get static image URL for a badge tier
   */
  getBadgeImageUrl(tier: number): string {
    const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const tierName = tierNames[tier] || 'Standard';
    const baseUrl = this.dependencies.getConfig().server.apiBaseUrl;
    PlatformLogger.debug('Getting badge image URL', {
      tier,
      tierName,
      baseUrl,
    });
    const imageUrl = `${baseUrl}/Badges/${tierName}.webp`;
    PlatformLogger.debug('Final image URL', { imageUrl });
    return imageUrl;
  }

}
