import { useState, useEffect, useCallback, useRef } from 'react';

const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 };

export function useGeolocation({ onPosition, enabled = false }) {
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);
  const watchIdRef              = useRef(null);
  const latestOnPosition        = useRef(onPosition);

  // Keep callback ref fresh without restarting the watch
  useEffect(() => { latestOnPosition.current = onPosition; }, [onPosition]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed:    pos.coords.speed,
          timestamp: pos.timestamp,
        };
        setPosition(p);
        latestOnPosition.current?.(p);
      },
      (err) => {
        console.warn('[GPS]', err.code, err.message);
        setError(err.message);
      },
      GEO_OPTIONS
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) startWatching(); else stopWatching();
    return stopWatching;
  }, [enabled, startWatching, stopWatching]);

  return { position, error };
}

/**
 * One-shot: get the current position immediately.
 * Used for map centering on mount regardless of run state.
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Not supported')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  });
}
