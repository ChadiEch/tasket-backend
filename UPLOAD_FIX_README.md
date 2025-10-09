# Fix for Uploaded Attachments Disappearing After Redeployment

## Problem
Uploaded attachments were disappearing after redeploying the backend server on Railway.

## Root Cause
The issue was caused by a mismatch between the deployment configuration and the Docker setup:
1. The `railway.docker-compose.yml` file referenced a Dockerfile that didn't exist
2. The `railway.json` file was using nixpacks instead of Docker
3. This inconsistency prevented proper volume mapping for persistent uploads

## Solution Applied
1. Created a proper Dockerfile for the backend service
2. Updated `railway.json` to use Docker instead of nixpacks for consistency
3. Ensured the `UPLOADS_DIR` environment variable is properly configured
4. Verified volume mapping in `railway.docker-compose.yml`

## Files Modified
- Created `tasket-backend/Dockerfile`
- Updated `tasket-backend/railway.json`

## Environment Variables
The following environment variable should be set in Railway:
```
UPLOADS_DIR=/app/persistent_uploads
```

## Testing
After applying these changes:
1. Upload a file through the application
2. Redeploy the application
3. Verify that the file is still accessible at `/uploads/filename.ext`

## Best Practices
1. Always ensure consistency between deployment configuration files
2. Test file persistence after any deployment configuration changes
3. Document all environment variables required for proper operation