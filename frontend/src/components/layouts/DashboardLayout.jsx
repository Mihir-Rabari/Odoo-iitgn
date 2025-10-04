import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { getInitials } from '@/lib/utils';

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
    { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt, roles: ['admin', 'manager', 'employee'] },
    { name: 'Approvals', href: '/dashboard/approvals', icon: CheckSquare, roles: ['admin', 'manager'] },
    { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['admin'] },
    { name: 'Approval Rules', href: '/dashboard/approval-rules', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 bg-gray-900/50 z-40 lg:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img src="/logo.svg" alt="Expe" className="h-8 w-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Expe
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Company Info */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b">
          <p className="text-sm font-medium text-gray-700">{company?.name}</p>
          <p className="text-xs text-gray-500">{company?.currency} • {user?.role}</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center text-white font-semibold">
                {getInitials(user?.name || '')}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center space-x-4">
              <Link to="/dashboard/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                </Button>
              </Link>
              <Link to="/dashboard/profile">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center text-white font-semibold text-sm cursor-pointer">
                  {getInitials(user?.name || '')}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
