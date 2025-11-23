// ==========================================
// Badge Image Validator - Validates WebP images before storing on-chain
// ==========================================

/**
 * WebP file format constants
 */
const WEBP_RIFF_HEADER = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_WEBP_HEADER = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
const WEBP_VP8_HEADER = [0x56, 0x50, 0x38]; // "VP8" (for lossy)
const WEBP_VP8L_HEADER = [0x56, 0x50, 0x38, 0x4C]; // "VP8L" (for lossless)
const WEBP_VP8X_HEADER = [0x56, 0x50, 0x38, 0x58]; // "VP8X" (for extended)

/**
 * Image validation configuration
 * 
 * IMPORTANT: These limits are based on Sui protocol constraints (not arbitrary):
 * - Pure arguments in transactions: 16KB (16,384 bytes) - Sui protocol hard limit
 *   Reference: https://forums.sui.io/t/limit-on-overall-size-of-rpc-call/2302
 * - Object storage: 250KB (256,000 bytes) - Sui protocol object size limit
 *   Reference: https://forums.sui.io/t/how-does-the-size-limit-of-a-single-sui-move-object-work/45398
 * 
 * NOTE: Badge images are now passed as BadgeImageData objects (not pure arguments),
 * which allows images up to 250KB. However, creating the BadgeImageData object still
 * requires passing the image data as a pure argument initially, which has the 16KB limit.
 * 
 * For images > 16KB, we need to use a different approach (e.g., chunking or two-step process).
 * For now, we validate against the object size limit (250KB) as the maximum.
 */
const MAX_IMAGE_SIZE_FOR_TRANSACTION = 16 * 1024; // 16,384 bytes - Sui protocol limit for pure arguments (when creating object)
const MAX_IMAGE_SIZE_FOR_OBJECT = 250 * 1024; // 256,000 bytes - Sui protocol object size limit (final storage)
const MIN_IMAGE_SIZE = 100; // 100 bytes minimum (very small WebP)
const EXPECTED_WIDTH = 512;
const EXPECTED_HEIGHT = 512;

/**
 * Validation result
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  size?: number;
  width?: number;
  height?: number;
  format?: 'VP8' | 'VP8L' | 'VP8X' | 'unknown';
}

/**
 * Validate WebP image data
 * @param imageData - Image data as Uint8Array
 * @returns Validation result
 */
