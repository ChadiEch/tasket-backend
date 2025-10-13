const { Task, Employee, Department, TaskComment } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('./notificationController');
const { deleteFromR2 } = require('../middleware/cloudflareR2Upload'); // Import R2 delete function

// Check if we should use Cloudflare R2
const USE_CLOUDFLARE_R2 = process.env.USE_CLOUDFLARE_R2 === 'true';

console.log('Task controller configuration:');
console.log('  USE_CLOUDFLARE_R2:', USE_CLOUDFLARE_R2);

// Helper function to delete old attachment files
const deleteOldAttachment = (oldAttachmentPath) => {
  try {
    // Only delete if the path is a local upload path and not an external URL
    if (oldAttachmentPath && typeof oldAttachmentPath === 'string' && oldAttachmentPath.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      
      // Extract just the filename to prevent path traversal attacks
      const filename = path.basename(oldAttachmentPath);
      const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
      const fullPath = path.join(uploadsDir, filename);
      
      // Additional safety check: ensure the file exists and is in the uploads directory
      if (fs.existsSync(fullPath) && fullPath.startsWith(path.resolve(uploadsDir))) {
        fs.unlinkSync(fullPath);
        console.log('Successfully deleted old attachment:', fullPath);
      } else {
        console.log('Skipped deletion - file not in uploads directory or does not exist:', fullPath);
      }
    } else {
      console.log('Skipped deletion - not a local upload path:', oldAttachmentPath);
    }
  } catch (error) {
    console.error('Error in deleteOldAttachment function:', error);
  }
};

