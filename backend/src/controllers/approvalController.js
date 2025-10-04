import { AppError } from '../middleware/errorHandler.js';
import * as approvalModel from '../models/approvalModel.js';
import * as expenseModel from '../models/expenseModel.js';
import * as userModel from '../models/userModel.js';
import * as notificationModel from '../models/notificationModel.js';
import * as companyModel from '../models/companyModel.js';
import { convertCurrency } from '../services/currencyService.js';
import { sendExpenseApprovedEmail, sendExpenseRejectedEmail, sendApprovalRequestEmail, sendExpenseFinallyApprovedEmail } from '../utils/email.js';
import { incrementApprovalAction } from '../middleware/metrics.js';
import { logger } from '../utils/logger.js';

// Approve expense
export const approveExpense = async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  const expense = await expenseModel.findExpenseById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Verify this user is the current approver
  if (expense.current_approver_id !== req.user.id) {
    throw new AppError('You are not authorized to approve this expense', 403);
  }

  if (expense.status !== 'pending_approval') {
    throw new AppError('Expense is not pending approval', 400);
  }

  const company = await companyModel.findCompanyById(expense.company_id);
  const employee = await userModel.findUserById(expense.employee_id);

  // Record approval
  await approvalModel.createApprovalHistory(
    expense.id,
    req.user.id,
    'approved',
    comments,
    expense.approval_step
  );

  // Get approval rules for this expense
  const approvalRules = await approvalModel.getApprovalRulesForExpense(expense.id);
  
  let isFullyApproved = false;
  let nextApprover = null;

  if (approvalRules.length > 0) {
    // Check each rule
    for (const rule of approvalRules) {
      if (rule.use_approver_sequence) {
        // Sequential approval
        const approvers = await approvalModel.getApproversForRule(rule.id);
        const currentStep = expense.approval_step;
        
        if (currentStep < approvers.length) {
          // Move to next approver
          const nextApproverData = approvers[currentStep];
          nextApprover = await userModel.findUserById(nextApproverData.user_id);
        } else {
          isFullyApproved = true;
        }
      }

      if (rule.has_specific_approver) {
        // Check if specific approver approved
        const specificApproved = await approvalModel.checkSpecificApproverApproval(
          expense.id,
          rule.specific_approver_id
        );
        if (specificApproved && !rule.is_hybrid) {
          isFullyApproved = true;
        }
      }

      if (rule.min_approval_percentage) {
        // Check percentage threshold
        const percentageMet = await approvalModel.checkPercentageApproval(
          expense.id,
          rule.id
        );
        if (percentageMet && !rule.is_hybrid) {
          isFullyApproved = true;
        }
      }

      if (rule.is_hybrid) {
        // Both conditions must be met
        const percentageMet = await approvalModel.checkPercentageApproval(
          expense.id,
          rule.id
        );
        const specificApproved = rule.has_specific_approver ? 
          await approvalModel.checkSpecificApproverApproval(expense.id, rule.specific_approver_id) : 
          true;
        
        if (percentageMet && specificApproved) {
          isFullyApproved = true;
        }
      }
    }
  } else {
    // No rules, just sequential manager approval
    isFullyApproved = true;
  }

  // Update expense
  const updates = {};
  if (isFullyApproved) {
    // Convert amount to company currency
    const convertedAmount = await convertCurrency(
      expense.amount,
      expense.currency,
      company.currency
    );

    updates.status = 'approved';
    updates.current_approver_id = null;
    updates.final_approved_at = new Date();
    updates.final_approved_by = req.user.id;
    updates.converted_amount = convertedAmount;

    // Send final approval email
    sendExpenseFinallyApprovedEmail(employee, expense, convertedAmount, company.currency).catch(err =>
      logger.error('Failed to send final approval email:', err)
    );

    await notificationModel.createNotification(
      employee.id,
      expense.id,
      'expense_approved',
      'Expense Fully Approved',
      `Your expense for ${expense.currency} ${expense.amount} has been fully approved`
    );
  } else if (nextApprover) {
    updates.current_approver_id = nextApprover.id;
    updates.approval_step = expense.approval_step + 1;

    // Send approval request to next approver
    sendApprovalRequestEmail(nextApprover, expense, employee).catch(err =>
      logger.error('Failed to send approval request email:', err)
    );

    await notificationModel.createNotification(
      nextApprover.id,
      expense.id,
      'approval_request',
      'New Expense Approval Request',
      `${employee.name} submitted an expense for ${expense.currency} ${expense.amount}`
    );
  }

  await expenseModel.updateExpense(expense.id, updates);

  // Send approval notification to employee
  const approver = await userModel.findUserById(req.user.id);
  sendExpenseApprovedEmail(employee, expense, approver).catch(err =>
    logger.error('Failed to send approval email:', err)
  );

  incrementApprovalAction('approved');

  const updatedExpense = await expenseModel.findExpenseById(expense.id);

  res.json({
    success: true,
    message: 'Expense approved successfully',
    data: updatedExpense
  });
};

