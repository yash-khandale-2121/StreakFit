import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

/* ── helpers ─────────────────────────────────────────────── */
function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtPace(distM, durSec) {
  if (!distM || distM < 100 || !durSec) return '—';
  const spk = durSec / (distM / 1000);
  return `${Math.floor(spk / 60)}:${String(Math.round(spk % 60)).padStart(2,'0')} /km`;
}

const ACH_MAP = {
  first_run:  { icon: '👟', name: 'First Steps'   },
  '5km':      { icon: '🏃', name: '5K Club'        },
  '10km':     { icon: '🔥', name: '10K Beast'      },
  tiles_10:   { icon: '🌱', name: 'Planter'        },
  tiles_100:  { icon: '⚔️', name: 'Conqueror'      },
  streak_3:   { icon: '🔥', name: 'On Fire'        },
  streak_7:   { icon: '🗓️', name: 'Weekly Warrior' },
  streak_30:  { icon: '🏅', name: 'Iron Runner'    },
  level_5:    { icon: '⭐', name: 'Rising Star'    },
  level_10:   { icon: '👑', name: 'Territory King' },
};

/* ── main component ──────────────────────────────────────── */
export default function UserProfile() {
  const { userId }   = useParams();
  const { user: me } = useAuth();

  const [profile,  setProfile]  = useState(null);
  const [sessions, setSessions] = useState([]);
  const [gamif,    setGamif]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [isFriend, setIsFriend] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');

  const isMe = me?._id === userId || me?._id?.toString() === userId;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [pRes, sRes] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/sessions/user/${userId}`),
        ]);
        setProfile(pRes.data);

        // Check friendship
        try {
          const frRes = await api.get('/social/friends');
          const friends = frRes.data.friends || [];
          setIsFriend(friends.some(f => f._id === userId || f._id?.toString() === userId));
        } catch {}

        // Compute basic gamif from user data
        const u = pRes.data.user;
        if (u) {
          const lvl = u.level || 1;
          const xpForCurrent = Math.pow(lvl - 1, 2) * 100;
          const xpForNext    = Math.pow(lvl, 2) * 100;
          setGamif({
            xp: u.xp || 0, level: lvl,
            xpProgress: (u.xp || 0) - xpForCurrent,
            xpNeeded:   xpForNext - xpForCurrent,
            achievements: u.achievements || [],
          });
        }

        setSessions(sRes.data.sessions || []);
      } catch (e) {
        setError(e.response?.data?.error || 'User not found');
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const sendFriendRequest = async () => {
    setRequesting(true);
    try {
      await api.post('/social/friends/request', { targetUserId: userId });
      setRequestMsg('Friend request sent!');
    } catch (e) {
      setRequestMsg(e.response?.data?.error || 'Could not send request');
    }
    setRequesting(false);
    setTimeout(() => setRequestMsg(''), 3000);
  };

  if (loading) return (
    <div className="page-layout">
      <Navbar user={me} />
      <div className="page-body">
        <div className="page-loading"><span className="page-spinner" />Loading profile…</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-layout">
      <Navbar user={me} />
      <div className="page-body">
        <div className="up-error">
          <span className="up-error-icon">😕</span>
          <h2>{error}</h2>
          <Link to="/social" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', padding: '.7rem 1.5rem', borderRadius: '10px', color: '#000', background: 'linear-gradient(135deg,#4ade80,#16a34a)', fontWeight: 700 }}>
            ← Back to Social
          </Link>
        </div>
      </div>
    </div>
  );

  const { user: u, tilesCount } = profile;
  const earnedKeys = Array.isArray(u.achievements) ? u.achievements : [];

  return (
    <div className="page-layout">
      <Navbar user={me} />
      <div className="page-body up-page">

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="up-hero">
          {/* Avatar */}
          <div className="up-avatar-ring" style={{ '--ring-color': u.color || '#4ade80' }}>
            <div className="up-avatar" style={{ background: u.color || '#4ade80' }}>
              {(u.username || '?')[0].toUpperCase()}
            </div>
          </div>

          {/* Info */}
          <div className="up-hero-info">
            <div className="up-hero-top">
              <h1 className="up-username">{u.username}</h1>
              <span className="up-level-badge">Lv {u.level || 1}</span>
            </div>

            {u.bio && <p className="up-bio">{u.bio}</p>}

            <div className="up-meta-badges">
              <span className="up-badge">🏃 {u.stats?.totalRuns || 0} runs</span>
              <span className="up-badge">📏 {((u.stats?.totalDistanceMeters || 0) / 1000).toFixed(1)} km</span>
              <span className="up-badge">🔥 {u.streak?.current || 0}-day streak</span>
              <span className="up-badge">🟦 {tilesCount || 0} tiles</span>
            </div>

            {/* XP bar */}
            {gamif && (
              <div className="up-xp-row">
                <span className="up-xp-lv">Lv {gamif.level}</span>
                <div className="up-xp-track">
                  <div className="up-xp-fill" style={{
                    width: `${gamif.xpNeeded > 0 ? Math.min(100, (gamif.xpProgress / gamif.xpNeeded) * 100) : 0}%`
                  }} />
                </div>
                <span className="up-xp-val">{gamif.xp.toLocaleString()} XP</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="up-actions">
            {isMe ? (
              <Link to="/profile" className="up-btn-secondary">Edit Profile →</Link>
            ) : (
              <>
                {!isFriend && !requestMsg && (
                  <button className="up-btn-primary" onClick={sendFriendRequest} disabled={requesting}>
                    {requesting ? 'Sending…' : '+ Add Friend'}
                  </button>
                )}
                {requestMsg && <span className="up-request-msg">{requestMsg}</span>}
                {isFriend && <span className="up-friend-badge">✓ Friends</span>}
              </>
            )}
          </div>
        </div>

        {/* ── Stats grid ─────────────────────────────────── */}
        <div className="section">
          <h2 className="section-title">Stats</h2>
          <div className="up-stats-grid">
            {[
              { icon: '🏃', label: 'Total Runs',  val: u.stats?.totalRuns || 0 },
              { icon: '📏', label: 'Distance',     val: `${((u.stats?.totalDistanceMeters || 0)/1000).toFixed(1)} km` },
              { icon: '⏱',  label: 'Total Time',   val: fmtDuration(u.stats?.totalTimeSeconds || 0) },
              { icon: '🔥', label: 'Calories',     val: (u.stats?.totalCalories || 0).toLocaleString() },
              { icon: '🟦', label: 'Tiles Owned',  val: (tilesCount || 0).toLocaleString() },
              { icon: '⭐', label: 'Total XP',     val: (u.xp || 0).toLocaleString() },
              { icon: '🔥', label: 'Best Streak',  val: `${u.streak?.longest || 0}d` },
              { icon: '🏅', label: 'Achievements', val: earnedKeys.length },
            ].map(s => (
              <div key={s.label} className="up-stat-card">
                <span className="up-stat-icon">{s.icon}</span>
                <span className="up-stat-val">{s.val}</span>
                <span className="up-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Achievements ───────────────────────────────── */}
        {earnedKeys.length > 0 && (
          <div className="section">
            <h2 className="section-title">Achievements ({earnedKeys.length})</h2>
            <div className="up-ach-row">
              {earnedKeys.map(key => {
                const a = ACH_MAP[key] || { icon: '⭐', name: key };
                return (
                  <div key={key} className="up-ach-badge" title={a.name}>
                    <span>{a.icon}</span>
                    <span className="up-ach-name">{a.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recent Runs ────────────────────────────────── */}
        <div className="section">
          <h2 className="section-title">Recent Runs ({sessions.length})</h2>
          {sessions.length === 0 ? (
            <p className="empty-hint">No runs recorded yet.</p>
          ) : (
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
              {sessions.map(s => (
                <div key={s._id} className="run-table-row">
                  <span className="run-td-date">
                    {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="run-td-year">{new Date(s.startTime).getFullYear()}</span>
                  </span>
                  <span className="run-td-dist">{((s.distanceMeters || 0)/1000).toFixed(2)} km</span>
                  <span className="run-td-dur">{fmtDuration(s.durationSeconds || 0)}</span>
                  <span className="run-td-pace">{fmtPace(s.distanceMeters, s.durationSeconds)}</span>
                  <span className="run-td-tiles">🟦 {s.tilesCaptured || 0}</span>
                  <span className="run-td-cal">🔥 {s.caloriesBurned || 0}</span>
                  <span className="run-td-xp">+{s.xpEarned || 0} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
