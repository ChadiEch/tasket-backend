const { validationResult } = require('express-validator');
const { Department, Employee } = require('../models');

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'name', 'position', 'email']
        },
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'name', 'position', 'email']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: ['id', 'name', 'position', 'email', 'phone', 'hire_date']
        },
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'name', 'position', 'email']
        }
      ]
    });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ department });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, manager_id, budget } = req.body;

    const department = await Department.create({
      name,
      description,
      manager_id,
      budget
    });

    const departmentWithDetails = await Department.findByPk(department.id, {
      include: [
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'name', 'position', 'email']
        }
      ]
    });

    res.status(201).json({
      message: 'Department created successfully',
      department: departmentWithDetails
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, manager_id, budget } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await department.update({
      name,
      description,
      manager_id,
      budget
    });

    const updatedDepartment = await Department.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'manager',
          attributes: ['id', 'name', 'position', 'email']
        }
      ]
    });

    res.json({
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has employees
    const employeeCount = await Employee.count({ where: { department_id: id } });
    if (employeeCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department with assigned employees' 
      });
    }

    await department.destroy();

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
};