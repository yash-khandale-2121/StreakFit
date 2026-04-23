import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [type,  setType]    = useState('tiles');   // tiles | xp | distance
  const [scope, setScope]   = useState('global');  // global | friends

  useEffect(() => {
    setLoading(true);
    api.get(`/gamification/leaderboard?type=${type}&scope=${scope}`)
      .then(r => { setData(r.data.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type, scope]);

  const typeLabels = { tiles: '🟦 Tiles', xp: '⭐ XP', distance: '🏃 km' };
  const scopeLabels = { global: '🌍 Global', friends: '👥 Friends' };

  return (
    <div className="leaderboard">
      {/* Toggles */}
      <div className="lb-controls">
        <div className="lb-toggle-group">
          {Object.entries(typeLabels).map(([k, v]) => (
            <button key={k} className={`lb-toggle ${type === k ? 'active' : ''}`} onClick={() => setType(k)}>{v}</button>
          ))}
        </div>
        <div className="lb-toggle-group">
          {Object.entries(scopeLabels).map(([k, v]) => (
            <button key={k} className={`lb-toggle ${scope === k ? 'active' : ''}`} onClick={() => setScope(k)}>{v}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="lb-loading">Loading…</p> : (
        <ol className="lb-list">
          {data.map((u, i) => (
            <li key={u.userId} className={`lb-row rank-${i + 1} ${u.isMe ? 'lb-me' : ''}`}>
              <span className="lb-rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="lb-dot" style={{ background: u.color }} />
              <div className="lb-user">
                <span className="lb-name">{u.username}{u.isMe ? ' (you)' : ''}</span>
                <span className="lb-lv">Lv {u.level}</span>
              </div>
              <span className="lb-count">{
                typeof u.value === 'number' && !Number.isInteger(u.value)
                  ? u.value.toFixed(1)
                  : u.value?.toLocaleString()
              } {u.label}</span>
            </li>
          ))}
          {!data.length && <li className="lb-empty">No data yet — go run!</li>}
        </ol>
      )}
    </div>
  );
}
