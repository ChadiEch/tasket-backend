const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { taskAttachmentUpload, compressUploadedFiles } = require('../middleware/upload'); // Use shared upload middleware
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new employee
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('position').optional().trim()
], register);

// @route   POST /api/auth/login
// @desc    Login employee
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], login);

// @route   GET /api/auth/profile
// @desc    Get current employee profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update current employee profile
// @access  Private
router.put('/profile', 
  auth,
  taskAttachmentUpload.single('photo'), // Use shared upload middleware
  compressUploadedFiles, // Add compression middleware
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('position').optional().trim(),
    body('phone').optional().trim(),
    body('job_description').optional().trim(),
    body('photo').optional().trim()
  ], 
  updateProfile
);

module.exports = router;