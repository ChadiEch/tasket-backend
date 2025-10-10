const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // Added for image compression

// Check if we should use Cloudflare R2 instead of local storage
const USE_CLOUDFLARE_R2 = process.env.USE_CLOUDFLARE_R2 === 'true';

console.log('Upload middleware configuration:');
console.log('  USE_CLOUDFLARE_R2:', USE_CLOUDFLARE_R2);

// Use a more persistent directory for uploads
// In production, you might want to use an environment variable for this
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');

// Ensure uploads directory exists (only for local storage)
if (!USE_CLOUDFLARE_R2) {
  if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  } else {
    console.log(`Uploads directory exists: ${uploadsDir}`);
  }
}

// Configure multer for task attachment uploads
let taskAttachmentStorage;
if (USE_CLOUDFLARE_R2) {
  // Use in-memory storage when using Cloudflare R2
  taskAttachmentStorage = multer.memoryStorage();
  console.log('Using in-memory storage for Cloudflare R2');
} else {
  // Use disk storage for local storage
  taskAttachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log(`Saving file to local storage: ${uploadsDir}`);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'task-attachment-' + uniqueSuffix + path.extname(file.originalname);
      console.log(`Generated filename: ${filename}`);
      cb(null, filename);
    }
  });
  console.log('Using disk storage for local uploads');
}

// Function to compress image files
const compressImage = async (filePath, options = {}) => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist, skipping compression: ${filePath}`);
      return;
    }
    
    // Default compression options
    const {
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg'
    } = options;
    
    // Get image metadata
    const metadata = await sharp(filePath).metadata();
    
    // Skip compression for small images
    if (metadata.width <= maxWidth && metadata.height <= maxHeight && fs.statSync(filePath).size < 100 * 1024) {
      console.log(`Skipping compression for small image: ${filePath}`);
      return;
    }
    
    // Resize and compress the image
    let sharpInstance = sharp(filePath);
    
    // Resize if needed
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Apply compression based on format
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ quality });
    }
    
    // Save compressed image
    await sharpInstance.toFile(filePath + '.compressed');
    
    // Replace the original file with the compressed one
    fs.unlinkSync(filePath);
    fs.renameSync(filePath + '.compressed', filePath);
    
    console.log(`Compressed image: ${filePath}`);
  } catch (error) {
    console.error('Error compressing image:', error);
  }
};

const taskAttachmentFileFilter = (req, file, cb) => {
  // Accept documents, images, videos, and other common file types
  const allowedTypes = [
    // Image files
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    
    // Document files
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    
    // Video files
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/avi',
    'video/x-flv',
    'video/mpeg',
    'video/3gpp',
    'video/3gpp2'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log(`File type accepted: ${file.mimetype}`);
    cb(null, true);
  } else {
    console.log(`File type rejected: ${file.mimetype}`);
    cb(new Error('File type not allowed!'), false);
  }
};

// Custom middleware to compress images after upload
const compressUploadedFiles = async (req, res, next) => {
  // Skip compression if using Cloudflare R2
  if (USE_CLOUDFLARE_R2) {
    console.log('Skipping compression as Cloudflare R2 is enabled');
    return next();
  }
  
  if (req.files && req.files.length > 0) {
    console.log(`Compressing ${req.files.length} uploaded files`);
    try {
      // Process each uploaded file
      for (const file of req.files) {
        // Check if it's an image file
        if (file.mimetype.startsWith('image/')) {
          const filePath = path.join(uploadsDir, file.filename);
          console.log(`Compressing image file: ${filePath}`);
          // Compress with default options
          await compressImage(filePath);
        } else {
          console.log(`Skipping compression for non-image file: ${file.originalname}`);
        }
      }
    } catch (error) {
      console.error('Error during file compression:', error);
    }
  } else if (req.file) {
    // Handle single file upload
    try {
      if (req.file.mimetype.startsWith('image/')) {
        const filePath = path.join(uploadsDir, req.file.filename);
        console.log(`Compressing single image file: ${filePath}`);
        // Compress with default options
        await compressImage(filePath);
      } else {
        console.log(`Skipping compression for non-image file: ${req.file.originalname}`);
      }
    } catch (error) {
      console.error('Error during file compression:', error);
    }
  }
  next();
};

const taskAttachmentUpload = multer({ 
  storage: taskAttachmentStorage,
  fileFilter: taskAttachmentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased from 10MB to 50MB
    files: 30
  }
});

module.exports = {
  taskAttachmentUpload,
  compressUploadedFiles // Export the compression middleware
};