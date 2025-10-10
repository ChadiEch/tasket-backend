// test-r2-url-generation.js
// Test script to verify Cloudflare R2 URL generation

console.log('=== Testing Cloudflare R2 URL Generation ===\n');

// Mock environment variables
process.env.USE_CLOUDFLARE_R2 = 'true';
process.env.R2_ACCOUNT_ID = '9364b705b27014c39098d5689dda5d36';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.R2_BUCKET_NAME = 'tasket';
process.env.R2_PUBLIC_BUCKET_KEY = 'pub-65a8f0a1ed924205af132a2ffe78debd';

// Import the uploadToR2 function
const { uploadToR2 } = require('./middleware/cloudflareR2Upload.js');

// Test URL generation
const testFilename = 'task-attachment-1760081717579-9a871520.jpg';

console.log('Testing URL generation...');
console.log('Account ID:', process.env.R2_ACCOUNT_ID);
console.log('Bucket Name:', process.env.R2_BUCKET_NAME);
console.log('Public Bucket Key:', process.env.R2_PUBLIC_BUCKET_KEY);
console.log('Test Filename:', testFilename);

// Generate the URL the same way the middleware does
const publicUrl = `https://${process.env.R2_PUBLIC_BUCKET_KEY}.r2.dev/${testFilename}`;

console.log('\nGenerated URL:');
console.log(publicUrl);

console.log('\nExpected URL (from your working example):');
console.log('https://pub-65a8f0a1ed924205af132a2ffe78debd.r2.dev/task-attachment-1760081717579-9a871520.jpg');

console.log('\nComparison:');
if (publicUrl === 'https://pub-65a8f0a1ed924205af132a2ffe78debd.r2.dev/task-attachment-1760081717579-9a871520.jpg') {
  console.log('✅ URLs match! The URL generation is working correctly.');
} else {
  console.log('❌ URLs do not match. There may be an issue with the URL generation.');
}

console.log('\n=== Test Complete ===');