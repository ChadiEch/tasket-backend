// Test script to verify upload directory configuration
const path = require('path');
const fs = require('fs');

// Get the uploads directory from environment variable or default
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'persistent_uploads');

console.log('Uploads directory:', uploadsDir);
console.log('Uploads directory exists:', fs.existsSync(uploadsDir));

if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created successfully');
} else {
  console.log('Uploads directory already exists');
}

// List files in the directory
try {
  const files = fs.readdirSync(uploadsDir);
  console.log('Files in uploads directory:', files.length);
  files.slice(0, 5).forEach(file => {
    console.log('  -', file);
  });
  if (files.length > 5) {
    console.log('  ... and', files.length - 5, 'more files');
  }
} catch (err) {
  console.error('Error reading uploads directory:', err.message);
}