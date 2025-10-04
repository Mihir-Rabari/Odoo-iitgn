import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import approvalRoutes from './approvalRoutes.js';
import currencyRoutes from './currencyRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/expenses', expenseRoutes);
router.use('/approvals', approvalRoutes);
router.use('/currency', currencyRoutes);
router.use('/notifications', notificationRoutes);

export default router;
