const fs = require('fs');
const path = require('path');

// Function to move files from old uploads directory to new persistent uploads directory
const migrateUploads = () => {
  try {
    const oldUploadsDir = path.join(__dirname, '..', 'uploads');
    const newUploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
    
    // Create new uploads directory if it doesn't exist
    if (!fs.existsSync(newUploadsDir)) {
      fs.mkdirSync(newUploadsDir, { recursive: true });
      console.log(`Created new uploads directory: ${newUploadsDir}`);
    }
    
    // Check if old uploads directory exists
    if (fs.existsSync(oldUploadsDir)) {
      const files = fs.readdirSync(oldUploadsDir);
      
      if (files.length > 0) {
        console.log(`Found ${files.length} files to migrate`);
        
        // Move each file from old to new directory
        files.forEach(file => {
          const oldPath = path.join(oldUploadsDir, file);
          const newPath = path.join(newUploadsDir, file);
          
          // Move file
          fs.renameSync(oldPath, newPath);
          console.log(`Moved ${file} from ${oldUploadsDir} to ${newUploadsDir}`);
        });
        
        console.log('File migration completed successfully');
      } else {
        console.log('No files found in old uploads directory');
      }
    } else {
      console.log('Old uploads directory does not exist');
    }
  } catch (error) {
    console.error('Error during file migration:', error);
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  migrateUploads();
}

module.exports = migrateUploads;