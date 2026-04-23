import { useState } from 'react';

export default function NearbyPanel({ users }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`nearby-panel ${open ? 'nearby-open' : 'nearby-closed'}`}>
      {/* Toggle tab */}
      <button
        id="btn-nearby-toggle"
        className="nearby-toggle"
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close nearby panel' : 'Show nearby runners'}
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s' }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {!open && users.length > 0 && (
          <span className="nearby-count">{users.length}</span>
        )}
      </button>

      {/* Panel content */}
      {open && (
        <div className="nearby-content">
          <div className="nearby-header">
            <span className="panel-title">👥 Nearby Runners</span>
            <span className="nearby-badge">{users.length}</span>
          </div>

          {users.length === 0 ? (
            <div className="nearby-empty-v2">
              <span>🏃</span>
              <p>No runners nearby</p>
              <small>Within 1 km radius</small>
            </div>
          ) : (
            <ul className="nearby-list">
              {users.map((u) => (
                <li key={u.userId} className="nearby-item">
                  <span className="nearby-avatar" style={{ background: u.color }}>
                    {u.username[0].toUpperCase()}
                  </span>
                  <div className="nearby-meta">
                    <span className="nearby-name">{u.username}</span>
                    <span className="nearby-dist">{u.distance} m away</span>
                  </div>
                  <div className="nearby-speed-v2">{Number(u.speed ?? 0).toFixed(1)} km/h</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
