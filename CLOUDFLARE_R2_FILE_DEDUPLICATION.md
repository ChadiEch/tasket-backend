# Cloudflare R2 File Deduplication

This document explains how the Tasket application implements file deduplication for Cloudflare R2 storage to avoid uploading the same file multiple times.

## Overview

The Tasket application now includes logic to check if a file already exists in the Cloudflare R2 bucket before uploading it. This prevents duplicate uploads and saves storage space.

## How It Works

### 1. File Existence Checking

When a file is uploaded, the system first checks if a file with the same name already exists in the R2 bucket using the `checkIfFileExists` function:

```javascript
const checkIfFileExists = async (filename) => {
  if (!isR2ProperlyConfigured || !R2_BUCKET_NAME) {
    return false;
  }

  try {
    const params = {
      Bucket: R2_BUCKET_NAME?.trim(),
      Key: filename?.trim(),
    };

    await s3Client.send(new HeadObjectCommand(params));
    // If HeadObjectCommand succeeds, the file exists
    console.log(`File ${filename} already exists in Cloudflare R2 bucket`);
    return true;
  } catch (error) {
    // If HeadObjectCommand throws an error, the file doesn't exist (or there's an access issue)
    if (error.name === 'NotFound' || error.code === 'NotFound') {
      console.log(`File ${filename} does not exist in Cloudflare R2 bucket`);
      return false;
    } else {
      // Some other error occurred
      console.error('Error checking if file exists in R2:', error);
      return false;
    }
  }
};
```

### 2. Conditional Upload Logic

The `uploadToR2` function now includes logic to skip the upload if the file already exists:

```javascript
const uploadToR2 = async (fileBuffer, filename, mimetype) => {
  // Check if R2 is properly configured
  if (!isR2ProperlyConfigured) {
    throw new Error('Cloudflare R2 is enabled but not properly configured. Please check environment variables.');
  }
  
  if (!R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME is not set');
  }

  // Check if file already exists
  const fileExists = await checkIfFileExists(filename);
  
  if (fileExists) {
    // File already exists, return the existing URL without re-uploading
    const publicUrl = `https://${R2_PUBLIC_BUCKET_KEY}.r2.dev/${filename}`;
    console.log(`File ${filename} already exists. Using existing URL: ${publicUrl}`);
    return publicUrl;
  }

  // Continue with normal upload process...
}
```

## Benefits

1. **Storage Savings**: Prevents duplicate files from being stored in R2
2. **Bandwidth Efficiency**: Reduces upload bandwidth usage
3. **Performance**: Faster processing when files already exist
4. **Cost Reduction**: Lower storage and bandwidth costs

## How Files Are Identified

Files are identified by their generated unique filenames, which include:
- A timestamp
- A random component

Example filename: `task-attachment-1760081717579-9a871520.jpg`

This naming convention ensures that files with the same content but uploaded at different times will have different names, preventing false positives in the deduplication logic.

## Limitations

1. **Name-Based Checking**: The system only checks for exact filename matches, not content matches
2. **No Content Hashing**: The system doesn't calculate file hashes to detect identical files with different names
3. **Performance Impact**: Each file upload now requires an additional API call to check existence

## Error Handling

The file existence checking is designed to be fail-safe:
- If there's any error during the existence check, the system assumes the file doesn't exist
- The upload proceeds normally to ensure no data is lost
- Errors are logged for debugging purposes

## Testing

You can test the file existence checking logic with:

```bash
npm run test:r2-file-exists
```

## Configuration

No additional configuration is required. The feature works automatically when Cloudflare R2 is enabled.

## Monitoring

File existence checks and deduplication decisions are logged in the application logs:
- `File {filename} already exists in Cloudflare R2 bucket`
- `File {filename} does not exist in Cloudflare R2 bucket`
- `File {filename} already exists. Using existing URL: {url}`

These logs can be used to monitor the effectiveness of the deduplication feature.