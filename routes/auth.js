const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024 // 150MB limit
  }
});

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
  upload.single('photo'),
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