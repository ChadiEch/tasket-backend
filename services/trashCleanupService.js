// Scheduled task to automatically delete trashed tasks after 30 days
const cron = require('node-cron');
const { Task } = require('../models');
const { Op } = require('sequelize');
const { deleteFromR2 } = require('../middleware/cloudflareR2Upload'); // Import R2 delete function

// Check if we should use Cloudflare R2
const USE_CLOUDFLARE_R2 = process.env.USE_CLOUDFLARE_R2 === 'true';

console.log('Trash cleanup service configuration:');
console.log('  USE_CLOUDFLARE_R2:', USE_CLOUDFLARE_R2);

// Function to permanently delete trashed tasks older than 30 days
const deleteOldTrashedTasks = async () => {
  try {
    console.log('Running scheduled task: Delete old trashed tasks');
    
    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find trashed tasks older than 30 days
    const oldTrashedTasks = await Task.findAll({
      where: {
        status: 'trashed',
        trashed_at: {
          [Op.lt]: thirtyDaysAgo
        }
      }
    });
    
    console.log(`Found ${oldTrashedTasks.length} trashed tasks older than 30 days`);
    
    // Delete each task and its attachments
    for (const task of oldTrashedTasks) {
      try {
        // Delete associated files from the file system
        if (task.attachments && Array.isArray(task.attachments)) {
          for (const attachment of task.attachments) {
            if (attachment.url) {
              try {
                if (USE_CLOUDFLARE_R2 && attachment.url.includes('r2.cloudflarestorage.com')) {
                  // Delete from Cloudflare R2
                  console.log(`Deleting file from Cloudflare R2: ${attachment.url}`);
                  const urlParts = attachment.url.split('/');
                  const filename = urlParts[urlParts.length - 1];
                  await deleteFromR2(filename);
                } else if (attachment.url.startsWith('/uploads/')) {
                  // Delete from local storage
                  console.log(`Deleting file from local storage: ${attachment.url}`);
                  const fs = require('fs');
                  const path = require('path');
                  
                  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
                  const filename = path.basename(attachment.url);
                  const filePath = path.join(uploadsDir, filename);
                  
                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old attachment file: ${filePath}`);
                  } else {
                    console.log(`Old attachment file not found: ${filePath}`);
                  }
                } else {
                  console.log(`Skipping deletion of external file: ${attachment.url}`);
                }
              } catch (error) {
                console.error('Error deleting old attachment file:', error);
              }
            }
          }
        }
        
        // Delete the task from database
        await task.destroy();
        console.log(`Permanently deleted trashed task: ${task.id}`);
      } catch (error) {
        console.error(`Error deleting trashed task ${task.id}:`, error);
      }
    }
    
    console.log('Completed scheduled task: Delete old trashed tasks');
  } catch (error) {
    console.error('Error in scheduled task to delete old trashed tasks:', error);
  }
};

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', deleteOldTrashedTasks);

module.exports = {
  deleteOldTrashedTasks
};