# Cloudflare R2 Setup Guide

This guide explains how to set up Cloudflare R2 storage for your Tasket application to handle file uploads.

## Prerequisites

1. A Cloudflare account
2. Access to Cloudflare R2 service

## Step 1: Create R2 Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to R2 under the "Storage" section
3. Click "Create bucket"
4. Enter a bucket name (e.g., "tasket-uploads")
5. Click "Create bucket"

## Step 2: Enable Public Access for Your Bucket

1. In the Cloudflare dashboard, go to the R2 section
2. Select your bucket
3. Click on "Settings"
4. Under "Public Development URL", click "Enable"
5. Type "allow" to confirm and click "Allow"
6. Note the Public Bucket URL (it will look like `https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev`)

## Step 3: Create R2 API Token

1. In the Cloudflare dashboard, go to "My Profile" > "API Tokens"
2. Click "Create Token"
3. Select "Custom Token"
4. Give your token a name (e.g., "Tasket R2 Token")
5. Under "Permissions", add:
   - Account > Cloudflare R2 Storage > Edit
6. Under "Account Resources", select your account
7. Click "Continue to summary"
8. Click "Create Token"
9. Copy the generated API token (you'll need both the key and secret)

## Step 4: Get Your Account ID

1. In the Cloudflare dashboard, go to the R2 section
2. Your Account ID is displayed at the top of the page
3. Copy this ID for later use

## Step 5: Configure Environment Variables in Railway

1. Go to your Railway project dashboard
2. Select the "tasket-backend" service
3. Go to the "Variables" tab
4. Add these environment variables:
   ```
   USE_CLOUDFLARE_R2=true
   R2_ACCOUNT_ID=your_actual_account_id_here
   R2_ACCESS_KEY_ID=your_actual_access_key_id_here
   R2_SECRET_ACCESS_KEY=your_actual_secret_access_key_here
   R2_BUCKET_NAME=your_bucket_name_here
   R2_PUBLIC_BUCKET_KEY=pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Step 6: Redeploy Application

1. After setting the environment variables, trigger a new deployment in Railway
2. Railway will automatically redeploy your application with the new configuration

## Verification

After deployment, you can verify that R2 is working by:

1. Creating a new task with file attachments
2. Checking that files are uploaded to your R2 bucket
3. Verifying that file URLs are correctly generated in the application

## Troubleshooting

### Common Issues

1. **500 Error when creating tasks with attachments**
   - Check that all environment variables are correctly set
   - Verify that your API token has the correct permissions
   - Ensure your bucket name is correct

2. **Files not appearing in R2 bucket**
   - Check the application logs for upload errors
   - Verify that the bucket exists and is spelled correctly
   - Confirm that your API credentials are correct

3. **Permission errors**
   - Double-check that your API token has R2 edit permissions
   - Ensure the token is associated with the correct account

### Checking Logs

To troubleshoot issues:

1. In Railway, go to your service
2. Click on the "Deployments" tab
3. Select the latest deployment
4. View the logs to see any error messages related to R2 uploads

## Security Best Practices

1. **Never commit credentials to version control**
   - Always use environment variables for sensitive information
   - The .env file should never be committed to git

2. **Use scoped API tokens**
   - Create tokens with minimal required permissions
   - Don't use account-wide tokens for specific services

3. **Regular credential rotation**
   - Periodically rotate your API credentials
   - Update environment variables when rotating credentials

## Cost Considerations

Cloudflare R2 offers a generous free tier:
- 10 GB storage free
- 1 million reads free per month
- 1 million writes free per month
- No egress fees

For most small to medium applications, the free tier will be sufficient.

## Fallback to Local Storage

If you need to temporarily disable R2 and fall back to local storage:
1. Set `USE_CLOUDFLARE_R2=false` in your Railway environment variables
2. Redeploy your application

Note that local storage on Railway is ephemeral unless you configure volumes properly.