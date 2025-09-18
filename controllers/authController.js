const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { Employee, Department } = require('../models');
const fs = require('fs');
const path = require('path');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, position, department_id, phone } = req.body;

    // Check if user already exists
    const existingEmployee = await Employee.findOne({ where: { email } });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee already exists with this email' });
    }

    // Create employee
    const employee = await Employee.create({
      email,
      password,
      name,
      position,
      department_id,
      phone,
      role: 'employee'
    });

    // Generate token
    const token = generateToken(employee.id);

    // Get employee with department info
    const employeeWithDept = await Employee.findByPk(employee.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }]
    });

    res.status(201).json({
      message: 'Employee registered successfully',
      token,
      employee: employeeWithDept
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find employee
    const employee = await Employee.findOne({ 
      where: { email, is_active: true },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }]
    });

    if (!employee) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await employee.checkPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(employee.id);

    // Remove password from response
    const { password: _, ...employeeData } = employee.toJSON();

    res.json({
      message: 'Login successful',
      token,
      employee: employeeData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getProfile = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }]
    });

    res.json({ employee });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to delete old photo file
const deleteOldPhoto = (oldPhotoPath) => {
  try {
    // Only delete if the path is a local upload path and not an external URL
    if (oldPhotoPath && typeof oldPhotoPath === 'string' && oldPhotoPath.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      
      // Extract just the filename to prevent path traversal attacks
      const filename = path.basename(oldPhotoPath);
      const fullPath = path.join(__dirname, '..', 'uploads', filename);
      
      // Additional safety check: ensure the file exists and is in the uploads directory
      if (fs.existsSync(fullPath) && fullPath.startsWith(path.resolve(__dirname, '..', 'uploads'))) {
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

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Handle profile data - either from body or parsed from form data
    let profileData = {};
    if (req.body.data) {
      // If data is sent as JSON string in form data
      profileData = JSON.parse(req.body.data);
    } else {
      // If data is sent as regular form fields
      profileData = req.body;
    }

    const { name, position, phone, email, password, job_description } = profileData;
    const userId = req.user.id;
    
    // Get current employee data to check for existing photo
    const currentEmployee = await Employee.findByPk(userId);
    
    // Prepare update data
    const updateData = {};

    // Both admins and regular employees should be able to update all their profile fields
    if (name !== undefined) updateData.name = name;
    if (position !== undefined) updateData.position = position;
    if (phone !== undefined) updateData.phone = phone;
    if (job_description !== undefined) updateData.job_description = job_description;
    
    // Handle email updates for all users
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingEmployee = await Employee.findOne({ 
        where: { email, id: { [require('sequelize').Op.ne]: userId } }
      });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email;
    }
    
    // Handle password updates for all users
    if (password !== undefined && password.trim() !== '') {
      updateData.password = password; // Will be hashed by the model hook
    }
    
    // Handle photo upload for all users
    if (req.file) {
      const photoPath = `/uploads/${req.file.filename}`;
      // Delete old photo if exists
      if (currentEmployee.photo) {
        deleteOldPhoto(currentEmployee.photo);
      }
      updateData.photo = photoPath;
    }
    
    // Only update if there's data to update
    if (Object.keys(updateData).length > 0) {
      await Employee.update(
        updateData,
        { where: { id: userId } }
      );
    }

    const updatedEmployee = await Employee.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }]
    });

    res.json({
      message: 'Profile updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};