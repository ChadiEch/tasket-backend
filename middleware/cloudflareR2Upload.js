const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

// Cloudflare R2 configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BUCKET_KEY = process.env.R2_PUBLIC_BUCKET_KEY || 'pub-65a8f0a1ed924205af132a2ffe78debd'; // Default to your working key
const R2_ENDPOINT = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null;

// Check if we should use Cloudflare R2
const USE_CLOUDFLARE_R2 = process.env.USE_CLOUDFLARE_R2 === 'true';

console.log('Cloudflare R2 Configuration:');
console.log('  USE_CLOUDFLARE_R2:', USE_CLOUDFLARE_R2);
console.log('  R2_ACCOUNT_ID:', R2_ACCOUNT_ID ? 'SET' : 'NOT SET');
console.log('  R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('  R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('  R2_BUCKET_NAME:', R2_BUCKET_NAME);
console.log('  R2_PUBLIC_BUCKET_KEY:', R2_PUBLIC_BUCKET_KEY);
console.log('  R2_ENDPOINT:', R2_ENDPOINT);

// Function to check for invalid characters in credentials
const checkForInvalidChars = (str, name) => {
  if (!str) return false;
  
  // Check for common invalid characters in HTTP headers
  const invalidChars = ['\n', '\r', '\t', '\0'];
  for (const char of invalidChars) {
    if (str.includes(char)) {
      console.error(`❌ Invalid character '${char}' found in ${name}`);
      return true;
    }
  }
  
  // Check for non-ASCII characters
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 127) {
      console.error(`❌ Non-ASCII character found in ${name} at position ${i}`);
      return true;
    }
  }
  
  return false;
};

// Check if all required variables are set when R2 is enabled
let isR2ProperlyConfigured = false;
if (USE_CLOUDFLARE_R2) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ Cloudflare R2 is enabled but required environment variables are missing:');
    if (!R2_ACCOUNT_ID) console.error('   - R2_ACCOUNT_ID is missing');
    if (!R2_ACCESS_KEY_ID) console.error('   - R2_ACCESS_KEY_ID is missing');
    if (!R2_SECRET_ACCESS_KEY) console.error('   - R2_SECRET_ACCESS_KEY is missing');
    if (!R2_BUCKET_NAME) console.error('   - R2_BUCKET_NAME is missing');
    console.error('⚠️  Cloudflare R2 will not work until these are set');
  } else {
    // Check for invalid characters in credentials
    let hasInvalidChars = false;
    hasInvalidChars |= checkForInvalidChars(R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
    hasInvalidChars |= checkForInvalidChars(R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID');
    hasInvalidChars |= checkForInvalidChars(R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY');
    hasInvalidChars |= checkForInvalidChars(R2_BUCKET_NAME, 'R2_BUCKET_NAME');
    
    if (hasInvalidChars) {
      console.error('❌ Cloudflare R2 credentials contain invalid characters');
      console.error('⚠️  Please check your Railway environment variables for extra characters (like newlines)');
    } else {
      console.log('✅ All Cloudflare R2 environment variables are properly set');
      isR2ProperlyConfigured = true;
    }
  }
}

// Initialize S3 client for Cloudflare R2
let s3Client;
if (isR2ProperlyConfigured) {
  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID?.trim(), // Trim whitespace
        secretAccessKey: R2_SECRET_ACCESS_KEY?.trim(), // Trim whitespace
      },
    });
    console.log('✅ Cloudflare R2 client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Cloudflare R2 client:', error.message);
    console.error('Error details:', error);
    isR2ProperlyConfigured = false;
  }
} else {
  console.log('⚠️  Cloudflare R2 client not initialized due to missing configuration');
}

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

// Function to check if a file already exists in Cloudflare R2
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

