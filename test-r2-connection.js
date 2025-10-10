const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null;

console.log('Testing Cloudflare R2 Connection...');
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
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  console.log('✅ Cloudflare R2 client initialized successfully');
  
  // Test the connection by listing buckets
  s3Client.send(new ListBucketsCommand({}))
    .then(response => {
      console.log('✅ Successfully connected to Cloudflare R2');
      console.log('Available buckets:', response.Buckets.map(b => b.Name));
      
      // Check if our bucket exists
      const bucketExists = response.Buckets.some(bucket => bucket.Name === R2_BUCKET_NAME);
      if (bucketExists) {
        console.log(`✅ Bucket "${R2_BUCKET_NAME}" exists`);
      } else {
        console.log(`⚠️  Bucket "${R2_BUCKET_NAME}" does not exist`);
      }
    })
    .catch(error => {
      console.error('❌ Error connecting to Cloudflare R2:', error.message);
      console.error('Error details:', error);
    });
} catch (error) {
  console.error('❌ Failed to initialize Cloudflare R2 client:', error.message);
  console.error('Error details:', error);
}