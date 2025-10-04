import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

const Dashboard = () => {
  const { user, company } = useAuthStore();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const expensesRes = await api.get('/expenses');
      const expenses = expensesRes.data.data;

      setStats({
        totalExpenses: expenses.length,
        pending: expenses.filter((e) => e.status === 'pending_approval').length,
        approved: expenses.filter((e) => e.status === 'approved').length,
        rejected: expenses.filter((e) => e.status === 'rejected').length,
      });

      setRecentExpenses(expenses.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Expenses', value: stats.totalExpenses, icon: Receipt, color: 'bg-blue-100 text-blue-600' },
    { title: 'Pending Approval', value: stats.pending, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
    { title: 'Approved', value: stats.approved, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { title: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-red-100 text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}! 👋</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your expenses</p>
        </div>
        {user?.role === 'employee' && (
          <Link to="/dashboard/expenses/new">
            <Button>Create Expense</Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your latest expense submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No expenses yet</p>
              {user?.role === 'employee' && (
                <Link to="/dashboard/expenses/new">
                  <Button className="mt-4" size="sm">Create Your First Expense</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/dashboard/expenses/${expense.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">{expense.description}</h3>
                        <Badge className={getStatusColor(expense.status)}>
                          {expense.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(expense.expense_date)} • {expense.category_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      {expense.converted_amount && expense.currency !== company?.currency && (
                        <p className="text-sm text-gray-500">
                          ≈ {formatCurrency(expense.converted_amount, company?.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              <Link to="/dashboard/expenses">
                <Button variant="outline" className="w-full">View All Expenses</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
