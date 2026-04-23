function fmt(n, dec = 1) { return Number(n ?? 0).toFixed(dec); }

function formatTime(secs) {
  const s = Math.floor(secs ?? 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function StatCard({ value, unit, label, accent }) {
  return (
    <div className={`stat-card-v2 ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-val-v2">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      <div className="stat-label-v2">{label}</div>
    </div>
  );
}

export default function StatsOverlay({ stats, isRunning, isPaused, user, isSimulating }) {
  const dist      = stats.distance >= 1000
    ? { val: fmt(stats.distance / 1000), unit: 'km' }
    : { val: Math.round(stats.distance), unit: 'm'  };

  return (
    <div className={`stats-overlay ${isRunning ? 'stats-active' : ''}`}>
      {/* Header row */}
      <div className="stats-ov-header">
        <span className="ov-avatar" style={{ background: user?.color || '#4ade80' }}>
          {user?.username?.[0]?.toUpperCase()}
        </span>
        <span className="ov-username">{user?.username}</span>
        {isRunning && (
          <span className={`live-chip ${isPaused ? 'chip-paused' : ''}`}>
            {isPaused ? '⏸ PAUSED' : '● LIVE'}
          </span>
        )}
        {isSimulating && <span className="sim-chip">🎮 SIM</span>}
      </div>

      {/* Stats grid */}
      <div className="stats-grid-v2">
        <StatCard value={dist.val} unit={dist.unit} label="Distance" accent={isRunning} />
        <StatCard value={formatTime(stats.duration)} label="Time"     accent={isRunning} />
        <StatCard value={fmt(stats.speed)} unit="km/h" label="Speed" />
        <StatCard value={stats.tilesCaptured ?? 0} label="Tiles 🏁"   accent={!!stats.tilesCaptured} />
      </div>

      {/* All-time footer */}
      <div className="stats-ov-footer">
        <span>All-time</span>
        <span>{fmt(user?.totalDistanceKm ?? 0, 1)} km · {user?.totalRuns ?? 0} runs</span>
      </div>
    </div>
  );
}
