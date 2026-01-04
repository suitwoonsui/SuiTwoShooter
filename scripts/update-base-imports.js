#!/usr/bin/env node
/**
 * Update base service imports in game backend files
 * Replaces @/ imports with relative paths to base
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Map of old imports to new relative paths
// The relative path depth depends on the file location
const baseImports = {
  '@/lib/sui/suiService': 'base/backend/lib/sui/suiService',
  '@/lib/api/api-handler': 'base/backend/lib/api/api-handler',
  '@/lib/cors': 'base/backend/lib/cors',
  '@/config/config': 'base/backend/config/config',
  '@/lib/sui/badge-logger': 'base/backend/lib/sui/badge-logger',
  '@/lib/sui/badge-errors': 'base/backend/lib/sui/badge-errors',
};

function calculateRelativePath(filePath, targetPath) {
  // Calculate relative path from file to target
  const fileDir = path.dirname(filePath);
  const relative = path.relative(fileDir, targetPath);
  // Convert to forward slashes for imports
  return relative.replace(/\\/g, '/');
}

function updateImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updated = content;
  let changed = false;
  
  // Calculate depth of file (how many levels deep in apps/shooter-game/backend)
  const parts = filePath.split(path.sep);
  const backendIndex = parts.indexOf('backend');
  if (backendIndex === -1) return { changed: false };
  
  // Count levels from backend to the file
  const depth = parts.length - backendIndex - 2; // -2 for backend and filename
  
  // Build relative path prefix (go up to root, then into base)
  // From apps/shooter-game/backend/app/api/... we need to go up to root
  // apps/shooter-game/backend = 3 levels, then app/api/... adds more
  const levelsUp = depth + 3; // backend + shooter-game + apps = 3, plus depth in backend
  const upPath = '../'.repeat(levelsUp);
  
  // Update each import
  for (const [oldImport, targetPath] of Object.entries(baseImports)) {
    const regex = new RegExp(`from ['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    if (content.includes(oldImport)) {
      const relativePath = upPath + targetPath;
      updated = updated.replace(regex, `from '${relativePath}'`);
      changed = true;
      console.log(`  Updated: ${oldImport} -> ${relativePath}`);
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
  
  return { changed };
}

async function main() {
  console.log('🔄 Updating base imports in game backend files...\n');
  
  // Find all TypeScript files in apps/shooter-game/backend
  const files = await glob('apps/shooter-game/backend/**/*.ts', {
    cwd: process.cwd(),
    absolute: false
  });
  
  console.log(`Found ${files.length} files to check\n`);
  
  let updatedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    console.log(`Checking: ${file}`);
    const result = updateImportsInFile(fullPath);
    if (result.changed) {
      updatedCount++;
      console.log(`  ✅ Updated\n`);
    } else {
      console.log(`  ⏭️  No changes needed\n`);
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} files`);
}

main().catch(console.error);
