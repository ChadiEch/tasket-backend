# Uploads Persistence Fixes

This document explains the changes made to fix the issue where uploaded files were not accessible after server restarts.

## Problem

After restarting the server, uploaded files were not accessible with errors like:
```
Cannot GET /uploads/task-attachment-1759995344325-614466101.png
```

## Root Causes

1. **Inconsistent directory paths**: Different controllers were using different paths for the uploads directory
2. **Docker volume mapping mismatch**: The Docker configuration was mapping to `uploads` but the application was using `persistent_uploads`
3. **Missing environment variable configuration**: The `UPLOADS_DIR` environment variable was not properly set in Docker

## Fixes Applied

### 1. Unified Uploads Directory Path

All controllers now use the same path logic:
```javascript
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
```

Files updated:
- [tasket-backend/controllers/taskController.js](file:///c%3A/Users/user/Downloads/uploads%20%282%29/tasket-backend/controllers/taskController.js)
- [tasket-backend/controllers/employeeController.js](file:///c%3A/Users/user/Downloads/uploads%20%282%29/tasket-backend/controllers/employeeController.js)
- [tasket-backend/controllers/authController.js](file:///c%3A/Users/user/Downloads/uploads%20%282%29/tasket-backend/controllers/authController.js)

### 2. Docker Configuration Update

Updated [railway.docker-compose.yml](file:///c%3A/Users/user/Downloads/uploads%20%282%29/railway.docker-compose.yml) to use the correct directory:
```yaml
environment:
  - UPLOADS_DIR=/app/persistent_uploads
volumes:
  - ./tasket-backend/persistent_uploads:/app/persistent_uploads
```

### 3. Deployment Scripts Update

Updated preparation scripts to create the correct directory:
- [prepare-railway-deployment.bat](file:///c%3A/Users/user/Downloads/uploads%20%282%29/prepare-railway-deployment.bat)
- [prepare-railway-deployment.sh](file:///c%3A/Users/user/Downloads/uploads%20%282%29/prepare-railway-deployment.sh)

### 4. Documentation Updates

Updated documentation to reflect the correct directory:
- [RAILWAY_DEPLOYMENT.md](file:///c%3A/Users/user/Downloads/uploads%20%282%29/RAILWAY_DEPLOYMENT.md)
- [RAILWAY_DEPLOYMENT_FULL_GUIDE.md](file:///c%3A/Users/user/Downloads/uploads%20%282%29/RAILWAY_DEPLOYMENT_FULL_GUIDE.md)
- [RAILWAY_DEPLOYMENT_QUICK_START.md](file:///c%3A/Users/user/Downloads/uploads%20%282%29/RAILWAY_DEPLOYMENT_QUICK_START.md)

## Testing

To verify the fixes:

1. Upload a file through the application
2. Restart the server
3. Verify the file is still accessible at `/uploads/filename.ext`

## Environment Variables

For proper file persistence, set the following environment variable:
```
UPLOADS_DIR=/app/persistent_uploads
```

## Directory Structure

```
tasket-backend/
├── persistent_uploads/     # Current uploads directory
│   ├── task-attachment-*.pdf
│   ├── photo-*.jpeg
│   └── ...
└── uploads/               # Legacy directory (can be removed)
```

## Best Practices

1. Always use environment variables for configurable paths
2. Ensure Docker volume mappings match the application's directory structure
3. Keep all controllers consistent in their path handling
4. Document directory structures and environment variables clearly