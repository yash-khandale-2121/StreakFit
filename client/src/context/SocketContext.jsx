import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) { socket.disconnect(); setSocket(null); setConnected(false); }
      return;
    }

    const s = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    s.on('connect',    () => { setConnected(true);  console.log('🟢 Socket connected'); });
    s.on('disconnect', () => { setConnected(false); console.log('🔴 Socket disconnected'); });
    s.on('connect_error', (e) => console.error('Socket error:', e.message));

    setSocket(s);
    return () => { s.disconnect(); setSocket(null); setConnected(false); };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
