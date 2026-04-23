export default function TeamCard({ team, onJoin, onLeave, currentUserId }) {
  const isMember = team.isMember;

  return (
    <div className={`team-card ${isMember ? 'my-team' : ''}`}>
      <div className="team-color-bar" style={{ background: team.color }} />
      <div className="team-body">
        <div className="team-header">
          <div className="team-tag" style={{ borderColor: team.color, color: team.color }}>
            [{team.tag}]
          </div>
          <div className="team-name">{team.name}</div>
          {isMember && <span className="team-you-badge">You</span>}
        </div>
        {team.bio && <p className="team-bio">{team.bio}</p>}
        <div className="team-stats">
          <span>👥 {team.memberCount} members</span>
          <span>🟦 {team.tileCount || 0} tiles</span>
        </div>
        {team.members && team.members.length > 0 && (
          <div className="team-avatars">
            {team.members.slice(0, 5).map(m => (
              <div
                key={m._id}
                className="team-avatar-dot"
                style={{ background: m.color }}
                title={m.username}
              >
                {m.username[0].toUpperCase()}
              </div>
            ))}
            {team.memberCount > 5 && <span className="team-more">+{team.memberCount - 5}</span>}
          </div>
        )}
        <div className="team-actions">
          {isMember ? (
            <button className="btn-team-leave" onClick={() => onLeave(team._id)}>Leave</button>
          ) : (
            <button className="btn-team-join" onClick={() => onJoin(team._id)}>Join Squad</button>
          )}
        </div>
      </div>
    </div>
  );
}
