const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

const taskAttachmentUpload = multer({ 
  storage: taskAttachmentStorage,
  fileFilter: taskAttachmentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased from 10MB to 50MB
    files: 30
  }
});

module.exports = {
  taskAttachmentUpload
};