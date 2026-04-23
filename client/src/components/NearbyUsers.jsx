export default function NearbyUsers({ users }) {
  if (!users.length) return (
    <div className="nearby-empty">
      <span>👻</span>
      <p>No runners nearby</p>
    </div>
  );

  return (
    <div className="nearby-list">
      <h3 className="nearby-title">Nearby Runners</h3>
      {users.map((u) => (
        <div key={u.userId} className="nearby-user">
          <span className="nearby-dot" style={{ background: u.color }} />
          <div className="nearby-info">
            <span className="nearby-name">{u.username}</span>
            <span className="nearby-dist">{u.distance}m away</span>
          </div>
          <span className="nearby-speed">{u.speed?.toFixed(1) || '—'} km/h</span>
        </div>
      ))}
    </div>
  );
}
