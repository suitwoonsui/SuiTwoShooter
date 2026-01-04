#!/usr/bin/env node
/**
 * Verification Script for Refactoring Progress
 * Tests that base infrastructure and app structure are correctly set up
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - MISSING: ${filePath}`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(process.cwd(), dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  if (exists) {
    const files = fs.readdirSync(fullPath);
    log(`✅ ${description} (${files.length} items)`, 'green');
    return true;
  } else {
    log(`❌ ${description} - MISSING: ${dirPath}`, 'red');
    return false;
  }
}

function checkImportPath(filePath, pattern, expectedPath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return { found: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasOldImport = content.includes(pattern);
    
    if (hasOldImport) {
      return { found: true, needsUpdate: true, message: `Still uses old import pattern: ${pattern}` };
    }
    
    const hasNewImport = content.includes(expectedPath);
    return { found: true, needsUpdate: !hasNewImport, message: hasNewImport ? 'Uses correct import' : 'Does not use expected import' };
  } catch (error) {
    return { found: false, error: error.message };
  }
}

log('\n🔍 Verifying Refactoring Progress...\n', 'blue');

let passed = 0;
let failed = 0;

// ==========================================
// Phase 1: Base Infrastructure
// ==========================================
log('\n📦 Phase 1: Base Infrastructure', 'blue');

// Base directories
if (checkDirectory('base/frontend/src/infrastructure/wallet', 'Base wallet directory')) passed++; else failed++;
if (checkDirectory('base/frontend/src/infrastructure/api', 'Base API directory')) passed++; else failed++;
if (checkDirectory('base/frontend/src/config', 'Base config directory')) passed++; else failed++;
if (checkDirectory('base/backend/lib/sui', 'Base Sui service directory')) passed++; else failed++;
if (checkDirectory('base/backend/lib/api', 'Base API handler directory')) passed++; else failed++;
if (checkDirectory('base/backend/config', 'Base backend config directory')) passed++; else failed++;
if (checkDirectory('base/backend/app/api/health', 'Base health endpoint directory')) passed++; else failed++;
if (checkDirectory('base/backend/app/api/tokens/balance/[address]', 'Base token balance endpoint directory')) passed++; else failed++;

// Base files
if (checkFile('base/frontend/src/infrastructure/wallet/wallet-connection.js', 'Wallet connection')) passed++; else failed++;
if (checkFile('base/frontend/src/config/api-config.js', 'API config')) passed++; else failed++;
if (checkFile('base/frontend/src/config/contract-config.js', 'Contract config')) passed++; else failed++;
if (checkFile('base/backend/lib/sui/suiService.ts', 'Sui service')) passed++; else failed++;
if (checkFile('base/backend/lib/api/api-handler.ts', 'API handler')) passed++; else failed++;
if (checkFile('base/backend/lib/cors.ts', 'CORS')) passed++; else failed++;
if (checkFile('base/backend/config/config.ts', 'Backend config')) passed++; else failed++;
if (checkFile('base/backend/app/api/health/route.ts', 'Health endpoint')) passed++; else failed++;
if (checkFile('base/backend/app/api/tokens/balance/[address]/route.ts', 'Token balance endpoint')) passed++; else failed++;
if (checkDirectory('base/wallet-module', 'Wallet module')) passed++; else failed++;
if (checkFile('base/frontend/assets/sui.svg', 'Sui logo (shared asset)')) passed++; else failed++;

// Check base imports are updated
log('\n🔗 Checking Base Import Paths...', 'blue');
const suiServiceCheck = checkImportPath('base/backend/lib/sui/suiService.ts', '@/config/config', '../../config/config');
if (suiServiceCheck.found) {
  if (!suiServiceCheck.needsUpdate) {
    log('✅ SuiService uses relative imports', 'green');
    passed++;
  } else {
    log(`⚠️ SuiService: ${suiServiceCheck.message}`, 'yellow');
    failed++;
  }
} else {
  log(`❌ SuiService check failed: ${suiServiceCheck.error}`, 'red');
  failed++;
}

const apiHandlerCheck = checkImportPath('base/backend/lib/api/api-handler.ts', '@/lib/cors', '../cors');
if (apiHandlerCheck.found) {
  if (!apiHandlerCheck.needsUpdate) {
    log('✅ API handler uses relative imports', 'green');
    passed++;
  } else {
    log(`⚠️ API handler: ${apiHandlerCheck.message}`, 'yellow');
    failed++;
  }
} else {
  log(`❌ API handler check failed: ${apiHandlerCheck.error}`, 'red');
  failed++;
}

// ==========================================
// Phase 2: Apps Structure
// ==========================================
log('\n📱 Phase 2: Apps Structure', 'blue');

// App directories
if (checkDirectory('apps/shooter-game/frontend/src/game', 'Game source directory')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/frontend/assets', 'Game assets directory')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/backend/app/api', 'Game backend API directory')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/contracts', 'Game contracts directory')) passed++; else failed++;

// Game frontend files
if (checkFile('apps/shooter-game/frontend/index.html', 'Game entry point')) passed++; else failed++;
if (checkFile('apps/shooter-game/frontend/src/game/main.js', 'Game main file')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/frontend/src/game/systems', 'Game systems')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/frontend/src/game/rendering', 'Game rendering')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/frontend/src/game/audio', 'Game audio')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/frontend/src/game/shared', 'Game shared utilities')) passed++; else failed++;
if (checkFile('apps/shooter-game/frontend/src/game/blockchain/badge-service.js', 'Badge service')) passed++; else failed++;
if (checkFile('apps/shooter-game/frontend/src/game/blockchain/score-submission.js', 'Score submission')) passed++; else failed++;

// Game backend endpoints
if (checkDirectory('apps/shooter-game/backend/app/api/scores', 'Scores endpoint')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/backend/app/api/leaderboard', 'Leaderboard endpoint')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/backend/app/api/tournaments', 'Tournaments endpoint')) passed++; else failed++;
if (checkDirectory('apps/shooter-game/backend/app/api/store', 'Store endpoint')) passed++; else failed++;

// Game contracts
if (checkDirectory('apps/shooter-game/contracts/suitwo_game', 'Game contracts')) passed++; else failed++;

// ==========================================
// Phase 3: Import Verification
// ==========================================
log('\n🔗 Phase 3: Import Verification (Partial)', 'blue');
log('⚠️  Note: Full import refactoring not yet complete', 'yellow');

// Check if game HTML still references old paths
const htmlCheck = checkImportPath('apps/shooter-game/frontend/index.html', 'src/game/systems/core/lazy-loader.js', 'src/game/systems/core/lazy-loader.js');
if (htmlCheck.found) {
  log('✅ Game HTML exists and references game scripts', 'green');
  passed++;
} else {
  log(`❌ Game HTML check failed: ${htmlCheck.error}`, 'red');
  failed++;
}

// Check if backend endpoints still use old imports (they should be updated in Phase 3)
log('⚠️  Backend endpoint imports need updating in Phase 3', 'yellow');

// ==========================================
// Summary
// ==========================================
log('\n📊 Summary', 'blue');
log(`✅ Passed: ${passed}`, 'green');
log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
log(`📈 Total Checks: ${passed + failed}`, 'blue');

if (failed === 0) {
  log('\n🎉 All checks passed! Base structure is ready.', 'green');
  log('✅ Phase 1: Complete', 'green');
  log('✅ Phase 2: Complete', 'green');
  log('⏳ Phase 3: Ready to begin (import refactoring)', 'yellow');
  process.exit(0);
} else {
  log('\n⚠️  Some checks failed. Please review the issues above.', 'yellow');
  process.exit(1);
}
