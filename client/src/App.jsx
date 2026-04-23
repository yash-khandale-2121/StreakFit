import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DashboardStats from './pages/DashboardStats';
import Social from './pages/Social';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import LeaderboardPage from './pages/LeaderboardPage';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash"><span className="logo-icon">⚡</span></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash"><span className="logo-icon">⚡</span></div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"     element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register"  element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/dashboard"    element={<Protected><Dashboard /></Protected>} />
      <Route path="/stats"        element={<Protected><DashboardStats /></Protected>} />
      <Route path="/social"       element={<Protected><Social /></Protected>} />
      <Route path="/profile"      element={<Protected><Profile /></Protected>} />
      <Route path="/settings"     element={<Protected><Settings /></Protected>} />
      <Route path="/user/:userId" element={<Protected><UserProfile /></Protected>} />
      <Route path="/leaderboard"  element={<Protected><LeaderboardPage /></Protected>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
