import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import * as userModel from '../models/userModel.js';
import { sendWelcomeEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';

// Get all users in company
export const getUsers = async (req, res) => {
  const { role, is_active } = req.query;
  
  const filters = {};
  if (role) filters.role = role;
  if (is_active !== undefined) filters.is_active = is_active === 'true';

  const users = await userModel.getUsersByCompany(req.user.company_id, filters);

  res.json({
    success: true,
    data: users
  });
};

// Get user by ID
export const getUserById = async (req, res) => {
  const user = await userModel.findUserById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user belongs to same company
  if (user.company_id !== req.user.company_id) {
    throw new AppError('Access denied', 403);
  }

  res.json({
    success: true,
    data: user
  });
};

// Create user (Admin only)
export const createUser = async (req, res) => {
  const { email, password, name, role, manager_id, is_manager_approver } = req.body;

  // Check if email already exists
  const existingUser = await userModel.findUserByEmail(email);
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // Use provided password or generate temporary one
  const userPassword = password || crypto.randomBytes(8).toString('hex');

  // Create user
  const user = await userModel.createUser({
    company_id: req.user.company_id,
    email,
    password: userPassword,
    name,
    role,
    manager_id: manager_id || null,
    is_manager_approver: is_manager_approver || false
  });

  // Send welcome email with password
  sendWelcomeEmail(user, userPassword).catch(err => 
    logger.error('Failed to send welcome email:', err)
  );

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user
  });
};

// Update user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, role, manager_id, is_manager_approver, is_active } = req.body;

  // Check if user exists and belongs to same company
  const existingUser = await userModel.findUserById(id);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  if (existingUser.company_id !== req.user.company_id) {
    throw new AppError('Access denied', 403);
  }

  // Prepare updates
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (manager_id !== undefined) updates.manager_id = manager_id;
  if (is_manager_approver !== undefined) updates.is_manager_approver = is_manager_approver;
  if (is_active !== undefined) updates.is_active = is_active;

  const updatedUser = await userModel.updateUser(id, updates);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser
  });
};

// Delete user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  // Check if user exists and belongs to same company
  const existingUser = await userModel.findUserById(id);
  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  if (existingUser.company_id !== req.user.company_id) {
    throw new AppError('Access denied', 403);
  }

  // Prevent deleting self
  if (id === req.user.id) {
    throw new AppError('Cannot delete your own account', 400);
  }

  await userModel.deleteUser(id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
};

// Get managers (for dropdown)
export const getManagers = async (req, res) => {
  const managers = await userModel.getUsersByCompany(req.user.company_id, { 
    role: 'manager',
    is_active: true 
  });

  res.json({
    success: true,
    data: managers
  });
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getManagers
};
