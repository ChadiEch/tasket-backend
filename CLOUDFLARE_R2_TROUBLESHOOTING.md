# Cloudflare R2 Troubleshooting Guide

This guide helps you diagnose and fix common issues with Cloudflare R2 integration in your Tasket application.

## Common Error: "Invalid character in header content ['authorization']"

### Problem
This error occurs when there are invalid characters (like newlines, tabs, or non-ASCII characters) in your Cloudflare R2 credentials that cause issues with HTTP headers.

### Solution Steps

1. **Check for Extra Characters**
   - Go to your Railway project dashboard
   - Navigate to your "tasket-backend" service
   - Go to the "Variables" tab
   - Carefully review each R2 credential for:
     - Leading or trailing spaces
     - Newline characters at the end
     - Tab characters
     - Any other invisible characters

2. **Re-enter Credentials**
   - Delete each R2 environment variable
   - Re-add them with fresh values copied directly from Cloudflare
   - Make sure to copy only the exact value without any extra characters

3. **Verify Credential Format**
   - R2_ACCOUNT_ID: Should be exactly 32 hexadecimal characters
   - R2_ACCESS_KEY_ID: Usually 20 characters
   - R2_SECRET_ACCESS_KEY: Usually 40 characters
   - R2_BUCKET_NAME: Your bucket name without any special formatting
   - R2_PUBLIC_BUCKET_KEY: Should match the public key from your bucket's public URL

### Prevention Tips
- Always copy credentials directly from the Cloudflare dashboard
- Never include quotes or extra formatting when setting environment variables
- Use the "eye" icon in Cloudflare to reveal and copy values cleanly

## Testing Your Configuration

### Run Diagnostic Scripts

1. **Local Diagnostic** (requires actual credentials in .env):
   ```bash
   node diagnose-railway-r2.js
   ```

2. **Railway Diagnostic** (run in Railway environment):
   ```bash
   npm run diagnose:railway
   ```

3. **Connection Test** (run in Railway environment):
   ```bash
   npm run test:railway-r2
   ```

## Common Issues and Solutions

### 1. Credentials Not Set
**Error**: "Required environment variables are missing"
**Solution**: 
- Verify all required variables are set in Railway:
  - R2_ACCOUNT_ID
  - R2_ACCESS_KEY_ID
  - R2_SECRET_ACCESS_KEY
  - R2_BUCKET_NAME
  - R2_PUBLIC_BUCKET_KEY

### 2. Invalid Credentials
**Error**: "InvalidAccessKeyId" or "SignatureDoesNotMatch"
**Solution**:
- Recreate your R2 API token in Cloudflare
- Ensure you're using the correct key/secret pair
- Verify the token has R2 edit permissions

### 3. Bucket Doesn't Exist
**Error**: "NoSuchBucket"
**Solution**:
- Create the bucket in your Cloudflare R2 dashboard
- Ensure the bucket name matches exactly (case-sensitive)

### 4. Permission Issues
**Error**: "AccessDenied"
**Solution**:
- Check that your API token has the correct permissions
- Ensure the token is associated with the correct Cloudflare account
- Verify the token hasn't expired

### 5. Incorrect Public URLs
**Issue**: Files upload successfully but can't be accessed via generated URLs
**Solution**:
- Verify that R2_PUBLIC_BUCKET_KEY is set correctly
- Ensure public access is enabled for your R2 bucket
- Check that the public bucket key matches the one in your bucket's public URL

## Debugging in Railway

### View Application Logs
1. In Railway, go to your service
2. Click on "Deployments"
3. Select the latest deployment
4. Click "View Logs"
5. Look for Cloudflare R2 related error messages

### Run Diagnostic Commands
You can run diagnostic commands directly in the Railway environment:

1. Go to your Railway service
2. Click "Deployments"
3. Select a deployment
4. Click "Console" tab
5. Run diagnostic commands:
   ```bash
   npm run diagnose:railway
   npm run test:railway-r2
   ```

## Credential Best Practices

### 1. Secure Handling
- Never commit credentials to version control
- Always use environment variables
- Rotate credentials periodically

### 2. Proper Formatting
- No leading or trailing spaces
- No newline or tab characters
- Single-line values only
- Correct character encoding (ASCII)

### 3. Validation
- Verify credential lengths match expected patterns
- Check for common formatting errors
- Test connectivity after any credential changes

## Advanced Troubleshooting

### Enable Debug Logging
Add this environment variable to get more detailed logs:
```
DEBUG=@aws-sdk*
```

### Test with a Simple Script
Create a simple test file to isolate the issue:
```javascript
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

client.send(new ListBucketsCommand({}))
  .then(response => console.log('Success:', response))
  .catch(error => console.error('Error:', error));
```

## Contact Support

If you continue to experience issues:

1. Check the Cloudflare status page for service outages
2. Review the Cloudflare R2 documentation
3. Contact Cloudflare support with:
   - Error messages
   - Timestamps
   - Request IDs (if available)

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Railway Environment Variables Documentation](https://docs.railway.app/develop/variables)