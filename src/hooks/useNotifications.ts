
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking_reminder' | 'extension_reminder' | 'owner_notification' | 'system';
  time: string;
  unread: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  // Mock notifications data - in real app this would come from Supabase
  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: 'Booking Reminder',
      message: 'Your parking session at Central Plaza starts in 30 minutes',
      type: 'booking_reminder',
      time: '5 min ago',
      unread: true,
      actionUrl: '/bookings',
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'Extension Available',
      message: 'You can extend your current parking session',
      type: 'extension_reminder',
      time: '15 min ago',
      unread: true,
      actionUrl: '/bookings',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'New Booking',
      message: 'Someone booked your parking spot at Downtown Mall',
      type: 'owner_notification',
      time: '1 hour ago',
      unread: false,
      actionUrl: '/admin',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'Payment Received',
      message: 'Payment confirmed for booking #12345',
      type: 'system',
      time: '2 hours ago',
      unread: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter notifications based on user type
      let filteredNotifications = mockNotifications;
      
      if (profile?.user_type === 'guest') {
        filteredNotifications = mockNotifications.filter(n => 
          n.type === 'booking_reminder' || n.type === 'extension_reminder' || n.type === 'system'
        );
      } else if (profile?.user_type === 'host') {
        filteredNotifications = mockNotifications.filter(n => 
          n.type === 'owner_notification' || n.type === 'system'
        );
      }
      
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // In real app, this would make an API call to mark as read
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, unread: false }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // In real app, this would make an API call to mark all as read
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, unread: false }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, profile?.user_type]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    loadNotifications,
  };
};
