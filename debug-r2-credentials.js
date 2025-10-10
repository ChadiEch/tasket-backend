const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null;

console.log('=== Cloudflare R2 Credentials Debug ===');
console.log('R2_ACCOUNT_ID:', R2_ACCOUNT_ID);
console.log('R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID);
console.log('R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? `${R2_SECRET_ACCESS_KEY.substring(0, 5)}...` : 'NOT SET');
console.log('R2_BUCKET_NAME:', R2_BUCKET_NAME);
console.log('R2_ENDPOINT:', R2_ENDPOINT);

// Check for invalid characters in credentials
const checkForInvalidChars = (str, name) => {
  if (!str) return false;
  
  // Check for common invalid characters in HTTP headers
  const invalidChars = ['\n', '\r', '\t', '\0'];
  for (const char of invalidChars) {
    if (str.includes(char)) {
      console.error(`❌ Invalid character '${char}' found in ${name}`);
      return true;
    }
  }
  
  // Check for non-ASCII characters
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 127) {
      console.error(`❌ Non-ASCII character found in ${name} at position ${i}`);
      return true;
    }
  }
  
  return false;
};

console.log('\n=== Credential Validation ===');
let hasInvalidChars = false;
hasInvalidChars |= checkForInvalidChars(R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
hasInvalidChars |= checkForInvalidChars(R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID');
hasInvalidChars |= checkForInvalidChars(R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY');
hasInvalidChars |= checkForInvalidChars(R2_BUCKET_NAME, 'R2_BUCKET_NAME');

if (!hasInvalidChars) {
  console.log('✅ No invalid characters found in credentials');
}

// Test credential length
console.log('\n=== Credential Length Check ===');
console.log('R2_ACCOUNT_ID length:', R2_ACCOUNT_ID?.length || 0);
console.log('R2_ACCESS_KEY_ID length:', R2_ACCESS_KEY_ID?.length || 0);
console.log('R2_SECRET_ACCESS_KEY length:', R2_SECRET_ACCESS_KEY?.length || 0);

// Common credential length patterns
const expectedLengths = {
  R2_ACCOUNT_ID: 32, // Typically 32 characters
  R2_ACCESS_KEY_ID: 32, // Typically 20 characters but can vary
  R2_SECRET_ACCESS_KEY: 64 // Typically 40 characters but can vary
};

console.log('\n=== Expected vs Actual Length ===');
Object.entries(expectedLengths).forEach(([key, expected]) => {
  const actual = process.env[key]?.length || 0;
  if (actual !== expected) {
    console.log(`⚠️  ${key}: Expected ~${expected}, got ${actual}`);
  } else {
    console.log(`✅ ${key}: ${actual} characters`);
  }
});

// Try to initialize the S3 client
if (!hasInvalidChars && R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME) {
  console.log('\n=== Testing S3 Client Initialization ===');
  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    console.log('✅ S3 Client initialized successfully');
    
    // Test a simple operation
    console.log('\n=== Testing Simple Operation ===');
    s3Client.send(new ListBucketsCommand({}))
      .then(response => {
        console.log('✅ Successfully connected to Cloudflare R2');
        console.log('Available buckets:', response.Buckets?.map(b => b.Name) || 'None');
      })
      .catch(error => {
        console.error('❌ Error connecting to Cloudflare R2:', error.message);
        console.error('Error code:', error.code);
      });
  } catch (error) {
    console.error('❌ Failed to initialize S3 Client:', error.message);
    console.error('Error details:', error);
  }
} else {
  console.log('⚠️  Skipping S3 client test due to missing or invalid credentials');
}