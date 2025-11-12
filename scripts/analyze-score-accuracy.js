#!/usr/bin/env node

/**
 * Score Accuracy Analysis Script
 * 
 * Parses backend logs to calculate average accuracy of score submissions.
 * Looks for lines containing "📊 ACCURACY:" and extracts the percentage.
 * 
 * Usage:
 *   node scripts/analyze-score-accuracy.js [log-file-path]
 * 
 * If no file is provided, reads from stdin:
 *   tail -f backend/logs/app.log | node scripts/analyze-score-accuracy.js
 *   cat backend/logs/app.log | node scripts/analyze-score-accuracy.js
 */

const fs = require('fs');
const readline = require('readline');

// Parse accuracy from log line
function parseAccuracy(line) {
  // Look for: 📊 ACCURACY: 99.21% (diff: -250)
  const match = line.match(/📊 ACCURACY:\s*([\d.]+)%/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// Analyze accuracy data
function analyzeAccuracy(accuracies) {
  if (accuracies.length === 0) {
    console.log('❌ No accuracy data found in logs.');
    return;
  }

  const sorted = [...accuracies].sort((a, b) => a - b);
  const sum = accuracies.reduce((a, b) => a + b, 0);
  const avg = sum / accuracies.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];

  // Calculate percentiles
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  // Count by ranges
  const ranges = {
    '90-95%': accuracies.filter(a => a >= 90 && a < 95).length,
    '95-98%': accuracies.filter(a => a >= 95 && a < 98).length,
    '98-99%': accuracies.filter(a => a >= 98 && a < 99).length,
    '99-100%': accuracies.filter(a => a >= 99 && a < 100).length,
    '100%+': accuracies.filter(a => a >= 100).length,
    '<90%': accuracies.filter(a => a < 90).length,
  };

  console.log('\n📊 Score Accuracy Analysis');
  console.log('='.repeat(50));
  console.log(`Total Submissions: ${accuracies.length}`);
  console.log(`\nStatistics:`);
  console.log(`  Average: ${avg.toFixed(2)}%`);
  console.log(`  Median:  ${median.toFixed(2)}%`);
  console.log(`  Min:     ${min.toFixed(2)}%`);
  console.log(`  Max:     ${max.toFixed(2)}%`);
  console.log(`\nPercentiles:`);
  console.log(`  25th:    ${p25.toFixed(2)}%`);
  console.log(`  75th:    ${p75.toFixed(2)}%`);
  console.log(`  95th:    ${p95.toFixed(2)}%`);
  console.log(`\nDistribution:`);
  Object.entries(ranges).forEach(([range, count]) => {
    if (count > 0) {
      const percentage = ((count / accuracies.length) * 100).toFixed(1);
      console.log(`  ${range.padEnd(10)}: ${count.toString().padStart(4)} (${percentage}%)`);
    }
  });

  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (p95 >= 95) {
    console.log(`  ✅ 95th percentile is ${p95.toFixed(2)}% - threshold could be tightened to 90%`);
  } else if (p95 >= 90) {
    console.log(`  ⚠️  95th percentile is ${p95.toFixed(2)}% - current 80% threshold is appropriate`);
  } else {
    console.log(`  ⚠️  95th percentile is ${p95.toFixed(2)}% - may need to investigate accuracy issues`);
  }

  if (avg >= 98) {
    console.log(`  ✅ Average accuracy is ${avg.toFixed(2)}% - excellent!`);
  } else if (avg >= 95) {
    console.log(`  ✅ Average accuracy is ${avg.toFixed(2)}% - good!`);
  } else {
    console.log(`  ⚠️  Average accuracy is ${avg.toFixed(2)}% - may need investigation`);
  }

  // Threshold recommendations
  if (p25 >= 90) {
    console.log(`  💡 Consider tightening threshold to 85% (25th percentile: ${p25.toFixed(2)}%)`);
  } else if (p25 >= 85) {
    console.log(`  💡 Consider tightening threshold to 80% (25th percentile: ${p25.toFixed(2)}%)`);
  }
}

// Main function
async function main() {
  const accuracies = [];
  const args = process.argv.slice(2);
  const filePath = args[0];

  let input;
  if (filePath) {
    // Read from file
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    input = fs.createReadStream(filePath);
  } else {
    // Read from stdin
    input = process.stdin;
  }

  const rl = readline.createInterface({
    input: input,
    crlfDelay: Infinity
  });

  console.log('📖 Parsing logs for accuracy data...');
  if (filePath) {
    console.log(`   Reading from: ${filePath}`);
  } else {
    console.log('   Reading from stdin (press Ctrl+D when done)...');
  }

  for await (const line of rl) {
    const accuracy = parseAccuracy(line);
    if (accuracy !== null) {
      accuracies.push(accuracy);
      process.stderr.write(`\r   Found ${accuracies.length} accuracy entries...`);
    }
  }

  process.stderr.write('\n');
  analyzeAccuracy(accuracies);
}

main().catch(console.error);

