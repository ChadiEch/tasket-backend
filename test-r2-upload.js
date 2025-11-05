const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Cloudflare R2 configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BUCKET_KEY = process.env.R2_PUBLIC_BUCKET_KEY || 'pub-65a8f0a1ed924205af132a2ffe78debd';
const R2_ENDPOINT = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null;

console.log('Testing Cloudflare R2 Upload...');
console.log('R2_ACCOUNT_ID:', R2_ACCOUNT_ID ? 'SET' : 'NOT SET');
console.log('R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('R2_BUCKET_NAME:', R2_BUCKET_NAME);
console.log('R2_ENDPOINT:', R2_ENDPOINT);

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ Missing required environment variables for Cloudflare R2');
  process.exit(1);
}

try {
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: R2_SECRET_ACCESS_KEY.trim(),
    },
  });

  console.log('✅ Cloudflare R2 client initialized successfully');
  
  // Test uploading a simple file
  const testFileName = `test-upload-${Date.now()}.txt`;
  const testContent = 'This is a test file uploaded from Node.js';
  
  const params = {
    Bucket: R2_BUCKET_NAME.trim(),
    Key: testFileName,
    Body: testContent,
    ContentType: 'text/plain',
  };

  console.log(`Uploading test file: ${testFileName}`);
  
  s3Client.send(new PutObjectCommand(params))
    .then(response => {
      console.log('✅ Successfully uploaded test file to Cloudflare R2');
      console.log('Response:', response);
      
      // Generate the public URL
      const publicUrl = `https://${R2_PUBLIC_BUCKET_KEY}.r2.dev/${testFileName}`;
      console.log('Public URL:', publicUrl);
      
      console.log('🎉 Test completed successfully!');
    })
    .catch(error => {
      console.error('❌ Error uploading to Cloudflare R2:', error.message);
      console.error('Error details:', error);
      
      if (error.$metadata) {
        console.error('Error metadata:', {
          httpStatusCode: error.$metadata.httpStatusCode,
          requestId: error.$metadata.requestId
        });
      }
    });
} catch (error) {
  console.error('❌ Failed to initialize Cloudflare R2 client:', error.message);
  console.error('Error details:', error);
}