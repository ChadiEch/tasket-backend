/**
 * Test script to verify Cloudflare R2 file deletion functionality
 * This script tests the deleteFromR2 function directly
 */

const { deleteFromR2 } = require('./middleware/cloudflareR2Upload');

async function testR2Deletion() {
  console.log('Testing Cloudflare R2 deletion functionality...');
  
  // Test with a sample filename
  const testFilename = 'test-deletion-file.txt';
  
  try {
    console.log(`Attempting to delete file: ${testFilename}`);
    await deleteFromR2(testFilename);
    console.log(`Deletion attempt completed for: ${testFilename}`);
  } catch (error) {
    console.log(`Expected error (file likely doesn't exist): ${error.message}`);
  }
  
  // Test with invalid filename
  try {
    console.log('Testing with invalid filename...');
    await deleteFromR2(null);
    console.log('Deletion with null filename handled gracefully');
  } catch (error) {
    console.log(`Handled error with null filename: ${error.message}`);
  }
  
  console.log('R2 deletion test completed.');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testR2Deletion().catch(console.error);
}

module.exports = { testR2Deletion };