import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ColorPicker from './ColorPicker';
import NotificationBell from './NotificationBell';
import api from '../services/api';

export default function Navbar({ user, isRunning, isPaused }) {
  const { logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const [open,         setOpen]         = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Poll for pending friend requests
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const { data } = await api.get('/social/requests');
        setPendingCount(data.requests?.length || 0);
      } catch { }
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [user]);

  const runStatus = isRunning
    ? (isPaused ? { label: 'Paused', cls: 'dot-paused' } : { label: 'Running', cls: 'dot-running' })
    : { label: 'Ready', cls: 'dot-ready' };

  const navLinks = [
    { to: '/dashboard',   icon: '🗺️', label: 'Map'         },
    { to: '/stats',       icon: '📊', label: 'Stats'       },
    { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
    { to: '/social',      icon: '👥', label: 'Social',     badge: pendingCount },
    { to: '/profile',     icon: '🎮', label: 'Profile'     },
    { to: '/settings',    icon: '⚙️', label: 'Settings'    },
  ];

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-logo">⚡</span>
          <span className="nav-title">StreakFit</span>
          <div className="conn-dot-wrap">
            <div className={`conn-dot ${connected ? 'on' : 'off'}`} title={connected ? 'Connected' : 'Disconnected'} />
          </div>
        </div>

        {/* Desktop nav links */}
        <div className="nav-links">
          {navLinks.filter(l => l.to !== '/settings').map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
              {link.badge > 0 && <span className="nav-badge">{link.badge}</span>}
            </Link>
          ))}
        </div>

        <div className="nav-right-group">
          {/* Run status — hidden on mobile */}
          <div className="nav-status nav-status-desktop">
            <div className={`nav-status-dot ${runStatus.cls}`} />
            <span>{runStatus.label}</span>
          </div>

          {/* Notification bell */}
          <NotificationBell user={user} />

          {/* User menu (desktop) */}
          <div className="nav-right nav-right-desktop" ref={dropRef}>
            <button id="btn-nav-user" className="nav-user" onClick={() => setOpen(o => !o)}>
              <div className="avatar" style={{ background: user?.color || '#4ade80' }}>
                {(user?.username || '?')[0].toUpperCase()}
              </div>
              <span className="nav-username">{user?.username}</span>
              {user?.level && (
                <span className="nav-level-badge">Lv {user.level}</span>
              )}
            </button>
            {open && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-header">
                  <div className="nav-dd-user">
                    <div className="avatar lg" style={{ background: user?.color || '#4ade80' }}>
                      {(user?.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="nav-dd-name">{user?.username}</div>
                      <div className="nav-dd-xp">{(user?.xp || 0).toLocaleString()} XP · Lv {user?.level || 1}</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setShowPicker(true); setOpen(false); }}>🎨 Change Color</button>
                <Link to="/profile"  className="nav-dd-link" onClick={() => setOpen(false)}>🎮 Profile & Achievements</Link>
                <Link to="/stats"    className="nav-dd-link" onClick={() => setOpen(false)}>📊 My Stats</Link>
                <Link to="/settings" className="nav-dd-link" onClick={() => setOpen(false)}>⚙️ Settings</Link>
                <button className="logout-btn" onClick={logout}>🚪 Sign out</button>
              </div>
            )}
          </div>

          {/* Hamburger button (mobile only) */}
          <button
            className={`nav-hamburger ${mobileOpen ? 'open' : ''}`}
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            {/* User header */}
            <div className="mobile-menu-user">
              <div className="avatar lg" style={{ background: user?.color || '#4ade80' }}>
                {(user?.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="mobile-menu-name">{user?.username}</div>
                <div className="mobile-menu-sub">{(user?.xp || 0).toLocaleString()} XP · Lv {user?.level || 1}</div>
              </div>
              {/* Run status in mobile menu */}
              <div className="mobile-run-status">
                <div className={`nav-status-dot ${runStatus.cls}`} />
                <span>{runStatus.label}</span>
              </div>
            </div>

            {/* Nav links */}
            <div className="mobile-menu-links">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`mobile-menu-link ${location.pathname === link.to ? 'active' : ''}`}
                >
                  <span className="mobile-link-icon">{link.icon}</span>
                  <span>{link.label}</span>
                  {link.badge > 0 && <span className="nav-badge">{link.badge}</span>}
                </Link>
              ))}
            </div>

            {/* Bottom actions */}
            <div className="mobile-menu-footer">
              <button className="mobile-color-btn" onClick={() => { setShowPicker(true); setMobileOpen(false); }}>
                🎨 Change Territory Color
              </button>
              <button className="mobile-logout-btn" onClick={logout}>
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && <ColorPicker onClose={() => setShowPicker(false)} />}
    </>
  );
}
