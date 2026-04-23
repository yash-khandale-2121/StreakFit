import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import XPBar from '../components/XPBar';
import ColorPicker from '../components/ColorPicker';
import api from '../services/api';

/* ── helpers ──────────────────────────────────────────────── */
function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtPace(distM, durSec) {
  if (!distM || distM < 100 || !durSec) return '—';
  const secPerKm = durSec / (distM / 1000);
  const mi = Math.floor(secPerKm / 60);
  const si = Math.round(secPerKm % 60);
  return `${mi}:${String(si).padStart(2, '0')} /km`;
}

/* ── Achievement tooltip card ──────────────────────────────── */
function AchCard({ icon, name, description, xpReward, earned }) {
  const [tip, setTip] = useState(false);
  return (
    <div
      className={`achievement-card ${earned ? 'earned' : 'locked'}`}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <div className="ach-icon">{earned ? icon : '🔒'}</div>
      <div className="ach-name">{name}</div>
      <div className="ach-xp">+{xpReward} XP</div>
      {!earned && <div className="ach-locked-overlay" />}
      {tip && (
        <div className="ach-tooltip">
          <div className="ach-tip-icon">{earned ? icon : '🔒'}</div>
          <div className="ach-tip-name">{name}</div>
          <div className="ach-tip-desc">{description}</div>
          <div className="ach-tip-xp">+{xpReward} XP reward</div>
          {!earned && <div className="ach-tip-status">🔒 Locked</div>}
          {earned  && <div className="ach-tip-earned">✅ Unlocked!</div>}
        </div>
      )}
    </div>
  );
}

