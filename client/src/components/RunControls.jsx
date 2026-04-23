import { useState, useRef, useEffect } from 'react';

export default function RunControls({ isRunning, position, geoError, onStart, onStop, onSimulate, onSimulatingChange, stats }) {
  const [simulating, setSimulating] = useState(false);
  const simRef    = useRef(null);
  const simPosRef = useRef(null); // tracks the simulation's current position

  // Notify parent whenever simulating changes
  useEffect(() => {
    onSimulatingChange?.(simulating);
  }, [simulating, onSimulatingChange]);

  // Stop simulation when run stops
  useEffect(() => {
    if (!isRunning && simulating) {
      clearInterval(simRef.current);
      setSimulating(false);
      simPosRef.current = null;
    }
  }, [isRunning, simulating]);

  const handleSimulate = () => {
    if (simulating) {
      clearInterval(simRef.current);
      setSimulating(false);
      simPosRef.current = null;
      return;
    }

    setSimulating(true);

    // Always start simulation from the current real GPS position if available,
    // otherwise use the current map centre (passed via position prop after GPS fix)
    const base = simPosRef.current || position || { lat: 28.6139, lng: 77.2090 };
    simPosRef.current = { ...base };

    let step = 0;
    simRef.current = setInterval(() => {
      // Small random walk — each step ~2–3 m, ensuring we cross tile boundaries
      const deltaLat = 0.000018 + (Math.random() * 0.000010);  // ~2–3 m per step
      const deltaLng = 0.000015 + (Math.random() * 0.000008);

      simPosRef.current = {
        lat: simPosRef.current.lat + deltaLat,
        lng: simPosRef.current.lng + deltaLng,
      };

      onSimulate({ ...simPosRef.current, accuracy: 5, timestamp: Date.now() });
      step++;
    }, 1500);
  };

  const handleStop = () => {
    if (simulating) {
      clearInterval(simRef.current);
      setSimulating(false);
      simPosRef.current = null;
    }
    onStop(stats);
  };

  return (
    <div className="run-controls">
      {geoError && !simulating && <p className="geo-error">📍 {geoError}</p>}

      {!isRunning ? (
        <button id="btn-start-run" className="btn-run start" onClick={onStart}>
          <span className="run-icon">▶</span>
          Start Run
        </button>
      ) : (
        <button id="btn-stop-run" className="btn-run stop" onClick={handleStop}>
          <span className="run-icon pulse-dot" />
          Stop Run
        </button>
      )}

      <button
        id="btn-simulate"
        className={`btn-simulate ${simulating ? 'active' : ''}`}
        onClick={handleSimulate}
        disabled={!isRunning}
        title={isRunning ? 'Simulate GPS movement (demo mode)' : 'Start a run first'}
      >
        {simulating ? '🛑 Stop Sim' : '🎮 Simulate'}
      </button>
    </div>
  );
}
