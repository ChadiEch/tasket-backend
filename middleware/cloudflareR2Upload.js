const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

// Cloudflare R2 configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// In-memory storage for multer (files will be uploaded to R2, not stored locally)
const storage = multer.memoryStorage();

// File filter (same as existing implementation)
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

// Function to upload file to Cloudflare R2
const uploadToR2 = async (fileBuffer, filename, mimetype) => {
  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    Body: fileBuffer,
    ContentType: mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    // Return the public URL for the uploaded file
    return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
};

// Function to delete file from Cloudflare R2
const deleteFromR2 = async (filename) => {
  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: filename,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`Deleted file from R2: ${filename}`);
  } catch (error) {
    console.error('Error deleting from R2:', error);
    throw error;
  }
};

// Custom middleware to handle R2 uploads
const uploadToR2Middleware = async (req, res, next) => {
  if (req.files && req.files.length > 0) {
    try {
      // Process each uploaded file
      for (const file of req.files) {
        // Generate a unique filename
        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `task-attachment-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${fileExtension}`;
        
        // Upload to R2
        const publicUrl = await uploadToR2(file.buffer, uniqueFilename, file.mimetype);
        
        // Add the public URL to the file object
        file.r2Url = publicUrl;
        file.filename = uniqueFilename;
      }
    } catch (error) {
      console.error('Error during R2 upload:', error);
      return res.status(500).json({ message: 'Error uploading files to storage' });
    }
  } else if (req.file) {
    // Handle single file upload
    try {
      const fileExtension = path.extname(req.file.originalname);
      const uniqueFilename = `task-attachment-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${fileExtension}`;
      
      const publicUrl = await uploadToR2(req.file.buffer, uniqueFilename, req.file.mimetype);
      
      req.file.r2Url = publicUrl;
      req.file.filename = uniqueFilename;
    } catch (error) {
      console.error('Error during R2 upload:', error);
      return res.status(500).json({ message: 'Error uploading file to storage' });
    }
  }
  next();
};

// Multer configuration for R2 uploads
const taskAttachmentUpload = multer({ 
  storage: storage,
  fileFilter: taskAttachmentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 30
  }
});

module.exports = {
  taskAttachmentUpload,
  uploadToR2Middleware,
  deleteFromR2 // Export delete function for use when deleting tasks
};