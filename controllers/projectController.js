const { Project, Task, Employee, Department } = require('../models');
const { Op } = require('sequelize');

const getProjects = async (req, res) => {
  try {
    // Show all projects to all users (not just projects they created)
    const projects = await Project.findAll({
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

    // Check if the project exists (no ownership check for viewing)
    const project = await Project.findOne({
      where: {
        id: id
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
    const { startDate, endDate } = req.query; // Optional date range parameters

    // Check if the project exists
    const project = await Project.findOne({
      where: {
        id: id
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Build where clause for tasks
    let whereClause = {
      project_id: id
    };

    // Add date range filtering if provided
    if (startDate && endDate) {
      // Filter tasks by created_at date within the specified range
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      // Default to project date range if no specific range provided
      whereClause.created_at = {
        [Op.between]: [project.start_date, project.end_date]
      };
    }

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
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title']
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
    const { title, description, start_date, end_date, columns } = req.body;
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

    // Validate columns if provided
    if (columns !== undefined) {
      if (!Array.isArray(columns)) {
        return res.status(400).json({ message: 'Columns must be an array' });
      }
      
      // Validate each column
      for (const column of columns) {
        if (!column || typeof column !== 'object') {
          return res.status(400).json({ message: 'Each column must be an object' });
        }
        
        if (!column.id) {
          return res.status(400).json({ message: 'Each column must have an id' });
        }
        
        if (!column.title) {
          return res.status(400).json({ message: 'Each column must have a title' });
        }
      }
    }

    const project = await Project.create({
      title,
      description,
      start_date,
      end_date,
      columns: columns || [], // Set columns if provided, otherwise empty array
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
    const { title, description, start_date, end_date, columns } = req.body;

    // Check if the project exists
    const project = await Project.findOne({
      where: {
        id: id
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
    if (columns !== undefined) {
      // Validate columns if provided
      if (!Array.isArray(columns)) {
        return res.status(400).json({ message: 'Columns must be an array' });
      }
      
      // Validate each column
      for (const column of columns) {
        if (!column || typeof column !== 'object') {
          return res.status(400).json({ message: 'Each column must be an object' });
        }
        
        if (!column.id) {
          return res.status(400).json({ message: 'Each column must have an id' });
        }
        
        if (!column.title) {
          return res.status(400).json({ message: 'Each column must have a title' });
        }
      }
      
      updateData.columns = columns;
    }

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

    // Check if the project exists
    const project = await Project.findOne({
      where: {
        id: id
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