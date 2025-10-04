import { AppError } from '../middleware/errorHandler.js';
import * as expenseModel from '../models/expenseModel.js';
import * as companyModel from '../models/companyModel.js';
import * as userModel from '../models/userModel.js';
import { convertCurrency } from '../services/currencyService.js';
import { extractExpenseFromReceipt as extractWithGemini } from '../services/geminiOcrService.js';
import { extractTextFromImage, parseExpenseFromText } from '../services/ocrService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { sendExpenseSubmittedEmail, sendApprovalRequestEmail } from '../utils/email.js';
import { incrementExpenseSubmission } from '../middleware/metrics.js';

// Create expense
export const createExpense = async (req, res) => {
  const {
    description,
    category_id,
    amount,
    currency,
    expense_date,
    paid_by,
    remarks
  } = req.body;

  const expense = await expenseModel.createExpense({
    company_id: req.user.company_id,
    employee_id: req.user.id,
    description,
    category_id,
    amount,
    currency,
    expense_date,
    paid_by,
    remarks,
    receipt_url: req.file ? `/uploads/${req.file.filename}` : null
  });

  incrementExpenseSubmission('draft');

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: expense
  });
};

// Submit expense for approval
export const submitExpense = async (req, res) => {
  const { id } = req.params;

  const expense = await expenseModel.findExpenseById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Verify ownership
  if (expense.employee_id !== req.user.id) {
    throw new AppError('Access denied', 403);
  }

  if (expense.status !== 'draft') {
    throw new AppError('Expense already submitted', 400);
  }

  // Get employee's manager
  const employee = await userModel.findUserById(req.user.id);
  
  let nextApprover = null;
  let newStatus = 'submitted';

  // Check if manager approval is required
  if (employee.manager_id && employee.is_manager_approver) {
    nextApprover = await userModel.findUserById(employee.manager_id);
    newStatus = 'pending_approval';
  }

  // Update expense status
  await expenseModel.updateExpense(id, {
    status: newStatus,
    current_approver_id: nextApprover?.id || null,
    approval_step: nextApprover ? 1 : 0
  });

  const updatedExpense = await expenseModel.findExpenseById(id);

  // Send notification to employee
  sendExpenseSubmittedEmail(employee, updatedExpense).catch(err =>
    logger.error('Failed to send expense submitted email:', err)
  );

  // If there's a next approver, send notification
  if (nextApprover) {
    sendApprovalRequestEmail(nextApprover, updatedExpense, employee).catch(err =>
      logger.error('Failed to send approval request email:', err)
    );

    await notificationModel.createNotification(
      nextApprover.id,
      id,
      'approval_request',
      'New Expense Approval Request',
      `${employee.name} submitted an expense for ${expense.currency} ${expense.amount}`
    );
  }

  incrementExpenseSubmission('submitted');

  res.json({
    success: true,
    message: 'Expense submitted successfully',
    data: updatedExpense
  });
};

// Get expenses
export const getExpenses = async (req, res) => {
  const { status, from_date, to_date, employee_id } = req.query;

  let expenses;

  if (req.user.role === 'employee') {
    // Employees see only their expenses
    expenses = await expenseModel.getExpensesByEmployee(req.user.id, {
      status,
      from_date,
      to_date
    });
  } else {
    // Managers and admins see all expenses in company
    expenses = await expenseModel.getExpensesByCompany(req.user.company_id, {
      status,
      employee_id
    });
  }

  res.json({
    success: true,
    data: expenses
  });
};

// Get expense by ID
export const getExpenseById = async (req, res) => {
  const expense = await expenseModel.findExpenseById(req.params.id);

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Check access
  if (expense.company_id !== req.user.company_id) {
    throw new AppError('Access denied', 403);
  }

  if (req.user.role === 'employee' && expense.employee_id !== req.user.id) {
    throw new AppError('Access denied', 403);
  }

  // Get approval history
  const approvalHistory = await approvalModel.getApprovalHistory(expense.id);

  res.json({
    success: true,
    data: {
      ...expense,
      approval_history: approvalHistory
    }
  });
};