const getTasks = async (req, res) => {
  try {
    const { status, priority, assigned_to, department_id, start_date, end_date } = req.query;
    const where = {};

    // If not admin, only show tasks assigned to user or created by user
    if (req.user.role !== 'admin') {
      where[Op.or] = [
        { assigned_to: req.user.id },
        { created_by: req.user.id }
      ];
    }

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_to) where.assigned_to = assigned_to;
    if (department_id) where.department_id = department_id;
    
    if (start_date && end_date) {
      where.due_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const tasks = await Task.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'assignedToEmployee',
          attributes: ['id', 'name', 'email', 'position']
        },
        {
          model: Employee,
          as: 'createdByEmployee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'assignedToEmployee',
          attributes: ['id', 'name', 'email', 'position']
        },
        {
          model: Employee,
          as: 'createdByEmployee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: TaskComment,
          as: 'comments',
          include: [{
            model: Employee,
            as: 'employee',
            attributes: ['id', 'name']
          }],
          order: [['created_at', 'ASC']]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    if (req.user.role !== 'admin' && 
        task.assigned_to !== req.user.id && 
        task.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createTask = async (req, res) => {
  try {
    console.log('Create task request received');
    console.log('Request files:', req.files);
    console.log('Request body:', req.body);
    
    // Handle task data - either from body or parsed from form data
    let taskData = {};
    if (req.body.data) {
      // If data is sent as JSON string in form data
      try {
        taskData = JSON.parse(req.body.data);
        console.log('Parsed task data from form data:', taskData);
      } catch (parseError) {
        console.error('Error parsing task data:', parseError);
        return res.status(400).json({ message: 'Invalid task data format' });
      }
    } else {
      // If data is sent as regular form fields
      taskData = req.body;
      console.log('Task data from regular form fields:', taskData);
    }

    // Validate required fields
    const { title, estimated_hours } = taskData;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    const parsedEstimatedHours = estimated_hours ? parseFloat(estimated_hours) : null;
    if (parsedEstimatedHours === null || isNaN(parsedEstimatedHours) || parsedEstimatedHours < 0.01) {
      return res.status(400).json({ message: 'Estimated hours is required and must be at least 0.01' });
    }

    const {
      description,
      assigned_to,
      department_id,
      status,
      priority,
      due_date,
      tags,
      attachments, // This will be handled separately
      created_at // Add created_at field
    } = taskData;

    // For admins, allow assignment to any employee or unassigned (null)
    // For non-admins, always assign to the current user
    let assignedToEmployee = req.user.id; // Default to current user
    if (req.user.role === 'admin') {
      // Admin can assign to any employee or leave it unassigned (null)
      assignedToEmployee = assigned_to !== undefined ? assigned_to : req.user.id;
    }

    // Process uploaded files
    let processedAttachments = Array.isArray(attachments) ? attachments : [];
    console.log('Initial attachments:', processedAttachments);
    console.log('Uploaded files:', req.files);
    
    if (req.files && req.files.length > 0) {
      // Add uploaded files to attachments
      const uploadedFiles = req.files.map(file => {
        let type = 'document'; // Default type
        if (file.mimetype.startsWith('image/')) {
          type = 'photo';
        } else if (file.mimetype.startsWith('video/')) {
          type = 'video';
        }
        
        return {
          id: Date.now() + Math.random(), // Generate a temporary ID
          type: type,
          // Use R2 URL if enabled, otherwise use local path
          url: USE_CLOUDFLARE_R2 ? file.r2Url : `/uploads/${file.filename}`,
          name: file.originalname
        };
      });
      
      console.log('Uploaded files processed:', uploadedFiles);
      
      // Filter out placeholder attachments (those with empty URLs)
      // This ensures we only keep valid attachments and replace placeholders with actual uploaded files
      const filteredAttachments = processedAttachments.filter(attachment => attachment && attachment.url);
      console.log('Filtered attachments:', filteredAttachments);
      processedAttachments = [...filteredAttachments, ...uploadedFiles];
      console.log('Final processed attachments:', processedAttachments);
    }

    // Handle start_date for tasks created as in-progress
    let startDate = null;
    if (status === 'in-progress') {
      startDate = new Date();
    }
    
    // Handle completed_date for tasks created as completed
    let completedDate = null;
    let actualHours = null;
    if (status === 'completed') {
      completedDate = new Date();
      // If task is created as completed, we'll calculate actual hours as 0
      // since we don't have a start date
      actualHours = 0;
    }

    // Prepare the final task data
    const finalTaskData = {
      title,
      description,
      assigned_to: assignedToEmployee,
      created_by: req.user.id,
      department_id,
      status: status || 'planned',
      priority: priority || 'medium',
      due_date,
      start_date: startDate, // Add start_date
      completed_date: completedDate, // Add completed_date
      actual_hours: actualHours, // Add actual_hours
      estimated_hours: parsedEstimatedHours,
      tags: Array.isArray(tags) ? tags : [],
      attachments: processedAttachments
    };

    // For admins, allow setting created_at manually
    if (req.user.role === 'admin' && created_at) {
      // Validate that created_at is a valid date
      const createdAtDate = new Date(created_at);
      if (!isNaN(createdAtDate.getTime())) {
        finalTaskData.created_at = createdAtDate;
      } else {
        console.warn('Invalid created_at value provided, using default');
      }
    }

    console.log('Final task data to be created:', finalTaskData);

    const task = await Task.create(finalTaskData);

    const taskWithDetails = await Task.findByPk(task.id, {
      include: [
        {
          model: Employee,
          as: 'assignedToEmployee',
          attributes: ['id', 'name', 'email', 'position']
        },
        {
          model: Employee,
          as: 'createdByEmployee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    // Emit WebSocket event for real-time updates
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.notifyTaskCreated(taskWithDetails, req.user);
    }

    // Send notification if task is assigned to someone other than the creator
    if (assignedToEmployee && assignedToEmployee !== req.user.id) {
      const assignedEmployee = await Employee.findByPk(assignedToEmployee);
      if (assignedEmployee) {
        const notification = await createNotification(
          assignedToEmployee,
          req.user.id,
          'task_assigned',
          'New Task Assigned',
          `You have been assigned task: ${task.title}`,
          task.id,
          null,
          priority || 'medium'
        );
        
        // Send WebSocket notification
        if (websocketService && notification) {
          websocketService.broadcastNotification(assignedToEmployee, {
            id: notification.id,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned task: ${task.title}`,
            data: taskWithDetails,
            priority: priority || 'medium',
            timestamp: notification.created_at
          });
        }
      }
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: taskWithDetails
    });
  } catch (error) {
    console.error('Create task error:', error);
    // Send more detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message,
        stack: error.stack
      });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle task data - either from body or parsed from form data
    let taskData = {};
    if (req.body.data) {
      // If data is sent as JSON string in form data
      try {
        taskData = JSON.parse(req.body.data);
      } catch (parseError) {
        console.error('Error parsing task data:', parseError);
        return res.status(400).json({ message: 'Invalid task data format' });
      }
    } else {
      // If data is sent as regular form fields
      taskData = req.body;
    }

    console.log('Update task request for ID:', id);
    console.log('Task data received:', JSON.stringify(taskData, null, 2));
    console.log('User role:', req.user.role);
    console.log('Created at in request:', taskData.created_at);

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to update this task
    if (req.user.role !== 'admin' && 
        task.assigned_to !== req.user.id && 
        task.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Store previous assigned_to value for comparison
    const previousAssignedTo = task.assigned_to;

    // Prepare update data
    const updateData = {};
    
    // Only include fields that are actually provided in the request
    if (taskData.title !== undefined) updateData.title = taskData.title;
    if (taskData.description !== undefined) updateData.description = taskData.description;
    if (taskData.assigned_to !== undefined) {
      // Only admins can change assignment
      if (req.user.role === 'admin') {
        updateData.assigned_to = taskData.assigned_to;
      } else {
        // Non-admins cannot change assignment
        updateData.assigned_to = task.assigned_to;
      }
    }
    if (taskData.department_id !== undefined) updateData.department_id = taskData.department_id;
    if (taskData.status !== undefined) updateData.status = taskData.status;
    if (taskData.priority !== undefined) updateData.priority = taskData.priority;
    if (taskData.due_date !== undefined) updateData.due_date = taskData.due_date;
    if (taskData.estimated_hours !== undefined) {
      const parsedEstimatedHours = parseFloat(taskData.estimated_hours);
      if (!isNaN(parsedEstimatedHours) && parsedEstimatedHours >= 0.01) {
        // Ensure we preserve decimal precision without rounding
        updateData.estimated_hours = parsedEstimatedHours;
      } else if (parsedEstimatedHours === 0) {
        updateData.estimated_hours = 0.00;
      }
    }
    
    // For admins, allow updating created_at manually
    if (req.user.role === 'admin' && taskData.created_at !== undefined) {
      // Validate that created_at is a valid date
      const createdAtDate = new Date(taskData.created_at);
      if (!isNaN(createdAtDate.getTime())) {
        console.log('Setting created_at to:', createdAtDate);
        updateData.created_at = createdAtDate;
      } else {
        console.warn('Invalid created_at value provided for update, ignoring');
      }
    }
    
    console.log('Update data being sent to database:', JSON.stringify(updateData, null, 2));
    
    await task.update(updateData);
    
    console.log('Task updated successfully. New task data:', JSON.stringify(task, null, 2));

    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'assignedToEmployee',
          attributes: ['id', 'name', 'email', 'position']
        },
        {
          model: Employee,
          as: 'createdByEmployee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    // Emit WebSocket event for real-time updates
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.notifyTaskUpdated(updatedTask, req.user);
    }

    // Send notification if task assignment changed
    if (updateData.assigned_to !== undefined && updateData.assigned_to !== previousAssignedTo) {
      // Notify the newly assigned employee
      if (updateData.assigned_to && updateData.assigned_to !== req.user.id) {
        const assignedEmployee = await Employee.findByPk(updateData.assigned_to);
        if (assignedEmployee) {
          const notification = await createNotification(
            updateData.assigned_to,
            req.user.id,
            'task_assigned',
            'Task Assigned',
            `You have been assigned task: ${updatedTask.title}`,
            updatedTask.id,
            null,
            updatedTask.priority
          );
          
          // Send WebSocket notification
          if (websocketService && notification) {
            websocketService.broadcastNotification(updateData.assigned_to, {
              id: notification.id,
              type: 'task_assigned',
              title: 'Task Assigned',
              message: `You have been assigned task: ${updatedTask.title}`,
              data: updatedTask,
              priority: updatedTask.priority,
              timestamp: notification.created_at
            });
          }
        }
      }
      
      // Notify the previously assigned employee if they're different
      if (previousAssignedTo && previousAssignedTo !== updateData.assigned_to && previousAssignedTo !== req.user.id) {
        const previousEmployee = await Employee.findByPk(previousAssignedTo);
        if (previousEmployee) {
          const notification = await createNotification(
            previousAssignedTo,
            req.user.id,
            'task_unassigned',
            'Task Unassigned',
            `You have been unassigned from task: ${updatedTask.title}`,
            updatedTask.id,
            null,
            updatedTask.priority
          );
          
          // Send WebSocket notification
          if (websocketService && notification) {
            websocketService.broadcastNotification(previousAssignedTo, {
              id: notification.id,
              type: 'task_unassigned',
              title: 'Task Unassigned',
              message: `You have been unassigned from task: ${updatedTask.title}`,
              data: updatedTask,
              priority: updatedTask.priority,
              timestamp: notification.created_at
            });
          }
        }
      }
    }

    // Send notification if task status changed
    if (updateData.status !== undefined && updateData.status !== task.status) {
      // Notify the assigned employee about status change
      if (updatedTask.assigned_to && updatedTask.assigned_to !== req.user.id) {
        const assignedEmployee = await Employee.findByPk(updatedTask.assigned_to);
        if (assignedEmployee) {
          const notification = await createNotification(
            updatedTask.assigned_to,
            req.user.id,
            'task_status_changed',
            'Task Status Updated',
            `Task "${updatedTask.title}" status changed to: ${updatedTask.status}`,
            updatedTask.id,
            null,
            updatedTask.priority
          );
          
          // Send WebSocket notification
          if (websocketService && notification) {
            websocketService.broadcastNotification(updatedTask.assigned_to, {
              id: notification.id,
              type: 'task_status_changed',
              title: 'Task Status Updated',
              message: `Task "${updatedTask.title}" status changed to: ${updatedTask.status}`,
              data: updatedTask,
              priority: updatedTask.priority,
              timestamp: notification.created_at
            });
          }
        }
      }
      
      // Also notify the task creator if they're different from the assigned employee
      if (updatedTask.created_by && 
          updatedTask.created_by !== updatedTask.assigned_to && 
          updatedTask.created_by !== req.user.id) {
        const creatorEmployee = await Employee.findByPk(updatedTask.created_by);
        if (creatorEmployee) {
          const notification = await createNotification(
            updatedTask.created_by,
            req.user.id,
            'task_status_changed',
            'Task Status Updated',
            `Task "${updatedTask.title}" status changed to: ${updatedTask.status}`,
            updatedTask.id,
            null,
            updatedTask.priority
          );
          
          // Send WebSocket notification
          if (websocketService && notification) {
            websocketService.broadcastNotification(updatedTask.created_by, {
              id: notification.id,
              type: 'task_status_changed',
              title: 'Task Status Updated',
              message: `Task "${updatedTask.title}" status changed to: ${updatedTask.status}`,
              data: updatedTask,
              priority: updatedTask.priority,
              timestamp: notification.created_at
            });
          }
        }
      }
    }

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    // Send more detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message,
        stack: error.stack
      });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.query; // 'delete' or 'trash'

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to delete this task
    if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (action === 'trash') {
      // Move task to trash and save the previous status
      await task.update({
        status: 'trashed',
        status_before_trash: task.status,
        trashed_at: new Date()
      });

      // Emit WebSocket event for real-time updates
      const websocketService = req.app.get('websocketService');
      if (websocketService) {
        websocketService.notifyTaskUpdated(task, req.user);
      }

      return res.json({ message: 'Task moved to trash successfully' });
    } else {
      // Permanently delete task and its attachments
      // First, delete associated files from the file system
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
                console.log(`Successfully deleted file from Cloudflare R2: ${filename}`);
              } else if (attachment.url.startsWith('/uploads/')) {
                // Delete from local storage
                console.log(`Deleting file from local storage: ${attachment.url}`);
                const fs = require('fs');
                const path = require('path');
                
                // Extract filename from URL
                const filename = path.basename(attachment.url);
                const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
                const filePath = path.join(uploadsDir, filename);
                
                // Check if file exists and delete it
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`Deleted attachment file: ${filePath}`);
                } else {
                  console.log(`Attachment file not found: ${filePath}`);
                }
              } else {
                console.log(`Skipping deletion of external file: ${attachment.url}`);
              }
            } catch (error) {
              console.error(`Error deleting attachment file ${attachment.url}:`, error);
              // Continue with other deletions even if one fails
            }
          }
        }
      }

      // Delete the task from database
      await task.destroy();

      // Emit WebSocket event for real-time updates
      const websocketService = req.app.get('websocketService');
      if (websocketService) {
        websocketService.notifyTaskDeleted(id, task.department_id, req.user);
      }

      return res.json({ message: 'Task deleted permanently successfully' });
    }
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New function to restore task from trash
const restoreTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task is in trash
    if (task.status !== 'trashed') {
      return res.status(400).json({ message: 'Task is not in trash' });
    }

    // Check if user has permission to restore this task
    if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Restore task to its previous status or default to 'planned'
    // Preserve the assigned_to field when restoring
    const previousStatus = task.status_before_trash || 'planned';
    
    await task.update({
      status: previousStatus,
      restored_at: new Date(),
      trashed_at: null
    });

    // Get the updated task with all associated data
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'assignedToEmployee',
          attributes: ['id', 'name', 'email', 'position']
        },
        {
          model: Employee,
          as: 'createdByEmployee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    // Emit WebSocket event for real-time updates
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.notifyTaskUpdated(updatedTask, req.user);
    }

    res.json({ 
      message: 'Task restored successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Restore task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New function to permanently delete trashed tasks
const permanentlyDeleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task is in trash
    if (task.status !== 'trashed') {
      return res.status(400).json({ message: 'Task is not in trash' });
    }

    // Check if user has permission to delete this task
    if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

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
              console.log(`Successfully deleted file from Cloudflare R2: ${filename}`);
            } else if (attachment.url.startsWith('/uploads/')) {
              // Delete from local storage
              console.log(`Deleting file from local storage: ${attachment.url}`);
              const fs = require('fs');
              const path = require('path');
              
              // Extract filename from URL
              const filename = path.basename(attachment.url);
              const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
              const filePath = path.join(uploadsDir, filename);
              
              // Check if file exists and delete it
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted attachment file: ${filePath}`);
              } else {
                console.log(`Attachment file not found: ${filePath}`);
              }
            } else {
              console.log(`Skipping deletion of external file: ${attachment.url}`);
            }
          } catch (error) {
            console.error(`Error deleting attachment file ${attachment.url}:`, error);
            // Continue with other deletions even if one fails
          }
        }
      }
    }

    // Delete the task from database
    await task.destroy();

    // Emit WebSocket event for real-time updates
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      websocketService.notifyTaskDeleted(id, task.department_id, req.user);
    }

    res.json({ message: 'Task permanently deleted successfully' });
  } catch (error) {
    console.error('Permanently delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New function to get trashed tasks
const getTrashedTasks = async (req, res) => {
  try {
    const where = {
      status: 'trashed'
    };

    // Only show trashed tasks created by the current user
    // Both admins and regular users should only see their own trashed tasks
    where.created_by = req.user.id;

    const tasks = await Task.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'assignedToEmployee',
          attributes: ['id', 'name', 'email', 'position']
        },
        {
          model: Employee,
          as: 'createdByEmployee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      order: [['trashed_at', 'DESC']]
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get trashed tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
  permanentlyDeleteTask,
  getTrashedTasks
};