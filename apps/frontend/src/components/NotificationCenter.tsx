import { useEffect, useState, useRef } from 'react';
import apiClient from '../api/client';
import socketService from '../services/socket';
import { showToast } from '../utils/toast';

const TYPE_CONFIG: Record<string, { bg: string; color: string; emoji: string }> = {
  TEAM_INVITATION:        { bg: 'rgba(0,180,216,0.12)',  color: '#00b4d8', emoji: '🛡️' },
  REGISTRATION_CONFIRMED: { bg: 'rgba(144,224,239,0.1)', color: '#90e0ef', emoji: '✅' },
  MATCH_REMINDER:         { bg: 'rgba(0,180,216,0.1)',   color: '#48cae4', emoji: '⏰' },
  SCORE_UPDATE:           { bg: 'rgba(0,119,182,0.12)',  color: '#0077b6', emoji: '⚡' },
  DEFAULT:                { bg: 'rgba(0,180,216,0.06)',  color: 'rgba(248,250,252,0.35)', emoji: '🔔' },
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now  = new Date();
  const diffMs    = now.getTime() - date.getTime();
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);
  if (diffMins  < 1)  return 'Just now';
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays  < 7)  return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);
  const [loading, setLoading]             = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      socketService.connect();
      socketService.subscribeToNotifications(user.id, handleNewNotification);
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        socketService.unsubscribeFromNotifications(user.id);
      }
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/notifications');
      const list = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setNotifications(list);
      setUnreadCount(list.filter((n: any) => !n.read).length);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally { setLoading(false); }
  };

  const handleNewNotification = (notification: any) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
    const msg  = notification.message || notification.title || 'New notification';
    const type = notification.type || '';
    if (type.includes('ERROR') || type.includes('FAIL')) showToast.error(msg);
    else if (type.includes('WARN')) showToast.info(msg);
    else showToast.success(msg);
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {});
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) { console.error('Failed to mark as read:', err); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) { console.error('Failed to mark all as read:', err); }
  };

  return (
    <>
      <style>{`
        @keyframes nc-drop { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }

        .nc-btn {
          position:relative; width:36px; height:36px; border-radius:8px;
          background:transparent; border:none; cursor:pointer;
          color:rgba(248,250,252,0.5); display:flex; align-items:center; justify-content:center;
          transition:background 150ms,color 150ms;
        }
        .nc-btn:hover { background:rgba(0,180,216,0.08); color:#f8fafc; }

        .nc-badge {
          position:absolute; top:2px; right:2px; width:16px; height:16px; border-radius:50%;
          background:#ef4444; display:flex; align-items:center; justify-content:center;
          font-family:'Barlow Condensed',sans-serif; font-size:9px; font-weight:900; color:#fff;
          box-shadow:0 0 8px rgba(239,68,68,0.6);
        }

        .nc-dropdown {
          position:absolute; right:0; top:calc(100% + 8px);
          width:320px; max-height:80vh;
          background:rgba(10,22,40,0.97); border:1px solid rgba(0,180,216,0.2); border-radius:14px;
          box-shadow:0 8px 40px rgba(3,4,94,0.7),0 0 40px rgba(0,180,216,0.08);
          backdrop-filter:blur(20px); overflow:hidden; z-index:60; display:flex; flex-direction:column;
          animation:nc-drop 180ms ease both;
        }
        @media(min-width:640px){ .nc-dropdown { width:380px; } }

        .nc-header {
          padding:15px 20px; background:linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.4));
          border-bottom:1px solid rgba(0,180,216,0.15);
          display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
        }
        .nc-header-title { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:900; letter-spacing:0.06em; text-transform:uppercase; color:#f8fafc; }
        .nc-mark-all {
          font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          color:rgba(0,180,216,0.7); background:none; border:none; cursor:pointer; padding:0;
          transition:color 120ms;
        }
        .nc-mark-all:hover { color:#00b4d8; }

        .nc-list { overflow-y:auto; flex:1; }
        .nc-list::-webkit-scrollbar { width:3px; }
        .nc-list::-webkit-scrollbar-thumb { background:rgba(0,180,216,0.25); border-radius:9999px; }

        .nc-item {
          display:flex; align-items:flex-start; gap:12px; padding:13px 18px;
          border-bottom:1px solid rgba(0,180,216,0.07); cursor:pointer;
          transition:background 120ms;
        }
        .nc-item:last-child { border-bottom:none; }
        .nc-item:hover { background:rgba(0,180,216,0.06); }
        .nc-item.unread { background:rgba(0,180,216,0.04); }

        .nc-icon { width:34px; height:34px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; margin-top:1px; }
        .nc-title { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:#f8fafc; margin-bottom:3px; line-height:1.2; }
        .nc-msg   { font-size:12px; color:rgba(248,250,252,0.5); line-height:1.5; }
        .nc-time  { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:rgba(248,250,252,0.22); margin-top:5px; }
        .nc-dot   { width:7px; height:7px; border-radius:50%; background:#00b4d8; box-shadow:0 0 8px rgba(0,180,216,0.6); flex-shrink:0; margin-top:5px; }

        .nc-loading { display:flex; align-items:center; justify-content:center; padding:40px; }
        .nc-spinner { width:28px; height:28px; border-radius:50%; border:2px solid rgba(0,180,216,0.2); border-top-color:#00b4d8; animation:spin 0.8s linear infinite; }

        .nc-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; gap:10px; }
        .nc-empty-icon  { font-size:34px; opacity:0.25; }
        .nc-empty-label { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:rgba(248,250,252,0.28); }

        .nc-footer {
          padding:12px 20px; border-top:1px solid rgba(0,180,216,0.1); text-align:center; flex-shrink:0;
        }
        .nc-view-all {
          font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          color:rgba(0,180,216,0.55); background:none; border:none; cursor:pointer; padding:0;
          transition:color 120ms;
        }
        .nc-view-all:hover { color:#00b4d8; }
      `}</style>

      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button className="nc-btn" onClick={() => setIsOpen(!isOpen)}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="nc-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {isOpen && (
          <div className="nc-dropdown">
            {/* Header */}
            <div className="nc-header">
              <span className="nc-header-title">Notifications</span>
              {unreadCount > 0 && (
                <button className="nc-mark-all" onClick={handleMarkAllAsRead}>Mark all read</button>
              )}
            </div>

            {/* List */}
            <div className="nc-list">
              {loading ? (
                <div className="nc-loading"><div className="nc-spinner" /></div>
              ) : notifications.length === 0 ? (
                <div className="nc-empty">
                  <div className="nc-empty-icon">🔔</div>
                  <div className="nc-empty-label">No notifications yet</div>
                </div>
              ) : (
                notifications.map((n) => {
                  const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.DEFAULT;
                  return (
                    <div key={n.id} className={`nc-item${!n.read ? ' unread' : ''}`}
                      onClick={() => !n.read && handleMarkAsRead(n.id)}>
                      <div className="nc-icon" style={{ background: tc.bg, border: `1px solid ${tc.bg}` }}>
                        {tc.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="nc-title">{n.title}</div>
                        <div className="nc-msg">{n.message}</div>
                        <div className="nc-time">{formatTime(n.createdAt)}</div>
                      </div>
                      {!n.read && <div className="nc-dot" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="nc-footer">
              <button className="nc-view-all" onClick={() => setIsOpen(false)}>
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default NotificationCenter;