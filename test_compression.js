// Test script for file compression feature
const fs = require('fs');
const path = require('path');

console.log('=== File Compression Test ===\n');

// Check if sharp is installed
try {
  require('sharp');
  console.log('✓ Sharp library is installed');
} catch (error) {
  console.log('✗ Sharp library is not installed');
  process.exit(1);
}

// Check upload directory
const uploadsDir = path.join(__dirname, 'persistent_uploads');
console.log('Uploads directory:', uploadsDir);
console.log('Uploads directory exists:', fs.existsSync(uploadsDir));

if (fs.existsSync(uploadsDir)) {
  // Count files and check sizes
  const files = fs.readdirSync(uploadsDir);
  console.log(`\nFound ${files.length} files in uploads directory`);
  
  // Show image files with sizes
  let imageCount = 0;
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    const ext = path.extname(file).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      if (imageCount < 5) {
        console.log(`  Image: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
      imageCount++;
    }
  });
  
  if (imageCount > 5) {
    console.log(`  ... and ${imageCount - 5} more image files`);
  }
  
  console.log(`\nTotal image files: ${imageCount}`);
} else {
  console.log('Uploads directory not found');
}

console.log('\n=== Test Complete ===');
console.log('To test compression:');
console.log('1. Upload an image through the application');
console.log('2. Check the file size before and after upload');
console.log('3. Large images should be compressed automatically');