// Function to upload file to Cloudflare R2
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

  const params = {
    Bucket: R2_BUCKET_NAME?.trim(), // Trim whitespace
    Key: filename?.trim(), // Trim whitespace
    Body: fileBuffer,
    ContentType: mimetype,
  };

  try {
    console.log(`Uploading file to Cloudflare R2: ${filename}`);
    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    // Generate the correct public URL using the r2.dev format
    const publicUrl = `https://${R2_PUBLIC_BUCKET_KEY}.r2.dev/${filename}`;
    console.log(`Successfully uploaded file to Cloudflare R2: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    // Log more details about the error
    if (error.$metadata) {
      console.error('Error metadata:', {
        httpStatusCode: error.$metadata.httpStatusCode,
        requestId: error.$metadata.requestId,
        attempts: error.$metadata.attempts,
        totalRetryDelay: error.$metadata.totalRetryDelay
      });
    }
    throw new Error(`Failed to upload file to Cloudflare R2: ${error.message}`);
  }
};

// Function to delete file from Cloudflare R2
const deleteFromR2 = async (filename) => {
  // Check if R2 is properly configured
  if (!isR2ProperlyConfigured) {
    console.warn('Cloudflare R2 is not properly configured. Skipping file deletion.');
    return;
  }
  
  if (!R2_BUCKET_NAME) {
    console.warn('R2_BUCKET_NAME is not set. Skipping file deletion.');
    return;
  }

  // Validate filename
  if (!filename || typeof filename !== 'string') {
    console.warn('Invalid filename provided for deletion:', filename);
    return;
  }

  const params = {
    Bucket: R2_BUCKET_NAME?.trim(), // Trim whitespace
    Key: filename?.trim(), // Trim whitespace
  };

  try {
    console.log(`Deleting file from Cloudflare R2: ${filename}`);
    const command = new DeleteObjectCommand(params);
    const response = await s3Client.send(command);
    console.log(`Successfully deleted file from Cloudflare R2: ${filename}`);
    return response; // Return the response for potential use
  } catch (error) {
    console.error('Error deleting from R2:', error);
    // Log more details about the error
    if (error.$metadata) {
      console.error('Error metadata:', {
        httpStatusCode: error.$metadata.httpStatusCode,
        requestId: error.$metadata.requestId,
        attempts: error.$metadata.attempts,
        totalRetryDelay: error.$metadata.totalRetryDelay
      });
    }
    // Re-throw the error so it can be handled by the calling function
    throw new Error(`Failed to delete file from Cloudflare R2: ${error.message}`);
  }
};

// Custom middleware to handle R2 uploads
const uploadToR2Middleware = async (req, res, next) => {
  // If R2 is not properly configured, return an error instead of falling back
  if (!isR2ProperlyConfigured) {
    console.error('Cloudflare R2 is enabled but not properly configured');
    return res.status(500).json({ 
      message: 'Cloudflare R2 storage is not properly configured. Please contact the administrator.',
      error: 'Cloudflare R2 configuration error'
    });
  }
  
  if (req.files && req.files.length > 0) {
    try {
      console.log(`Processing ${req.files.length} files for R2 upload`);
      // Process each uploaded file
      for (const file of req.files) {
        // Generate a unique filename
        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `task-attachment-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${fileExtension}`;
        
        console.log(`Processing file: ${file.originalname} as ${uniqueFilename}`);
        // Upload to R2
        const publicUrl = await uploadToR2(file.buffer, uniqueFilename, file.mimetype);
        
        // Add the public URL to the file object
        file.r2Url = publicUrl;
        file.filename = uniqueFilename;
        console.log(`File processed successfully: ${publicUrl}`);
      }
    } catch (error) {
      console.error('Error during R2 upload:', error);
      // Provide more detailed error information
      const errorMessage = error.message || 'Unknown error during R2 upload';
      const errorDetails = {
        message: 'Error uploading files to Cloudflare R2 storage',
        error: errorMessage,
        // Include stack trace in development
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      };
      
      // Add AWS-specific error details if available
      if (error.$metadata) {
        errorDetails.details = {
          httpStatusCode: error.$metadata.httpStatusCode,
          requestId: error.$metadata.requestId
        };
      }
      
      return res.status(500).json(errorDetails);
    }
  } else if (req.file) {
    // Handle single file upload
    try {
      const fileExtension = path.extname(req.file.originalname);
      const uniqueFilename = `task-attachment-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${fileExtension}`;
      
      console.log(`Processing single file: ${req.file.originalname} as ${uniqueFilename}`);
      const publicUrl = await uploadToR2(req.file.buffer, uniqueFilename, req.file.mimetype);
      
      req.file.r2Url = publicUrl;
      req.file.filename = uniqueFilename;
      console.log(`Single file processed successfully: ${publicUrl}`);
    } catch (error) {
      console.error('Error during R2 upload:', error);
      // Provide more detailed error information
      const errorMessage = error.message || 'Unknown error during R2 upload';
      const errorDetails = {
        message: 'Error uploading file to Cloudflare R2 storage',
        error: errorMessage,
        // Include stack trace in development
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      };
      
      // Add AWS-specific error details if available
      if (error.$metadata) {
        errorDetails.details = {
          httpStatusCode: error.$metadata.httpStatusCode,
          requestId: error.$metadata.requestId
        };
      }
      
      return res.status(500).json(errorDetails);
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
  deleteFromR2,
  checkIfFileExists // Export the new function for use in tests
};