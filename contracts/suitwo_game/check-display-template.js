// Check Display object template values
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const displayObjectId = process.env.BADGE_DISPLAY_OBJECT_ID_TESTNET || 
                        '0x6897f6b256e19b26ad1eec9c28c17114119920a07bb913a9d0e0787fa94b4869';

async function checkDisplayTemplate() {
  try {
    const client = new SuiClient({ url: getFullnodeUrl('testnet') });
    
    console.log('🔍 Checking Display Object Template');
    console.log('═══════════════════════════════════════\n');
    console.log('Display Object ID:', displayObjectId);
    console.log('');
    
    const displayObj = await client.getObject({
      id: displayObjectId,
      options: {
        showContent: true,
        showBcs: false,
      },
    });
    
    if (!displayObj.data || !displayObj.data.content) {
      console.error('❌ Display object not found or has no content');
      process.exit(1);
    }
    
    const content = displayObj.data.content;
    if (content.dataType !== 'moveObject') {
      console.error('❌ Invalid Display object format');
      process.exit(1);
    }
    
    const fields = content.fields;
    console.log('📋 Display Fields:');
    
    if (fields.fields && fields.values) {
      const fieldNames = fields.fields;
      const fieldValues = fields.values;
      
      for (let i = 0; i < fieldNames.length && i < fieldValues.length; i++) {
        const fieldName = fieldNames[i];
        const fieldValue = fieldValues[i];
        
        // Extract string values
        let nameStr = '';
        let valueStr = '';
        
        if (typeof fieldName === 'string') {
          nameStr = fieldName;
        } else if (fieldName && typeof fieldName === 'object') {
          nameStr = fieldName.fields?.name || fieldName.fields?.value || JSON.stringify(fieldName);
        }
        
        if (typeof fieldValue === 'string') {
          valueStr = fieldValue;
        } else if (fieldValue && typeof fieldValue === 'object') {
          valueStr = fieldValue.fields?.value || fieldValue.fields?.name || JSON.stringify(fieldValue);
        }
        
        console.log(`   ${nameStr}: ${valueStr}`);
        
        // Highlight image_url field
        if (nameStr.includes('image') || nameStr.includes('image_url')) {
          if (valueStr === '{image}') {
            console.log('      ✅ CORRECT: Uses {image} template');
          } else {
            console.log(`      ⚠️  Expected: {image}, Found: ${valueStr}`);
          }
        }
      }
    } else {
      console.log('   ⚠️  Could not parse Display fields');
      console.log('   Raw content:', JSON.stringify(fields, null, 2));
    }
    
    console.log('');
    console.log('✅ Display object check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

checkDisplayTemplate();



