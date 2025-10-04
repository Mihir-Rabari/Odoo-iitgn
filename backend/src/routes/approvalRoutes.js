import express from 'express';
import * as approvalController from '../controllers/approvalController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const approveRejectSchema = Joi.object({
  comments: Joi.string().max(500)
});

const createApprovalRuleSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(500),
  use_approver_sequence: Joi.boolean(),
  min_approval_percentage: Joi.number().min(0).max(100),
  has_specific_approver: Joi.boolean(),
  specific_approver_id: Joi.string().uuid().allow(null),
  is_hybrid: Joi.boolean(),
  approvers: Joi.array().items(Joi.object({
    user_id: Joi.string().uuid().required(),
    sequence_order: Joi.number().integer().min(1).required(),
    is_required: Joi.boolean()
  }))
});

const updateApprovalRuleSchema = Joi.object({
  name: Joi.string().min(3).max(200),
  description: Joi.string().max(500),
  is_active: Joi.boolean(),
  use_approver_sequence: Joi.boolean(),
  min_approval_percentage: Joi.number().min(0).max(100),
  has_specific_approver: Joi.boolean(),
  specific_approver_id: Joi.string().uuid().allow(null),
  is_hybrid: Joi.boolean()
});

const addApproverSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  sequence_order: Joi.number().integer().min(1).required(),
  is_required: Joi.boolean()
});

// Get pending approvals for current user
router.get('/pending', authenticate, approvalController.getPendingApprovals);

// Expense approval routes
router.post('/expenses/:id/approve', authenticate, authorize('manager', 'admin'), validate(approveRejectSchema), approvalController.approveExpense);
router.post('/expenses/:id/reject', authenticate, authorize('manager', 'admin'), validate(approveRejectSchema), approvalController.rejectExpense);

// Approval rules routes
router.get('/rules', authenticate, authorize('admin'), approvalController.getApprovalRules);
router.get('/rules/:id', authenticate, authorize('admin'), approvalController.getApprovalRuleById);
router.post('/rules', authenticate, authorize('admin'), validate(createApprovalRuleSchema), approvalController.createApprovalRule);
router.patch('/rules/:id', authenticate, authorize('admin'), validate(updateApprovalRuleSchema), approvalController.updateApprovalRule);
router.delete('/rules/:id', authenticate, authorize('admin'), approvalController.deleteApprovalRule);
router.post('/rules/:rule_id/approvers', authenticate, authorize('admin'), validate(addApproverSchema), approvalController.addApproverToRule);
router.delete('/rules/:rule_id/approvers/:user_id', authenticate, authorize('admin'), approvalController.removeApproverFromRule);

export default router;
