import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── helpers ─────────────────────────────────────────────────── */
function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtPace(distM, durSec) {
  if (!distM || distM < 100 || !durSec) return '—';
  const spk = durSec / (distM / 1000);
  const mi  = Math.floor(spk / 60);
  const si  = Math.round(spk % 60);
  return `${mi}:${String(si).padStart(2, '0')} /km`;
}

/* ── XP counter animation ─────────────────────────────────────── */
function CountUp({ target, duration = 1400, suffix = '' }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      setCurrent(Math.floor(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{current.toLocaleString()}{suffix}</>;
}

/* ── Achievement badge row ───────────────────────────────────── */
const ACH_MAP = {
  first_run:  { icon: '👟', name: 'First Steps'      },
  '5km':      { icon: '🏃', name: '5K Club'           },
  '10km':     { icon: '🔥', name: '10K Beast'         },
  tiles_10:   { icon: '🌱', name: 'Planter'           },
  tiles_100:  { icon: '⚔️', name: 'Conqueror'         },
  streak_3:   { icon: '🔥', name: 'On Fire'           },
  streak_7:   { icon: '🗓️', name: 'Weekly Warrior'    },
  streak_30:  { icon: '🏅', name: 'Iron Runner'       },
  level_5:    { icon: '⭐', name: 'Rising Star'       },
  level_10:   { icon: '👑', name: 'Territory King'    },
};

/* ── main component ──────────────────────────────────────────── */
export default function RunSummaryModal({ result, onDismiss }) {
  const navigate   = useNavigate();
  const overlayRef = useRef(null);

  const {
    distanceMeters = 0, durationSeconds = 0, tilesCaptured = 0,
    tilesRecaptured = 0, avgSpeedKmh = 0,
    xpEarned = 0, caloriesBurned = 0,
    newlyEarned = [], streakCurrent = 0, user,
  } = result || {};

  const dist  = (distanceMeters / 1000).toFixed(2);
  const grade = distanceMeters >= 10000 ? 'EPIC' : distanceMeters >= 5000 ? 'GREAT' : distanceMeters >= 1000 ? 'NICE' : 'DONE';

  return (
    <div className="rsm-overlay" ref={overlayRef}>
      <div className="rsm-card">

        {/* ── Grade banner ─────────────────────────────────── */}
        <div className="rsm-grade-wrap">
          <div className="rsm-grade">{grade} RUN!</div>
          <div className="rsm-subtitle">
            {streakCurrent > 1 ? `🔥 ${streakCurrent}-day streak active` : 'Keep it up!'}
          </div>
        </div>

        {/* ── Distance hero ────────────────────────────────── */}
        <div className="rsm-hero-dist">
          <span className="rsm-dist-val">{dist}</span>
          <span className="rsm-dist-unit">km</span>
        </div>

        {/* ── Stat grid ────────────────────────────────────── */}
        <div className="rsm-stat-grid">
          <div className="rsm-stat">
            <span className="rsm-stat-icon">⏱</span>
            <span className="rsm-stat-val">{fmtDuration(durationSeconds)}</span>
            <span className="rsm-stat-label">Time</span>
          </div>
          <div className="rsm-stat">
            <span className="rsm-stat-icon">⚡</span>
            <span className="rsm-stat-val">{fmtPace(distanceMeters, durationSeconds)}</span>
            <span className="rsm-stat-label">Pace</span>
          </div>
          <div className="rsm-stat">
            <span className="rsm-stat-icon">🏎</span>
            <span className="rsm-stat-val">{(avgSpeedKmh || 0).toFixed(1)}</span>
            <span className="rsm-stat-label">km/h avg</span>
          </div>
          <div className="rsm-stat highlight-tile">
            <span className="rsm-stat-icon">🟦</span>
            <span className="rsm-stat-val">{tilesCaptured}</span>
            <span className="rsm-stat-label">Tiles</span>
          </div>
          <div className="rsm-stat highlight-cal">
            <span className="rsm-stat-icon">🔥</span>
            <span className="rsm-stat-val">{caloriesBurned}</span>
            <span className="rsm-stat-label">kcal</span>
          </div>
          {tilesRecaptured > 0 && (
            <div className="rsm-stat highlight-recap">
              <span className="rsm-stat-icon">⚔️</span>
              <span className="rsm-stat-val">{tilesRecaptured}</span>
              <span className="rsm-stat-label">Stolen</span>
            </div>
          )}
        </div>

        {/* ── XP earned ────────────────────────────────────── */}
        <div className="rsm-xp-banner">
          <div className="rsm-xp-glow" />
          <span className="rsm-xp-label">XP EARNED</span>
          <span className="rsm-xp-val">
            +<CountUp target={xpEarned} duration={1200} />
          </span>
          {user && (
            <div className="rsm-xp-level">
              <span>Level {user.level || 1}</span>
              <div className="rsm-xp-track">
                <div className="rsm-xp-fill" style={{
                  width: `${Math.min(100, ((user.xp - Math.pow((user.level || 1) - 1, 2) * 100) /
                    (Math.pow(user.level || 1, 2) * 100 - Math.pow((user.level || 1) - 1, 2) * 100)) * 100)}%`
                }} />
              </div>
              <span>{(user.xp || 0).toLocaleString()} XP</span>
            </div>
          )}
        </div>

        {/* ── Achievements unlocked ────────────────────────── */}
        {newlyEarned.length > 0 && (
          <div className="rsm-achievements">
            <div className="rsm-ach-title">🏅 Achievements Unlocked!</div>
            <div className="rsm-ach-list">
              {newlyEarned.map(key => {
                const a = ACH_MAP[key] || { icon: '⭐', name: key };
                return (
                  <div key={key} className="rsm-ach-badge">
                    <span className="rsm-ach-icon">{a.icon}</span>
                    <span className="rsm-ach-name">{a.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Action buttons ───────────────────────────────── */}
        <div className="rsm-actions">
          <button className="rsm-btn-stats" onClick={() => { onDismiss(); navigate('/stats'); }}>
            📊 View Stats
          </button>
          <button className="rsm-btn-close" onClick={onDismiss}>
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}
