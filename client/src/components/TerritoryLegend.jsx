import { useState } from 'react';

export default function TerritoryLegend({ tiles, showTiles, showUsers, onToggleTiles, onToggleUsers }) {
  const [collapsed, setCollapsed] = useState(false);

  // Get unique owners from loaded tiles
  const owners = Object.values(
    Object.values(tiles).reduce((acc, t) => {
      acc[t.ownerId] = { name: t.ownerUsername, color: t.ownerColor, count: (acc[t.ownerId]?.count || 0) + 1 };
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className={`territory-legend ${collapsed ? 'legend-collapsed' : ''}`}>
      {/* Header */}
      <div className="legend-header" onClick={() => setCollapsed(c => !c)} style={{ cursor: 'pointer' }}>
        <span className="legend-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Territory
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </div>

      {!collapsed && (
        <>
          {/* Color legend */}
          {owners.length > 0 && (
            <div className="legend-owners">
              {owners.map((o) => (
                <div key={o.name} className="legend-owner">
                  <span className="legend-swatch" style={{ background: o.color }} />
                  <span className="legend-owner-name">{o.name}</span>
                  <span className="legend-tile-count">{o.count}</span>
                </div>
              ))}
            </div>
          )}

          {owners.length > 0 && <div className="legend-divider" />}

          {/* Toggles */}
          <div className="legend-toggles">
            <label className="legend-toggle">
              <input type="checkbox" checked={showTiles} onChange={onToggleTiles} />
              <span className="toggle-track" />
              <span className="toggle-label">Show tiles</span>
            </label>
            <label className="legend-toggle">
              <input type="checkbox" checked={showUsers} onChange={onToggleUsers} />
              <span className="toggle-track" />
              <span className="toggle-label">Show runners</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
