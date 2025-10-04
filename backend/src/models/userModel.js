import { query } from '../database/connection.js';
import bcrypt from 'bcryptjs';

export const createUser = async (userData) => {
  const { company_id, email, password, name, role, manager_id, is_manager_approver } = userData;
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await query(
    `INSERT INTO users (company_id, email, password, name, role, manager_id, is_manager_approver)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, company_id, email, name, role, manager_id, is_manager_approver, is_active, created_at`,
    [company_id, email, hashedPassword, name, role, manager_id || null, is_manager_approver || false]
  );
  
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

export const findUserById = async (id) => {
  const result = await query(
    'SELECT id, company_id, email, name, role, manager_id, is_manager_approver, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const getUsersByCompany = async (companyId, filters = {}) => {
  let queryText = `
    SELECT u.id, u.email, u.name, u.role, u.manager_id, u.is_manager_approver, u.is_active, u.created_at,
           m.name as manager_name
    FROM users u
    LEFT JOIN users m ON u.manager_id = m.id
    WHERE u.company_id = $1
  `;
  const params = [companyId];
  let paramCount = 1;

  if (filters.role) {
    paramCount++;
    queryText += ` AND u.role = $${paramCount}`;
    params.push(filters.role);
  }

  if (filters.is_active !== undefined) {
    paramCount++;
    queryText += ` AND u.is_active = $${paramCount}`;
    params.push(filters.is_active);
  }

  queryText += ' ORDER BY u.created_at DESC';

  const result = await query(queryText, params);
  return result.rows;
};

export const updateUser = async (id, updates) => {
  const allowedUpdates = ['name', 'role', 'manager_id', 'is_manager_approver', 'is_active'];
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
    `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING id, company_id, email, name, role, manager_id, is_manager_approver, is_active, updated_at`,
    params
  );

  return result.rows[0];
};

export const updatePassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await query(
    'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [hashedPassword, userId]
  );
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

export const deleteUser = async (id) => {
  await query('DELETE FROM users WHERE id = $1', [id]);
};

export const setResetToken = async (userId, token, expiresAt) => {
  await query(
    'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
    [token, expiresAt, userId]
  );
};

export const findUserByResetToken = async (token) => {
  const result = await query(
    'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
    [token]
  );
  return result.rows[0];
};

export const clearResetToken = async (userId) => {
  await query(
    'UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = $1',
    [userId]
  );
};

export default {
  createUser,
  findUserByEmail,
  findUserById,
  getUsersByCompany,
  updateUser,
  updatePassword,
  verifyPassword,
  deleteUser,
  setResetToken,
  findUserByResetToken,
  clearResetToken
};
