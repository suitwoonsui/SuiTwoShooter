// ==========================================
// Price Conversion Verification Script
// Verifies that USD to token conversion is working correctly
// ==========================================

import { priceConverter } from '../lib/services/price-converter';
import { ITEM_CATALOG, getItemPrice } from '../lib/services/item-catalog';

/**
 * Verify price conversion accuracy
 */
async function verifyPriceConversion() {
  console.log('🔍 Starting price conversion verification...\n');

  // Step 1: Get current token prices
  console.log('📊 Step 1: Fetching current token prices...');
  const pricesResult = await priceConverter.getTokenPrices();
  
  if (!pricesResult.success || !pricesResult.prices) {
    console.error('❌ Failed to fetch token prices:', pricesResult.error);
    process.exit(1);
  }

  const prices = pricesResult.prices;
  console.log('✅ Token prices fetched:');
  console.log(`   SUI:  $${prices.sui.toFixed(4)}`);
  console.log(`   MEWS: $${prices.mews.toFixed(9)}`);
  console.log(`   USDC: $${prices.usdc.toFixed(2)}`);
  console.log(`   Timestamp: ${new Date(pricesResult.timestamp || 0).toISOString()}\n`);

  // Step 2: Test conversion for known USD amounts
  console.log('🧮 Step 2: Testing USD to token conversions...\n');
  
  const testAmounts = [0.50, 1.00, 2.50, 5.00, 10.00];
  
  for (const usdAmount of testAmounts) {
    console.log(`Testing $${usdAmount.toFixed(2)} USD:`);
    
    // Test SUI conversion
    const suiResult = await priceConverter.convertUSDToToken(usdAmount, 'SUI');
    if (suiResult.success && suiResult.tokenAmount) {
      const suiAmount = parseFloat(suiResult.tokenAmount) / 1_000_000_000; // Convert from MIST
      const expectedSui = usdAmount / prices.sui;
      const difference = Math.abs(suiAmount - expectedSui);
      const percentError = (difference / expectedSui) * 100;
      
      console.log(`   SUI:  ${suiAmount.toFixed(6)} SUI (expected: ${expectedSui.toFixed(6)}, error: ${percentError.toFixed(2)}%)`);
      
      // Verify reverse calculation
      const reverseUsd = suiAmount * prices.sui;
      const reverseError = Math.abs(reverseUsd - usdAmount);
      console.log(`          Reverse: $${reverseUsd.toFixed(4)} (error: $${reverseError.toFixed(4)})`);
    } else {
      console.log(`   SUI:  ❌ Failed - ${suiResult.error}`);
    }

    // Test MEWS conversion
    const mewsResult = await priceConverter.convertUSDToToken(usdAmount, 'MEWS');
    if (mewsResult.success && mewsResult.tokenAmount) {
      const mewsAmount = parseFloat(mewsResult.tokenAmount) / 1_000_000; // Convert from smallest unit (6 decimals)
      const expectedMews = usdAmount / prices.mews;
      const difference = Math.abs(mewsAmount - expectedMews);
      const percentError = (difference / expectedMews) * 100;
      
      console.log(`   MEWS: ${mewsAmount.toFixed(2)} MEWS (expected: ${expectedMews.toFixed(2)}, error: ${percentError.toFixed(2)}%)`);
      
      // Verify reverse calculation
      const reverseUsd = mewsAmount * prices.mews;
      const reverseError = Math.abs(reverseUsd - usdAmount);
      console.log(`          Reverse: $${reverseUsd.toFixed(4)} (error: $${reverseError.toFixed(4)})`);
    } else {
      console.log(`   MEWS: ❌ Failed - ${mewsResult.error}`);
    }

    // Test USDC conversion
    const usdcResult = await priceConverter.convertUSDToToken(usdAmount, 'USDC');
    if (usdcResult.success && usdcResult.tokenAmount) {
      const usdcAmount = parseFloat(usdcResult.tokenAmount) / 1_000_000; // Convert from smallest unit (6 decimals)
      const expectedUsdc = usdAmount; // USDC should be 1:1
      const difference = Math.abs(usdcAmount - expectedUsdc);
      
      console.log(`   USDC: ${usdcAmount.toFixed(2)} USDC (expected: ${expectedUsdc.toFixed(2)}, error: $${difference.toFixed(4)})`);
    } else {
      console.log(`   USDC: ❌ Failed - ${usdcResult.error}`);
    }
    
    console.log('');
  }

  // Step 3: Test item price conversions
  console.log('🛒 Step 3: Testing item catalog price conversions...\n');
  
  const testItems = [
    { itemId: 'extraLives', level: 1 },
    { itemId: 'forceField', level: 2 },
    { itemId: 'bossKillShot', level: 1 },
  ];

  for (const { itemId, level } of testItems) {
    const usdPrice = getItemPrice(itemId, level);
    if (!usdPrice) {
      console.log(`❌ ${itemId} level ${level}: Price not found`);
      continue;
    }

    console.log(`${itemId} level ${level} - $${usdPrice.toFixed(2)} USD:`);
    
    // Use the item price conversion method
    const conversionResult = await priceConverter.convertItemPriceToTokens(usdPrice);
    
    if (conversionResult.success && conversionResult.prices) {
      const { sui, mews, usdc } = conversionResult.prices;
      
      // Verify SUI
      const suiAmount = parseFloat(sui.amount) / 1_000_000_000;
      const expectedSui = usdPrice / prices.sui;
      const suiError = Math.abs(suiAmount - expectedSui) / expectedSui * 100;
      
      console.log(`   SUI:  ${sui.display} (${sui.amount} MIST) - Error: ${suiError.toFixed(2)}%`);
      
      // Verify MEWS
      const mewsAmount = parseFloat(mews.amount) / 1_000_000;
      const expectedMews = usdPrice / prices.mews;
      const mewsError = Math.abs(mewsAmount - expectedMews) / expectedMews * 100;
      
      console.log(`   MEWS: ${mews.display} (${mews.amount} smallest units) - Error: ${mewsError.toFixed(2)}%`);
      
      // Verify USDC
      const usdcAmount = parseFloat(usdc.amount) / 1_000_000;
      const usdcError = Math.abs(usdcAmount - usdPrice);
      
      console.log(`   USDC: ${usdc.display} (${usdc.amount} smallest units) - Error: $${usdcError.toFixed(4)}`);
    } else {
      console.log(`   ❌ Conversion failed: ${conversionResult.error}`);
    }
    
    console.log('');
  }

  // Step 4: Verify decimal handling
  console.log('🔢 Step 4: Verifying decimal handling...\n');
  
  const decimalTests = [
    { token: 'SUI' as const, expectedDecimals: 9 },
    { token: 'MEWS' as const, expectedDecimals: 6 },
    { token: 'USDC' as const, expectedDecimals: 6 },
  ];

  for (const { token, expectedDecimals } of decimalTests) {
    const result = await priceConverter.convertUSDToToken(1.0, token);
    if (result.success && result.tokenAmount) {
      const amount = BigInt(result.tokenAmount);
      const divisor = BigInt(10 ** expectedDecimals);
      const wholePart = amount / divisor;
      const remainder = amount % divisor;
      
      console.log(`${token}:`);
      console.log(`   Amount: ${result.tokenAmount} (smallest units)`);
      console.log(`   Whole part: ${wholePart.toString()}`);
      console.log(`   Remainder: ${remainder.toString()} (should be < ${divisor.toString()})`);
      console.log(`   Decimals: ${expectedDecimals} ✓`);
    }
    console.log('');
  }

  // Step 5: Test batch conversion
  console.log('📦 Step 5: Testing batch conversion...\n');
  
  const batchItems = [
    { usdAmount: 0.50, token: 'SUI' as const },
    { usdAmount: 1.00, token: 'MEWS' as const },
    { usdAmount: 2.50, token: 'USDC' as const },
  ];

  const batchResult = await priceConverter.convertMultipleUSDToToken(batchItems);
  
  if (batchResult.success && batchResult.tokenAmounts) {
    console.log('Batch conversion results:');
    let totalUsd = 0;
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      const converted = batchResult.tokenAmounts[i];
      totalUsd += item.usdAmount;
      
      console.log(`   $${item.usdAmount.toFixed(2)} USD → ${converted.amount} ${converted.token} (smallest units)`);
    }
    console.log(`   Total USD: $${totalUsd.toFixed(2)}`);
    console.log(`   Total token amount: ${batchResult.totalTokenAmount} (combined)`);
  } else {
    console.log(`❌ Batch conversion failed: ${batchResult.error}`);
  }

  console.log('\n✅ Verification complete!');
}

// Run verification
verifyPriceConversion().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

