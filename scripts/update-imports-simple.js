#!/usr/bin/env node
/**
 * Simple script to update base imports in game backend files
 */

const fs = require('fs');
const path = require('path');

function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function calculateUpLevels(filePath) {
  // Count how many levels deep from apps/shooter-game/backend
  const parts = filePath.split(path.sep);
  const backendIndex = parts.indexOf('backend');
  if (backendIndex === -1) return 0;
  
  // From backend to file: backend/app/api/scores/verify/route.ts
  // Levels: app (1), api (2), scores (3), verify (4), route.ts (file, not counted)
  const depth = parts.length - backendIndex - 2; // -2 for 'backend' and filename
  
  // To get to root: backend (1) + shooter-game (2) + apps (3) = 3, plus depth
  return depth + 3;
}

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const upLevels = calculateUpLevels(filePath);
  const upPath = '../'.repeat(upLevels);
  
  // Replace patterns
  const replacements = [
    {
      pattern: /from ['"]@\/lib\/sui\/suiService['"]/g,
      replacement: `from '${upPath}base/backend/lib/sui/suiService'`
    },
    {
      pattern: /from ['"]@\/lib\/api\/api-handler['"]/g,
      replacement: `from '${upPath}base/backend/lib/api/api-handler'`
    },
    {
      pattern: /from ['"]@\/lib\/cors['"]/g,
      replacement: `from '${upPath}base/backend/lib/cors'`
    },
    {
      pattern: /from ['"]@\/config\/config['"]/g,
      replacement: `from '${upPath}base/backend/config/config'`
    },
    {
      pattern: /from ['"]@\/lib\/sui\/badge-logger['"]/g,
      replacement: `from '${upPath}base/backend/lib/sui/badge-logger'`
    },
    {
      pattern: /from ['"]@\/lib\/sui\/badge-errors['"]/g,
      replacement: `from '${upPath}base/backend/lib/sui/badge-errors'`
    }
  ];
  
  replacements.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

const backendDir = path.join(process.cwd(), 'apps/shooter-game/backend');
const files = findTsFiles(backendDir);

console.log(`Found ${files.length} TypeScript files\n`);

let updated = 0;
files.forEach(file => {
  const relativePath = path.relative(process.cwd(), file);
  if (updateFile(file)) {
    console.log(`✅ Updated: ${relativePath}`);
    updated++;
  }
});

console.log(`\n✅ Updated ${updated} files`);
