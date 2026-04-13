// Test badge image API endpoint
const https = require('https');
const http = require('http');

// Test addresses - use admin wallet or any address with a badge
const testAddress = process.argv[2] || '0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3';
const apiBaseUrl = process.argv[3] || 'http://localhost:3000';

console.log('🧪 Testing Badge Image API Endpoint');
console.log('═══════════════════════════════════════\n');
console.log('📍 Test Address:', testAddress);
console.log('🌐 API Base URL:', apiBaseUrl);
console.log('');

const url = `${apiBaseUrl}/api/badges/${testAddress}/image`;
const urlObj = new URL(url);

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname,
  method: 'GET',
  headers: {
    'Accept': 'image/webp,*/*',
  },
};

const client = urlObj.protocol === 'https:' ? https : http;

console.log('📤 Requesting:', url);
console.log('');

const req = client.request(options, (res) => {
  console.log('📥 Response Status:', res.statusCode, res.statusMessage);
  console.log('📋 Response Headers:');
  Object.keys(res.headers).forEach(key => {
    console.log(`   ${key}: ${res.headers[key]}`);
  });
  console.log('');

  if (res.statusCode === 200) {
    console.log('✅ Success! Badge image endpoint is working');
    console.log('   Content-Type:', res.headers['content-type']);
    console.log('   Content-Length:', res.headers['content-length'], 'bytes');
    
    // Collect image data
    let imageData = Buffer.alloc(0);
    res.on('data', (chunk) => {
      imageData = Buffer.concat([imageData, chunk]);
    });
    
    res.on('end', () => {
      console.log('   Received:', imageData.length, 'bytes');
      console.log('');
      console.log('💡 The image should now appear in:');
      console.log('   1. Sui Wallet (Slush Wallet) - refresh your wallet');
      console.log('   2. SuiVision.xyz - view your badge NFT');
      console.log('   3. Direct URL:', url);
      console.log('');
      console.log('🔍 To view in SuiVision:');
      console.log(`   https://suivision.xyz/object/${testAddress}?network=testnet`);
      console.log('   (Replace with actual badge object ID)');
    });
  } else {
    let errorData = '';
    res.on('data', (chunk) => {
      errorData += chunk.toString();
    });
    res.on('end', () => {
      console.log('❌ Error response:');
      try {
        const error = JSON.parse(errorData);
        console.log(JSON.stringify(error, null, 2));
      } catch (e) {
        console.log(errorData);
      }
    });
  }
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.error('');
  console.error('💡 Make sure:');
  console.error('   1. Backend server is running on', apiBaseUrl);
  console.error('   2. The address has a badge');
  console.error('   3. The API endpoint is accessible');
});

req.end();

