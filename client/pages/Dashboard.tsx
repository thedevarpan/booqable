import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  CreditCard, 
  Bell, 
  Heart, 
  MessageCircle, 
  RefreshCw, 
  Users,
  BarChart3,
  Settings,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Dashboard Components
import AccountPortal from '../components/dashboard/AccountPortal';
import BookingManagement from '../components/dashboard/BookingManagement';
import PaymentsDashboard from '../components/dashboard/PaymentsDashboard';
import AlertsNotifications from '../components/dashboard/AlertsNotifications';
import WishlistsFavorites from '../components/dashboard/WishlistsFavorites';
import SupportContact from '../components/dashboard/SupportContact';
import QuickRebooking from '../components/dashboard/QuickRebooking';
import MultiUserAccess from '../components/dashboard/MultiUserAccess';
import NotificationCenter from '../components/dashboard/NotificationCenter';

interface DashboardSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ComponentType;
  description: string;
}

const dashboardSections: DashboardSection[] = [
  {
    id: 'account',
    title: 'Account Portal',
    icon: <User className="h-5 w-5" />,
    component: AccountPortal,
    description: 'View bookings and download invoices'
  },
  {
    id: 'bookings',
    title: 'Booking Management',
    icon: <Calendar className="h-5 w-5" />,
    component: BookingManagement,
    description: 'Modify dates, quantities, and cancel bookings'
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: <CreditCard className="h-5 w-5" />,
    component: PaymentsDashboard,
    description: 'Outstanding balances and payment history'
  },
  {
    id: 'alerts',
    title: 'Alerts & Notifications',
    icon: <Bell className="h-5 w-5" />,
    component: AlertsNotifications,
    description: 'Set costume alerts and manage notifications'
  },
  {
    id: 'wishlists',
    title: 'Wishlists & Favorites',
    icon: <Heart className="h-5 w-5" />,
    component: WishlistsFavorites,
    description: 'Save costumes for later'
  },
  {
    id: 'support',
    title: 'Support Contact',
    icon: <MessageCircle className="h-5 w-5" />,
    component: SupportContact,
    description: 'Get help and contact support'
  },
  {
    id: 'rebooking',
    title: 'Quick Rebooking',
    icon: <RefreshCw className="h-5 w-5" />,
    component: QuickRebooking,
    description: 'Repeat previous orders'
  },
  {
    id: 'multi-user',
    title: 'Multi-User Access',
    icon: <Users className="h-5 w-5" />,
    component: MultiUserAccess,
    description: 'Manage account permissions'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: <Bell className="h-5 w-5" />,
    component: NotificationCenter,
    description: 'View and manage all your notifications'
  }
];

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('account');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();

  // Get active component
  const activeComponent = dashboardSections.find(section => section.id === activeSection)?.component;
  const ActiveComponent = activeComponent || AccountPortal;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-brand-purple hover:text-brand-purple-dark transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="flex h-screen lg:h-auto">
          {/* Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            transition-transform duration-300 ease-in-out lg:transition-none
          `}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-emerald rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {dashboardSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
                    ${activeSection === section.id 
                      ? 'bg-brand-purple text-white' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
                    }
                  `}
                >
                  {section.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{section.title}</div>
                    <div className={`text-sm ${activeSection === section.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {section.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
              <Link
                to="/"
                className="flex items-center space-x-3 px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Store</span>
              </Link>
            </div>
          </div>

          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 lg:ml-0 min-h-screen">
            {/* Desktop Header */}
            <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {dashboardSections.find(s => s.id === activeSection)?.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {dashboardSections.find(s => s.id === activeSection)?.description}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/"
                    className="text-brand-purple hover:text-brand-purple-dark transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 lg:p-6">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
