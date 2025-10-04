import express from 'express';
import * as expenseController from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createExpenseSchema = Joi.object({
  description: Joi.string().min(3).max(500).required(),
  category_id: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  expense_date: Joi.date().max('now').required(),
  paid_by: Joi.string().max(100),
  remarks: Joi.string().max(500)
});

const updateExpenseSchema = Joi.object({
  description: Joi.string().min(3).max(500),
  category_id: Joi.string().uuid(),
  amount: Joi.number().positive(),
  currency: Joi.string().length(3),
  expense_date: Joi.date().max('now'),
  paid_by: Joi.string().max(100),
  remarks: Joi.string().max(500)
});

// Routes
router.get('/categories', authenticate, expenseController.getCategories);
router.post('/ocr', authenticate, uploadSingle('receipt'), expenseController.extractExpenseFromReceipt);
router.get('/pending-approvals', authenticate, expenseController.getPendingApprovals);
router.get('/', authenticate, expenseController.getExpenses);
router.get('/:id', authenticate, expenseController.getExpenseById);
router.post('/', authenticate, uploadSingle('receipt'), validate(createExpenseSchema), expenseController.createExpense);
router.post('/:id/submit', authenticate, expenseController.submitExpense);
router.patch('/:id', authenticate, uploadSingle('receipt'), validate(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', authenticate, expenseController.deleteExpense);

export default router;
