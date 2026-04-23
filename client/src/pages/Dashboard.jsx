import { useState, useEffect, useCallback } from 'react';
import { useAuth }        from '../context/AuthContext';
import { useSocket }      from '../context/SocketContext';
import { useRun }         from '../hooks/useRun';
import { useGeolocation } from '../hooks/useGeolocation';

import Navbar        from '../components/Navbar';
import MapView       from '../components/MapView';
import ControlPanel  from '../components/ControlPanel';
import StatsPanel    from '../components/StatsPanel';
import NearbyUsers   from '../components/NearbyUsers';
import Leaderboard   from '../components/Leaderboard';
import RunSummaryModal from '../components/RunSummaryModal';
import NotificationStack, { addToast } from '../components/NotificationStack';

export default function Dashboard() {
  const { user }              = useAuth();
  const { socket }            = useSocket();
  const { isRunning, isPaused, stats, path, runResult, startRun, pauseRun, resumeRun, stopRun, sendPosition, dismissResult } = useRun();

  const [tiles,        setTiles]        = useState({});
  const [nearbyUsers,  setNearby]       = useState([]);
  const [follow,       setFollow]       = useState(true);
  const [panel,        setPanel]        = useState('stats');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showTiles,    setShowTiles]    = useState(true);
  const [showUsers,    setShowUsers]    = useState(true);

  // Geolocation always active to show current location, but only sent to server when active run
  const { position, error: geoError } = useGeolocation({
    enabled:    !isSimulating,
    onPosition: (pos) => {
      if (isRunning && !isPaused) sendPosition(pos);
    },
  });

  // ── Socket events ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onTile     = (t) => {
      setTiles(prev => ({ ...prev, [t.tileId]: t }));
      if (t.isNewTile && t.ownerId === user?._id?.toString()) {
        addToast('🏁 Tile captured!', 'success');
      } else if (t.isRecapture && t.ownerId !== user?._id?.toString()) {
        addToast(`⚔️ ${t.ownerUsername} stole a tile!`, 'danger');
      }
    };
    const onSnapshot = (d) => {
      const map = {};
      d.tiles.forEach(t => { map[t.tileId] = t; });
      setTiles(prev => ({ ...prev, ...map }));
    };
    const onNearby   = (d) => setNearby(d.users);
    const onUserPos  = (u) => setNearby(prev => {
      const idx = prev.findIndex(x => x.userId === u.userId);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...u }; return n; }
      return [...prev, u];
    });
    const onUserStop = (d) => setNearby(prev => prev.filter(u => u.userId !== d.userId));
    const onCheat    = (d) => addToast(`⚠️ Anti-cheat: ${d.reason}`, 'warn');

    socket.on('tile-update',      onTile);
    socket.on('tiles-snapshot',   onSnapshot);
    socket.on('nearby-users',     onNearby);
    socket.on('user-position',    onUserPos);
    socket.on('user-stopped-run', onUserStop);
    socket.on('cheat-detected',   onCheat);

    return () => {
      socket.off('tile-update',      onTile);
      socket.off('tiles-snapshot',   onSnapshot);
      socket.off('nearby-users',     onNearby);
      socket.off('user-position',    onUserPos);
      socket.off('user-stopped-run', onUserStop);
      socket.off('cheat-detected',   onCheat);
    };
  }, [socket, user]);

  // ── Nearby poll ───────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || !socket || !position || isPaused) return;
    const id = setInterval(() => {
      socket.emit('get-nearby-users', { lat: position.lat, lng: position.lng, radius: 1000 });
    }, 5000);
    return () => clearInterval(id);
  }, [isRunning, socket, position, isPaused]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!socket) { addToast('Not connected to server', 'warn'); return; }
    const begin = (pos) => { startRun(pos); addToast('🏃 Run started! Capture territory!', 'success'); };
    if (position) {
      begin(position);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => begin({ lat: p.coords.latitude, lng: p.coords.longitude }),
        ()  => { begin({ lat: 28.6139, lng: 77.2090 }); addToast('No GPS — use Simulate', 'warn'); },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      begin({ lat: 28.6139, lng: 77.2090 });
    }
  }, [socket, startRun, position]);

  const handlePause  = () => { pauseRun();  addToast('⏸ Run paused', 'warn'); };
  const handleResume = () => { resumeRun(); addToast('▶ Run resumed!', 'success'); };
  const handleStop = (finalStats) => {
    setIsSimulating(false);
    stopRun(finalStats);
  };

  const handleTilesLoaded = useCallback((newTiles) => {
    const map = {};
    newTiles.forEach(t => { map[t.tileId] = t; });
    setTiles(prev => ({ ...prev, ...map }));
  }, []);

  return (
    <div className="dashboard">
      <Navbar user={user} isRunning={isRunning} isPaused={isPaused} />

      <div className="dashboard-body">
        {/* ── Map (main area) ───────────────────────────── */}
        <div className="map-wrap">
          <MapView
            position={position}
            tiles={tiles}
            path={path}
            nearbyUsers={nearbyUsers}
            isRunning={isRunning}
            isPaused={isPaused}
            follow={follow}
            onTilesLoaded={handleTilesLoaded}
            showTiles={showTiles}
            showUsers={showUsers}
          />

          {/* Follow toggle */}
          <button
            id="btn-follow"
            className={`map-overlay-btn follow-btn ${follow ? 'active' : ''}`}
            onClick={() => setFollow(f => !f)}
            title={follow ? 'Following you' : 'Map unlocked'}
          >
            {follow ? '📍' : '🗺️'}
          </button>

          {/* Run controls — bottom center */}
          <div className="map-controls-overlay">
            <ControlPanel
              isRunning={isRunning}
              isPaused={isPaused}
              position={position}
              geoError={geoError}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onSimulate={sendPosition}
              onSimulatingChange={setIsSimulating}
              stats={stats}
            />
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────── */}
        <aside className="sidebar">
          {/* Tab buttons */}
          <div className="sidebar-tabs">
            {[
              { id: 'stats',       icon: '📊', label: 'Stats'       },
              { id: 'nearby',      icon: '👥', label: 'Nearby'      },
              { id: 'leaderboard', icon: '🏆', label: 'Top'         },
            ].map(t => (
              <button
                key={t.id}
                className={`tab-btn ${panel === t.id ? 'active' : ''}`}
                onClick={() => setPanel(t.id)}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="sidebar-content">
            {panel === 'stats' && (
              <StatsPanel
                stats={stats}
                isRunning={isRunning}
                isPaused={isPaused}
                isSimulating={isSimulating}
                user={user}
              />
            )}
            {panel === 'nearby'      && <NearbyUsers users={nearbyUsers} />}
            {panel === 'leaderboard' && <Leaderboard />}
          </div>

          {/* Footer: tile count + visibility toggles */}
          <div className="sidebar-footer">
            <div className="tile-count-banner">
              <span>🟦 {Object.keys(tiles).length} tiles loaded</span>
              {isSimulating && <span className="sim-indicator">🎮 Simulating</span>}
            </div>
            <div className="visibility-toggles">
              <label className="vis-toggle">
                <input type="checkbox" checked={showTiles} onChange={() => setShowTiles(s => !s)} />
                <span className="vis-track" />
                <span>Tiles</span>
              </label>
              <label className="vis-toggle">
                <input type="checkbox" checked={showUsers} onChange={() => setShowUsers(s => !s)} />
                <span className="vis-track" />
                <span>Runners</span>
              </label>
            </div>
          </div>
        </aside>
      </div>

      <NotificationStack />

      {/* ── Post-run Summary Modal ──────────────────────── */}
      {runResult && (
        <RunSummaryModal result={runResult} onDismiss={dismissResult} />
      )}
    </div>
  );
}