/* ── main component ────────────────────────────────────────── */
export default function Profile() {
  const { user, updateUser } = useAuth();
  const [gamif,       setGamif]       = useState(null);
  const [runs,        setRuns]        = useState([]);
  const [runMeta,     setRunMeta]     = useState({ total: 0, pages: 1 });
  const [runPage,     setRunPage]     = useState(1);
  const [tab,         setTab]         = useState('stats');   // stats | achievements | history
  const [loading,     setLoading]     = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [bio,         setBio]         = useState(user?.bio || '');
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [showColor,   setShowColor]   = useState(false);

  /* load gamification profile */
  useEffect(() => {
    api.get('/gamification/profile')
      .then(r => { setGamif(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /* load run history when tab switches */
  const loadRuns = useCallback(async (page) => {
    setRunsLoading(true);
    try {
      const { data } = await api.get(`/dashboard/history?page=${page}`);
      setRuns(data.sessions || []);
      setRunMeta({ total: data.total, pages: data.pages });
    } catch {}
    setRunsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'history') loadRuns(runPage);
  }, [tab, runPage, loadRuns]);

  /* save bio */
  const saveBio = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/bio', { bio });
      updateUser(data.user);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const earned = gamif?.achievements?.filter(a => a.earned).length || 0;
  const total  = gamif?.achievements?.length || 0;

  return (
    <div className="page-layout">
      <Navbar user={user} />
      <div className="page-body profile-page">

        {/* ── Profile Hero ───────────────────────────────────── */}
        <div className="profile-hero">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-ring" style={{ '--ring-color': user?.color || '#4ade80' }}>
              <div className="profile-avatar-lg" style={{ background: user?.color || '#4ade80' }}>
                {(user?.username || '?')[0].toUpperCase()}
              </div>
            </div>
            <button className="btn-change-color" onClick={() => setShowColor(true)} title="Change color">🎨</button>
          </div>

          <div className="profile-hero-info">
            <h1 className="profile-username">{user?.username}</h1>

            {editing ? (
              <div className="bio-edit-row">
                <input className="social-input bio-input" value={bio} maxLength={160}
                  onChange={e => setBio(e.target.value)} placeholder="Write a short bio…" />
                <button className="btn-primary-sm" onClick={saveBio} disabled={saving}>
                  {saving ? '…' : 'Save'}
                </button>
                <button className="btn-secondary-sm" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <div className="bio-row">
                <p className="profile-bio">{user?.bio || 'No bio yet — tell the world who you are!'}</p>
                <button className="btn-edit-bio" onClick={() => setEditing(true)}>✏️</button>
              </div>
            )}

            <div className="profile-badges">
              <span className="profile-badge">🏃 {user?.stats?.totalRuns || 0} runs</span>
              <span className="profile-badge">📏 {((user?.stats?.totalDistanceMeters || 0) / 1000).toFixed(1)} km</span>
              <span className="profile-badge">🔥 {gamif?.streak?.current || 0}-day streak</span>
              <span className="profile-badge">⭐ Level {user?.level || 1}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="page-loading"><span className="page-spinner" />Loading profile…</div>
        ) : (
          <>
            {/* XP Bar always visible */}
            {gamif && (
              <div className="section">
                <XPBar xp={gamif.xp} level={gamif.level} xpProgress={gamif.xpProgress} xpNeeded={gamif.xpNeeded} />
              </div>
            )}

            {/* Tab bar */}
            <div className="stats-tabs">
              {[
                { id: 'stats',        label: '📊 Stats' },
                { id: 'achievements', label: `🏅 Achievements (${earned}/${total})` },
                { id: 'history',      label: '📋 Run History' },
              ].map(t => (
                <button key={t.id}
                  className={`stats-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >{t.label}</button>
              ))}
            </div>

            {/* ── STATS TAB ──────────────────────────────────── */}
            {tab === 'stats' && (
              <>
                <div className="section">
                  <h2 className="section-title">Territory Stats</h2>
                  <div className="profile-stats-row">
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{(user?.stats?.totalTilesCaptured || 0).toLocaleString()}</span>
                      <span className="profile-stat-label">Tiles Captured</span>
                    </div>
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{(user?.stats?.totalCalories || 0).toLocaleString()}</span>
                      <span className="profile-stat-label">Calories Burned</span>
                    </div>
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{gamif?.streak?.longest || 0}</span>
                      <span className="profile-stat-label">Best Streak 🔥</span>
                    </div>
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{(user?.xp || 0).toLocaleString()}</span>
                      <span className="profile-stat-label">Total XP ⭐</span>
                    </div>
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{user?.stats?.totalRuns || 0}</span>
                      <span className="profile-stat-label">Total Runs</span>
                    </div>
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{((user?.stats?.totalDistanceMeters || 0) / 1000).toFixed(1)} km</span>
                      <span className="profile-stat-label">Total Distance</span>
                    </div>
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{fmtDuration(user?.stats?.totalTimeSeconds || 0)}</span>
                      <span className="profile-stat-label">Total Time</span>
                    </div>
                    <div className="profile-stat-card">
                      <span className="profile-stat-val">{earned}</span>
                      <span className="profile-stat-label">Achievements</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── ACHIEVEMENTS TAB ───────────────────────────── */}
            {tab === 'achievements' && (
              <div className="section">
                <div className="section-header-row">
                  <h2 className="section-title">Achievements</h2>
                  <span className="ach-progress-label">{earned} / {total} unlocked</span>
                </div>
                <div className="ach-progress-bar-wrap">
                  <div className="ach-progress-bar-fill" style={{ width: `${total > 0 ? (earned / total) * 100 : 0}%` }} />
                </div>
                <div className="ach-grid" style={{ marginTop: '1.25rem' }}>
                  {gamif?.achievements?.map(a => (
                    <AchCard key={a.key} {...a} />
                  ))}
                </div>
              </div>
            )}

            {/* ── HISTORY TAB ────────────────────────────────── */}
            {tab === 'history' && (
              <div className="section">
                <h2 className="section-title">Run History ({runMeta.total})</h2>
                {runsLoading ? (
                  <div className="page-loading"><span className="page-spinner" />Loading runs…</div>
                ) : runs.length === 0 ? (
                  <p className="empty-hint">No runs yet — start your first run from the Dashboard!</p>
                ) : (
                  <>
                    <div className="run-table">
                      <div className="run-table-head">
                        <span>Date</span>
                        <span>Distance</span>
                        <span>Time</span>
                        <span>Pace</span>
                        <span>Tiles</span>
                        <span>Calories</span>
                        <span>XP</span>
                      </div>
                      {runs.map(s => (
                        <div key={s._id} className="run-table-row">
                          <span className="run-td-date">
                            {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            <span className="run-td-year">{new Date(s.startTime).getFullYear()}</span>
                          </span>
                          <span className="run-td-dist">{((s.distanceMeters || 0) / 1000).toFixed(2)} km</span>
                          <span className="run-td-dur">{fmtDuration(s.durationSeconds || 0)}</span>
                          <span className="run-td-pace">{fmtPace(s.distanceMeters, s.durationSeconds)}</span>
                          <span className="run-td-tiles">🟦 {s.tilesCaptured || 0}</span>
                          <span className="run-td-cal">🔥 {s.caloriesBurned || 0}</span>
                          <span className="run-td-xp">+{s.xpEarned || 0} XP</span>
                        </div>
                      ))}
                    </div>
                    {runMeta.pages > 1 && (
                      <div className="hist-pagination">
                        <button className="pag-btn" disabled={runPage <= 1}
                          onClick={() => setRunPage(p => p - 1)}>← Prev</button>
                        <span className="pag-info">Page {runPage} of {runMeta.pages}</span>
                        <button className="pag-btn" disabled={runPage >= runMeta.pages}
                          onClick={() => setRunPage(p => p + 1)}>Next →</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Color picker modal */}
      {showColor && <ColorPicker onClose={() => setShowColor(false)} />}
    </div>
  );
}
