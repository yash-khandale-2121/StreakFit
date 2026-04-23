// XPBar — animated XP progress bar with level display
export default function XPBar({ xp = 0, level = 1, xpProgress = 0, xpNeeded = 100, compact = false }) {
  const pct = xpNeeded > 0 ? Math.min(100, (xpProgress / xpNeeded) * 100) : 0;

  if (compact) {
    return (
      <div className="xp-bar-compact">
        <span className="xp-level-badge">Lv {level}</span>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="xp-label">{xpProgress}/{xpNeeded}</span>
      </div>
    );
  }

  return (
    <div className="xp-bar-full">
      <div className="xp-header-row">
        <div className="xp-level-circle">
          <span className="xp-level-num">{level}</span>
          <span className="xp-level-word">LVL</span>
        </div>
        <div className="xp-info">
          <div className="xp-title">Level {level}</div>
          <div className="xp-subtitle">{xpProgress.toLocaleString()} / {xpNeeded.toLocaleString()} XP to Level {level + 1}</div>
        </div>
        <div className="xp-total">
          <span className="xp-total-val">{xp.toLocaleString()}</span>
          <span className="xp-total-label">Total XP</span>
        </div>
      </div>
      <div className="xp-track-full">
        <div className="xp-fill-full" style={{ width: `${pct}%` }} />
        <span className="xp-pct">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
