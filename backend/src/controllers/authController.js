import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/config.js';
import { AppError } from '../middleware/errorHandler.js';
import * as userModel from '../models/userModel.js';
import * as companyModel from '../models/companyModel.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendLoginAlertEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

// Generate random password
const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Signup - Create company and admin user
export const signup = async (req, res) => {
  const { name, email, password, confirmPassword, companyName, country, currency } = req.body;

  // Validate password match
  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  }

  // Check if user already exists
  const existingUser = await userModel.findUserByEmail(email);
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // Create company
  const company = await companyModel.createCompany({
    name: companyName,
    currency,
    country
  });

  // Create default categories for the company
  await companyModel.createDefaultCategories(company.id);

  // Create admin user
  const user = await userModel.createUser({
    company_id: company.id,
    email,
    password,
    name,
    role: 'admin',
    is_manager_approver: false
  });

  // Generate token
  const token = generateToken(user.id);

  // Send welcome email (don't wait for it)
  sendWelcomeEmail(user, password).catch(err => 
    logger.error('Failed to send welcome email:', err)
  );

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id
      },
      company: {
        id: company.id,
        name: company.name,
        currency: company.currency,
        country: company.country
      },
      token
    }
  });
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await userModel.findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.is_active) {
    throw new AppError('Your account has been deactivated', 401);
  }

  // Verify password
  const isPasswordValid = await userModel.verifyPassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Get company details
  const company = await companyModel.findCompanyById(user.company_id);

  // Generate token
  const token = generateToken(user.id);

  // Send login alert email with IP and location (don't wait for it)
  const loginInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };
  
  sendLoginAlertEmail(user, loginInfo).catch(err => 
    logger.error('Failed to send login alert email:', err)
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        manager_id: user.manager_id,
        is_manager_approver: user.is_manager_approver
      },
      company: {
        id: company.id,
        name: company.name,
        currency: company.currency,
        country: company.country
      },
      token
    }
  });
};

// Get current user
export const getCurrentUser = async (req, res) => {
  const user = await userModel.findUserById(req.user.id);
  const company = await companyModel.findCompanyById(user.company_id);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        manager_id: user.manager_id,
        is_manager_approver: user.is_manager_approver
      },
      company: {
        id: company.id,
        name: company.name,
        currency: company.currency,
        country: company.country
      }
    }
  });
};

// Forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await userModel.findUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await userModel.setResetToken(user.id, hashedToken, expiresAt);

  // Send reset email
  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (error) {
    logger.error('Failed to send reset email:', error);
    throw new AppError('Failed to send reset email', 500);
  }

  res.json({
    success: true,
    message: 'Password reset link sent to your email'
  });
};

// Reset password
export const resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  }

  // Hash the token to compare with database
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await userModel.findUserByResetToken(hashedToken);
  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Update password
  await userModel.updatePassword(user.id, password);
  await userModel.clearResetToken(user.id);

  res.json({
    success: true,
    message: 'Password reset successful'
  });
};

// Change password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new AppError('New passwords do not match', 400);
  }

  const user = await userModel.findUserByEmail(req.user.email);

  // Verify current password
  const isPasswordValid = await userModel.verifyPassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Update password
  await userModel.updatePassword(user.id, newPassword);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
};

export default {
  signup,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword
};
