function fmtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Estimate calories for current run (MET 8.0, 70 kg default)
function estimateCalories(durationSeconds) {
  return Math.round(8.0 * 70 * (durationSeconds / 3600));
}

// Estimate XP for current run (no streak mult here — just for display)
function estimateXP(distanceMeters, tilesCaptured) {
  return Math.floor(distanceMeters / 10) + (tilesCaptured || 0) * 5;
}

export default function StatsPanel({ stats, isRunning, isPaused, isSimulating, user }) {
  const dist = stats.distance >= 1000
    ? `${(stats.distance / 1000).toFixed(2)} km`
    : `${Math.round(stats.distance)} m`;

  const calories = estimateCalories(stats.duration ?? 0);
  const xp       = estimateXP(stats.distance ?? 0, stats.tilesCaptured ?? 0);

  return (
    <div className={`stats-panel ${isRunning ? 'running' : ''}`}>
      <div className="stats-header">
        <span className="user-dot" style={{ background: user?.color || '#4ade80' }} />
        <span className="user-name">{user?.username}</span>
        <div className="stats-badges">
          {isRunning && !isPaused && <span className="live-badge">LIVE</span>}
          {isPaused  && <span className="live-badge paused-badge">⏸ PAUSED</span>}
          {isSimulating && <span className="sim-badge">🎮 SIM</span>}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-val">{dist}</span>
          <span className="stat-label">Distance</span>
        </div>
        <div className="stat-card">
          <span className="stat-val">{(stats.speed ?? 0).toFixed(1)}</span>
          <span className="stat-label">km/h</span>
        </div>
        <div className="stat-card">
          <span className="stat-val">{fmtTime(stats.duration ?? 0)}</span>
          <span className="stat-label">Time</span>
        </div>
        <div className="stat-card highlight">
          <span className="stat-val">{stats.tilesCaptured ?? 0}</span>
          <span className="stat-label">Tiles 🏁</span>
        </div>
      </div>

      {/* Live calorie + XP estimates */}
      {isRunning && (
        <div className="stats-live-extras">
          <div className="live-extra-card">
            <span className="live-extra-icon">🔥</span>
            <span className="live-extra-val">{calories}</span>
            <span className="live-extra-label">kcal</span>
          </div>
          <div className="live-extra-card xp-card">
            <span className="live-extra-icon">⭐</span>
            <span className="live-extra-val">+{xp}</span>
            <span className="live-extra-label">XP est.</span>
          </div>
        </div>
      )}

      {stats.tilesRecaptured > 0 && (
        <div className="recapture-badge">⚔️ {stats.tilesRecaptured} tiles stolen from you!</div>
      )}

      <div className="all-time">
        <span>All-time: {Math.round((user?.stats?.totalDistanceMeters || 0) / 1000)} km</span>
        <span>Runs: {user?.stats?.totalRuns || 0}</span>
      </div>

      {/* User level mini bar */}
      {user?.xp !== undefined && (
        <div className="stats-xp-row">
          <span className="stats-lv-badge">Lv {user.level || 1}</span>
          <div className="stats-xp-track">
            <div
              className="stats-xp-fill"
              style={{
                width: `${Math.min(100, ((user.xp - Math.pow((user.level || 1) - 1, 2) * 100) / (Math.pow(user.level || 1, 2) * 100 - Math.pow((user.level || 1) - 1, 2) * 100)) * 100)}%`,
              }}
            />
          </div>
          <span className="stats-xp-val">{(user.xp || 0).toLocaleString()} XP</span>
        </div>
      )}
    </div>
  );
}
