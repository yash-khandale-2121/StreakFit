import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

/* ── helpers ─────────────────────────────────────────────── */
function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const METRIC_CFG = {
  tiles:    { label: 'Tiles',    icon: '🟦', unit: 'tiles'  },
  xp:       { label: 'XP',      icon: '⭐', unit: 'XP'     },
  distance: { label: 'Distance', icon: '🏃', unit: 'km'     },
  runs:     { label: 'Runs',     icon: '🔄', unit: 'runs'   },
  streak:   { label: 'Streak',   icon: '🔥', unit: 'days'   },
};

/* ── rank change indicator ───────────────────────────────── */
function RankChange({ prev, curr }) {
  if (prev == null) return null;
  const diff = prev - curr;
  if (diff === 0) return <span className="lb-rank-stable">—</span>;
  if (diff > 0)   return <span className="lb-rank-up">▲{diff}</span>;
  return           <span className="lb-rank-down">▼{Math.abs(diff)}</span>;
}

/* ── main component ──────────────────────────────────────── */
export default function LeaderboardPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState('tiles');
  const [scope,  setScope]  = useState('global');
  const [data,   setData]   = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page,   setPage]   = useState(1);
  const PER_PAGE = 25;
  const prevDataRef = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/gamification/leaderboard?type=${metric}&scope=${scope}`);
      const rows = res.data.leaderboard || [];
      setData(rows);
      const myIdx = rows.findIndex(r => r.isMe);
      setMyRank(myIdx >= 0 ? myIdx + 1 : null);
    } catch {}
    setLoading(false);
  }, [metric, scope]);

  useEffect(() => { setPage(1); load(); }, [load]);

  const paginated = data.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(data.length / PER_PAGE));
  const cfg = METRIC_CFG[metric];

  const fmtVal = (v) => {
    if (typeof v !== 'number') return v;
    return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1);
  };

  return (
    <div className="page-layout">
      <Navbar user={user} />
      <div className="page-body lb-page">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="page-header">
          <h1 className="page-title">🏆 Leaderboard</h1>
          <p className="page-subtitle">Compete for territory dominance across every metric</p>
        </div>

        {/* ── My rank hero ─────────────────────────────────── */}
        {myRank && user && (
          <div className="lb-my-rank-hero">
            <div className="lb-my-rank-left">
              <div className="lb-my-avatar" style={{ background: user.color || '#4ade80' }}>
                {(user.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="lb-my-name">{user.username}</div>
                <div className="lb-my-sub">Level {user.level || 1} · {scope === 'global' ? 'Global' : 'Friends'}</div>
              </div>
            </div>
            <div className="lb-my-rank-right">
              <div className="lb-my-rank-num">#{myRank}</div>
              <div className="lb-my-rank-label">Your Rank · {cfg.icon} {cfg.label}</div>
            </div>
          </div>
        )}

        {/* ── Controls ─────────────────────────────────────── */}
        <div className="lb-controls-bar">
          {/* Metric pills */}
          <div className="lb-pill-group">
            {Object.entries(METRIC_CFG).map(([k, c]) => (
              <button
                key={k}
                className={`lb-pill ${metric === k ? 'active' : ''}`}
                onClick={() => setMetric(k)}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Scope toggle */}
          <div className="lb-scope-toggle">
            {['global', 'friends'].map(s => (
              <button
                key={s}
                className={`lb-scope-btn ${scope === s ? 'active' : ''}`}
                onClick={() => setScope(s)}
              >
                {s === 'global' ? '🌍 Global' : '👥 Friends'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────── */}
        {loading ? (
          <div className="page-loading"><span className="page-spinner" />Loading rankings…</div>
        ) : (
          <>
            <div className="lb-table">
              {/* Header */}
              <div className="lb-table-head">
                <span className="lb-col-rank">Rank</span>
                <span className="lb-col-user">Player</span>
                <span className="lb-col-level">Level</span>
                <span className="lb-col-val">{cfg.icon} {cfg.label}</span>
              </div>

              {paginated.length === 0 && (
                <div className="lb-empty-state">
                  <span>🏜️</span>
                  <p>{scope === 'friends' ? 'Add friends to see a friends leaderboard!' : 'No data yet — go run!'}</p>
                </div>
              )}

              {paginated.map((row, i) => {
                const globalIdx = (page - 1) * PER_PAGE + i;
                const medal     = MEDAL[globalIdx] || null;
                const isTop3    = globalIdx < 3;
                return (
                  <Link
                    key={row.userId}
                    to={`/user/${row.userId}`}
                    className={`lb-table-row ${row.isMe ? 'lb-row-me' : ''} ${isTop3 ? `lb-top-${globalIdx + 1}` : ''}`}
                  >
                    {/* Rank */}
                    <span className="lb-col-rank">
                      {medal
                        ? <span className="lb-medal">{medal}</span>
                        : <span className="lb-rank-num">#{globalIdx + 1}</span>
                      }
                    </span>

                    {/* User */}
                    <span className="lb-col-user">
                      <span className="lb-avatar-dot" style={{ background: row.color || '#4ade80' }}>
                        {(row.username || '?')[0].toUpperCase()}
                      </span>
                      <span className="lb-uname">
                        {row.username}
                        {row.isMe && <span className="lb-you-pill">you</span>}
                      </span>
                    </span>

                    {/* Level */}
                    <span className="lb-col-level">
                      <span className="lb-lv-badge">Lv {row.level || 1}</span>
                    </span>

                    {/* Value */}
                    <span className="lb-col-val">
                      <span className="lb-val-num">{fmtVal(row.value)}</span>
                      <span className="lb-val-unit">{row.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="hist-pagination" style={{ marginTop: '1.5rem' }}>
                <button className="pag-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  ← Prev
                </button>
                <span className="pag-info">Page {page} of {totalPages} · {data.length} players</span>
                <button className="pag-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Fun stat footer ───────────────────────────────── */}
        <div className="lb-footer-stats">
          <div className="lb-footer-item">
            <span className="lb-footer-icon">📍</span>
            <span className="lb-footer-val">{data.length}</span>
            <span className="lb-footer-label">Ranked Players</span>
          </div>
          <div className="lb-footer-item">
            <span className="lb-footer-icon">{cfg.icon}</span>
            <span className="lb-footer-val">{data[0] ? fmtVal(data[0].value) : '—'}</span>
            <span className="lb-footer-label">Leader's {cfg.label}</span>
          </div>
          <div className="lb-footer-item">
            <span className="lb-footer-icon">🏅</span>
            <span className="lb-footer-val">{myRank ? `#${myRank}` : '—'}</span>
            <span className="lb-footer-label">Your Rank</span>
          </div>
        </div>

      </div>
    </div>
  );
}
