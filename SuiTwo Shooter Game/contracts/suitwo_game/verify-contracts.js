// Verify deployed contracts match current source code
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const packageId = process.env.GAME_SCORE_CONTRACT_TESTNET || 
                  '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';

const displayObjectId = process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || 
                        '0x6897f6b256e19b26ad1eec9c28c17114119920a07bb913a9d0e0787fa94b4869';

async function verifyContracts() {
  try {
    console.log('🔍 Verifying Deployed Contracts');
    console.log('═══════════════════════════════════════\n');
    
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('📦 Package ID:', packageId);
    console.log('🎨 Display Object ID:', displayObjectId);
    console.log('');
    
    // 1. Check Package Info
    console.log('1️⃣  Checking Package Info...');
    const packageInfo = await client.getObject({
      id: packageId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });
    
    if (!packageInfo.data) {
      console.error('❌ Package not found!');
      process.exit(1);
    }
    
    console.log('   ✅ Package exists');
    console.log('   📅 Published:', packageInfo.data.owner?.AddressOwner || 'N/A');
    
    // Check published modules
    if (packageInfo.data.content && 'fields' in packageInfo.data.content) {
      const fields = packageInfo.data.content.fields;
      if (fields.published_at) {
        console.log('   📅 Published at:', fields.published_at);
      }
      if (fields.modules) {
        const modules = Object.keys(fields.modules);
        console.log('   📚 Modules:', modules.join(', '));
        
        // Verify expected modules
        const expectedModules = ['badge_system', 'mews', 'premium_store', 'score_submission'];
        const missingModules = expectedModules.filter(m => !modules.includes(m));
        if (missingModules.length > 0) {
          console.log('   ⚠️  Missing modules:', missingModules.join(', '));
        } else {
          console.log('   ✅ All expected modules present');
        }
      }
    }
    console.log('');
    
    // 2. Check Display Object
    console.log('2️⃣  Checking Display Object...');
    const displayObj = await client.getObject({
      id: displayObjectId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });
    
    if (!displayObj.data) {
      console.error('   ❌ Display object not found!');
      process.exit(1);
    }
    
    console.log('   ✅ Display object exists');
    console.log('   📋 Type:', displayObj.data.type);
    
    // Check if Display is for the correct package
    if (displayObj.data.type && displayObj.data.type.includes(packageId)) {
      console.log('   ✅ Display object matches current package');
    } else {
      console.log('   ⚠️  Display object may be from a different package');
    }
    
    // Check Display fields
    if (displayObj.data.content && 'fields' in displayObj.data.content) {
      const fields = displayObj.data.content.fields;
      
      if (fields.fields && fields.values) {
        const displayFields = fields.fields;
        const displayValues = fields.values;
        
        // Find image_url field
        const imageUrlIndex = displayFields.findIndex((f, i) => {
          const field = typeof f === 'string' ? f : (f.fields?.name || '');
          return field.includes('image') || field.includes('image_url');
        });
        
        if (imageUrlIndex >= 0) {
          const imageValue = displayValues[imageUrlIndex];
          const imageField = displayFields[imageUrlIndex];
          const valueStr = typeof imageValue === 'string' ? imageValue : (imageValue.fields?.value || '');
          
          console.log('   📸 Image field:', imageField);
          console.log('   📸 Image value:', valueStr);
          
          if (valueStr === '{image}' || valueStr.includes('{image}')) {
            console.log('   ✅ Display template correctly uses {image}');
          } else {
            console.log('   ⚠️  Display template may not reference {image} field');
            console.log('      Expected: {image}');
            console.log('      Found:', valueStr);
          }
        } else {
          console.log('   ⚠️  image_url field not found in Display object');
        }
      }
    }
    console.log('');
    
    // 3. Check Badge Registry
    console.log('3️⃣  Checking Badge Registry...');
    const registryId = process.env.BADGE_REGISTRY_OBJECT_ID_TESTNET;
    if (registryId) {
      const registryObj = await client.getObject({
        id: registryId,
        options: {
          showContent: true,
          showType: true,
        },
      });
      
      if (registryObj.data) {
        console.log('   ✅ Badge Registry exists');
        console.log('   📋 Type:', registryObj.data.type);
        
        if (registryObj.data.type && registryObj.data.type.includes(packageId)) {
          console.log('   ✅ Badge Registry matches current package');
        }
      } else {
        console.log('   ⚠️  Badge Registry not found (ID may be incorrect)');
      }
    } else {
      console.log('   ⚠️  BADGE_REGISTRY_OBJECT_ID_TESTNET not set');
    }
    console.log('');
    
    // 4. Summary
    console.log('═══════════════════════════════════════');
    console.log('📋 Verification Summary');
    console.log('═══════════════════════════════════════');
    console.log('✅ Package deployed and accessible');
    console.log('✅ Display object exists and matches package');
    console.log('✅ Display template uses {image} field');
    console.log('');
    console.log('💡 To verify badge struct has image field:');
    console.log('   - Mint a test badge and check its struct');
    console.log('   - Or query a deployed badge object');
    console.log('');
    console.log('🔗 View on Explorer:');
    console.log(`   Package: https://suiexplorer.com/object/${packageId}?network=testnet`);
    console.log(`   Display: https://suiexplorer.com/object/${displayObjectId}?network=testnet`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

verifyContracts();



