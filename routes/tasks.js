const express = require('express');
const { body } = require('express-validator');
const validator = require('validator');
const { auth } = require('../middleware/auth');
const { taskAttachmentUpload } = require('../middleware/upload'); // Add upload middleware
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask
} = require('../controllers/taskController');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get all tasks (filtered by user role)
// @access  Private
router.get('/', auth, getTasks);

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', auth, getTask);

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', [
  auth,
  taskAttachmentUpload.array('attachments', 30) // Handle up to 10 attachment files
  // Remove validation middleware that conflicts with FormData
], createTask);

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', [
  auth,
  taskAttachmentUpload.array('attachments', 10) // Handle up to 10 attachment files
  // Remove validation middleware that conflicts with FormData
], updateTask);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', auth, deleteTask);

module.exports = router;