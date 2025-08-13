import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate notifications from real Booqable data
  const generateNotificationsFromBookings = async (): Promise<Notification[]> => {
    try {
      const bookings = await booqableAPI.getBookings();
      const generatedNotifications: Notification[] = [];

      bookings.forEach((booking, index) => {
        const baseTimestamp = new Date(booking.createdAt).getTime();

        // Booking confirmation
        generatedNotifications.push({
          id: `booking-${booking.id}`,
          type: 'order',
          title: 'Booking Confirmed',
          message: `Your booking ${booking.orderNumber} has been confirmed`,
          timestamp: new Date(baseTimestamp + (index * 1000)).toISOString(),
          isRead: Math.random() > 0.4,
          actionUrl: '/dashboard?section=account'
        });

        // Payment reminders
        if (booking.paidAmount < booking.totalAmount) {
          generatedNotifications.push({
            id: `payment-${booking.id}`,
            type: 'payment',
            title: 'Payment Reminder',
            message: `£${(booking.totalAmount - booking.paidAmount).toLocaleString()} due for ${booking.orderNumber}`,
            timestamp: new Date(baseTimestamp + (index * 2000)).toISOString(),
            isRead: false,
            actionUrl: '/dashboard?section=payments'
          });
        }
      });

      // Add system notifications
      generatedNotifications.push({
        id: 'system-welcome',
        type: 'system',
        title: 'Welcome to CostumeRent',
        message: 'Your account is ready! Explore our amazing costume collection.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isRead: true
      });

      return generatedNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error generating notifications:', error);
      return [];
    }
  };

  // Load initial notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const realNotifications = await generateNotificationsFromBookings();
        setNotifications(realNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
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

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
