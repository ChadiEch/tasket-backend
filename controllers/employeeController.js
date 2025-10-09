const { validationResult } = require('express-validator');
const { Employee, Department, Task } = require('../models');
const { Op } = require('sequelize');

const getEmployees = async (req, res) => {
  try {
    const { department_id, role, is_active } = req.query;
    const where = {};

    if (department_id) where.department_id = department_id;
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const employees = await Employee.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }],
      order: [['name', 'ASC']]
    });

    res.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get task statistics
    const taskStats = await Task.findAll({
      where: { assigned_to: id },
      attributes: [
        'status',
        [Task.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.json({ 
      employee,
      taskStats: taskStats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to delete old photo file (similar to authController)
const deleteOldPhoto = (oldPhotoPath) => {
  try {
    // Only delete if the path is a local upload path and not an external URL
    if (oldPhotoPath && typeof oldPhotoPath === 'string' && oldPhotoPath.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      
      // Extract just the filename to prevent path traversal attacks
      const filename = path.basename(oldPhotoPath);
      const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'persistent_uploads');
      const fullPath = path.join(uploadsDir, filename);
      
      // Additional safety check: ensure the file exists and is in the uploads directory
      if (fs.existsSync(fullPath) && fullPath.startsWith(path.resolve(uploadsDir))) {
        // Only delete image files (jpg, jpeg, png, gif)
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const fileExtension = path.extname(fullPath).toLowerCase();
        
        if (allowedExtensions.includes(fileExtension)) {
          fs.unlinkSync(fullPath);
          console.log('Successfully deleted old photo:', fullPath);
        } else {
          console.log('Skipped deletion of non-image file:', fullPath);
        }
      } else {
        console.log('Skipped deletion - file not in uploads directory or does not exist:', fullPath);
      }
    } else {
      console.log('Skipped deletion - not a local upload path:', oldPhotoPath);
    }
  } catch (error) {
    console.error('Error in deleteOldPhoto function:', error);
  }
};

const createEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Handle employee data - either from body or parsed from form data
    let employeeData = {};
    if (req.body.data) {
      // If data is sent as JSON string in form data
      employeeData = JSON.parse(req.body.data);
    } else {
      // If data is sent as regular form fields
      employeeData = req.body;
    }

    const {
      email,
      password,
      name,
      position,
      job_description, // Add job description field
      department_id,
      role,
      phone,
      hire_date,
      salary,
      photo // Add photo field
    } = employeeData;

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ where: { email } });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee already exists with this email' });
    }

    // Ensure salary is properly formatted if provided
    const formattedSalary = salary ? parseFloat(salary) : null;

    // Prepare create data
    const createData = {
      email,
      password,
      name,
      position,
      job_description, // Add job description field
      department_id,
      role: role || 'employee',
      phone,
      hire_date,
      salary: formattedSalary
    };

    // Handle photo upload
    if (req.file) {
      const photoPath = `/uploads/${req.file.filename}`;
      createData.photo = photoPath;
    } else if (photo) {
      // If photo is provided as a string (existing photo URL)
      createData.photo = photo;
    }

    const employee = await Employee.create(createData);

    const employeeWithDept = await Employee.findByPk(employee.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }]
    });

    // Emit WebSocket event for real-time updates
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      // Create a notification for employee creation
      const notification = {
        type: 'employee_created',
        title: 'New Employee Added',
        message: `${employeeWithDept.name} has been added to the team`,
        data: employeeWithDept
      };
      
      // Broadcast to department room
      if (employeeWithDept.department_id) {
        websocketService.broadcastNotification(employeeWithDept.department_id, notification);
      }
      
      // Send direct notification to all users
      websocketService.broadcastNotification('all', notification);
    }

    res.status(201).json({
      message: 'Employee created successfully',
      employee: employeeWithDept
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    
    // Handle employee data - either from body or parsed from form data
    let employeeData = {};
    if (req.body.data) {
      // If data is sent as JSON string in form data
      employeeData = JSON.parse(req.body.data);
    } else {
      // If data is sent as regular form fields
      employeeData = req.body;
    }

    const {
      name,
      position,
      job_description,
      department_id,
      role,
      phone,
      hire_date,
      salary,
      is_active,
      photo,
      email, // Add email field
      password // Add password field
    } = employeeData;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Ensure salary is properly formatted if provided
    const formattedSalary = salary !== undefined ? (salary ? parseFloat(salary) : null) : undefined;

    // Prepare update data
    const updateData = {};
    
    // Only include fields that are actually provided in the request
    if (name !== undefined) updateData.name = name;
    if (position !== undefined) updateData.position = position;
    if (job_description !== undefined) updateData.job_description = job_description;
    if (department_id !== undefined) updateData.department_id = department_id;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (hire_date !== undefined) updateData.hire_date = hire_date;
    if (formattedSalary !== undefined) updateData.salary = formattedSalary;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingEmployee = await Employee.findOne({ 
        where: { email, id: { [require('sequelize').Op.ne]: id } }
      });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email;
    }
    if (password !== undefined && password.trim() !== '') {
      updateData.password = password; // Will be hashed by the model hook
    }
    
    // Handle photo upload
    if (req.file) {
      const photoPath = `/uploads/${req.file.filename}`;
      // Delete old photo if exists
      if (employee.photo) {
        deleteOldPhoto(employee.photo);
      }
      updateData.photo = photoPath;
    } else if (photo !== undefined) {
      // If photo is provided as a string (existing photo URL or null)
      updateData.photo = photo;
    }

    await employee.update(updateData);

    const updatedEmployee = await Employee.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }]
    });

    // Emit WebSocket event for real-time updates
    const websocketService = req.app.get('websocketService');
    if (websocketService) {
      // Create a notification for employee updates
      const notification = {
        type: 'employee_updated',
        title: 'Employee Updated',
        message: `${updatedEmployee.name} profile has been updated`,
        data: updatedEmployee
      };
      
      // Broadcast to department room
      if (updatedEmployee.department_id) {
        websocketService.broadcastNotification(updatedEmployee.department_id, notification);
      }
      
      // Send direct notification to the employee
      websocketService.broadcastNotification(updatedEmployee.id, notification);
      
      // Also broadcast to all connected users to ensure global updates
      websocketService.broadcastNotification('all', notification);
    }

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if employee has assigned tasks
    const taskCount = await Task.count({ where: { assigned_to: id } });
    if (taskCount > 0) {
      // Deactivate instead of delete
      await employee.update({ is_active: false });
      
      // Emit WebSocket event for real-time updates
      const websocketService = req.app.get('websocketService');
      if (websocketService) {
        // Create a notification for employee deactivation
        const notification = {
          type: 'employee_deactivated',
          title: 'Employee Deactivated',
          message: `${employee.name} has been deactivated`,
          data: { id: employee.id, is_active: false }
        };
        
        // Broadcast to department room
        if (employee.department_id) {
          websocketService.broadcastNotification(employee.department_id, notification);
        }
        
        // Send direct notification to the employee
        websocketService.broadcastNotification(employee.id, notification);
        
        // Also broadcast to all connected users to ensure global updates
        websocketService.broadcastNotification('all', notification);
      }
      
      res.json({ message: 'Employee deactivated successfully' });
    } else {
      await employee.destroy();
      
      // Emit WebSocket event for real-time updates
      const websocketService = req.app.get('websocketService');
      if (websocketService) {
        // Create a notification for employee deletion
        const notification = {
          type: 'employee_deleted',
          title: 'Employee Deleted',
          message: `${employee.name} has been removed from the team`,
          data: { id: employee.id }
        };
        
        // Broadcast to department room
        if (employee.department_id) {
          websocketService.broadcastNotification(employee.department_id, notification);
        }
        
        // Send direct notification to the employee
        websocketService.broadcastNotification(employee.id, notification);
        
        // Also broadcast to all connected users to ensure global updates
        websocketService.broadcastNotification('all', notification);
      }
      
      res.json({ message: 'Employee deleted successfully' });
    }
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
};