import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import XPBar from '../components/XPBar';
import api from '../services/api';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from 'recharts';

/* ── helpers ────────────────────────────────────────────────────── */
function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── sub-components ─────────────────────────────────────────────── */
function StatHero({ icon, label, value, sub, accent }) {
  return (
    <div className="hero-stat-card" style={{ '--accent-color': accent }}>
      <div className="hero-stat-icon">{icon}</div>
      <div className="hero-stat-val">{value}</div>
      <div className="hero-stat-label">{label}</div>
      {sub && <div className="hero-stat-sub">{sub}</div>}
    </div>
  );
}

function PRCard({ icon, label, value, sub }) {
  return (
    <div className="pr-card">
      <div className="pr-icon">{icon}</div>
      <div className="pr-body">
        <div className="pr-value">{value}</div>
        <div className="pr-label">{label}</div>
        {sub && <div className="pr-date">{sub}</div>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, chartMetric }) => {
  if (!active || !payload?.length) return null;
  const units = { km: 'km', calories: 'kcal', xp: 'XP', tiles: 'tiles', runs: 'runs' };
  return (
    <div className="chart-tooltip">
      <div className="chart-tt-date">{label}</div>
      <div className="chart-tt-val">
        {payload[0].value?.toFixed(chartMetric === 'km' ? 2 : 0)} {units[chartMetric]}
      </div>
    </div>
  );
};

/* ── main component ─────────────────────────────────────────────── */
export default function DashboardStats() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [chart,    setChart]    = useState([]);
  const [records,  setRecords]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const [gamif,    setGamif]    = useState(null);
  const [range,    setRange]    = useState('weekly');
  const [metric,   setMetric]   = useState('km');
  const [chartType,setChartType]= useState('bar');   // bar | area
  const [recent,   setRecent]   = useState([]);
  const [histPage, setHistPage] = useState(1);
  const [histMeta, setHistMeta] = useState({ total: 0, pages: 1 });
  const [tab,      setTab]      = useState('overview'); // overview | history
  const [loading,  setLoading]  = useState(true);
  const [histLoad, setHistLoad] = useState(false);

  /* initial load */
  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/records'),
      api.get('/gamification/profile'),
      api.get('/dashboard/recent'),
    ]).then(([s, r, g, rec]) => {
      setStats(s.data.stats);
      setRecords(r.data.records);
      setGamif(g.data);
      setRecent(rec.data.sessions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* chart data */
  useEffect(() => {
    api.get(`/dashboard/chart?range=${range}`)
      .then(r => setChart(r.data.chart || []))
      .catch(() => {});
  }, [range]);

  /* paginated history */
  const loadHistory = useCallback(async (page) => {
    setHistLoad(true);
    try {
      const { data } = await api.get(`/dashboard/history?page=${page}`);
      setHistory(data.sessions || []);
      setHistMeta({ total: data.total, pages: data.pages });
    } catch {}
    setHistLoad(false);
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory(histPage);
  }, [tab, histPage, loadHistory]);

  const metricColors = { km: '#4ade80', calories: '#f59e0b', xp: '#a78bfa', tiles: '#22d3ee', runs: '#fb923c' };
  const col = metricColors[metric];

  const ChartComp = chartType === 'area' ? AreaChart : BarChart;

  return (
    <div className="page-layout">
      <Navbar user={user} />
      <div className="page-body stats-page">
        <div className="page-header">
          <h1 className="page-title">📊 My Stats</h1>
          <p className="page-subtitle">Track your progress and dominate the territory</p>
        </div>

        {/* Tab bar */}
        <div className="stats-tabs">
          {[
            { id: 'overview', label: '📈 Overview' },
            { id: 'history',  label: '📋 Run History' },
          ].map(t => (
            <button key={t.id}
              className={`stats-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="page-loading"><span className="page-spinner" />Loading your stats…</div>
        ) : tab === 'overview' ? (
          <>
            {/* XP Bar */}
            {gamif && (
              <div className="section">
                <XPBar xp={gamif.xp} level={gamif.level} xpProgress={gamif.xpProgress} xpNeeded={gamif.xpNeeded} />
              </div>
            )}

            {/* Streak banner */}
            {gamif?.streak?.current > 0 && (
              <div className="streak-banner">
                <span className="streak-flame">🔥</span>
                <div className="streak-info">
                  <span className="streak-current">{gamif.streak.current}-day streak!</span>
                  <span className="streak-best">Best: {gamif.streak.longest} days</span>
                </div>
                <div className="streak-multiplier">
                  {Math.min(2.0, 1.0 + gamif.streak.current * 0.05).toFixed(2)}× XP
                </div>
              </div>
            )}

            {/* Hero stat cards */}
            <div className="section">
              <div className="hero-stats-grid">
                <StatHero icon="🏃" label="Total Distance"
                  value={`${stats?.totalDistanceKm || 0} km`}
                  sub={`${stats?.totalRuns || 0} runs`} accent="#4ade80" />
                <StatHero icon="🔥" label="Calories Burned"
                  value={(stats?.totalCalories || 0).toLocaleString()}
                  sub="kcal total" accent="#f59e0b" />
                <StatHero icon="🟦" label="Territories"
                  value={(stats?.tilesOwned || 0).toLocaleString()}
                  sub={`${stats?.totalTilesCaptured || 0} captured`} accent="#22d3ee" />
                <StatHero icon="⭐" label="Total XP"
                  value={(stats?.xp || 0).toLocaleString()}
                  sub={`Level ${stats?.level || 1}`} accent="#a78bfa" />
              </div>
            </div>

            {/* Personal Records */}
            {records && (
              <div className="section">
                <h2 className="section-title">🏅 Personal Records</h2>
                <div className="pr-grid">
                  {records.bestDistance &&
                    <PRCard icon="📏" label="Longest Run"
                      value={`${((records.bestDistance.value || 0) / 1000).toFixed(2)} km`}
                      sub={fmtDate(records.bestDistance.date)} />}
                  {records.bestPace &&
                    <PRCard icon="⚡" label="Best Pace"
                      value={fmtPace(records.bestPace.value)}
                      sub={fmtDate(records.bestPace.date)} />}
                  {records.bestDuration &&
                    <PRCard icon="⏱" label="Longest Time"
                      value={fmtDuration(records.bestDuration.value)}
                      sub={fmtDate(records.bestDuration.date)} />}
                  {records.bestCalories &&
                    <PRCard icon="🔥" label="Most Calories"
                      value={`${records.bestCalories.value} kcal`}
                      sub={fmtDate(records.bestCalories.date)} />}
                  {records.bestXP &&
                    <PRCard icon="⭐" label="Most XP"
                      value={`+${records.bestXP.value} XP`}
                      sub={fmtDate(records.bestXP.date)} />}
                  {records.bestTiles &&
                    <PRCard icon="🟦" label="Most Tiles"
                      value={`${records.bestTiles.value} tiles`}
                      sub={fmtDate(records.bestTiles.date)} />}
                </div>
              </div>
            )}

            {/* Progress Chart */}
            <div className="section">
              <div className="chart-card">
                <div className="chart-controls">
                  <h2 className="section-title" style={{ margin: 0 }}>Progress</h2>
                  <div className="chart-toggles">
                    {/* Chart type */}
                    <div className="toggle-group">
                      {[['bar', '▦'], ['area', '∿']].map(([v, lbl]) => (
                        <button key={v} className={`toggle-btn ${chartType === v ? 'active' : ''}`}
                          onClick={() => setChartType(v)}>{lbl}</button>
                      ))}
                    </div>
                    {/* Range */}
                    <div className="toggle-group">
                      {['weekly', 'monthly'].map(r => (
                        <button key={r} className={`toggle-btn ${range === r ? 'active' : ''}`}
                          onClick={() => setRange(r)}>
                          {r === 'weekly' ? '7d' : '30d'}
                        </button>
                      ))}
                    </div>
                    {/* Metric */}
                    <div className="toggle-group">
                      {['km', 'calories', 'xp', 'tiles', 'runs'].map(m => (
                        <button key={m} className={`toggle-btn ${metric === m ? 'active' : ''}`}
                          style={metric === m ? { borderColor: metricColors[m], color: metricColors[m], background: `${metricColors[m]}18` } : {}}
                          onClick={() => setMetric(m)}>
                          {m === 'km' ? '🏃' : m === 'calories' ? '🔥' : m === 'xp' ? '⭐' : m === 'tiles' ? '🟦' : '🔢'}
                          {' '}{m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={230}>
                  {chartType === 'area' ? (
                    <AreaChart data={chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={col} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={col} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={d => d.slice(5)}
                        tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip chartMetric={metric} />} cursor={{ stroke: col, strokeWidth: 1, strokeDasharray: '4 2' }} />
                      <Area dataKey={metric} stroke={col} fill="url(#chartGrad)" strokeWidth={2} dot={{ fill: col, r: 3 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={d => d.slice(5)}
                        tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip chartMetric={metric} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey={metric} fill={col} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Sessions preview */}
            <div className="section">
              <div className="section-header-row">
                <h2 className="section-title">Recent Runs</h2>
                <button className="stats-history-link" onClick={() => setTab('history')}>
                  View all →
                </button>
              </div>
              <RunTable sessions={recent.slice(0, 5)} compact />
            </div>
          </>
        ) : (
          /* ── HISTORY TAB ─────────────────────────────────────── */
          <div className="section">
            <h2 className="section-title">All Runs ({histMeta.total})</h2>
            {histLoad ? (
              <div className="page-loading"><span className="page-spinner" />Loading history…</div>
            ) : (
              <>
                <RunTable sessions={history} />
                {histMeta.pages > 1 && (
                  <div className="hist-pagination">
                    <button className="pag-btn" disabled={histPage <= 1}
                      onClick={() => setHistPage(p => p - 1)}>← Prev</button>
                    <span className="pag-info">Page {histPage} of {histMeta.pages}</span>
                    <button className="pag-btn" disabled={histPage >= histMeta.pages}
                      onClick={() => setHistPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── RunTable sub-component ─────────────────────────────────────── */
function RunTable({ sessions = [], compact = false }) {
  if (!sessions.length) return (
    <p className="empty-hint">No runs recorded yet — lace up and start!</p>
  );
  return (
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
      {sessions.map(s => {
        const dist = (s.distanceMeters || 0) / 1000;
        const dur  = s.durationSeconds || 0;
        const pace = dist > 0.1 ? fmtPace(dur / dist) : '—';
        return (
          <div key={s._id} className="run-table-row">
            <span className="run-td-date">
              {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <span className="run-td-year">{new Date(s.startTime).getFullYear()}</span>
            </span>
            <span className="run-td-dist">{dist.toFixed(2)} km</span>
            <span className="run-td-dur">{fmtDuration(dur)}</span>
            <span className="run-td-pace">{pace}</span>
            <span className="run-td-tiles">🟦 {s.tilesCaptured || 0}</span>
            <span className="run-td-cal">🔥 {s.caloriesBurned || 0}</span>
            <span className="run-td-xp">+{s.xpEarned || 0} XP</span>
          </div>
        );
      })}
    </div>
  );
}
