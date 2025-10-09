#!/usr/bin/env node

/**
 * Migration script to move uploaded files to persistent storage
 * 
 * This script helps migrate existing uploaded files to a persistent storage system
 * to prevent data loss during redeployments.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const sourceDir = process.env.SOURCE_DIR || path.join(__dirname, '..', 'uploads');
const targetDir = process.env.TARGET_DIR || path.join(__dirname, '..', 'persistent_uploads');

console.log('File Migration Script');
console.log('====================');
console.log(`Source directory: ${sourceDir}`);
console.log(`Target directory: ${targetDir}`);
console.log('');

// Function to migrate files
const migrateFiles = () => {
  try {
    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      console.log('Source directory does not exist. Nothing to migrate.');
      return;
    }

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      console.log(`Creating target directory: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Read files from source directory
    const files = fs.readdirSync(sourceDir);
    
    if (files.length === 0) {
      console.log('No files found in source directory.');
      return;
    }

    console.log(`Found ${files.length} files to migrate.`);
    console.log('');

    let migratedCount = 0;
    let errorCount = 0;

    // Migrate each file
    files.forEach(file => {
      try {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        // Skip if it's a directory
        if (fs.statSync(sourcePath).isDirectory()) {
          console.log(`Skipping directory: ${file}`);
          return;
        }

        // Check if file already exists in target
        if (fs.existsSync(targetPath)) {
          console.log(`File already exists in target, skipping: ${file}`);
          return;
        }

        // Move file
        fs.renameSync(sourcePath, targetPath);
        console.log(`Migrated: ${file}`);
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating ${file}:`, error.message);
        errorCount++;
      }
    });

    console.log('');
    console.log('Migration Summary:');
    console.log(`- Successfully migrated: ${migratedCount} files`);
    console.log(`- Errors: ${errorCount} files`);
    console.log(`- Total files processed: ${files.length}`);
    
    if (errorCount === 0) {
      console.log('');
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('');
      console.log('⚠️  Migration completed with some errors.');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

// Function to verify migration
const verifyMigration = () => {
  try {
    console.log('');
    console.log('Verifying migration...');
    
    if (!fs.existsSync(targetDir)) {
      console.log('Target directory does not exist.');
      return false;
    }

    const files = fs.readdirSync(targetDir);
    console.log(`Found ${files.length} files in target directory.`);
    
    // Show first 10 files as sample
    const sampleFiles = files.slice(0, 10);
    console.log('Sample files:');
    sampleFiles.forEach(file => console.log(`  - ${file}`));
    
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more files`);
    }
    
    return true;
  } catch (error) {
    console.error('Verification failed:', error.message);
    return false;
  }
};

// Main execution
const main = () => {
  console.log('Starting file migration...');
  console.log('');
  
  migrateFiles();
  
  console.log('');
  verifyMigration();
  
  console.log('');
  console.log('Migration process completed.');
};

// Run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateFiles, verifyMigration };