import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).optional(), // Allow custom password
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'manager', 'employee').required(),
  manager_id: Joi.string().uuid().allow(null),
  is_manager_approver: Joi.boolean()
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  role: Joi.string().valid('admin', 'manager', 'employee'),
  manager_id: Joi.string().uuid().allow(null),
  is_manager_approver: Joi.boolean(),
  is_active: Joi.boolean()
});

// Routes
router.get('/', authenticate, userController.getUsers);
router.get('/managers', authenticate, userController.getManagers);
router.get('/:id', authenticate, userController.getUserById);
router.post('/', authenticate, authorize('admin'), validate(createUserSchema), userController.createUser);
router.patch('/:id', authenticate, authorize('admin'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

export default router;
