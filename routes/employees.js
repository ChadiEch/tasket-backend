const express = require('express');
const { body } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const { taskAttachmentUpload, compressUploadedFiles } = require('../middleware/upload'); // Use shared upload middleware
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private
router.get('/', auth, getEmployees);

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/:id', auth, getEmployee);

// @route   POST /api/employees
// @desc    Create a new employee
// @access  Admin
router.post('/', 
  adminAuth,
  taskAttachmentUpload.single('photo'), // Use shared upload middleware
  compressUploadedFiles, // Add compression middleware
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 2 }),
    body('position').optional().trim(),
    body('job_description').optional().trim(), // Add validation for job description field
    body('department_id').optional().isUUID(),
    body('role').optional().isIn(['admin', 'manager', 'employee']),
    body('phone').optional().trim(),
    body('hire_date').optional().isISO8601(),
    body('salary').optional().isDecimal(),
    body('photo').optional().trim() // Add validation for photo field
  ], 
  createEmployee
);

// @route   PUT /api/employees/:id
// @desc    Update an employee
// @access  Admin
router.put('/:id', 
  adminAuth,
  taskAttachmentUpload.single('photo'), // Use shared upload middleware
  compressUploadedFiles, // Add compression middleware
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('position').optional().trim(),
    body('job_description').optional().trim(), // Add validation for job description field
    body('department_id').optional().isUUID(),
    body('role').optional().isIn(['admin', 'manager', 'employee']),
    body('phone').optional().trim(),
    body('hire_date').optional().isISO8601(),
    body('salary').optional().isDecimal(),
    body('is_active').optional().isBoolean(),
    body('photo').optional().trim() // Add validation for photo field
  ], 
  updateEmployee
);

// @route   DELETE /api/employees/:id
// @desc    Delete an employee
// @access  Admin
router.delete('/:id', adminAuth, deleteEmployee);

module.exports = router;