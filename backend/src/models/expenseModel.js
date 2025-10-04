import { query } from '../database/connection.js';

export const createExpense = async (expenseData) => {
  const {
    company_id,
    employee_id,
    description,
    category_id,
    amount,
    currency,
    expense_date,
    paid_by,
    remarks,
    receipt_url
  } = expenseData;

  const result = await query(
    `INSERT INTO expenses (
      company_id, employee_id, description, category_id, amount, currency,
      expense_date, paid_by, remarks, receipt_url, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
    RETURNING *`,
    [company_id, employee_id, description, category_id, amount, currency, expense_date, paid_by, remarks, receipt_url]
  );

  return result.rows[0];
};

export const findExpenseById = async (id) => {
  const result = await query(
    `SELECT e.*, 
            u.name as employee_name, u.email as employee_email,
            c.name as category_name,
            co.currency as company_currency,
            approver.name as current_approver_name
     FROM expenses e
     JOIN users u ON e.employee_id = u.id
     LEFT JOIN expense_categories c ON e.category_id = c.id
     JOIN companies co ON e.company_id = co.id
     LEFT JOIN users approver ON e.current_approver_id = approver.id
     WHERE e.id = $1`,
    [id]
  );
  return result.rows[0];
};

export const getExpensesByEmployee = async (employeeId, filters = {}) => {
  let queryText = `
    SELECT e.*, 
           c.name as category_name,
           co.currency as company_currency,
           approver.name as current_approver_name
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    JOIN companies co ON e.company_id = co.id
    LEFT JOIN users approver ON e.current_approver_id = approver.id
    WHERE e.employee_id = $1
  `;
  const params = [employeeId];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    queryText += ` AND e.status = $${paramCount}`;
    params.push(filters.status);
  }

  if (filters.from_date) {
    paramCount++;
    queryText += ` AND e.expense_date >= $${paramCount}`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    paramCount++;
    queryText += ` AND e.expense_date <= $${paramCount}`;
    params.push(filters.to_date);
  }

  queryText += ' ORDER BY e.created_at DESC';

  const result = await query(queryText, params);
  return result.rows;
};

export const getExpensesByCompany = async (companyId, filters = {}) => {
  let queryText = `
    SELECT e.*, 
           u.name as employee_name,
           c.name as category_name,
           co.currency as company_currency,
           approver.name as current_approver_name
    FROM expenses e
    JOIN users u ON e.employee_id = u.id
    LEFT JOIN expense_categories c ON e.category_id = c.id
    JOIN companies co ON e.company_id = co.id
    LEFT JOIN users approver ON e.current_approver_id = approver.id
    WHERE e.company_id = $1
  `;
  const params = [companyId];
  let paramCount = 1;

  if (filters.status) {
    paramCount++;
    queryText += ` AND e.status = $${paramCount}`;
    params.push(filters.status);
  }

  if (filters.employee_id) {
    paramCount++;
    queryText += ` AND e.employee_id = $${paramCount}`;
    params.push(filters.employee_id);
  }

  queryText += ' ORDER BY e.created_at DESC';

  const result = await query(queryText, params);
  return result.rows;
};

export const getPendingApprovalsForUser = async (userId) => {
  const result = await query(
    `SELECT e.*, 
            u.name as employee_name, u.email as employee_email,
            c.name as category_name,
            co.currency as company_currency
     FROM expenses e
     JOIN users u ON e.employee_id = u.id
     LEFT JOIN expense_categories c ON e.category_id = c.id
     JOIN companies co ON e.company_id = co.id
     WHERE e.current_approver_id = $1 AND e.status = 'pending_approval'
     ORDER BY e.created_at ASC`,
    [userId]
  );
  return result.rows;
};

export const updateExpense = async (id, updates) => {
  const allowedUpdates = [
    'description', 'category_id', 'amount', 'currency', 'expense_date',
    'paid_by', 'remarks', 'receipt_url', 'status', 'current_approver_id',
    'approval_step', 'converted_amount', 'final_approved_at', 'final_approved_by'
  ];
  
  const updateFields = [];
  const params = [];
  let paramCount = 0;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedUpdates.includes(key)) {
      paramCount++;
      updateFields.push(`${key} = $${paramCount}`);
      params.push(value);
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  paramCount++;
  params.push(id);

  const result = await query(
    `UPDATE expenses SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING *`,
    params
  );

  return result.rows[0];
};

export const deleteExpense = async (id) => {
  await query('DELETE FROM expenses WHERE id = $1', [id]);
};

export const getExpenseCategories = async (companyId) => {
  const result = await query(
    'SELECT * FROM expense_categories WHERE company_id = $1 AND is_active = true ORDER BY name',
    [companyId]
  );
  return result.rows;
};

export const createExpenseCategory = async (companyId, name, description) => {
  const result = await query(
    `INSERT INTO expense_categories (company_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [companyId, name, description]
  );
  return result.rows[0];
};

export default {
  createExpense,
  findExpenseById,
  getExpensesByEmployee,
  getExpensesByCompany,
  getPendingApprovalsForUser,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  createExpenseCategory
};
