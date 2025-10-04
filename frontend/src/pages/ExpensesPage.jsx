import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const ExpensesPage = () => {
  const { user, company } = useAuthStore();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      setExpenses(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-gray-600 mt-1">Manage and track your expense claims</p>
        </div>
        {user?.role === 'employee' && (
          <Link to="/dashboard/expenses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredExpenses.length} of {expenses.length} expenses
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No expenses found</p>
              {user?.role === 'employee' && (
                <Link to="/dashboard/expenses/new">
                  <Button className="mt-4" size="sm">Create Your First Expense</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {formatDate(expense.expense_date)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{expense.description}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{expense.category_name || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">
                            {formatCurrency(expense.amount, expense.currency)}
                          </p>
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
                        <span className="text-sm">{expense.employee_name}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/dashboard/expenses/${expense.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;
