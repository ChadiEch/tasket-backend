const { Project, Task, Employee, Department } = require('../models');
const { Op } = require('sequelize');

const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // For all users, only show projects they created
    const whereClause = {
      created_by: userId
    };

    const projects = await Project.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if the project was created by the user
    const project = await Project.findOne({
      where: {
        id: id,
        created_by: userId
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProjectTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if the project was created by the user
    const project = await Project.findOne({
      where: {
        id: id,
        created_by: userId
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get tasks within the project date range and assigned to the user
    let whereClause = {
      due_date: {
        [Op.between]: [project.start_date, project.end_date]
      },
      assigned_to: userId  // Only show tasks assigned to the logged-in user
    };

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'assignedToEmployee',
          attributes: ['id', 'name', 'email', 'position']
        },
        {
          model: Employee,
          as: 'createdByEmployee',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get project tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createProject = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  try {
    const { title, description, start_date, end_date } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Validate date range
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate > endDate) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }

    const project = await Project.create({
      title,
      description,
      start_date,
      end_date,
      created_by: userId  // Set the creator
    });

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProject = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  try {
    const { id } = req.params;
    const { title, description, start_date, end_date } = req.body;
    const userId = req.user.id;

    // Check if the project was created by the user
    const project = await Project.findOne({
      where: {
        id: id,
        created_by: userId
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Prepare update data
    const updateData = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;

    // Validate date range if both dates are provided
    if (updateData.start_date && updateData.end_date) {
      const startDate = new Date(updateData.start_date);
      const endDate = new Date(updateData.end_date);

      if (startDate > endDate) {
        return res.status(400).json({ message: 'Start date must be before end date' });
      }
    }

    await project.update(updateData);

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProject = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if the project was created by the user
    const project = await Project.findOne({
      where: {
        id: id,
        created_by: userId
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await project.destroy();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProjects,
  getProject,
  getProjectTasks,
  createProject,
  updateProject,
  deleteProject
};