const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getMeistertaskProjects,
  getMeistertaskProject,
  getMeistertaskProjectTasks,
  createMeistertaskProject,
  updateMeistertaskProject,
  deleteMeistertaskProject
} = require('../controllers/meistertaskProjectController');

const router = express.Router();

// @route   GET /api/meistertask-projects
// @desc    Get all Meistertask projects
// @access  Private (All users)
router.get('/', auth, getMeistertaskProjects);

// @route   GET /api/meistertask-projects/:id
// @desc    Get Meistertask project by ID
// @access  Private (All users)
router.get('/:id', auth, getMeistertaskProject);

// @route   GET /api/meistertask-projects/:id/tasks
// @desc    Get tasks for a Meistertask project
// @access  Private (All users)
router.get('/:id/tasks', auth, getMeistertaskProjectTasks);

// @route   POST /api/meistertask-projects
// @desc    Create a new Meistertask project
// @access  Private (Admin only)
router.post('/', auth, createMeistertaskProject);

// @route   PUT /api/meistertask-projects/:id
// @desc    Update a Meistertask project
// @access  Private (Admin only)
router.put('/:id', auth, updateMeistertaskProject);

// @route   DELETE /api/meistertask-projects/:id
// @desc    Delete a Meistertask project
// @access  Private (Admin only)
router.delete('/:id', auth, deleteMeistertaskProject);

module.exports = router;