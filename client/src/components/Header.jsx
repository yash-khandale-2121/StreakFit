import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ColorPicker from './ColorPicker';

const STATUS = {
  stopped: { label: 'Ready',   cls: 'status-ready'   },
  running: { label: 'Running', cls: 'status-running'  },
  paused:  { label: 'Paused',  cls: 'status-paused'   },
};

export default function Header({ isRunning, isPaused }) {
  const { user, logout }        = useAuth();
  const { connected }           = useSocket();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const menuRef = useRef(null);

  const status = isRunning ? (isPaused ? STATUS.paused : STATUS.running) : STATUS.stopped;

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header className="app-header">
        {/* Left: Brand */}
        <div className="header-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">Territory Run</span>
          <span className={`conn-pill ${connected ? 'conn-online' : 'conn-offline'}`}>
            <span className="conn-dot-sm" />
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Center: Status badge */}
        <div className={`run-status-badge ${status.cls}`}>
          <span className="status-dot" />
          <span className="status-label">{status.label}</span>
        </div>

        {/* Right: User */}
        <div className="header-right" ref={menuRef}>
          <button className="user-pill" id="btn-user-menu" onClick={() => setMenuOpen(o => !o)}>
            <span className="avatar-circle" style={{ background: user?.color || '#4ade80' }}>
              {user?.username?.[0]?.toUpperCase()}
            </span>
            <span className="username-text">{user?.username}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {menuOpen && (
            <div className="user-dropdown" role="menu">
              <div className="dropdown-info">
                <span className="avatar-circle lg" style={{ background: user?.color || '#4ade80' }}>
                  {user?.username?.[0]?.toUpperCase()}
                </span>
                <div>
                  <div className="dropdown-name">{user?.username}</div>
                  <div className="dropdown-email">{user?.email}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => { setPickerOpen(true); setMenuOpen(false); }}>
                <span>🎨</span> Change Color
              </button>
              <button className="dropdown-item danger" onClick={logout}>
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {pickerOpen && <ColorPicker onClose={() => setPickerOpen(false)} />}
    </>
  );
}
