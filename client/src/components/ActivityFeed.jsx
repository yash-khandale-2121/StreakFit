function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ActivityFeed({ feed = [], loading = false }) {
  if (loading) return <div className="feed-loading"><span className="feed-spinner" />Loading feed…</div>;
  if (!feed.length) return (
    <div className="feed-empty">
      <span>🌍</span>
      <p>No activity yet. Add friends and start running!</p>
    </div>
  );

  return (
    <div className="activity-feed">
      {feed.map(event => (
        <div key={event._id} className="feed-item">
          <div className="feed-avatar" style={{ background: event.user?.color || '#4ade80' }}>
            {(event.user?.username || '?')[0].toUpperCase()}
          </div>
          <div className="feed-body">
            <div className="feed-top">
              <span className="feed-username">{event.user?.username}</span>
              <span className="feed-badge level-badge">Lv {event.user?.level || 1}</span>
            </div>
            <div className="feed-action">
              Ran <strong>{event.distanceKm} km</strong> and captured{' '}
              <strong>{event.tilesCaptured} tiles</strong>
              {event.calories > 0 && <> · {event.calories} kcal</>}
              {event.xpEarned > 0 && <> · +{event.xpEarned} XP</>}
            </div>
            <div className="feed-meta">
              <span>⏱ {fmtDuration(event.durationSeconds)}</span>
              <span>{timeAgo(event.startTime)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
