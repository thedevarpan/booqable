import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Filter, Search, MoreVertical, Archive, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { Notification } from '../NotificationMenu';
import { booqableAPI } from '../../lib/booqable';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Generate notifications from real Booqable data
  const generateNotificationsFromBookings = async (): Promise<Notification[]> => {
    try {
      const bookings = await booqableAPI.getBookings();
      const generatedNotifications: Notification[] = [];

      // Generate notifications based on booking states
      bookings.forEach((booking, index) => {
        const baseTimestamp = new Date(booking.createdAt).getTime();

        // Booking confirmation notification
        generatedNotifications.push({
          id: `booking-${booking.id}`,
          type: 'order',
          title: 'Booking Confirmed',
          message: `Your booking ${booking.orderNumber} has been confirmed. Total: £${booking.totalAmount.toLocaleString()}`,
          timestamp: new Date(baseTimestamp + (index * 1000)).toISOString(),
          isRead: Math.random() > 0.3, // Random read status
          actionUrl: '/dashboard?section=account'
        });

        // Payment notifications
        if (booking.paidAmount < booking.totalAmount) {
          generatedNotifications.push({
            id: `payment-${booking.id}`,
            type: 'payment',
            title: 'Payment Reminder',
            message: `Payment of £${(booking.totalAmount - booking.paidAmount).toLocaleString()} is due for booking ${booking.orderNumber}`,
            timestamp: new Date(baseTimestamp + (index * 2000)).toISOString(),
            isRead: false,
            actionUrl: '/dashboard?section=payments'
          });
        }

        // Delivery notifications for delivered orders
        if (booking.status === 'delivered') {
          generatedNotifications.push({
            id: `delivery-${booking.id}`,
            type: 'order',
            title: 'Order Delivered',
            message: `Your order ${booking.orderNumber} has been delivered successfully. Enjoy your rental!`,
            timestamp: new Date(baseTimestamp + (index * 3000)).toISOString(),
            isRead: Math.random() > 0.5,
            actionUrl: '/dashboard?section=account'
          });
        }
      });

      // Add some system and promotional notifications
      generatedNotifications.push(
        {
          id: 'system-welcome',
          type: 'system',
          title: 'Welcome to CostumeRent',
          message: 'Your account has been set up successfully. Start exploring our amazing costume collection!',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          isRead: true
        },
        {
          id: 'promo-weekend',
          type: 'promotion',
          title: 'Weekend Special Offer',
          message: '🎉 Get 15% off on your next booking! Use code WEEKEND15. Valid until Sunday.',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          actionUrl: '/'
        }
      );

      return generatedNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error generating notifications from bookings:', error);
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

  // Filter and search notifications
  useEffect(() => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'unread') {
        filtered = filtered.filter(n => !n.isRead);
      } else {
        filtered = filtered.filter(n => n.type === filterType);
      }
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filterType, searchTerm]);

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
    const iconMap = {
      order: '📦',
      payment: '💳',
      system: '⚙️',
      promotion: '🎉'
    };
    return iconMap[type] || '📧';
  };

  const getTypeColor = (type: Notification['type']) => {
    const colorMap = {
      order: 'bg-blue-100 text-blue-700',
      payment: 'bg-orange-100 text-orange-700',
      system: 'bg-green-100 text-green-700',
      promotion: 'bg-purple-100 text-purple-700'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-700';
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
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Center
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {unreadCount} unread
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Stay updated with your orders, payments, and special offers
              </p>
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="text-brand-purple hover:text-brand-purple-dark"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {filterType === 'all' ? 'All Types' : 
                   filterType === 'unread' ? 'Unread' :
                   filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setFilterType('all')}>
                  All Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('unread')}>
                  Unread Only
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterType('order')}>
                  📦 Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('payment')}>
                  💳 Payments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('system')}>
                  ⚙️ System
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('promotion')}>
                  🎉 Promotions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">
                {searchTerm || filterType !== 'all' 
                  ? 'No matching notifications' 
                  : 'No notifications yet'
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'You\'re all caught up! New notifications will appear here.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-6 hover:bg-gray-50 transition-colors cursor-pointer border-l-4",
                    notification.isRead 
                      ? "border-l-transparent" 
                      : "border-l-brand-purple bg-brand-purple/5"
                  )}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                        getTypeColor(notification.type)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-medium mb-1",
                            notification.isRead ? "text-gray-900" : "text-foreground"
                          )}>
                            {notification.title}
                          </h4>
                          
                          <p className={cn(
                            "text-sm mb-2",
                            notification.isRead ? "text-gray-600" : "text-gray-700"
                          )}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-brand-purple rounded-full"></div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 h-8 w-8 text-gray-400 hover:text-gray-600"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!notification.isRead && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-red-600"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
