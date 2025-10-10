const express = require('express');
const { body } = require('express-validator');
const validator = require('validator');
const { auth } = require('../middleware/auth');
const { taskAttachmentUpload, compressUploadedFiles } = require('../middleware/upload'); // Add upload middleware

// Check if we should use Cloudflare R2
const USE_CLOUDFLARE_R2 = process.env.USE_CLOUDFLARE_R2 === 'true';
let uploadMiddleware = [auth, taskAttachmentUpload.array('attachments', 20), compressUploadedFiles];

// If using Cloudflare R2, add the R2 upload middleware
if (USE_CLOUDFLARE_R2) {
  const { uploadToR2Middleware } = require('../middleware/cloudflareR2Upload');
  // Replace the compressUploadedFiles middleware with uploadToR2Middleware
  uploadMiddleware = [auth, taskAttachmentUpload.array('attachments', 20), uploadToR2Middleware];
}

const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
  permanentlyDeleteTask,
  getTrashedTasks
} = require('../controllers/taskController');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get all tasks (filtered by user role)
// @access  Private
router.get('/', auth, getTasks);

// @route   GET /api/tasks/trashed
// @desc    Get all trashed tasks
// @access  Private
router.get('/trashed', auth, getTrashedTasks);

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', auth, getTask);

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', uploadMiddleware, (req, res, next) => {
  // Add error handling for multer errors
  if (req.files && req.files.length > 20) {
    return res.status(400).json({ message: 'Too many files uploaded. Maximum is 20 attachments per task.' });
  }
  next();
}, createTask);

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', uploadMiddleware, (req, res, next) => {
  // Add error handling for multer errors
  if (req.files && req.files.length > 30) {
    return res.status(400).json({ message: 'Too many files uploaded. Maximum is 30 attachments per task.' });
  }
  next();
}, updateTask);

// @route   PUT /api/tasks/:id/restore
// @desc    Restore a trashed task
// @access  Private
router.put('/:id/restore', auth, restoreTask);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task (move to trash or permanent delete)
// @access  Private
router.delete('/:id', auth, deleteTask);

// @route   DELETE /api/tasks/:id/permanent
// @desc    Permanently delete a trashed task
// @access  Private
router.delete('/:id/permanent', auth, permanentlyDeleteTask);

module.exports = router;