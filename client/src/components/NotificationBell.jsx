import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

/* ── helpers ─────────────────────────────────────────────── */
function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACH_ICONS = {
  first_run: '👟', '5km': '🏃', '10km': '🔥', tiles_10: '🌱',
  tiles_100: '⚔️', streak_3: '🔥', streak_7: '🗓️', streak_30: '🏅',
  level_5: '⭐', level_10: '👑',
};
const ACH_NAMES = {
  first_run: 'First Steps', '5km': '5K Club', '10km': '10K Beast',
  tiles_10: 'Planter', tiles_100: 'Conqueror', streak_3: 'On Fire',
  streak_7: 'Weekly Warrior', streak_30: 'Iron Runner',
  level_5: 'Rising Star', level_10: 'Territory King',
};

/* ── main component ──────────────────────────────────────── */
export default function NotificationBell({ user }) {
  const [open,         setOpen]         = useState(false);
  const [notifications, setNotifs]      = useState([]);
  const [unread,        setUnread]      = useState(0);
  const [loading,       setLoading]     = useState(false);
  const panelRef   = useRef(null);
  const pollRef    = useRef(null);

  /* Build notifications from friend-requests + recent achievements */
  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const [reqRes, gamifRes] = await Promise.all([
        api.get('/social/requests'),
        api.get('/gamification/profile'),
      ]);

      const list = [];

      // Pending friend requests
      (reqRes.data.requests || []).forEach(r => {
        list.push({
          id:     r._id,
          type:   'friend_request',
          icon:   '🤝',
          title:  `${r.fromId?.username} wants to be friends`,
          sub:    `Level ${r.fromId?.level || 1}`,
          time:   r.createdAt || new Date().toISOString(),
          action: r._id,
          userId: r.fromId?._id,
        });
      });

      // Recent achievement unlocks (only earned ones, newest last)
      const achs = (gamifRes.data?.achievements || [])
        .filter(a => a.earned)
        .map(a => a.key)
        .slice(-3)
        .reverse();
      achs.forEach(key => {
        list.push({
          id:    `ach_${key}`,
          type:  'achievement',
          icon:  ACH_ICONS[key] || '🏅',
          title: `Achievement Unlocked: ${ACH_NAMES[key] || key}`,
          sub:   'Congrats on your new badge!',
          time:  new Date().toISOString(),
        });
      });

      // Sort newest first
      list.sort((a, b) => new Date(b.time) - new Date(a.time));

      setNotifs(list);
      setUnread(list.filter(n => n.type === 'friend_request').length);
    } catch {}
  }, [user]);

  /* Initial load + polling every 30s */
  useEffect(() => {
    fetchNotifs();
    pollRef.current = setInterval(fetchNotifs, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifs]);

  /* Close on outside click */
  useEffect(() => {
    const h = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleAccept = async (requestId) => {
    try {
      await api.patch(`/social/requests/${requestId}`, { action: 'accept' });
      fetchNotifs();
    } catch {}
  };

  const handleReject = async (requestId) => {
    try {
      await api.patch(`/social/requests/${requestId}`, { action: 'reject' });
      fetchNotifs();
    } catch {}
  };

  const toggle = () => {
    setOpen(o => !o);
    if (!open) setUnread(0); // mark read on open
  };

  return (
    <div className="notif-bell-wrap" ref={panelRef}>

      {/* Bell button */}
      <button
        id="btn-notif-bell"
        className={`notif-bell-btn ${unread > 0 ? 'has-notif' : ''}`}
        onClick={toggle}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        🔔
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="notif-panel">
          {/* Header */}
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            <button className="notif-refresh" onClick={fetchNotifs} title="Refresh">↺</button>
          </div>

          {/* List */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span>🔕</span>
                <p>All caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item notif-${n.type}`}>
                  <div className="notif-item-icon">{n.icon}</div>
                  <div className="notif-item-body">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-sub">{n.sub}</div>
                    <div className="notif-item-time">{timeAgo(n.time)}</div>

                    {/* Friend request inline actions */}
                    {n.type === 'friend_request' && (
                      <div className="notif-fr-actions">
                        <button className="notif-btn-accept" onClick={() => handleAccept(n.action)}>
                          ✓ Accept
                        </button>
                        <button className="notif-btn-reject" onClick={() => handleReject(n.action)}>
                          ✕ Decline
                        </button>
                        {n.userId && (
                          <Link to={`/user/${n.userId}`} className="notif-view-profile" onClick={() => setOpen(false)}>
                            View Profile →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="notif-panel-footer">
            <Link to="/social" className="notif-footer-link" onClick={() => setOpen(false)}>
              View all social activity →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
