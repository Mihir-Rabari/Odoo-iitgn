import nodemailer from 'nodemailer';
import { config } from '../config/config.js';
import { logger } from './logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter
const createTransporter = () => {
  if (config.nodeEnv === 'development') {
    // Use ethereal for development
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: config.emailUser || 'ethereal.user@ethereal.email',
        pass: config.emailPass || 'ethereal.password'
      }
    });
  } else {
    // Use real SMTP for production
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.emailUser,
        pass: config.emailPass
      }
    });
  }
};

// Load email template
const loadTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  return fs.readFileSync(templatePath, 'utf8');
};

// Replace placeholders in template
const replacePlaceholders = (template, data) => {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  return result;
};

// Send email function
export const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const transporter = createTransporter();
    
    // Load and process template
    const htmlTemplate = loadTemplate(template);
    const html = replacePlaceholders(htmlTemplate, data);

    const mailOptions = {
      from: `"Expe - Expense Management" <${config.emailFrom || 'noreply@expe.com'}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent: ${info.messageId}`);
    if (config.nodeEnv === 'development') {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
};

// Specific email functions
export const sendWelcomeEmail = async (user, tempPassword) => {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Expe - Your Account is Ready',
    template: 'welcome',
    data: {
      name: user.name,
      email: user.email,
      tempPassword: tempPassword,
      loginUrl: `${config.frontendUrl}/login`,
      role: user.role
    }
  });
};

export const sendLoginAlertEmail = async (user, loginInfo) => {
  // Parse user agent for device info
  const userAgent = loginInfo.userAgent || '';
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || 'Unknown Browser';
  const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[0] || 'Unknown OS';
  
  return sendEmail({
    to: user.email,
    subject: '🔐 New Login to Your Expe Account',
    template: 'login-alert',
    data: {
      name: user.name,
      ip: loginInfo.ip,
      device: isMobile ? 'Mobile Device' : 'Desktop/Laptop',
      browser: browser,
      os: os,
      timestamp: new Date(loginInfo.timestamp).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'long'
      }),
      dashboardUrl: `${config.frontendUrl}/dashboard`,
      supportUrl: `${config.frontendUrl}/support`
    }
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  return sendEmail({
    to: user.email,
    subject: 'Reset Your Password - Expe',
    template: 'password-reset',
    data: {
      name: user.name,
      resetUrl: `${config.frontendUrl}/reset-password?token=${resetToken}`,
      expiryTime: '1 hour'
    }
  });
};

export const sendExpenseSubmittedEmail = async (user, expense) => {
  return sendEmail({
    to: user.email,
    subject: 'Expense Submitted Successfully',
    template: 'expense-submitted',
    data: {
      name: user.name,
      expenseId: expense.id,
      description: expense.description,
      amount: `${expense.currency} ${expense.amount}`,
      date: new Date(expense.expense_date).toLocaleDateString(),
      viewUrl: `${config.frontendUrl}/expenses/${expense.id}`
    }
  });
};

export const sendApprovalRequestEmail = async (approver, expense, employee) => {
  return sendEmail({
    to: approver.email,
    subject: 'New Expense Approval Request',
    template: 'approval-request',
    data: {
      approverName: approver.name,
      employeeName: employee.name,
      expenseId: expense.id,
      description: expense.description,
      amount: `${expense.currency} ${expense.amount}`,
      date: new Date(expense.expense_date).toLocaleDateString(),
      approveUrl: `${config.frontendUrl}/approvals/${expense.id}`
    }
  });
};

export const sendExpenseApprovedEmail = async (employee, expense, approver) => {
  return sendEmail({
    to: employee.email,
    subject: 'Expense Approved',
    template: 'expense-approved',
    data: {
      name: employee.name,
      approverName: approver.name,
      expenseId: expense.id,
      description: expense.description,
      amount: `${expense.currency} ${expense.amount}`,
      approvalDate: new Date().toLocaleDateString(),
      viewUrl: `${config.frontendUrl}/expenses/${expense.id}`
    }
  });
};

export const sendExpenseRejectedEmail = async (employee, expense, approver, reason) => {
  return sendEmail({
    to: employee.email,
    subject: 'Expense Rejected',
    template: 'expense-rejected',
    data: {
      name: employee.name,
      approverName: approver.name,
      expenseId: expense.id,
      description: expense.description,
      amount: `${expense.currency} ${expense.amount}`,
      reason: reason || 'No reason provided',
      rejectionDate: new Date().toLocaleDateString(),
      viewUrl: `${config.frontendUrl}/expenses/${expense.id}`
    }
  });
};

export const sendExpenseFinallyApprovedEmail = async (employee, expense, convertedAmount, companyCurrency) => {
  return sendEmail({
    to: employee.email,
    subject: 'Expense Fully Approved - Payment Processing',
    template: 'expense-finally-approved',
    data: {
      name: employee.name,
      expenseId: expense.id,
      description: expense.description,
      originalAmount: `${expense.currency} ${expense.amount}`,
      convertedAmount: `${companyCurrency} ${convertedAmount}`,
      approvalDate: new Date().toLocaleDateString(),
      viewUrl: `${config.frontendUrl}/expenses/${expense.id}`
    }
  });
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendPasswordResetEmail,
  sendExpenseSubmittedEmail,
  sendApprovalRequestEmail,
  sendExpenseApprovedEmail,
  sendExpenseRejectedEmail,
  sendExpenseFinallyApprovedEmail
};
