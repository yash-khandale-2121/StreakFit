import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ActivityFeed from '../components/ActivityFeed';
import TeamCard from '../components/TeamCard';
import api from '../services/api';

function FriendRow({ friend, onUnfriend }) {
  return (
    <div className="friend-row">
      <Link to={`/user/${friend._id}`} className="friend-avatar" style={{ background: friend.color }}>
        {friend.username[0].toUpperCase()}
      </Link>
      <div className="friend-info">
        <Link to={`/user/${friend._id}`} className="friend-name">{friend.username}</Link>
        <div className="friend-sub">Lv {friend.level} · {friend.streak}🔥 · {friend.totalDistanceKm} km</div>
      </div>
      <button className="btn-unfriend" onClick={() => onUnfriend(friend._id)} title="Unfriend">✕</button>
    </div>
  );
}

function RequestRow({ request, onAccept, onReject }) {
  return (
    <div className="friend-row request-row">
      <div className="friend-avatar" style={{ background: request.fromId?.color }}>
        {(request.fromId?.username || '?')[0].toUpperCase()}
      </div>
      <div className="friend-info">
        <div className="friend-name">{request.fromId?.username}</div>
        <div className="friend-sub">Lv {request.fromId?.level || 1} · wants to be friends</div>
      </div>
      <div className="request-actions">
        <button className="btn-accept" onClick={() => onAccept(request._id)}>✓</button>
        <button className="btn-reject" onClick={() => onReject(request._id)}>✕</button>
      </div>
    </div>
  );
}

