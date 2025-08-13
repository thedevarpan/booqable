import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock, AlertCircle, Package, CreditCard, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuHeader,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';
import { booqableAPI } from '../lib/booqable';

export interface Notification {
  id: string;
  type: 'order' | 'payment' | 'system' | 'promotion';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  icon?: React.ReactNode;
}

interface NotificationMenuProps {
  className?: string;
}

export function NotificationMenu({ className }: NotificationMenuProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generate notifications from real Booqable data
  const generateNotificationsFromBookings = async (): Promise<Notification[]> => {
    try {
      const bookings = await booqableAPI.getBookings();
      const generatedNotifications: Notification[] = [];

      // Get latest 3 bookings for the notification menu
      const latestBookings = bookings.slice(0, 3);

      latestBookings.forEach((booking, index) => {
        const baseTimestamp = new Date(booking.createdAt).getTime();

        // Booking confirmation notification
        generatedNotifications.push({
          id: `booking-${booking.id}`,
          type: 'order',
          title: 'Booking Confirmed',
          message: `Your booking ${booking.orderNumber} has been confirmed`,
          timestamp: new Date(baseTimestamp + (index * 1000)).toISOString(),
          isRead: index > 0, // First notification unread
          actionUrl: '/dashboard?section=account',
          icon: <Package className="h-4 w-4" />
        });

        // Payment notification if balance due
        if (booking.paidAmount < booking.totalAmount) {
          generatedNotifications.push({
            id: `payment-${booking.id}`,
            type: 'payment',
            title: 'Payment Due',
            message: `£${(booking.totalAmount - booking.paidAmount).toLocaleString()} due for ${booking.orderNumber}`,
            timestamp: new Date(baseTimestamp + (index * 2000)).toISOString(),
            isRead: false,
            actionUrl: '/dashboard?section=payments',
            icon: <CreditCard className="h-4 w-4" />
          });
        }
      });

      // Add a promotional notification
      generatedNotifications.push({
        id: 'promo-latest',
        type: 'promotion',
        title: 'Special Offer',
        message: '15% off on weekend bookings! Limited time offer.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        actionUrl: '/',
        icon: <AlertCircle className="h-4 w-4" />
      });

      return generatedNotifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5); // Limit to 5 notifications for the dropdown
    } catch (error) {
      console.error('Error generating notifications:', error);
      return [];
    }
  };

  useEffect(() => {
    // Load notifications from real Booqable data
    const loadNotifications = async () => {
      try {
        const realNotifications = await generateNotificationsFromBookings();
        setNotifications(realNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-orange-600" />;
      case 'system':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'promotion':
        return <AlertCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative p-2 hover:bg-gray-100", className)}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center bg-red-500 border-0 text-white p-0"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={5}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-brand-purple hover:text-brand-purple-dark"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-medium text-foreground mb-1">No notifications</h4>
              <p className="text-sm text-muted-foreground">
                You're all caught up! Check back later for updates.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer border-l-4",
                    notification.isRead 
                      ? "border-l-transparent bg-white" 
                      : "border-l-brand-purple bg-brand-purple/5"
                  )}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {notification.icon || getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className={cn(
                        "text-sm font-medium truncate",
                        notification.isRead ? "text-gray-900" : "text-foreground"
                      )}>
                        {notification.title}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 h-6 w-6 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <p className={cn(
                      "text-xs mt-1 line-clamp-2",
                      notification.isRead ? "text-gray-600" : "text-gray-700"
                    )}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-brand-purple rounded-full ml-auto"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3">
              <Button
                variant="ghost"
                className="w-full text-sm text-brand-purple hover:text-brand-purple-dark hover:bg-brand-purple/10"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/dashboard?section=notifications';
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationMenu;
