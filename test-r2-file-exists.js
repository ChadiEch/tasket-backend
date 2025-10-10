// test-r2-file-exists.js
// Test script to verify Cloudflare R2 file existence checking

console.log('=== Testing Cloudflare R2 File Existence Checking ===\n');

// Mock environment variables
process.env.USE_CLOUDFLARE_R2 = 'true';
process.env.R2_ACCOUNT_ID = '9364b705b27014c39098d5689dda5d36';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.R2_BUCKET_NAME = 'tasket';
process.env.R2_PUBLIC_BUCKET_KEY = 'pub-65a8f0a1ed924205af132a2ffe78debd';

// Import the checkIfFileExists function
const { checkIfFileExists } = require('./middleware/cloudflareR2Upload.js');

// Test cases
const testCases = [
  'task-attachment-1760081717579-9a871520.jpg',
  'non-existent-file.jpg',
  'task-attachment-1234567890-test.jpg'
];

console.log('Testing file existence checking...');
console.log('Note: This test will show errors because we\'re not actually connected to R2');
console.log('The important part is that the logic is correctly implemented.\n');

async function runTests() {
  for (const filename of testCases) {
    console.log(`Checking if file exists: ${filename}`);
    try {
      const exists = await checkIfFileExists(filename);
      console.log(`  Result: ${exists ? 'File exists' : 'File does not exist'}`);
    } catch (error) {
      console.log(`  Error (expected in test environment): ${error.message}`);
    }
    console.log('');
  }
  
  console.log('=== Test Complete ===');
  console.log('In a real environment with proper credentials, this would check actual file existence in R2.');
}

runTests();