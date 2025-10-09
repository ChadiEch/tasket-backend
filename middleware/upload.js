const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // Added for image compression

// Use a more persistent directory for uploads
// In production, you might want to use an environment variable for this
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for task attachment uploads
const taskAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'task-attachment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Function to compress image files
const compressImage = async (filePath, options = {}) => {
  try {
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
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed!'), false);
  }
};

// Custom middleware to compress images after upload
const compressUploadedFiles = async (req, res, next) => {
  if (req.files && req.files.length > 0) {
    try {
      // Process each uploaded file
      for (const file of req.files) {
        // Check if it's an image file
        if (file.mimetype.startsWith('image/')) {
          const filePath = path.join(uploadsDir, file.filename);
          // Compress with default options
          await compressImage(filePath);
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
        // Compress with default options
        await compressImage(filePath);
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