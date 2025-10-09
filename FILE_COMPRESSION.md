# File Compression Feature

## Overview
This feature automatically compresses image files during upload to reduce storage space and improve performance while maintaining acceptable image quality.

## How It Works
1. When a user uploads image files (JPEG, PNG, GIF), they are automatically compressed
2. Non-image files (documents, videos, etc.) are stored as-is without compression
3. Images are resized if they exceed 1920x1080 pixels
4. Compressed images maintain a quality level of 80% (adjustable)

## Technical Implementation

### Compression Settings
- **Quality**: 80% (configurable)
- **Maximum Dimensions**: 1920x1080 pixels
- **Supported Formats**: JPEG, PNG, WebP
- **File Size Threshold**: Files smaller than 100KB are not compressed

### Middleware
The compression is handled by the [compressUploadedFiles](file:///c%3A/Users/user/Downloads/uploads%20%282%29/tasket-backend/middleware/upload.js#L78-L107) middleware which:
1. Detects image files based on MIME type
2. Applies compression using the Sharp library
3. Preserves original file names
4. Handles both single and multiple file uploads

## Configuration

### Adjusting Compression Settings
Compression settings can be modified in the [compressImage](file:///c%3A/Users/user/Downloads/uploads%20%282%29/tasket-backend/middleware/upload.js#L17-L67) function:

```javascript
const compressImage = async (filePath, options = {}) => {
  const {
    quality = 80,        // Image quality (1-100)
    maxWidth = 1920,     // Maximum width in pixels
    maxHeight = 1080,    // Maximum height in pixels
    format = 'jpeg'      // Output format
  } = options;
  // ... compression logic
};
```

### Disabling Compression
To disable compression for specific routes, simply remove the [compressUploadedFiles](file:///c%3A/Users/user/Downloads/uploads%20%282%29/tasket-backend/middleware/upload.js#L78-L107) middleware from the route definition.

## Supported File Types

### Compressed
- JPEG/JPG
- PNG
- GIF

### Stored Without Compression
- PDF documents
- Microsoft Office documents (Word, Excel)
- Text files
- ZIP archives
- Video files

## Performance Benefits

### Storage Savings
- Typical image compression reduces file size by 60-80%
- Large images (4K+) can be reduced by 90% or more

### Upload Performance
- Smaller file sizes result in faster uploads
- Reduced bandwidth usage for both client and server

## Error Handling
- If compression fails, the original file is preserved
- Errors are logged but don't interrupt the upload process
- Non-image files are unaffected by compression errors

## Testing
To test the compression feature:
1. Upload an image file through any form that accepts attachments
2. Check the file size in the uploads directory
3. Compare with the original file size to verify compression

## Troubleshooting

### Compression Not Working
- Verify Sharp library is installed: `npm list sharp`
- Check file MIME types are correctly detected
- Ensure the uploads directory has proper write permissions

### Quality Issues
- Adjust the quality parameter in [compressImage](file:///c%3A/Users/user/Downloads/uploads%20%282%29/tasket-backend/middleware/upload.js#L17-L67) function
- For higher quality, increase the quality value (up to 100)
- For smaller files, decrease the quality value