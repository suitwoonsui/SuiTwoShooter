'use strict';

/**
 * @deprecated Use apps/springmint/scripts/mint-mews.js (env-based; no keys in repo).
 * See apps/springmint/README.md
 */
console.error(
  'This script moved to apps/springmint/scripts/mint-mews.js\n' +
    'Set SUI_PRIVATE_KEY, SPRINGMINT_PACKAGE_ID, SPRINGMINT_MEWS_TREASURY_CAP_ID, then:\n' +
    '  cd apps/springmint && npm run mint:mews -- [recipient] [amount]'
);
process.exit(1);
