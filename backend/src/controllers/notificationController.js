import * as notificationModel from '../models/notificationModel.js';

// Get notifications
export const getNotifications = async (req, res) => {
  const { is_read } = req.query;
  
  const isReadFilter = is_read === 'true' ? true : is_read === 'false' ? false : null;
  
  const notifications = await notificationModel.getNotificationsByUser(
    req.user.id,
    isReadFilter
  );

  res.json({
    success: true,
    data: notifications
  });
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  const count = await notificationModel.getUnreadCount(req.user.id);

  res.json({
    success: true,
    data: { count }
  });
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  const { id } = req.params;

  await notificationModel.markNotificationAsRead(id);

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  await notificationModel.markAllNotificationsAsRead(req.user.id);

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
};

// Delete notification
export const deleteNotification = async (req, res) => {
  const { id } = req.params;

  await notificationModel.deleteNotification(id);

  res.json({
    success: true,
    message: 'Notification deleted'
  });
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
