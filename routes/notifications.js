const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// GET /api/notifications - Get user's notifications
router.get('/', getNotifications);

// PUT /api/notifications/:id/read - Mark a notification as read
router.put('/:id/read', markAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', markAllAsRead);

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', deleteNotification);

module.exports = router;