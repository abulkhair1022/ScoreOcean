import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const TYPE_CONFIG: Record<string, { bg: string; color: string; icon: string }> = {
  NEW_TOURNAMENT:         { bg: 'rgba(0,180,216,0.12)',  color: '#00b4d8', icon: '🏆' },
  TOURNAMENT_UPDATE:      { bg: 'rgba(144,224,239,0.1)', color: '#90e0ef', icon: '📢' },
  REGISTRATION_CONFIRMED: { bg: 'rgba(0,119,182,0.12)',  color: '#0077b6', icon: '✅' },
  DEFAULT:                { bg: 'rgba(0,180,216,0.06)',  color: 'rgba(248,250,252,0.4)', icon: '🔔' },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown]   = useState(false);

  useEffect(() => {
    fetchNotifications();
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
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <style>{`
        @keyframes nb-drop { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .nb-bell-btn {
          position:relative; width:36px; height:36px; border-radius:8px;
          background:transparent; border:none; cursor:pointer;
          color:rgba(248,250,252,0.5); display:flex; align-items:center; justify-content:center;
          transition:background 150ms,color 150ms;
        }
        .nb-bell-btn:hover { background:rgba(0,180,216,0.08); color:#f8fafc; }
        .nb-dropdown {
          position:absolute; right:0; top:calc(100% + 8px); width:360px;
          background:rgba(10,22,40,0.97); border:1px solid rgba(0,180,216,0.2); border-radius:14px;
          box-shadow:0 8px 40px rgba(3,4,94,0.7),0 0 40px rgba(0,180,216,0.08);
          backdrop-filter:blur(20px); overflow:hidden; z-index:60;
          animation:nb-drop 180ms ease both;
        }
        .nb-header {
          padding:16px 20px; background:linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.4));
          border-bottom:1px solid rgba(0,180,216,0.15); display:flex; align-items:center; justify-content:space-between;
        }
        .nb-header-title { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:900; letter-spacing:0.06em; text-transform:uppercase; color:#f8fafc; }
        .nb-unread-badge { padding:3px 10px; border-radius:9999px; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:rgba(0,180,216,0.15); border:1px solid rgba(0,180,216,0.3); color:#00b4d8; }
        .nb-list { max-height:360px; overflow-y:auto; }
        .nb-list::-webkit-scrollbar { width:3px; }
        .nb-list::-webkit-scrollbar-thumb { background:rgba(0,180,216,0.3); border-radius:9999px; }
        .nb-item {
          display:flex; align-items:flex-start; gap:12px; padding:14px 20px;
          border-bottom:1px solid rgba(0,180,216,0.08); cursor:pointer;
          transition:background 120ms;
        }
        .nb-item:last-child { border-bottom:none; }
        .nb-item:hover { background:rgba(0,180,216,0.06); }
        .nb-item.unread { background:rgba(0,180,216,0.04); }
        .nb-item-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
        .nb-item-title { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.03em; text-transform:uppercase; color:#f8fafc; margin-bottom:3px; }
        .nb-item-msg   { font-size:12px; color:rgba(248,250,252,0.5); line-height:1.5; }
        .nb-item-time  { font-size:10px; font-family:'Barlow Condensed',sans-serif; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:rgba(248,250,252,0.25); margin-top:5px; }
        .nb-unread-dot { width:7px; height:7px; border-radius:50%; background:#00b4d8; flex-shrink:0; margin-top:4px; box-shadow:0 0 8px rgba(0,180,216,0.6); }
        .nb-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; gap:12px; }
        .nb-empty-icon  { font-size:36px; opacity:0.25; }
        .nb-empty-label { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:rgba(248,250,252,0.3); }
      `}</style>

      <div style={{ position: 'relative' }}>
        <button className="nb-bell-btn" onClick={() => setShowDropdown(!showDropdown)}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 900, color: '#fff', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}>
              {unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setShowDropdown(false)} />
            <div className="nb-dropdown">
              <div className="nb-header">
                <span className="nb-header-title">Notifications</span>
                {unreadCount > 0 && <span className="nb-unread-badge">{unreadCount} new</span>}
              </div>

              <div className="nb-list">
                {notifications.length > 0 ? (
                  notifications.map((n) => {
                    const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.DEFAULT;
                    return (
                      <div key={n.id} className={`nb-item${!n.read ? ' unread' : ''}`} onClick={() => !n.read && markAsRead(n.id)}>
                        <div className="nb-item-icon" style={{ background: tc.bg, border: `1px solid ${tc.bg}` }}>
                          {tc.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="nb-item-title">{n.title}</div>
                          <div className="nb-item-msg">{n.message}</div>
                          <div className="nb-item-time">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        {!n.read && <div className="nb-unread-dot" />}
                      </div>
                    );
                  })
                ) : (
                  <div className="nb-empty">
                    <div className="nb-empty-icon">🔔</div>
                    <div className="nb-empty-label">No notifications</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}