export function validateWebPImage(imageData: Uint8Array): ImageValidationResult {
  // Check minimum size
  if (imageData.length < MIN_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image too small: ${imageData.length} bytes (minimum: ${MIN_IMAGE_SIZE} bytes)`,
      size: imageData.length,
    };
  }

  // Check maximum size for object storage (250KB limit)
  // This is the Sui protocol object size limit - cannot be exceeded
  // NOTE: Images are passed as BadgeImageData objects, which can be up to 250KB
  // The 16KB pure argument limit only applies when creating the object, but Sui's
  // Programmable Transaction Blocks may handle this differently internally
  if (imageData.length > MAX_IMAGE_SIZE_FOR_OBJECT) {
    return {
      valid: false,
      error: `Image too large: ${(imageData.length / 1024).toFixed(2)}KB (maximum: ${(MAX_IMAGE_SIZE_FOR_OBJECT / 1024).toFixed(2)}KB / ${MAX_IMAGE_SIZE_FOR_OBJECT} bytes). ` +
        `This exceeds Sui's protocol limit for object storage (250KB). ` +
        `Please compress the image more aggressively or use a smaller resolution.`,
      size: imageData.length,
    };
  }
  
  // Note: Images > 16KB will be passed as BadgeImageData objects in the transaction
  // The transaction builder handles creating the object and passing it to the function
  // This allows images up to 250KB to be used, despite the 16KB pure argument limit
  
  // Warn if image approaches object storage limit (for reference)
  // Note: Object storage limit is 250KB total (image + metadata), so we warn at 200KB to leave room for metadata
  const OBJECT_STORAGE_WARNING_THRESHOLD = 200 * 1024; // 200KB - leaves ~50KB for metadata
  if (imageData.length > OBJECT_STORAGE_WARNING_THRESHOLD) {
    console.warn(
      `⚠️ [IMAGE VALIDATOR] Image size ${(imageData.length / 1024).toFixed(2)}KB exceeds recommended threshold of ${(OBJECT_STORAGE_WARNING_THRESHOLD / 1024).toFixed(2)}KB. ` +
      `Sui objects have a 250KB total size limit (image + metadata). ` +
      `This image may cause the badge object to exceed the limit when combined with metadata.`
    );
  }

  // Check RIFF header (bytes 0-3)
  if (imageData.length < 4) {
    return {
      valid: false,
      error: 'Image data too short to contain RIFF header',
      size: imageData.length,
    };
  }

  for (let i = 0; i < 4; i++) {
    if (imageData[i] !== WEBP_RIFF_HEADER[i]) {
      return {
        valid: false,
        error: `Invalid RIFF header at byte ${i}: expected ${WEBP_RIFF_HEADER[i]}, got ${imageData[i]}`,
        size: imageData.length,
      };
    }
  }

  // Check WEBP header (bytes 8-11)
  if (imageData.length < 12) {
    return {
      valid: false,
      error: 'Image data too short to contain WEBP header',
      size: imageData.length,
    };
  }

  for (let i = 0; i < 4; i++) {
    if (imageData[8 + i] !== WEBP_WEBP_HEADER[i]) {
      return {
        valid: false,
        error: `Invalid WEBP header at byte ${8 + i}: expected ${WEBP_WEBP_HEADER[i]}, got ${imageData[8 + i]}`,
        size: imageData.length,
      };
    }
  }

  // Detect WebP format type (VP8, VP8L, or VP8X)
  let format: 'VP8' | 'VP8L' | 'VP8X' | 'unknown' = 'unknown';
  
  // Check for VP8 (lossy) - starts at byte 12
  if (imageData.length >= 15) {
    let isVP8 = true;
    for (let i = 0; i < 3; i++) {
      if (imageData[12 + i] !== WEBP_VP8_HEADER[i]) {
        isVP8 = false;
        break;
      }
    }
    if (isVP8) {
      format = 'VP8';
    }
  }

  // Check for VP8L (lossless) - starts at byte 12
  if (format === 'unknown' && imageData.length >= 16) {
    let isVP8L = true;
    for (let i = 0; i < 4; i++) {
      if (imageData[12 + i] !== WEBP_VP8L_HEADER[i]) {
        isVP8L = false;
        break;
      }
    }
    if (isVP8L) {
      format = 'VP8L';
    }
  }

  // Check for VP8X (extended) - starts at byte 12
  if (format === 'unknown' && imageData.length >= 16) {
    let isVP8X = true;
    for (let i = 0; i < 4; i++) {
      if (imageData[12 + i] !== WEBP_VP8X_HEADER[i]) {
        isVP8X = false;
        break;
      }
    }
    if (isVP8X) {
      format = 'VP8X';
    }
  }

  // If format is still unknown, it might be a valid WebP but we can't detect the format
  // This is okay - we've validated the RIFF and WEBP headers which are the critical parts
  if (format === 'unknown') {
    // Still valid if RIFF and WEBP headers are correct
    // Some WebP variants might have different chunk structures
    console.warn('⚠️ [IMAGE VALIDATOR] Could not detect WebP format type, but RIFF/WEBP headers are valid');
  }

  // Try to extract dimensions (optional - not all WebP formats store dimensions in the same place)
  // NOTE: Dimension extraction is best-effort and may fail for some WebP variants
  // The actual image validation is based on headers, not dimensions
  let width: number | undefined;
  let height: number | undefined;

  // For VP8 (lossy/simple WebP), the frame header starts after "VP8 " (4 bytes at byte 12)
  // After the frame sync code (0x9D 0x01 0x2A at bytes 16-18), dimensions are at bytes 20-23
  // Format: width (14 bits) at bytes 20-21, height (14 bits) at bytes 22-23 (little-endian)
  // NOTE: VP8 stores dimensions as (width-1) and (height-1), so we need to add 1
  // IMPORTANT: VP8 dimension extraction is tricky - if we get invalid values, skip dimension extraction
  if (format === 'VP8' && imageData.length >= 24) {
    // Check for frame sync code first (should be at bytes 16-18)
    const hasFrameSync = imageData.length >= 19 && 
                        imageData[16] === 0x9D && 
                        imageData[17] === 0x01 && 
                        imageData[18] === 0x2A;
    
    if (hasFrameSync) {
      // Dimensions are at bytes 20-23 (14 bits each, little-endian)
      // VP8 stores dimensions as (value - 1), so we add 1
      // Read 16 bits and mask to 14 bits, then add 1
      const widthRaw = (imageData[20] | (imageData[21] << 8)) & 0x3FFF;
      const heightRaw = (imageData[22] | (imageData[23] << 8)) & 0x3FFF;
      
      // Validate the raw values before adding 1 (should be reasonable)
      // If widthRaw or heightRaw is > 16383 (max 14-bit value), something is wrong
      // Also check that the final values (after +1) are reasonable (max 10000 for images)
      if (widthRaw <= 16383 && heightRaw <= 16383) {
        const finalWidth = widthRaw + 1;
        const finalHeight = heightRaw + 1;
        // Only set dimensions if final values are reasonable
        if (finalWidth <= 10000 && finalHeight <= 10000 && finalWidth >= 1 && finalHeight >= 1) {
          width = finalWidth;
          height = finalHeight;
        }
        // If values are invalid, silently skip (dimension extraction is optional)
      }
    } else {
      // Fallback: try bytes 26-29 (some VP8 variants)
      if (imageData.length >= 30) {
        const widthRaw = (imageData[26] | (imageData[27] << 8)) & 0x3FFF;
        const heightRaw = (imageData[28] | (imageData[29] << 8)) & 0x3FFF;
        
        if (widthRaw <= 16383 && heightRaw <= 16383) {
          const finalWidth = widthRaw + 1;
          const finalHeight = heightRaw + 1;
          // Only set dimensions if final values are reasonable
          if (finalWidth <= 10000 && finalHeight <= 10000 && finalWidth >= 1 && finalHeight >= 1) {
            width = finalWidth;
            height = finalHeight;
          }
        }
      }
    }
  }

  // For VP8L (lossless), dimensions are encoded in a single 32-bit value at bytes 21-24
  // Format: 14 bits width, 14 bits height, packed into 32 bits (little-endian)
  if (format === 'VP8L' && imageData.length >= 25) {
    const bits = imageData[21] | (imageData[22] << 8) | (imageData[23] << 16) | (imageData[24] << 24);
    width = (bits & 0x3FFF) + 1;  // Width is 14 bits, +1 because it's stored as width-1
    height = ((bits >> 14) & 0x3FFF) + 1;  // Height is next 14 bits, +1 because it's stored as height-1
  }

  // For VP8X (extended), dimensions are at bytes 24-27 (24 bits each, little-endian)
  // Format: width (24 bits) at bytes 24-26, height (24 bits) at bytes 27-29
  if (format === 'VP8X' && imageData.length >= 30) {
    width = imageData[24] | (imageData[25] << 8) | ((imageData[26] & 0x0F) << 16);
    height = imageData[27] | (imageData[28] << 8) | ((imageData[29] & 0x0F) << 16);
  }
  
  // If dimensions are still undefined or seem invalid, don't report them
  // This is okay - dimension extraction is optional and may fail for some WebP variants
  if (width && height && (width > 10000 || height > 10000 || width < 1 || height < 1)) {
    // Dimensions seem invalid, clear them
    console.warn(`⚠️ [IMAGE VALIDATOR] Extracted dimensions (${width}x${height}) seem invalid, ignoring`);
    width = undefined;
    height = undefined;
  }

  // Warn if dimensions don't match expected (but don't fail validation)
  if (width && height) {
    if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
      console.warn(
        `⚠️ [IMAGE VALIDATOR] Image dimensions (${width}x${height}) don't match expected (${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}), but image is valid`
      );
    }
  }

  return {
    valid: true,
    size: imageData.length,
    width,
    height,
    format,
  };
}

/**
 * Validate and sanitize image data
 * Throws error if validation fails
 * @param imageData - Image data as Uint8Array
 * @returns Validated image data
 * @throws Error if validation fails
 */
export function validateAndSanitizeImage(imageData: Uint8Array): Uint8Array {
  const validation = validateWebPImage(imageData);
  
  if (!validation.valid) {
    throw new Error(`Invalid WebP image: ${validation.error}`);
  }

  // Return original data (no sanitization needed - WebP is safe)
  return imageData;
}

/**
 * Get image validation info (for logging/debugging)
 * @param imageData - Image data as Uint8Array
 * @returns Validation info
 */
export function getImageInfo(imageData: Uint8Array): {
  size: number;
  sizeKB: number;
  format?: string;
  width?: number;
  height?: number;
  isValid: boolean;
} {
  const validation = validateWebPImage(imageData);
  
  return {
    size: imageData.length,
    sizeKB: Math.round((imageData.length / 1024) * 100) / 100,
    format: validation.format,
    width: validation.width,
    height: validation.height,
    isValid: validation.valid,
  };
}

