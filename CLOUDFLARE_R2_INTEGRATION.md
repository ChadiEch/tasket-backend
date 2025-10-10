# Cloudflare R2 Integration

This document explains how to configure and use Cloudflare R2 as an alternative to Railway volumes for storing uploaded files.

## Overview

Cloudflare R2 is an S3-compatible object storage service that provides:
- 10GB free storage tier
- Zero egress fees
- High performance and reliability
- Cost-effective pricing beyond the free tier

## Prerequisites

1. A Cloudflare account
2. A Cloudflare R2 bucket
3. R2 API credentials (Access Key ID and Secret Access Key)

## Setup Instructions

### 1. Create R2 Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to R2 Storage
3. Create a new bucket (note the bucket name)
4. Make the bucket public or configure appropriate access permissions

### 2. Generate API Credentials

1. In the Cloudflare dashboard, go to R2 Storage
2. Click on "Manage R2 API Tokens"
3. Create a new API token with appropriate permissions
4. Note the Access Key ID and Secret Access Key

### 3. Configure Environment Variables

Set the following environment variables in your deployment environment:

```env
USE_CLOUDFLARE_R2=true
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
```

### 4. Deploy the Application

When `USE_CLOUDFLARE_R2` is set to `true`, the application will:
- Store uploaded files in Cloudflare R2 instead of local storage
- Serve file URLs directly from Cloudflare's CDN
- Automatically delete files from R2 when tasks are permanently deleted

## Benefits

1. **Free Tier**: 10GB storage at no cost
2. **Zero Egress Fees**: Unlike most cloud storage providers, R2 has zero egress fees
3. **Scalability**: Can easily handle large amounts of data
4. **Performance**: Files served from Cloudflare's global CDN
5. **Reliability**: 99.99% uptime SLA

## Pricing

Beyond the free tier:
- Storage: $0.015 per GB-month
- Class A Operations: $4.50 per million operations
- Class B Operations: $0.36 per million operations

## Migration

If you're migrating from local storage to Cloudflare R2:
1. Existing files in local storage will continue to work
2. New uploads will be stored in R2
3. You can manually migrate existing files to R2 if needed

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify your R2 credentials are correct
2. **Permission Errors**: Ensure your API token has the necessary permissions
3. **Upload Failures**: Check file size limits and supported file types

### Logs

Check application logs for detailed error messages related to R2 operations.

## Security Considerations

1. Keep your R2 credentials secure
2. Use appropriate bucket permissions
3. Consider implementing signed URLs for private files
4. Regularly rotate your API credentials

## Best Practices

1. Monitor your storage usage to stay within the free tier
2. Implement proper error handling for upload failures
3. Use appropriate file naming conventions
4. Regularly audit your R2 bucket for unused files