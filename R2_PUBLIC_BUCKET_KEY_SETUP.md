# Cloudflare R2 Public Bucket Key Setup

This guide explains how to find and configure the R2_PUBLIC_BUCKET_KEY environment variable for your Tasket application.

## What is the R2_PUBLIC_BUCKET_KEY?

The R2_PUBLIC_BUCKET_KEY is the unique identifier for your Cloudflare R2 bucket's public development URL. When you enable public access for your R2 bucket, Cloudflare generates a public URL in the format:

```
https://{public_bucket_key}.r2.dev/{filename}
```

For example:
```
https://pub-65a8f0a1ed924205af132a2ffe78debd.r2.dev/task-attachment-1760081717579-9a871520.jpg
```

In this example, the R2_PUBLIC_BUCKET_KEY is:
```
pub-65a8f0a1ed924205af132a2ffe78debd
```

## How to Find Your R2_PUBLIC_BUCKET_KEY

### Step 1: Enable Public Access for Your Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to R2 under the "Storage" section
3. Select your bucket (e.g., "tasket")
4. Click on "Settings"
5. Scroll down to "Public Development URL"
6. Click "Enable"
7. Type "allow" to confirm and click "Allow"

### Step 2: Find Your Public Bucket URL

1. After enabling public access, you'll see a "Public Bucket URL" field
2. The URL will look like:
   ```
   https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
   ```
3. Copy the entire key part (without the `https://` and `.r2.dev` parts):
   ```
   pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 3: Set the Environment Variable in Railway

1. Go to your Railway project dashboard
2. Select the "tasket-backend" service
3. Go to the "Variables" tab
4. Add a new environment variable:
   - Name: `R2_PUBLIC_BUCKET_KEY`
   - Value: The key you copied (e.g., `pub-65a8f0a1ed924205af132a2ffe78debd`)

## Common Issues and Troubleshooting

### Issue: Files Upload But Aren't Accessible

**Symptoms**: 
- Files upload successfully to R2
- Generated URLs return 404 errors
- Files are visible in the R2 dashboard but not publicly accessible

**Solution**:
1. Verify that public access is enabled for your bucket
2. Check that the R2_PUBLIC_BUCKET_KEY matches the key in your bucket's public URL
3. Ensure there are no typos in the environment variable

### Issue: Incorrect Public Bucket Key

**Symptoms**:
- Generated URLs have the wrong format
- Files are not accessible via the generated URLs

**Solution**:
1. Double-check the public bucket key in your Cloudflare dashboard
2. Make sure you're copying only the key part (e.g., `pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
3. Verify there are no extra characters or spaces

## Testing Your Configuration

After setting the R2_PUBLIC_BUCKET_KEY:

1. Redeploy your application in Railway
2. Create a task with a file attachment
3. Check that the generated URL matches the expected format:
   ```
   https://{your-public-bucket-key}.r2.dev/{filename}
   ```
4. Verify that you can access the file via the generated URL

## Security Considerations

- The R2_PUBLIC_BUCKET_KEY is not a secret credential
- It's part of the public URL structure
- Anyone with this key can access publicly available files in your bucket
- For private files, consider using signed URLs or custom domains with authentication

## Example Configuration

Here's what your Railway environment variables should look like:

```
USE_CLOUDFLARE_R2=true
R2_ACCOUNT_ID=9364b705b27014c39098d5689dda5d36
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=tasket
R2_PUBLIC_BUCKET_KEY=pub-65a8f0a1ed924205af132a2ffe78debd
```

## Verification Script

You can test your configuration with the following command in your Railway environment:

```bash
npm run test:r2-url
```

This will verify that the URL generation is working correctly.