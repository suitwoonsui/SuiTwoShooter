#!/usr/bin/env node
/**
 * Update game-specific service imports in game backend files
 * These services are still in the original backend/lib/sui/
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
  const parts = filePath.split(path.sep);
  const backendIndex = parts.indexOf('backend');
  if (backendIndex === -1) return 0;
  
  const depth = parts.length - backendIndex - 2; // -2 for 'backend' and filename
  return depth + 3; // backend + shooter-game + apps = 3, plus depth in backend
}

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  const upLevels = calculateUpLevels(filePath);
  const upPath = '../'.repeat(upLevels);
  
  // Game-specific services that are in original backend/lib/sui/
  const gameServices = [
    'achievement-service',
    'tournament-service',
    'store-service',
    'badge-service',
    'game-pass-service',
    'rewards-service',
    'admin-wallet-service',
    'migration-service',
    'transaction-helpers',
    'badge-validators'
  ];
  
  // Game-specific services in backend/lib/services/
  const libServices = [
    'price-converter',
    'item-catalog',
    'reward-cost-calculator',
    'tournament-scheduler',
    'creator-reward-service',
    'batch-reward-distribution'
  ];
  
  // Update game service imports (static and dynamic)
  gameServices.forEach(service => {
    // Static imports: from '@/lib/sui/service'
    const staticPattern = new RegExp(`from ['"]@/lib/sui/${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    if (content.includes(`@/lib/sui/${service}`)) {
      const replacement = `from '${upPath}backend/lib/sui/${service}'`;
      content = content.replace(staticPattern, replacement);
      changed = true;
    }
    
    // Dynamic imports: await import('@/lib/sui/service')
    const dynamicPattern = new RegExp(`import\\(['"]@/lib/sui/${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g');
    if (content.includes(`import('@/lib/sui/${service}')`)) {
      const replacement = `import('${upPath}backend/lib/sui/${service}')`;
      content = content.replace(dynamicPattern, replacement);
      changed = true;
    }
  });
  
  // Update lib service imports (static and dynamic)
  libServices.forEach(service => {
    // Static imports
    const staticPattern = new RegExp(`from ['"]@/lib/services/${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    if (content.includes(`@/lib/services/${service}`)) {
      const replacement = `from '${upPath}backend/lib/services/${service}'`;
      content = content.replace(staticPattern, replacement);
      changed = true;
    }
    
    // Dynamic imports
    const dynamicPattern = new RegExp(`import\\(['"]@/lib/services/${service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, 'g');
    if (content.includes(`import('@/lib/services/${service}')`)) {
      const replacement = `import('${upPath}backend/lib/services/${service}')`;
      content = content.replace(dynamicPattern, replacement);
      changed = true;
    }
  });
  
  // Update auth imports (static and dynamic)
  const authStaticPattern = /from ['"]@\/lib\/auth['"]/g;
  const authDynamicPattern = /import\\(['"]@\/lib\/auth['"]\\)/g;
  if (content.includes('@/lib/auth')) {
    content = content.replace(authStaticPattern, `from '${upPath}backend/lib/auth'`);
    content = content.replace(authDynamicPattern, `import('${upPath}backend/lib/auth')`);
    changed = true;
  }
  
  // Update config imports (static and dynamic)
  const configStaticPattern = /from ['"]@\/config\/config['"]/g;
  const configDynamicPattern = /import\\(['"]@\/config\/config['"]\\)/g;
  if (content.includes('@/config/config')) {
    content = content.replace(configStaticPattern, `from '${upPath}base/backend/config/config'`);
    content = content.replace(configDynamicPattern, `import('${upPath}base/backend/config/config')`);
    changed = true;
  }
  
  // Update badge-service sub-imports (static and dynamic)
  const badgeUtilsStaticPattern = /from ['"]@\/lib\/sui\/badge-service\/badge-utilities['"]/g;
  const badgeUtilsDynamicPattern = /import\\(['"]@\/lib\/sui\/badge-service\/badge-utilities['"]\\)/g;
  if (content.includes('@/lib/sui/badge-service/badge-utilities')) {
    content = content.replace(badgeUtilsStaticPattern, `from '${upPath}backend/lib/sui/badge-service/badge-utilities'`);
    content = content.replace(badgeUtilsDynamicPattern, `import('${upPath}backend/lib/sui/badge-service/badge-utilities')`);
    changed = true;
  }
  
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
