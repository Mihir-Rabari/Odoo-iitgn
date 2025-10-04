import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { formatCurrency, formatDateTime, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const ExpenseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, company } = useAuthStore();
  const [expense, setExpense] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenseDetails();
  }, [id]);

  const fetchExpenseDetails = async () => {
    try {
      const response = await api.get(`/expenses/${id}`);
      setExpense(response.data.data.expense);
      setApprovalHistory(response.data.data.approvalHistory || []);
    } catch (error) {
      toast.error('Failed to fetch expense details');
      navigate('/dashboard/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post(`/expenses/${id}/submit`);
      toast.success('Expense submitted for approval');
      fetchExpenseDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit expense');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!expense) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/expenses')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Expenses
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expense Details</h1>
            <p className="text-gray-600 mt-1">View complete expense information</p>
          </div>
          <Badge className={getStatusColor(expense.status)}>
            {expense.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expense Information */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Description</label>
              <p className="mt-1">{expense.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Category</label>
                <p className="mt-1">{expense.category_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Expense Date</label>
                <p className="mt-1">{new Date(expense.expense_date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Amount</label>
                <p className="mt-1 font-semibold text-lg">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
                {expense.converted_amount && expense.currency !== company?.currency && (
                  <p className="text-sm text-gray-500">
                    ≈ {formatCurrency(expense.converted_amount, company?.currency)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Paid By</label>
                <p className="mt-1">{expense.paid_by || 'N/A'}</p>
              </div>
            </div>
            {expense.remarks && (
              <div>
                <label className="text-sm font-medium text-gray-600">Remarks</label>
                <p className="mt-1">{expense.remarks}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Submitted By</label>
              <p className="mt-1">{expense.employee_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Submitted On</label>
              <p className="mt-1">{formatDateTime(expense.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Receipt */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            {expense.receipt_url ? (
              <div className="space-y-4">
                <img
                  src={expense.receipt_url}
                  alt="Receipt"
                  className="w-full rounded-lg border"
                />
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-gray-500">No receipt uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval History */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {approvalHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No approval history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvalHistory.map((history, index) => (
                <div key={history.id} className="flex items-start space-x-4">
                  <div className={`p-2 rounded-full ${
                    history.action === 'approved' ? 'bg-green-100' : 
                    history.action === 'rejected' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {history.action === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : history.action === 'rejected' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{history.approver_name}</p>
                      <span className="text-sm text-gray-500">
                        {formatDateTime(history.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{history.action}</p>
                    {history.comments && (
                      <p className="text-sm text-gray-500 mt-1 italic">"{history.comments}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {expense.status === 'draft' && expense.employee_id === user?.id && (
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate(`/dashboard/expenses/${id}/edit`)}>
            Edit Expense
          </Button>
          <Button onClick={handleSubmit}>Submit for Approval</Button>
        </div>
      )}
    </div>
  );
};

export default ExpenseDetailPage;