// Update expense
export const updateExpense = async (req, res) => {
  const { id } = req.params;
  const {
    description,
    category_id,
    amount,
    currency,
    expense_date,
    paid_by,
    remarks
  } = req.body;

  const expense = await expenseModel.findExpenseById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Only owner can update
  if (expense.employee_id !== req.user.id) {
    throw new AppError('Access denied', 403);
  }

  // Can only update draft expenses
  if (expense.status !== 'draft') {
    throw new AppError('Cannot update submitted expense', 400);
  }

  const updates = {};
  if (description !== undefined) updates.description = description;
  if (category_id !== undefined) updates.category_id = category_id;
  if (amount !== undefined) updates.amount = amount;
  if (currency !== undefined) updates.currency = currency;
  if (expense_date !== undefined) updates.expense_date = expense_date;
  if (paid_by !== undefined) updates.paid_by = paid_by;
  if (remarks !== undefined) updates.remarks = remarks;
  if (req.file) updates.receipt_url = `/uploads/${req.file.filename}`;

  const updatedExpense = await expenseModel.updateExpense(id, updates);

  res.json({
    success: true,
    message: 'Expense updated successfully',
    data: updatedExpense
  });
};

// Delete expense
export const deleteExpense = async (req, res) => {
  const { id } = req.params;

  const expense = await expenseModel.findExpenseById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Only owner or admin can delete
  if (expense.employee_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Access denied', 403);
  }

  // Can only delete draft expenses
  if (expense.status !== 'draft') {
    throw new AppError('Cannot delete submitted expense', 400);
  }

  await expenseModel.deleteExpense(id);

  res.json({
    success: true,
    message: 'Expense deleted successfully'
  });
};

// Get pending approvals
export const getPendingApprovals = async (req, res) => {
  const expenses = await expenseModel.getPendingApprovalsForUser(req.user.id);

  // Convert amounts to company currency
  const company = await companyModel.findCompanyById(req.user.company_id);
  
  const expensesWithConversion = await Promise.all(
    expenses.map(async (expense) => {
      if (expense.currency !== company.currency) {
        const convertedAmount = await convertCurrency(
          expense.amount,
          expense.currency,
          company.currency
        );
        return { ...expense, converted_amount: convertedAmount };
      }
      return { ...expense, converted_amount: expense.amount };
    })
  );

  res.json({
    success: true,
    data: expensesWithConversion
  });
};

// Get expense categories
export const getCategories = async (req, res) => {
  const categories = await expenseModel.getExpenseCategories(req.user.company_id);

  res.json({
    success: true,
    data: categories
  });
};

// OCR - Extract expense from receipt
export const extractExpenseFromReceipt = async (req, res) => {
  if (!req.file) {
    throw new AppError('No receipt image provided', 400);
  }

  try {
    // Check if Gemini API key is available
    const useGemini = config.geminiApiKey && config.geminiApiKey !== '';
    
    let expenseData;
    let method;

    if (useGemini) {
      // Use Gemini AI for better accuracy and structured output
      logger.info('Using Gemini AI for OCR extraction');
      const result = await extractWithGemini(req.file.path);
      expenseData = result.data;
      method = 'gemini-ai';
    } else {
      // Fallback to Tesseract OCR
      logger.info('Using Tesseract OCR (Gemini API key not found)');
      const text = await extractTextFromImage(req.file.path);
      expenseData = parseExpenseFromText(text);
      method = 'tesseract';
    }

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        amount: expenseData.amount,
        currency: expenseData.currency,
        date: expenseData.date,
        merchant: expenseData.merchantName || expenseData.merchant,
        description: expenseData.description,
        category: expenseData.category,
        confidence: expenseData.confidence,
        receipt_url: `/uploads/${req.file.filename}`,
        method: method
      }
    });
  } catch (error) {
    logger.error('OCR processing failed:', error);
    throw new AppError('Failed to process receipt', 500);
  }
};

export default {
  createExpense,
  submitExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getPendingApprovals,
  getCategories,
  extractExpenseFromReceipt
};
