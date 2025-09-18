const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getProjects,
  getProject,
  getProjectTasks,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects
// @access  Private (Admin and Employees)
router.get('/', auth, getProjects);

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Private (Admin and Employees)
router.get('/:id', auth, getProject);

// @route   GET /api/projects/:id/tasks
// @desc    Get tasks for a project (within date range)
// @access  Private (Admin and Employees)
router.get('/:id/tasks', auth, getProjectTasks);

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private (Admin only)
router.post('/', auth, createProject);

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private (Admin only)
router.put('/:id', auth, updateProject);

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private (Admin only)
router.delete('/:id', auth, deleteProject);

module.exports = router;