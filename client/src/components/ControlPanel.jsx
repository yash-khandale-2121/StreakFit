import { useState, useRef, useEffect } from 'react';

// One simulation step: move ~2–3 m northeast with slight randomness
function nextSimPos(prev) {
  return {
    lat: prev.lat + 0.000018 + (Math.random() * 0.00001),
    lng: prev.lng + 0.000015 + (Math.random() * 0.000008),
  };
}

export default function ControlPanel({
  isRunning, isPaused, position, geoError,
  onStart, onPause, onResume, onStop, onSimulate, onSimulatingChange, stats,
}) {
  const [simulating, setSimulating]     = useState(false);
  const simRef    = useRef(null);
  const simPosRef = useRef(null);

  // Notify parent of sim state
  useEffect(() => { onSimulatingChange?.(simulating); }, [simulating, onSimulatingChange]);

  // Stop sim if run ends
  useEffect(() => {
    if (!isRunning && simulating) {
      clearInterval(simRef.current);
      setSimulating(false);
      simPosRef.current = null;
    }
  }, [isRunning, simulating]);

  // Pause/resume sim with run
  useEffect(() => {
    if (!simulating) return;
    if (isPaused) {
      clearInterval(simRef.current);
    } else {
      simRef.current = setInterval(() => {
        simPosRef.current = nextSimPos(simPosRef.current);
        onSimulate({ ...simPosRef.current, accuracy: 5, timestamp: Date.now() });
      }, 1500);
    }
    return () => clearInterval(simRef.current);
  }, [isPaused, simulating, onSimulate]);

  const toggleSim = () => {
    if (simulating) {
      clearInterval(simRef.current);
      setSimulating(false);
      simPosRef.current = null;
      return;
    }
    setSimulating(true);
    simPosRef.current = position || { lat: 28.6139, lng: 77.2090 };
    simRef.current = setInterval(() => {
      simPosRef.current = nextSimPos(simPosRef.current);
      onSimulate({ ...simPosRef.current, accuracy: 5, timestamp: Date.now() });
    }, 1500);
  };

  const handleStop = () => {
    if (simulating) { clearInterval(simRef.current); setSimulating(false); simPosRef.current = null; }
    onStop(stats);
  };

  return (
    <div className="control-panel">
      {geoError && !simulating && (
        <div className="geo-warn">📍 No GPS — use Simulate for demo</div>
      )}

      <div className="control-buttons">
        {!isRunning ? (
          /* ── STOPPED ── */
          <button id="btn-start-run" className="ctrl-btn ctrl-start" onClick={onStart}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            Start Run
          </button>
        ) : (
          <>
            {/* ── RUNNING / PAUSED ── */}
            {isPaused ? (
              <button id="btn-resume-run" className="ctrl-btn ctrl-resume" onClick={onResume}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                Resume
              </button>
            ) : (
              <button id="btn-pause-run" className="ctrl-btn ctrl-pause" onClick={onPause}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
                Pause
              </button>
            )}

            <button id="btn-stop-run" className="ctrl-btn ctrl-stop" onClick={handleStop}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop
            </button>
          </>
        )}

        {/* ── Simulate ── */}
        <button
          id="btn-simulate"
          className={`ctrl-btn ctrl-sim ${simulating ? 'sim-active' : ''}`}
          onClick={toggleSim}
          disabled={!isRunning}
          title={isRunning ? 'Simulate GPS movement' : 'Start a run first'}
        >
          {simulating
            ? <><span className="sim-pulse" /> Stop Sim</>
            : <><span>🎮</span> Simulate</>
          }
        </button>
      </div>
    </div>
  );
}
