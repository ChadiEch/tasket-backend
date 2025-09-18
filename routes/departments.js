const express = require('express');
const { body } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private
router.get('/', auth, getDepartments);

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', auth, getDepartment);

// @route   POST /api/departments
// @desc    Create a new department
// @access  Admin
router.post('/', [
  adminAuth,
  body('name').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('manager_id').optional().isUUID(),
  body('budget').optional().isDecimal()
], createDepartment);

// @route   PUT /api/departments/:id
// @desc    Update a department
// @access  Admin
router.put('/:id', [
  adminAuth,
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('manager_id').optional().isUUID(),
  body('budget').optional().isDecimal()
], updateDepartment);

// @route   DELETE /api/departments/:id
// @desc    Delete a department
// @access  Admin
router.delete('/:id', adminAuth, deleteDepartment);

module.exports = router;