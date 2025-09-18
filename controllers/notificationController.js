const { Notification, Employee, Task } = require('../models');
const { Op } = require('sequelize');

const getNotifications = async (req, res) => {
  try {
    const { limit = 20, offset = 0, is_read, type } = req.query;
    
    const where = {
      recipient_id: req.user.id
    };
    
    if (is_read !== undefined) {
      where.is_read = is_read === 'true';
    }
    
    if (type) {
      where.type = type;
    }
    
    const notifications = await Notification.findAll({
      where,
      include: [
        {
          model: Employee,
          as: 'sender',
          attributes: ['id', 'name']
        },
        {
          model: Task,
          as: 'relatedTask',
          attributes: ['id', 'title']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Get total count for pagination
    const totalCount = await Notification.count({ where });
    
    res.json({ 
      notifications,
      totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      where: {
        id,
        recipient_id: req.user.id
      }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    await notification.update({
      is_read: true,
      read_at: new Date()
    });
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const [updatedRows] = await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          recipient_id: req.user.id,
          is_read: false
        }
      }
    );
    
    res.json({ 
      message: `Marked ${updatedRows} notification${updatedRows !== 1 ? 's' : ''} as read`,
      updatedCount: updatedRows
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      where: {
        id,
        recipient_id: req.user.id
      }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    await notification.destroy();
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to create a notification
const createNotification = async (recipientId, senderId, type, title, message, relatedTaskId = null, relatedProjectId = null, priority = 'medium') => {
  try {
    // Don't create notifications for the sender themselves
    if (recipientId === senderId) {
      return null;
    }
    
    const notification = await Notification.create({
      recipient_id: recipientId,
      sender_id: senderId,
      type,
      title,
      message,
      related_task_id: relatedTaskId,
      related_project_id: relatedProjectId,
      priority
    });
    
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
};