import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined) return '-';
  try {
    return new window.Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch (error) {
    // Fallback
    return `${currency || 'USD'} ${Number(amount).toFixed(2)}`;
  }
}

export function formatDate(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new window.Intl.DateFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch (error) {
    // Fallback if Intl is not available
    const d = new Date(date);
    return d.toLocaleDateString('en-US');
  }
}

export function formatDateTime(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new window.Intl.DateFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (error) {
    // Fallback if Intl is not available
    const d = new Date(date);
    return d.toLocaleString('en-US');
  }
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusIcon(status) {
  const icons = {
    draft: '📝',
    submitted: '📤',
    pending_approval: '⏳',
    approved: '✅',
    rejected: '❌',
  };
  return icons[status] || '📄';
}