// Reject expense
export const rejectExpense = async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  if (!comments) {
    throw new AppError('Rejection reason is required', 400);
  }

  const expense = await expenseModel.findExpenseById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Verify this user is the current approver
  if (expense.current_approver_id !== req.user.id) {
    throw new AppError('You are not authorized to reject this expense', 403);
  }

  if (expense.status !== 'pending_approval') {
    throw new AppError('Expense is not pending approval', 400);
  }

  // Record rejection
  await approvalModel.createApprovalHistory(
    expense.id,
    req.user.id,
    'rejected',
    comments,
    expense.approval_step
  );

  // Update expense status
  await expenseModel.updateExpense(expense.id, {
    status: 'rejected',
    current_approver_id: null
  });

  // Send rejection email
  const employee = await userModel.findUserById(expense.employee_id);
  const approver = await userModel.findUserById(req.user.id);
  
  sendExpenseRejectedEmail(employee, expense, approver, comments).catch(err =>
    logger.error('Failed to send rejection email:', err)
  );

  await notificationModel.createNotification(
    employee.id,
    expense.id,
    'expense_rejected',
    'Expense Rejected',
    `Your expense for ${expense.currency} ${expense.amount} was rejected`
  );

  incrementApprovalAction('rejected');

  const updatedExpense = await expenseModel.findExpenseById(expense.id);

  res.json({
    success: true,
    message: 'Expense rejected',
    data: updatedExpense
  });
};

// Create approval rule
export const createApprovalRule = async (req, res) => {
  const {
    name,
    description,
    use_approver_sequence,
    min_approval_percentage,
    has_specific_approver,
    specific_approver_id,
    is_hybrid,
    approvers
  } = req.body;

  const rule = await approvalModel.createApprovalRule({
    company_id: req.user.company_id,
    name,
    description,
    use_approver_sequence: use_approver_sequence || false,
    min_approval_percentage: min_approval_percentage || null,
    has_specific_approver: has_specific_approver || false,
    specific_approver_id: specific_approver_id || null,
    is_hybrid: is_hybrid || false
  });

  // Add approvers if provided
  if (approvers && Array.isArray(approvers)) {
    for (const approver of approvers) {
      await approvalModel.addApproverToRule(
        rule.id,
        approver.user_id,
        approver.sequence_order,
        approver.is_required || false
      );
    }
  }

  res.status(201).json({
    success: true,
    message: 'Approval rule created successfully',
    data: rule
  });
};

// Get approval rules
export const getApprovalRules = async (req, res) => {
  const rules = await approvalModel.getApprovalRulesByCompany(req.user.company_id);

  // Get approvers for each rule
  const rulesWithApprovers = await Promise.all(
    rules.map(async (rule) => {
      const approvers = await approvalModel.getApproversForRule(rule.id);
      return { ...rule, approvers };
    })
  );

  res.json({
    success: true,
    data: rulesWithApprovers
  });
};

// Get approval rule by ID
export const getApprovalRuleById = async (req, res) => {
  const rule = await approvalModel.getApprovalRuleById(req.params.id);

  if (!rule) {
    throw new AppError('Approval rule not found', 404);
  }

  const approvers = await approvalModel.getApproversForRule(rule.id);

  res.json({
    success: true,
    data: { ...rule, approvers }
  });
};

// Update approval rule
export const updateApprovalRule = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    is_active,
    use_approver_sequence,
    min_approval_percentage,
    has_specific_approver,
    specific_approver_id,
    is_hybrid
  } = req.body;

  const rule = await approvalModel.getApprovalRuleById(id);
  if (!rule) {
    throw new AppError('Approval rule not found', 404);
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (is_active !== undefined) updates.is_active = is_active;
  if (use_approver_sequence !== undefined) updates.use_approver_sequence = use_approver_sequence;
  if (min_approval_percentage !== undefined) updates.min_approval_percentage = min_approval_percentage;
  if (has_specific_approver !== undefined) updates.has_specific_approver = has_specific_approver;
  if (specific_approver_id !== undefined) updates.specific_approver_id = specific_approver_id;
  if (is_hybrid !== undefined) updates.is_hybrid = is_hybrid;

  const updatedRule = await approvalModel.updateApprovalRule(id, updates);

  res.json({
    success: true,
    message: 'Approval rule updated successfully',
    data: updatedRule
  });
};

// Delete approval rule
export const deleteApprovalRule = async (req, res) => {
  const { id } = req.params;

  const rule = await approvalModel.getApprovalRuleById(id);
  if (!rule) {
    throw new AppError('Approval rule not found', 404);
  }

  await approvalModel.deleteApprovalRule(id);

  res.json({
    success: true,
    message: 'Approval rule deleted successfully'
  });
};

// Add approver to rule
export const addApproverToRule = async (req, res) => {
  const { rule_id } = req.params;
  const { user_id, sequence_order, is_required } = req.body;

  const approver = await approvalModel.addApproverToRule(
    rule_id,
    user_id,
    sequence_order,
    is_required || false
  );

  res.status(201).json({
    success: true,
    message: 'Approver added to rule',
    data: approver
  });
};

// Remove approver from rule
export const removeApproverFromRule = async (req, res) => {
  const { rule_id, user_id } = req.params;

  await approvalModel.removeApproverFromRule(rule_id, user_id);

  res.json({
    success: true,
    message: 'Approver removed from rule'
  });
};

// Get pending approvals for current user
export const getPendingApprovals = async (req, res) => {
  // Get all expenses where current user is the approver
  const pendingApprovals = await expenseModel.getPendingApprovalsForUser(req.user.id);

  res.json({
    success: true,
    data: pendingApprovals
  });
};

export default {
  approveExpense,
  rejectExpense,
  getPendingApprovals,
  createApprovalRule,
  getApprovalRules,
  getApprovalRuleById,
  updateApprovalRule,
  deleteApprovalRule,
  addApproverToRule,
  removeApproverFromRule
};
