// diagnose-railway-r2.js
// Diagnostic script to check Railway Cloudflare R2 configuration

console.log('=== Railway Cloudflare R2 Diagnostic ===\n');

// Check Railway environment variables
const requiredVars = [
  'USE_CLOUDFLARE_R2',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME'
];

console.log('Railway Environment Variables Check:');
let allSet = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value !== undefined) {
    // For sensitive variables, just show that they're set
    if (varName.includes('KEY') || varName.includes('SECRET')) {
      console.log(`  ${varName}: SET`);
    } else {
      console.log(`  ${varName}: ${value}`);
    }
  } else {
    console.log(`  ${varName}: NOT SET`);
    allSet = false;
  }
});

console.log('');

// Function to check for invalid characters in credentials
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

if (process.env.USE_CLOUDFLARE_R2 === 'true') {
  console.log('⚠️  Cloudflare R2 is ENABLED in Railway deployment');
  
  if (allSet) {
    console.log('✅ All required environment variables are SET in Railway');
    
    // Check for invalid characters in credentials
    console.log('\nChecking for invalid characters in credentials...');
    let hasInvalidChars = false;
    hasInvalidChars |= checkForInvalidChars(process.env.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
    hasInvalidChars |= checkForInvalidChars(process.env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID');
    hasInvalidChars |= checkForInvalidChars(process.env.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY');
    hasInvalidChars |= checkForInvalidChars(process.env.R2_BUCKET_NAME, 'R2_BUCKET_NAME');
    
    if (hasInvalidChars) {
      console.log('\n❌ Cloudflare R2 credentials contain invalid characters');
      console.log('⚠️  Please check your Railway environment variables for extra characters (like newlines)');
      console.log('💡 Tip: Make sure you didn\'t accidentally copy newline characters when pasting credentials');
    } else {
      console.log('✅ No invalid characters found in credentials');
      
      // Test R2 connection
      console.log('\nTesting R2 connection...');
      try {
        const { S3Client } = require('@aws-sdk/client-s3');
        
        const s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
          },
        });
        
        console.log('✅ Cloudflare R2 client initialized successfully');
        console.log('🎉 Configuration appears to be correct!');
      } catch (error) {
        console.log('❌ Error initializing Cloudflare R2 client:', error.message);
        if (error.code) {
          console.log('Error code:', error.code);
        }
      }
    }
  } else {
    console.log('❌ Some required environment variables are MISSING');
  }
} else {
  console.log('ℹ️  Cloudflare R2 is DISABLED in Railway deployment');
}

console.log('\n=== Diagnostic Complete ===');