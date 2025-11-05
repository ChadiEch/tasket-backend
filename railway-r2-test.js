// railway-r2-test.js
// Test script specifically for Railway environment to diagnose R2 issues

require('dotenv').config(); // Load environment variables from .env file

console.log('=== Railway Cloudflare R2 Connection Test ===\n');

// Import required modules
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// Get environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const USE_CLOUDFLARE_R2 = process.env.USE_CLOUDFLARE_R2 === 'true';

console.log('Environment Variables:');
console.log('  USE_CLOUDFLARE_R2:', USE_CLOUDFLARE_R2);
console.log('  R2_ACCOUNT_ID:', R2_ACCOUNT_ID ? `[${R2_ACCOUNT_ID.length} chars]` : 'NOT SET');
console.log('  R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID ? `[${R2_ACCESS_KEY_ID.length} chars]` : 'NOT SET');
console.log('  R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? `[${R2_SECRET_ACCESS_KEY.length} chars]` : 'NOT SET');
console.log('  R2_BUCKET_NAME:', R2_BUCKET_NAME || 'NOT SET');

// Check if R2 is enabled
if (!USE_CLOUDFLARE_R2) {
  console.log('\n⚠️  Cloudflare R2 is not enabled. Set USE_CLOUDFLARE_R2=true to enable.');
  process.exit(0);
}

// Check required variables
const requiredVars = [
  { name: 'R2_ACCOUNT_ID', value: R2_ACCOUNT_ID },
  { name: 'R2_ACCESS_KEY_ID', value: R2_ACCESS_KEY_ID },
  { name: 'R2_SECRET_ACCESS_KEY', value: R2_SECRET_ACCESS_KEY },
  { name: 'R2_BUCKET_NAME', value: R2_BUCKET_NAME }
];

let missingVars = [];
requiredVars.forEach(({ name, value }) => {
  if (!value) {
    missingVars.push(name);
  }
});

if (missingVars.length > 0) {
  console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.log('Please set these variables in your Railway project settings.');
  process.exit(1);
}

// Display credential details for debugging
console.log('\n=== Credential Analysis ===');
console.log('R2_ACCOUNT_ID:');
console.log('  Length:', R2_ACCOUNT_ID.length);
console.log('  Starts with:', R2_ACCOUNT_ID.substring(0, 8));
console.log('  Ends with:', R2_ACCOUNT_ID.substring(R2_ACCOUNT_ID.length - 8));

console.log('R2_ACCESS_KEY_ID:');
console.log('  Length:', R2_ACCESS_KEY_ID.length);
console.log('  Starts with:', R2_ACCESS_KEY_ID.substring(0, 8));
console.log('  Ends with:', R2_ACCESS_KEY_ID.substring(R2_ACCESS_KEY_ID.length - 8));

console.log('R2_SECRET_ACCESS_KEY:');
console.log('  Length:', R2_SECRET_ACCESS_KEY.length);
// Don't log actual secret values

// Check for common issues
console.log('\n=== Common Issue Checks ===');

// Check for whitespace
const hasLeadingWhitespace = 
  R2_ACCOUNT_ID.startsWith(' ') || 
  R2_ACCESS_KEY_ID.startsWith(' ') || 
  R2_SECRET_ACCESS_KEY.startsWith(' ') ||
  R2_BUCKET_NAME.startsWith(' ');

const hasTrailingWhitespace = 
  R2_ACCOUNT_ID.endsWith(' ') || 
  R2_ACCESS_KEY_ID.endsWith(' ') || 
  R2_SECRET_ACCESS_KEY.endsWith(' ') ||
  R2_BUCKET_NAME.endsWith(' ');

if (hasLeadingWhitespace || hasTrailingWhitespace) {
  console.log('❌ Whitespace issues detected:');
  if (hasLeadingWhitespace) console.log('  - Leading whitespace found in one or more credentials');
  if (hasTrailingWhitespace) console.log('  - Trailing whitespace found in one or more credentials');
  console.log('💡 Solution: Remove any leading/trailing spaces from your credentials');
} else {
  console.log('✅ No leading/trailing whitespace found');
}

// Check for newline characters
const hasNewlines = 
  R2_ACCOUNT_ID.includes('\n') || 
  R2_ACCESS_KEY_ID.includes('\n') || 
  R2_SECRET_ACCESS_KEY.includes('\n') ||
  R2_BUCKET_NAME.includes('\n');

if (hasNewlines) {
  console.log('❌ Newline characters detected in credentials');
  console.log('💡 Solution: Ensure credentials are single-line values without any newline characters');
} else {
  console.log('✅ No newline characters found');
}

// Test R2 connection
console.log('\n=== Testing R2 Connection ===');

try {
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  console.log('Endpoint:', endpoint);
  
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: R2_SECRET_ACCESS_KEY.trim(),
    },
  });
  
  console.log('✅ S3 Client initialized successfully');
  
  // Test listing buckets
  console.log('\nTesting bucket listing...');
  s3Client.send(new ListBucketsCommand({}))
    .then(response => {
      console.log('✅ Successfully connected to Cloudflare R2');
      
      if (response.Buckets) {
        console.log(`Found ${response.Buckets.length} buckets:`);
        response.Buckets.forEach(bucket => {
          console.log(`  - ${bucket.Name}`);
        });
        
        // Check if our bucket exists
        const bucketExists = response.Buckets.some(bucket => bucket.Name === R2_BUCKET_NAME);
        if (bucketExists) {
          console.log(`\n✅ Target bucket "${R2_BUCKET_NAME}" exists`);
        } else {
          console.log(`\n⚠️  Target bucket "${R2_BUCKET_NAME}" does not exist`);
          console.log('💡 Solution: Create the bucket in your Cloudflare R2 dashboard');
        }
      } else {
        console.log('No buckets found');
      }
      
      console.log('\n🎉 All tests completed successfully!');
    })
    .catch(error => {
      console.log('❌ Error connecting to Cloudflare R2:');
      console.log('  Message:', error.message);
      console.log('  Code:', error.code);
      
      if (error.$metadata) {
        console.log('  HTTP Status:', error.$metadata.httpStatusCode);
        console.log('  Request ID:', error.$metadata.requestId);
      }
      
      console.log('\n💡 Troubleshooting tips:');
      console.log('  1. Verify all credentials are correct');
      console.log('  2. Check that your API token has R2 edit permissions');
      console.log('  3. Ensure your bucket name is correct');
      console.log('  4. Confirm your account has access to R2');
    });
} catch (error) {
  console.log('❌ Failed to initialize S3 Client:');
  console.log('  Message:', error.message);
  console.log('  Stack:', error.stack);
  
  console.log('\n💡 Troubleshooting tips:');
  console.log('  1. Check for special characters in credentials');
  console.log('  2. Ensure all environment variables are properly set');
  console.log('  3. Verify no extra characters (spaces, newlines) in credentials');
}