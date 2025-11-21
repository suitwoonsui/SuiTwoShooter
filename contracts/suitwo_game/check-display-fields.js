// Check Display object fields
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');

const displayObjectId = process.argv[2] || '0x3ce8f47ba853a9f774ea70656c5c2ea799053dbf356eab82138354dec0105d8a';

async function checkDisplayFields() {
  const client = new SuiClient({ url: getFullnodeUrl('testnet') });
  
  try {
    const displayObj = await client.getObject({
      id: displayObjectId,
      options: {
        showContent: true,
        showType: true,
      },
    });
    
    console.log('🔍 Checking Display object fields...\n');
    
    if (displayObj.data && displayObj.data.content) {
      const content = displayObj.data.content;
      console.log('📋 Display object structure:');
      console.log(JSON.stringify(content, null, 2));
      
      // Check if image_url exists in the content
      const contentStr = JSON.stringify(content);
      if (contentStr.includes('image_url')) {
        console.log('\n✅ image_url field is present in Display object!');
      } else {
        console.log('\n⚠️  image_url field is NOT present');
        console.log('   You need to update the Display object with:');
        console.log('   node update-badge-display-image.js');
      }
    } else {
      console.log('⚠️  Could not read Display object content');
      console.log('   Object data:', JSON.stringify(displayObj.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkDisplayFields();

