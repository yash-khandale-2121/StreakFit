import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ColorPicker from '../components/ColorPicker';
import api from '../services/api';

/* ─── section wrapper ──────────────────────────────────────── */
function SettingsSection({ title, icon, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <span className="settings-section-icon">{icon}</span>
        <h2 className="settings-section-title">{title}</h2>
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

/* ─── toggle row ───────────────────────────────────────────── */
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="settings-row">
      <div className="settings-row-info">
        <div className="settings-row-label">{label}</div>
        {description && <div className="settings-row-desc">{description}</div>}
      </div>
      <label className="settings-toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="settings-track" />
      </label>
    </div>
  );
}

/* ─── main component ───────────────────────────────────────── */
export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [bio,        setBio]        = useState(user?.bio || '');
  const [username,   setUsername]   = useState(user?.username || '');
  const [isPrivate,  setIsPrivate]  = useState(user?.isPrivate || false);
  const [showColor,  setShowColor]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState('');
  const [error,      setError]      = useState('');

  // Sync when user changes
  useEffect(() => {
    setBio(user?.bio || '');
    setUsername(user?.username || '');
    setIsPrivate(user?.isPrivate || false);
  }, [user]);

  const flash = (msg, isErr = false) => {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 3500); }
    else        { setSaved(msg); setTimeout(() => setSaved(''), 2500); }
  };

  /* Save bio */
  const saveBio = async () => {
    if (!bio.trim() && bio !== '') return;
    setSaving(true);
    try {
      const { data } = await api.patch('/users/bio', { bio });
      updateUser(data.user);
      flash('Bio saved ✓');
    } catch { flash('Failed to save bio', true); }
    setSaving(false);
  };

  /* Save privacy */
  const savePrivacy = async (val) => {
    setIsPrivate(val);
    try {
      const { data } = await api.patch('/users/privacy', { isPrivate: val });
      updateUser(data.user);
      flash('Privacy setting saved ✓');
    } catch { flash('Failed to update privacy', true); setIsPrivate(!val); }
  };

  /* Confirm logout */
  const handleLogout = () => {
    if (window.confirm('Sign out of Territory Run?')) logout();
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <div className="page-layout">
      <Navbar user={user} />
      <div className="page-body settings-page">

        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">⚙️ Settings</h1>
          <p className="page-subtitle">Manage your account, appearance, and preferences</p>
        </div>

        {/* Status flash messages */}
        {saved && <div className="settings-flash success">{saved}</div>}
        {error && <div className="settings-flash error">{error}</div>}

        {/* ── Profile ──────────────────────────────────────────── */}
        <SettingsSection icon="🎮" title="Profile">
          {/* Avatar + color */}
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-label">Territory Color</div>
              <div className="settings-row-desc">This color marks every tile you capture on the map</div>
            </div>
            <div className="settings-color-preview" onClick={() => setShowColor(true)}>
              <div className="settings-color-swatch" style={{ background: user?.color || '#4ade80' }}>
                <div className="settings-avatar-letter">{(user?.username || '?')[0].toUpperCase()}</div>
              </div>
              <span className="settings-color-btn">Change →</span>
            </div>
          </div>

          {/* Bio */}
          <div className="settings-row settings-row-col">
            <div className="settings-row-label">Bio</div>
            <div className="settings-row-desc">Tell other runners about yourself (max 160 chars)</div>
            <div className="settings-bio-wrap">
              <textarea
                className="settings-textarea"
                value={bio}
                maxLength={160}
                rows={3}
                onChange={e => setBio(e.target.value)}
                placeholder="Write a short bio…"
              />
              <div className="settings-bio-footer">
                <span className="settings-char-count">{bio.length}/160</span>
                <button className="settings-save-btn" onClick={saveBio} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Bio'}
                </button>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ── Privacy ─────────────────────────────────────────── */}
        <SettingsSection icon="🔒" title="Privacy">
          <ToggleRow
            label="Private Profile"
            description="When enabled, only friends can see your profile and stats"
            checked={isPrivate}
            onChange={savePrivacy}
          />
          <ToggleRow
            label="Show on Leaderboard"
            description="Appear in global leaderboards and territory rankings"
            checked={!isPrivate}
            onChange={v => savePrivacy(!v)}
          />
        </SettingsSection>

        {/* ── Account Info ─────────────────────────────────────── */}
        <SettingsSection icon="👤" title="Account">
          <div className="settings-info-grid">
            <div className="settings-info-item">
              <span className="settings-info-label">Username</span>
              <span className="settings-info-val">{user?.username}</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Email</span>
              <span className="settings-info-val">{user?.email || '—'}</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Auth Method</span>
              <span className="settings-info-val">
                {user?.googleId ? '🔵 Google OAuth' : '🔑 Email / Password'}
              </span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Member Since</span>
              <span className="settings-info-val">{memberSince}</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Level</span>
              <span className="settings-info-val">Level {user?.level || 1} — {(user?.xp || 0).toLocaleString()} XP</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Total Runs</span>
              <span className="settings-info-val">{user?.stats?.totalRuns || 0}</span>
            </div>
          </div>
        </SettingsSection>

        {/* ── App ──────────────────────────────────────────────── */}
        <SettingsSection icon="📱" title="App">
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-label">App Version</div>
              <div className="settings-row-desc">Territory Run v1.0.0</div>
            </div>
            <span className="settings-badge-pill">Latest</span>
          </div>
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-label">Server</div>
              <div className="settings-row-desc">Connected to Territory Run backend</div>
            </div>
            <span className="settings-badge-pill online">● Online</span>
          </div>
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-label">View Your Profile</div>
              <div className="settings-row-desc">See how others see your public profile</div>
            </div>
            <button className="settings-link-btn" onClick={() => navigate('/profile')}>
              Open →
            </button>
          </div>
        </SettingsSection>

        {/* ── Danger Zone ──────────────────────────────────────── */}
        <SettingsSection icon="⚠️" title="Danger Zone">
          <div className="settings-danger-zone">
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label danger-label">Sign Out</div>
                <div className="settings-row-desc">You'll need to log in again to access your account</div>
              </div>
              <button className="settings-danger-btn" onClick={handleLogout}>Sign Out</button>
            </div>
          </div>
        </SettingsSection>

      </div>

      {/* Color picker modal */}
      {showColor && <ColorPicker onClose={() => setShowColor(false)} />}
    </div>
  );
}
