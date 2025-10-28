const { MeistertaskProject, Task, Employee, Department } = require('../models');
const { Op } = require('sequelize');

const getMeistertaskProjects = async (req, res) => {
  try {
    // Show all Meistertask projects to all users
    const projects = await MeistertaskProject.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json({ projects });
  } catch (error) {
    console.error('Get Meistertask projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMeistertaskProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await MeistertaskProject.findOne({
      where: {
        id: id
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Meistertask project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get Meistertask project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMeistertaskProjectTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if the project exists
    const project = await MeistertaskProject.findOne({
      where: {
        id: id
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Meistertask project not found' });
    }

    // Get tasks for this project
    let whereClause = {
      project_id: id
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
    console.error('Get Meistertask project tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createMeistertaskProject = async (req, res) => {
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

    const project = await MeistertaskProject.create({
      title,
      description,
      start_date,
      end_date,
      columns: columns || [], // Set columns if provided, otherwise empty array
      created_by: userId  // Set the creator
    });

    res.status(201).json({
      message: 'Meistertask project created successfully',
      project
    });
  } catch (error) {
    console.error('Create Meistertask project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMeistertaskProject = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, columns } = req.body;

    // Check if the project exists
    const project = await MeistertaskProject.findOne({
      where: {
        id: id
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Meistertask project not found' });
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
      message: 'Meistertask project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update Meistertask project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMeistertaskProject = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }

  try {
    const { id } = req.params;

    // Check if the project exists
    const project = await MeistertaskProject.findOne({
      where: {
        id: id
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Meistertask project not found' });
    }

    await project.destroy();

    res.json({ message: 'Meistertask project deleted successfully' });
  } catch (error) {
    console.error('Delete Meistertask project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMeistertaskProjects,
  getMeistertaskProject,
  getMeistertaskProjectTasks,
  createMeistertaskProject,
  updateMeistertaskProject,
  deleteMeistertaskProject
};