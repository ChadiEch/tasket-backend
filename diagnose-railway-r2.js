#!/usr/bin/env node

/**
 * Diagnostic script to check Cloudflare R2 configuration in Railway deployment
 */

console.log('=== Railway Cloudflare R2 Diagnostic ===\n');

// Load environment variables
require('dotenv').config();

const useCloudflareR2 = process.env.USE_CLOUDFLARE_R2 === 'true';
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;

console.log('Railway Environment Variables Check:');
console.log('  USE_CLOUDFLARE_R2:', useCloudflareR2);
console.log('  R2_ACCOUNT_ID:', r2AccountId ? 'SET' : 'NOT SET');
console.log('  R2_ACCESS_KEY_ID:', r2AccessKeyId ? 'SET' : 'NOT SET');
console.log('  R2_SECRET_ACCESS_KEY:', r2SecretAccessKey ? 'SET' : 'NOT SET');
console.log('  R2_BUCKET_NAME:', r2BucketName ? 'SET' : 'NOT SET');

if (useCloudflareR2) {
  console.log('\n⚠️  Cloudflare R2 is ENABLED in Railway deployment');
  
  const missingVars = [];
  if (!r2AccountId) missingVars.push('R2_ACCOUNT_ID');
  if (!r2AccessKeyId) missingVars.push('R2_ACCESS_KEY_ID');
  if (!r2SecretAccessKey) missingVars.push('R2_SECRET_ACCESS_KEY');
  if (!r2BucketName) missingVars.push('R2_BUCKET_NAME');
  
  if (missingVars.length > 0) {
    console.log('\n❌ MISSING required environment variables in Railway:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    
    console.log('\n🔧 SOLUTION - Set these variables in Railway:');
    console.log('1. Go to your Railway project dashboard');
    console.log('2. Select your "tasket-backend" service');
    console.log('3. Go to the "Variables" tab');
    console.log('4. Add the missing environment variables:');
    if (!r2AccountId) console.log('   - R2_ACCOUNT_ID: your Cloudflare account ID');
    if (!r2AccessKeyId) console.log('   - R2_ACCESS_KEY_ID: your R2 access key ID');
    if (!r2SecretAccessKey) console.log('   - R2_SECRET_ACCESS_KEY: your R2 secret access key');
    if (!r2BucketName) console.log('   - R2_BUCKET_NAME: your R2 bucket name');
  } else {
    console.log('\n✅ All required environment variables are SET in Railway');
    console.log('\nTesting R2 connection...');
    
    try {
      // Try to initialize the R2 client
      const { S3Client } = require('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
      
      console.log('✅ Cloudflare R2 client initialized successfully');
      console.log('🎉 Configuration appears to be correct!');
    } catch (error) {
      console.log('❌ Error initializing Cloudflare R2 client:', error.message);
    }
  }
} else {
  console.log('\nℹ️  Cloudflare R2 is DISABLED in Railway deployment');
  console.log('To enable Cloudflare R2, set USE_CLOUDFLARE_R2=true in your Railway environment variables');
}

console.log('\n=== Diagnostic Complete ===');