export default function Social() {
  const { user } = useAuth();
  const [tab,       setTab]       = useState('feed');    // feed | friends | teams
  const [feed,      setFeed]      = useState([]);
  const [friends,   setFriends]   = useState([]);
  const [requests,  setRequests]  = useState([]);
  const [teams,     setTeams]     = useState([]);
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [teamForm,  setTeamForm]  = useState({ show: false, name: '', tag: '', bio: '', color: '#4ade80' });
  const [msg,       setMsg]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, fr, req] = await Promise.all([
        api.get('/social/feed'),
        api.get('/social/friends'),
        api.get('/social/requests'),
      ]);
      setFeed(f.data.feed || []);
      setFriends(fr.data.friends || []);
      setRequests(req.data.requests || []);
    } catch {}

    try {
      const t = await api.get('/social/teams');
      setTeams(t.data.teams || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // User search debounce
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/social/search?q=${encodeURIComponent(search)}`);
        setResults(data.users || []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const sendRequest = async (userId) => {
    try {
      await api.post('/social/friends/request', { targetUserId: userId });
      setMsg('Friend request sent!');
      setTimeout(() => setMsg(''), 3000);
      setResults([]);
      setSearch('');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Error sending request');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      await api.patch(`/social/requests/${requestId}`, { action });
      load();
    } catch {}
  };

  const unfriend = async (userId) => {
    if (!window.confirm('Remove this friend?')) return;
    try { await api.delete(`/social/friends/${userId}`); load(); } catch {}
  };

  const joinTeam = async (teamId) => {
    try { await api.post(`/social/teams/${teamId}/join`); load(); } catch (e) {
      setMsg(e.response?.data?.error || 'Error joining team');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const leaveTeam = async (teamId) => {
    if (!window.confirm('Leave this team?')) return;
    try { await api.delete(`/social/teams/${teamId}/leave`); load(); } catch {}
  };

  const createTeam = async () => {
    try {
      await api.post('/social/teams', {
        name:  teamForm.name,
        tag:   teamForm.tag,
        bio:   teamForm.bio,
        color: teamForm.color,
      });
      setTeamForm({ show: false, name: '', tag: '', bio: '', color: '#4ade80' });
      load();
    } catch (e) {
      setMsg(e.response?.data?.error || 'Error creating team');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const tabs = [
    { id: 'feed',    label: '🌍 Activity', icon: '🌍' },
    { id: 'friends', label: `👥 Friends${requests.length > 0 ? ` (${requests.length})` : ''}`, icon: '👥' },
    { id: 'teams',   label: '⚔️ Teams',    icon: '⚔️' },
  ];

  return (
    <div className="page-layout">
      <Navbar user={user} />
      <div className="page-body social-page">
        <div className="page-header">
          <h1 className="page-title">👥 Social</h1>
          <p className="page-subtitle">Connect with runners, form squads, dominate together</p>
        </div>

        {msg && <div className="social-msg">{msg}</div>}

        {/* Tab bar */}
        <div className="social-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`social-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-loading"><span className="page-spinner" />Loading…</div>
        ) : (
          <div className="social-content">

            {/* ── ACTIVITY FEED ───────────────────────────────── */}
            {tab === 'feed' && <ActivityFeed feed={feed} />}

            {/* ── FRIENDS ─────────────────────────────────────── */}
            {tab === 'friends' && (
              <div className="friends-panel">
                {/* Search */}
                <div className="friend-search-box">
                  <input
                    id="friend-search"
                    className="social-input"
                    placeholder="🔍 Search users to add…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {results.length > 0 && (
                    <div className="search-results">
                      {results.map(u => (
                        <div key={u._id} className="search-result-row">
                          <div className="friend-avatar sm" style={{ background: u.color }}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <div className="friend-info">
                            <span className="friend-name">{u.username}</span>
                            <span className="friend-sub">Lv {u.level}</span>
                          </div>
                          <button className="btn-add-friend" onClick={() => sendRequest(u._id)}>+ Add</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending requests */}
                {requests.length > 0 && (
                  <div className="friend-section">
                    <h3 className="friend-section-title">Pending Requests ({requests.length})</h3>
                    {requests.map(r => (
                      <RequestRow
                        key={r._id}
                        request={r}
                        onAccept={id => handleRequest(id, 'accept')}
                        onReject={id => handleRequest(id, 'reject')}
                      />
                    ))}
                  </div>
                )}

                {/* Friends list */}
                <div className="friend-section">
                  <h3 className="friend-section-title">Friends ({friends.length})</h3>
                  {friends.length === 0 ? (
                    <div className="feed-empty"><span>🤝</span><p>No friends yet — search above to add someone!</p></div>
                  ) : (
                    friends.map(f => <FriendRow key={f._id} friend={f} onUnfriend={unfriend} />)
                  )}
                </div>
              </div>
            )}

            {/* ── TEAMS ───────────────────────────────────────── */}
            {tab === 'teams' && (
              <div className="teams-panel">
                <div className="teams-header">
                  <h3 className="friend-section-title">Squads & Teams</h3>
                  <button className="btn-create-team" onClick={() => setTeamForm(f => ({ ...f, show: true }))}>
                    + Create Squad
                  </button>
                </div>

                {/* Create team form */}
                {teamForm.show && (
                  <div className="team-form-card">
                    <h4>Create a New Squad</h4>
                    <div className="team-form-grid">
                      <input className="social-input" placeholder="Squad Name" value={teamForm.name}
                        onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} />
                      <input className="social-input" placeholder="Tag (max 6)" maxLength={6} value={teamForm.tag}
                        onChange={e => setTeamForm(f => ({ ...f, tag: e.target.value.toUpperCase() }))} />
                    </div>
                    <input className="social-input" placeholder="Short bio (optional)" value={teamForm.bio}
                      onChange={e => setTeamForm(f => ({ ...f, bio: e.target.value }))} />
                    <div className="team-form-actions">
                      <button className="btn-primary-sm" onClick={createTeam}>Create</button>
                      <button className="btn-secondary-sm" onClick={() => setTeamForm(f => ({ ...f, show: false }))}>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="teams-grid">
                  {teams.length === 0 && <div className="feed-empty"><span>⚔️</span><p>No teams yet. Create the first squad!</p></div>}
                  {teams.map(t => (
                    <TeamCard key={t._id} team={t} onJoin={joinTeam} onLeave={leaveTeam} currentUserId={user?._id} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
