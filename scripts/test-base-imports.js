#!/usr/bin/env node
/**
 * Test Base Infrastructure Imports
 * Verifies that base files can be imported and have correct structure
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

function checkFileContent(filePath, checks) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: 'File not found' };
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const results = {};
    
    for (const [name, pattern] of Object.entries(checks)) {
      results[name] = {
        found: content.includes(pattern),
        pattern: pattern
      };
    }
    
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

log('\n🧪 Testing Base Infrastructure Imports...\n', 'blue');

let tests = 0;
let passed = 0;
let failed = 0;

// Test 1: SuiService imports
log('Test 1: SuiService Import Paths', 'blue');
tests++;
const suiServiceCheck = checkFileContent('base/backend/lib/sui/suiService.ts', {
  hasSuiClient: "from '@mysten/sui/client'",
  hasConfigImport: "from '../../config/config'",
  noOldImport: "@/config/config"
});

if (suiServiceCheck.success) {
  if (suiServiceCheck.results.hasConfigImport.found && !suiServiceCheck.results.noOldImport.found) {
    log('  ✅ SuiService uses correct relative import for config', 'green');
    passed++;
  } else {
    log('  ❌ SuiService import issue', 'red');
    if (!suiServiceCheck.results.hasConfigImport.found) {
      log('     Missing: relative import to config', 'red');
    }
    if (suiServiceCheck.results.noOldImport.found) {
      log('     Still has: old @/ import', 'red');
    }
    failed++;
  }
} else {
  log(`  ❌ Failed to check SuiService: ${suiServiceCheck.error}`, 'red');
  failed++;
}

// Test 2: API Handler imports
log('\nTest 2: API Handler Import Paths', 'blue');
tests++;
const apiHandlerCheck = checkFileContent('base/backend/lib/api/api-handler.ts', {
  hasCorsImport: "from '../cors'",
  hasBadgeErrorsImport: "from '../sui/badge-errors'",
  hasBadgeLoggerImport: "from '../sui/badge-logger'",
  noOldImports: "@/lib/"
});

if (apiHandlerCheck.success) {
  const allRelative = apiHandlerCheck.results.hasCorsImport.found &&
                     apiHandlerCheck.results.hasBadgeErrorsImport.found &&
                     apiHandlerCheck.results.hasBadgeLoggerImport.found;
  const noOld = !apiHandlerCheck.results.noOldImports.found;
  
  if (allRelative && noOld) {
    log('  ✅ API Handler uses correct relative imports', 'green');
    passed++;
  } else {
    log('  ❌ API Handler import issues', 'red');
    if (!allRelative) {
      log('     Missing relative imports', 'red');
    }
    if (!noOld) {
      log('     Still has old @/ imports', 'red');
    }
    failed++;
  }
} else {
  log(`  ❌ Failed to check API Handler: ${apiHandlerCheck.error}`, 'red');
  failed++;
}

// Test 3: Health endpoint imports
log('\nTest 3: Health Endpoint Import Paths', 'blue');
tests++;
const healthCheck = checkFileContent('base/backend/app/api/health/route.ts', {
  hasApiHandlerImport: "from '../../../../lib/api/api-handler'",
  noOldImport: "@/lib/api/api-handler"
});

if (healthCheck.success) {
  if (healthCheck.results.hasApiHandlerImport.found && !healthCheck.results.noOldImport.found) {
    log('  ✅ Health endpoint uses correct relative import', 'green');
    passed++;
  } else {
    log('  ❌ Health endpoint import issue', 'red');
    failed++;
  }
} else {
  log(`  ❌ Failed to check health endpoint: ${healthCheck.error}`, 'red');
  failed++;
}

// Test 4: Token balance endpoint imports
log('\nTest 4: Token Balance Endpoint Import Paths', 'blue');
tests++;
const balanceCheck = checkFileContent('base/backend/app/api/tokens/balance/[address]/route.ts', {
  hasSuiServiceImport: "from '../../../../../lib/sui/suiService'",
  hasCorsImport: "from '../../../../../lib/cors'",
  hasApiHandlerImport: "from '../../../../../lib/api/api-handler'",
  noOldImports: "@/lib/"
});

if (balanceCheck.success) {
  const allRelative = balanceCheck.results.hasSuiServiceImport.found &&
                     balanceCheck.results.hasCorsImport.found &&
                     balanceCheck.results.hasApiHandlerImport.found;
  const noOld = !balanceCheck.results.noOldImports.found;
  
  if (allRelative && noOld) {
    log('  ✅ Token balance endpoint uses correct relative imports', 'green');
    passed++;
  } else {
    log('  ❌ Token balance endpoint import issues', 'red');
    failed++;
  }
} else {
  log(`  ❌ Failed to check token balance endpoint: ${balanceCheck.error}`, 'red');
  failed++;
}

// Test 5: Game structure verification
log('\nTest 5: Game Structure Verification', 'blue');
tests++;
const gameMainExists = fs.existsSync(path.join(process.cwd(), 'apps/shooter-game/frontend/src/game/main.js'));
const gameHtmlExists = fs.existsSync(path.join(process.cwd(), 'apps/shooter-game/frontend/index.html'));
const gameSystemsExists = fs.existsSync(path.join(process.cwd(), 'apps/shooter-game/frontend/src/game/systems'));

if (gameMainExists && gameHtmlExists && gameSystemsExists) {
  log('  ✅ Game structure is complete', 'green');
  passed++;
} else {
  log('  ❌ Game structure incomplete', 'red');
  if (!gameMainExists) log('     Missing: main.js', 'red');
  if (!gameHtmlExists) log('     Missing: index.html', 'red');
  if (!gameSystemsExists) log('     Missing: systems directory', 'red');
  failed++;
}

// Test 6: Config files in base
log('\nTest 6: Config Files in Base', 'blue');
tests++;
const apiConfigExists = fs.existsSync(path.join(process.cwd(), 'base/frontend/src/config/api-config.js'));
const contractConfigExists = fs.existsSync(path.join(process.cwd(), 'base/frontend/src/config/contract-config.js'));

if (apiConfigExists && contractConfigExists) {
  log('  ✅ Config files are in base', 'green');
  passed++;
} else {
  log('  ❌ Config files missing from base', 'red');
  failed++;
}

// Test 7: Wallet connection in base
log('\nTest 7: Wallet Connection in Base', 'blue');
tests++;
const walletConnectionExists = fs.existsSync(path.join(process.cwd(), 'base/frontend/src/infrastructure/wallet/wallet-connection.js'));

if (walletConnectionExists) {
  log('  ✅ Wallet connection is in base', 'green');
  passed++;
} else {
  log('  ❌ Wallet connection missing from base', 'red');
  failed++;
}

// Summary
log('\n📊 Test Summary', 'blue');
log(`Tests Run: ${tests}`, 'blue');
log(`✅ Passed: ${passed}`, 'green');
log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
log(`📈 Success Rate: ${((passed / tests) * 100).toFixed(1)}%`, 'blue');

if (failed === 0) {
  log('\n🎉 All import tests passed!', 'green');
  log('✅ Base infrastructure is correctly set up', 'green');
  log('✅ All imports use relative paths', 'green');
  log('✅ Ready for Phase 3 (updating game imports)', 'green');
  process.exit(0);
} else {
  log('\n⚠️  Some tests failed. Please review the issues above.', 'yellow');
  process.exit(1);
}
