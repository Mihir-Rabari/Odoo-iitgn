import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const ApprovalsPage = () => {
  const { company } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState({ open: false, expense: null, action: null });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/approvals/pending');
      setExpenses(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (expense, action) => {
    setActionDialog({ open: true, expense, action });
    setComments('');
  };

  const confirmAction = async () => {
    const { expense, action } = actionDialog;
    setSubmitting(true);

    try {
      await api.post(`/approvals/expenses/${expense.id}/${action}`, { comments });
      toast.success(`Expense ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setActionDialog({ open: false, expense: null, action: null });
      fetchPendingApprovals();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} expense`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve expense claims awaiting your decision</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses Awaiting Approval ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading approvals...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500">No pending approvals</p>
              <p className="text-sm text-gray-400 mt-1">All caught up! 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>{expense.employee_name}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate font-medium">{expense.description}</p>
                          <p className="text-sm text-gray-500">{expense.category_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{formatCurrency(expense.amount, expense.currency)}</p>
                          {expense.converted_amount && expense.currency !== company?.currency && (
                            <p className="text-xs text-gray-500">
                              ≈ {formatCurrency(expense.converted_amount, company?.currency)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.status)}>
                          {expense.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end space-x-2">
                          <Link to={`/dashboard/expenses/${expense.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(expense, 'approve')}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(expense, 'reject')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !submitting && setActionDialog({ ...actionDialog, open })}>
        <DialogContent onClose={() => !submitting && setActionDialog({ open: false, expense: null, action: null })}>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' ? 'Approve' : 'Reject'} Expense
            </DialogTitle>
          </DialogHeader>
          {actionDialog.expense && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{actionDialog.expense.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatCurrency(actionDialog.expense.amount, actionDialog.expense.currency)} • {actionDialog.expense.employee_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Comments {actionDialog.action === 'reject' && '*'}</label>
                <Textarea
                  placeholder={actionDialog.action === 'approve' ? 'Optional approval notes' : 'Please provide a reason for rejection'}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, expense: null, action: null })}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={submitting || (actionDialog.action === 'reject' && !comments.trim())}
              className={actionDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? 'Processing...' : actionDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;
