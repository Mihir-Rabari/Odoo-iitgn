import { query } from '../database/connection.js';

export const createNotification = async (userId, expenseId, type, title, message) => {
  const result = await query(
    `INSERT INTO notifications (user_id, expense_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, expenseId, type, title, message]
  );
  return result.rows[0];
};

export const getNotificationsByUser = async (userId, isRead = null) => {
  let queryText = `
    SELECT n.*, e.description as expense_description
    FROM notifications n
    LEFT JOIN expenses e ON n.expense_id = e.id
    WHERE n.user_id = $1
  `;
  const params = [userId];

  if (isRead !== null) {
    queryText += ' AND n.is_read = $2';
    params.push(isRead);
  }

  queryText += ' ORDER BY n.created_at DESC LIMIT 50';

  const result = await query(queryText, params);
  return result.rows;
};

export const markNotificationAsRead = async (notificationId) => {
  await query(
    'UPDATE notifications SET is_read = true WHERE id = $1',
    [notificationId]
  );
};

export const markAllNotificationsAsRead = async (userId) => {
  await query(
    'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
    [userId]
  );
};

export const deleteNotification = async (notificationId) => {
  await query('DELETE FROM notifications WHERE id = $1', [notificationId]);
};

export const getUnreadCount = async (userId) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return parseInt(result.rows[0].count);
};

export default {
  createNotification,
  getNotificationsByUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount
};
