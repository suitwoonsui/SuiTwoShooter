// ==========================================
// Check Specific Badge and Display Object
// ==========================================

const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const displayObjectId = '0x6897f6b256e19b26ad1eec9c28c17114119920a07bb913a9d0e0787fa94b4869';
const badgeObjectId = '0xcfe5a61ea48f333cbda24cf361925e36a3a46942f0cd1839f433c193e75b8ef7';

async function checkBadge() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  console.log('🔍 Checking Badge and Display Configuration');
  console.log('═══════════════════════════════════════\n');
  
  // ===== 1. Check Display Object =====
  console.log('📋 Step 1: Display Object');
  console.log(`   ID: ${displayObjectId}\n`);
  
  try {
    const displayObj = await client.getObject({
      id: displayObjectId,
      options: {
        showContent: true,
        showType: true,
        showDisplay: true,
      },
    });
    
    if (!displayObj.data) {
      console.error('❌ Display object not found!');
      return;
    }
    
    console.log('✅ Display object found');
    console.log('   Type:', displayObj.data.type);
    
    // Check the fields structure
    if (displayObj.data.content?.fields) {
      const fields = displayObj.data.content.fields;
      
      // Display object has a 'fields' field that contains the template mappings
      if (fields.fields && Array.isArray(fields.fields)) {
        console.log('\n📋 Display Template Fields:');
        let imageUrlFound = false;
        
        for (const field of fields.fields) {
          if (field.key === 'image_url') {
            imageUrlFound = true;
            console.log(`   ✅ image_url: "${field.value}"`);
            
            if (field.value === '{image}') {
              console.log('   ✅ CORRECT: References {image} struct field');
            } else {
              console.log(`   ❌ INCORRECT: Should be "{image}" but found "${field.value}"`);
              console.log('   💡 This needs to be fixed!');
            }
          } else {
            console.log(`   - ${field.key}: "${field.value}"`);
          }
        }
        
        if (!imageUrlFound) {
          console.log('   ❌ image_url field is MISSING');
          console.log('   💡 Need to add image_url field with value {image}');
        }
      } else {
        console.log('\n⚠️  Display object structure:');
        console.log(JSON.stringify(fields, null, 2));
      }
      
      console.log('\n   Version:', fields.version || 'unknown');
    }
    
  } catch (error) {
    console.error('❌ Error checking Display:', error.message);
    if (error.stack) console.error(error.stack);
  }
  
  // ===== 2. Check Badge Object =====
  console.log('\n═══════════════════════════════════════');
  console.log('📋 Step 2: Badge Object');
  console.log(`   ID: ${badgeObjectId}\n`);
  
  try {
    const badgeObj = await client.getObject({
      id: badgeObjectId,
      options: {
        showContent: true,
        showType: true,
        showDisplay: true,
        showOwner: true,
      },
    });
    
    if (!badgeObj.data) {
      console.error('❌ Badge object not found!');
      return;
    }
    
    console.log('✅ Badge object found');
    console.log('   Type:', badgeObj.data.type);
    
    // Check badge fields
    if (badgeObj.data.content?.fields) {
      const fields = badgeObj.data.content.fields;
      console.log('\n📋 Badge Fields:');
      console.log('   owner:', fields.owner);
      console.log('   tier:', fields.tier);
      console.log('   games_played:', fields.games_played);
      
      if (fields.image) {
        console.log(`   ✅ image: "${fields.image}"`);
        
        // Validate URL
        if (fields.image.startsWith('http://') || fields.image.startsWith('https://')) {
          console.log('   ✅ URL format is valid');
          try {
            const url = new URL(fields.image);
            console.log('   Domain:', url.hostname);
            console.log('   Path:', url.pathname);
            
            // Check if it's a Vercel URL
            if (url.hostname.includes('vercel.app')) {
              console.log('   ✅ Vercel URL detected');
            }
          } catch (e) {
            console.log('   ⚠️  URL parsing error:', e.message);
          }
        } else {
          console.log('   ❌ Image field is not a valid URL');
        }
      } else {
        console.log('   ❌ image field is MISSING');
      }
    }
    
    // Check resolved Display data (THIS IS WHAT WALLETS SEE)
    console.log('\n═══════════════════════════════════════');
    console.log('📋 Step 3: Resolved Display Data');
    console.log('   (This is what wallets query)\n');
    
    if (badgeObj.data.display?.data) {
      const displayData = badgeObj.data.display.data;
      
      console.log('✅ Display data is resolved');
      console.log('\n📋 Resolved Fields:');
      
      if (displayData.image_url) {
        console.log(`   ✅ image_url: "${displayData.image_url}"`);
        
        if (displayData.image_url.startsWith('http://') || displayData.image_url.startsWith('https://')) {
          console.log('   ✅ Resolved to valid URL');
          console.log('   ✅ Wallets should be able to display this image');
          
          // Try to verify the URL is accessible
          console.log('\n   🔍 Verifying URL accessibility...');
          try {
            const url = new URL(displayData.image_url);
            console.log(`   Domain: ${url.hostname}`);
            console.log(`   Path: ${url.pathname}`);
            console.log('   💡 If image still doesn\'t show, check:');
            console.log('      1. URL is publicly accessible (no auth required)');
            console.log('      2. CORS headers allow wallet to fetch image');
            console.log('      3. Image file exists at that path');
          } catch (e) {
            console.log('   ⚠️  URL parsing error');
          }
        } else {
          console.log('   ❌ Resolved value is not a URL');
          console.log('   ❌ THIS IS WHY WALLETS SHOW "no media"');
          console.log(`   Found: "${displayData.image_url}"`);
          console.log('   Expected: A valid HTTP/HTTPS URL');
        }
      } else {
        console.log('   ❌ image_url is MISSING in resolved Display data');
        console.log('   ❌ THIS IS WHY WALLETS SHOW "no media"');
      }
      
      console.log('\n   Full resolved Display data:');
      console.log(JSON.stringify(displayData, null, 2));
      
    } else {
      console.log('❌ No Display data resolved for this badge');
      console.log('   This means:');
      console.log('   1. Display object is not properly configured, OR');
      console.log('   2. Display object version needs to be updated, OR');
      console.log('   3. Badge type doesn\'t match Display object type');
    }
    
  } catch (error) {
    console.error('❌ Error checking Badge:', error.message);
    if (error.stack) console.error(error.stack);
  }
  
  // ===== Summary =====
  console.log('\n═══════════════════════════════════════');
  console.log('📊 Diagnosis Summary');
  console.log('═══════════════════════════════════════\n');
  
  console.log('Next steps based on findings above:');
  console.log('1. If Display.image_url ≠ "{image}" → Fix Display object');
  console.log('2. If resolved image_url is not a URL → Fix Display template');
  console.log('3. If image_url is missing → Add image_url field to Display');
  console.log('4. If URL is valid but not showing → Check CORS/accessibility');
  console.log('');
}

checkBadge().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

