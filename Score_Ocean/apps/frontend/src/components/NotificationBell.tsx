import { useEffect, useState } from 'react';
import apiClient from '../api/client';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      fetchNotifications(); // Refresh
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.type === 'NEW_TOURNAMENT' ? 'bg-green-100' :
                          notification.type === 'TOURNAMENT_UPDATE' ? 'bg-blue-100' :
                          notification.type === 'REGISTRATION_CONFIRMED' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          <svg className={`w-5 h-5 ${
                            notification.type === 'NEW_TOURNAMENT' ? 'text-green-600' :
                            notification.type === 'TOURNAMENT_UPDATE' ? 'text-blue-600' :
                            notification.type === 'REGISTRATION_CONFIRMED' ? 'text-purple-600' :
                            'text-gray-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm text-gray-500">No notifications</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
