const cron = require('node-cron');
const { Task, Employee, Notification } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('../controllers/notificationController');

class DueDateNotificationService {
  constructor(websocketService) {
    this.websocketService = websocketService;
    this.setupCronJobs();
  }

  setupCronJobs() {
    // Run every day at 9:00 AM to check for upcoming due dates
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily due date check...');
      await this.checkUpcomingDueDates();
    });
    
    // Run every hour to check for urgent due dates (within 24 hours)
    cron.schedule('0 * * * *', async () => {
      console.log('Running hourly urgent due date check...');
      await this.checkUrgentDueDates();
    });
  }

  async checkUpcomingDueDates() {
    try {
      // Find tasks due in 3 days that haven't been completed
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const tasks = await Task.findAll({
        where: {
          due_date: {
            [Op.lte]: threeDaysFromNow,
            [Op.gt]: new Date() // Only future dates
          },
          status: {
            [Op.ne]: 'completed'
          }
        },
        include: [
          {
            model: Employee,
            as: 'assignedToEmployee',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      for (const task of tasks) {
        // Only send notification if assigned to someone
        if (task.assigned_to && task.assignedToEmployee) {
          // Check if we've already sent a notification for this task
          const existingNotification = await this.checkExistingNotification(
            task.assigned_to, 
            task.id, 
            'due_date_reminder'
          );
          
          if (!existingNotification) {
            const daysUntilDue = Math.ceil(
              (new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            
            const notification = await createNotification(
              task.assigned_to,
              null, // System notification
              'due_date_reminder',
              'Task Due Soon',
              `Task "${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
              task.id,
              null,
              task.priority
            );
            
            // Send WebSocket notification
            if (this.websocketService && notification) {
              this.websocketService.broadcastNotification(task.assigned_to, {
                id: notification.id,
                type: 'due_date_reminder',
                title: 'Task Due Soon',
                message: `Task "${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
                data: task,
                priority: task.priority,
                timestamp: notification.created_at
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking upcoming due dates:', error);
    }
  }

  async checkUrgentDueDates() {
    try {
      // Find tasks due within 24 hours that haven't been completed
      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
      
      const tasks = await Task.findAll({
        where: {
          due_date: {
            [Op.lte]: oneDayFromNow,
            [Op.gt]: new Date() // Only future dates
          },
          status: {
            [Op.ne]: 'completed'
          }
        },
        include: [
          {
            model: Employee,
            as: 'assignedToEmployee',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      for (const task of tasks) {
        // Only send notification if assigned to someone
        if (task.assigned_to && task.assignedToEmployee) {
          // Check if we've already sent an urgent notification for this task
          const existingNotification = await this.checkExistingNotification(
            task.assigned_to, 
            task.id, 
            'urgent_due_date_reminder'
          );
          
          if (!existingNotification) {
            const hoursUntilDue = Math.ceil(
              (new Date(task.due_date) - new Date()) / (1000 * 60 * 60)
            );
            
            const notification = await createNotification(
              task.assigned_to,
              null, // System notification
              'urgent_due_date_reminder',
              'Urgent: Task Due Soon',
              `Task "${task.title}" is due in ${hoursUntilDue} hour${hoursUntilDue !== 1 ? 's' : ''}`,
              task.id,
              null,
              task.priority === 'urgent' ? 'urgent' : 'high'
            );
            
            // Send WebSocket notification
            if (this.websocketService && notification) {
              this.websocketService.broadcastNotification(task.assigned_to, {
                id: notification.id,
                type: 'urgent_due_date_reminder',
                title: 'Urgent: Task Due Soon',
                message: `Task "${task.title}" is due in ${hoursUntilDue} hour${hoursUntilDue !== 1 ? 's' : ''}`,
                data: task,
                priority: task.priority === 'urgent' ? 'urgent' : 'high',
                timestamp: notification.created_at
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking urgent due dates:', error);
    }
  }

  async checkExistingNotification(recipientId, taskId, type) {
    // Check if a notification of this type for this task already exists for this user
    const existing = await Notification.findOne({
      where: {
        recipient_id: recipientId,
        related_task_id: taskId,
        type: type,
        is_read: false
      }
    });
    
    return !!existing;
  }
}

module.exports = DueDateNotificationService;