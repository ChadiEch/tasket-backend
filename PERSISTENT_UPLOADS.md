# Persistent Uploads Configuration

This document explains how to configure persistent file uploads to prevent loss of attachments after server restarts.

## Problem

Previously, uploaded attachments were stored in the `uploads` directory, which could be lost during server restarts, especially in cloud deployment environments where the file system is ephemeral.

## Solution

We've implemented a persistent uploads system that:

1. Stores uploaded files in a dedicated `persistent_uploads` directory
2. Allows configuration of the uploads directory via environment variables
3. Provides a migration script to move existing files

## Configuration

### Environment Variable

To specify a custom uploads directory, set the `UPLOADS_DIR` environment variable in your `.env` file:

```env
UPLOADS_DIR=/path/to/your/persistent/uploads/directory
```

If not set, files will be stored in `persistent_uploads` relative to the backend directory.

### Railway Deployment

For Railway deployments, you can set the environment variable in your Railway project settings:

1. Go to your Railway project
2. Click on the "Variables" tab
3. Add a new variable:
   - Name: `UPLOADS_DIR`
   - Value: `/app/persistent_uploads` (or your preferred path)

## Migration

To migrate existing uploads from the old directory to the new persistent directory:

```bash
npm run migrate:uploads
```

This script will:
1. Create the new persistent uploads directory if it doesn't exist
2. Move all files from the old `uploads` directory to the new directory
3. Preserve all existing file references in the database

## Directory Structure

```
tasket-backend/
├── persistent_uploads/     # New persistent uploads directory
│   ├── task-attachment-*.pdf
│   ├── photo-*.jpeg
│   └── ...
├── uploads/                # Old uploads directory (can be deleted after migration)
├── scripts/
│   └── migrateUploads.js   # Migration script
└── ...
```

## Best Practices

1. **Always run the migration script** after updating to this version if you have existing uploads
2. **Set the UPLOADS_DIR environment variable** in production environments
3. **Backup your uploads directory** before running migrations
4. **Test file uploads** after deployment to ensure everything works correctly

## Troubleshooting

### Files still disappearing after restart

1. Ensure `UPLOADS_DIR` is set to a persistent location
2. Check that your deployment environment preserves the specified directory
3. In cloud environments, consider using external storage services like AWS S3

### Migration script not working

1. Ensure you have read/write permissions on both directories
2. Check that the old `uploads` directory exists and contains files
3. Review the console output for any error messages

## Security Notes

- The system still validates file types and sizes
- File paths are sanitized to prevent directory traversal attacks
- Access to uploaded files is still controlled through the application