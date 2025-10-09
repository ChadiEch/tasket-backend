// Scheduled task to automatically delete trashed tasks after 30 days
const cron = require('node-cron');
const { Task } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

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
          const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
          
          for (const attachment of task.attachments) {
            if (attachment.url && attachment.url.startsWith('/uploads/')) {
              try {
                const filename = path.basename(attachment.url);
                const filePath = path.join(uploadsDir, filename);
                
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`Deleted old attachment file: ${filePath}`);
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