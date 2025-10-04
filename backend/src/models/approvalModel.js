import { query, getClient } from '../database/connection.js';

export const createApprovalRule = async (ruleData) => {
  const {
    company_id,
    name,
    description,
    use_approver_sequence,
    min_approval_percentage,
    has_specific_approver,
    specific_approver_id,
    is_hybrid
  } = ruleData;

  const result = await query(
    `INSERT INTO approval_rules (
      company_id, name, description, use_approver_sequence,
      min_approval_percentage, has_specific_approver, specific_approver_id, is_hybrid
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [company_id, name, description, use_approver_sequence, min_approval_percentage, 
     has_specific_approver, specific_approver_id, is_hybrid]
  );

  return result.rows[0];
};

export const addApproverToRule = async (ruleId, userId, sequenceOrder, isRequired) => {
  const result = await query(
    `INSERT INTO approval_rule_approvers (approval_rule_id, user_id, sequence_order, is_required)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [ruleId, userId, sequenceOrder, isRequired]
  );
  return result.rows[0];
};

export const getApprovalRulesByCompany = async (companyId) => {
  const result = await query(
    `SELECT ar.*,
            u.name as specific_approver_name,
            (SELECT COUNT(*) FROM approval_rule_approvers WHERE approval_rule_id = ar.id) as approver_count
     FROM approval_rules ar
     LEFT JOIN users u ON ar.specific_approver_id = u.id
     WHERE ar.company_id = $1 AND ar.is_active = true
     ORDER BY ar.created_at DESC`,
    [companyId]
  );
  return result.rows;
};

export const getApprovalRuleById = async (ruleId) => {
  const result = await query(
    `SELECT ar.*,
            u.name as specific_approver_name
     FROM approval_rules ar
     LEFT JOIN users u ON ar.specific_approver_id = u.id
     WHERE ar.id = $1`,
    [ruleId]
  );
  return result.rows[0];
};

export const getApproversForRule = async (ruleId) => {
  const result = await query(
    `SELECT ara.*, u.name as approver_name, u.email as approver_email
     FROM approval_rule_approvers ara
     JOIN users u ON ara.user_id = u.id
     WHERE ara.approval_rule_id = $1
     ORDER BY ara.sequence_order ASC`,
    [ruleId]
  );
  return result.rows;
};

export const updateApprovalRule = async (ruleId, updates) => {
  const allowedUpdates = [
    'name', 'description', 'is_active', 'use_approver_sequence',
    'min_approval_percentage', 'has_specific_approver', 'specific_approver_id', 'is_hybrid'
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
  params.push(ruleId);

  const result = await query(
    `UPDATE approval_rules SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING *`,
    params
  );

  return result.rows[0];
};

export const deleteApprovalRule = async (ruleId) => {
  await query('DELETE FROM approval_rules WHERE id = $1', [ruleId]);
};

export const removeApproverFromRule = async (ruleId, userId) => {
  await query(
    'DELETE FROM approval_rule_approvers WHERE approval_rule_id = $1 AND user_id = $2',
    [ruleId, userId]
  );
};

export const createApprovalHistory = async (expenseId, approverId, action, comments, stepNumber) => {
  const result = await query(
    `INSERT INTO approval_history (expense_id, approver_id, action, comments, step_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [expenseId, approverId, action, comments, stepNumber]
  );
  return result.rows[0];
};

export const getApprovalHistory = async (expenseId) => {
  const result = await query(
    `SELECT ah.*, u.name as approver_name, u.email as approver_email
     FROM approval_history ah
     JOIN users u ON ah.approver_id = u.id
     WHERE ah.expense_id = $1
     ORDER BY ah.step_number ASC, ah.actioned_at ASC`,
    [expenseId]
  );
  return result.rows;
};

export const linkExpenseToApprovalRule = async (expenseId, ruleId) => {
  const result = await query(
    `INSERT INTO expense_approval_rules (expense_id, approval_rule_id)
     VALUES ($1, $2)
     RETURNING *`,
    [expenseId, ruleId]
  );
  return result.rows[0];
};

export const getApprovalRulesForExpense = async (expenseId) => {
  const result = await query(
    `SELECT ar.*, ear.created_at as linked_at
     FROM approval_rules ar
     JOIN expense_approval_rules ear ON ar.id = ear.approval_rule_id
     WHERE ear.expense_id = $1`,
    [expenseId]
  );
  return result.rows;
};

// Default rule helpers (requires is_default column on approval_rules)
export const getDefaultApprovalRule = async (companyId) => {
  // Ensure column exists (non-destructive on existing DBs)
  await query(`ALTER TABLE approval_rules ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE`);
  const result = await query(
    `SELECT * FROM approval_rules 
     WHERE company_id = $1 AND is_active = true AND is_default = true 
     ORDER BY created_at DESC LIMIT 1`,
    [companyId]
  );
  return result.rows[0] || null;
};

export const setDefaultApprovalRule = async (companyId, ruleId) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Ensure column exists
    await client.query(`ALTER TABLE approval_rules ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE`);
    await client.query(`UPDATE approval_rules SET is_default = false WHERE company_id = $1`, [companyId]);
    const res = await client.query(
      `UPDATE approval_rules SET is_default = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [ruleId, companyId]
    );
    await client.query('COMMIT');
    return res.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const checkPercentageApproval = async (expenseId, ruleId) => {
  const rule = await getApprovalRuleById(ruleId);
  const approvers = await getApproversForRule(ruleId);
  if (!approvers || approvers.length === 0) return false;

  const approvalHistory = await query(
    `SELECT COUNT(*) as approved_count
     FROM approval_history
     WHERE expense_id = $1 AND action = 'approved'`,
    [expenseId]
  );

  const approvedCount = parseInt(approvalHistory.rows[0].approved_count);
  const totalApprovers = approvers.length;
  const approvalPercentage = (approvedCount / totalApprovers) * 100;

  return approvalPercentage >= Number(rule.min_approval_percentage || 0);
};

// Check if specific approver has approved
export const checkSpecificApproverApproval = async (expenseId, specificApproverId) => {
  const result = await query(
    `SELECT * FROM approval_history
     WHERE expense_id = $1 AND approver_id = $2 AND action = 'approved'`,
    [expenseId, specificApproverId]
  );
  return result.rows.length > 0;
};

export default {
  createApprovalRule,
  addApproverToRule,
  getApprovalRulesByCompany,
  getApprovalRuleById,
  getApproversForRule,
  updateApprovalRule,
  deleteApprovalRule,
  removeApproverFromRule,
  createApprovalHistory,
  getApprovalHistory,
  linkExpenseToApprovalRule,
  getApprovalRulesForExpense,
  checkPercentageApproval,
  checkSpecificApproverApproval,
  getDefaultApprovalRule,
  setDefaultApprovalRule
};
