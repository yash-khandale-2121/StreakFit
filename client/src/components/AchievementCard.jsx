// AchievementCard — locked/unlocked achievement badge
export default function AchievementCard({ icon, name, description, xpReward, earned }) {
  return (
    <div className={`achievement-card ${earned ? 'earned' : 'locked'}`} title={description}>
      <div className="ach-icon">{earned ? icon : '🔒'}</div>
      <div className="ach-name">{name}</div>
      <div className="ach-xp">+{xpReward} XP</div>
      {!earned && <div className="ach-locked-overlay" />}
    </div>
  );
}
