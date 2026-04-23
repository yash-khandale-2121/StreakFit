import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const initialStats = { distance: 0, speed: 0, duration: 0, tilesCaptured: 0, tilesRecaptured: 0 };

export function useRun() {
  const { socket }              = useSocket();
  const { updateUser }          = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused,  setIsPaused]  = useState(false);
  const [stats,     setStats]     = useState(initialStats);
  const [path,      setPath]      = useState([]);
  const [runResult, setRunResult] = useState(null); // holds post-run summary data
  const sessionRef                = useRef(null);

  const startRun = useCallback((pos) => {
    if (!socket || !pos) return;
    setIsRunning(true);
    setIsPaused(false);
    setStats(initialStats);
    setPath([{ lat: pos.lat, lng: pos.lng }]);
    setRunResult(null);
    sessionRef.current = { startTime: new Date().toISOString(), maxSpeed: 0 };
    socket.emit('start-run', { lat: pos.lat, lng: pos.lng });
  }, [socket]);

  const pauseRun  = useCallback(() => setIsPaused(true),  []);
  const resumeRun = useCallback(() => setIsPaused(false), []);

  const stopRun = useCallback(async (finalStats) => {
    if (!socket) return;
    socket.emit('stop-run');
    setIsRunning(false);
    setIsPaused(false);

    if (sessionRef.current && (finalStats?.distance || 0) > 5) {
      try {
        const { data } = await api.post('/sessions', {
          startTime:       sessionRef.current.startTime,
          endTime:         new Date().toISOString(),
          distanceMeters:  finalStats.distance,
          avgSpeedKmh:     finalStats.speed,
          maxSpeedKmh:     sessionRef.current.maxSpeed,
          tilesCaptured:   finalStats.tilesCaptured,
          tilesRecaptured: finalStats.tilesRecaptured,
        });
        // Surface the response for the summary modal
        setRunResult({
          distanceMeters:  finalStats.distance,
          durationSeconds: finalStats.duration || 0,
          tilesCaptured:   finalStats.tilesCaptured || 0,
          tilesRecaptured: finalStats.tilesRecaptured || 0,
          avgSpeedKmh:     finalStats.speed || 0,
          xpEarned:        data.xpEarned || 0,
          caloriesBurned:  data.caloriesBurned || 0,
          newlyEarned:     data.newlyEarned || [],
          streakCurrent:   data.streakCurrent || 0,
          user:            data.user,
        });
        // Sync latest user stats to auth context
        if (data.user) updateUser(data.user);
      } catch (e) {
        console.error('Session save failed', e);
      }
    }
    sessionRef.current = null;
  }, [socket, updateUser]);

  // Called when user closes the summary modal
  const dismissResult = useCallback(() => {
    setRunResult(null);
    setStats(initialStats);
    setPath([]);
  }, []);

  const sendPosition = useCallback((pos) => {
    if (!socket || !isRunning || isPaused) return;
    socket.emit('location-update', { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy || 10 });
    setPath((p) => [...p, { lat: pos.lat, lng: pos.lng }]);
  }, [socket, isRunning, isPaused]);

  useEffect(() => {
    if (!socket) return;
    const onStats = (data) => {
      setStats(data);
      if (sessionRef.current && data.speed > sessionRef.current.maxSpeed) {
        sessionRef.current.maxSpeed = data.speed;
      }
    };
    socket.on('run-stats', onStats);
    return () => socket.off('run-stats', onStats);
  }, [socket]);

  return {
    isRunning, isPaused, stats, path, runResult,
    startRun, pauseRun, resumeRun, stopRun, sendPosition, dismissResult,
  };
}
