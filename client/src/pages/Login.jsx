import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      nav('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleGoogle = async (credentialResponse) => {
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential });
      login(data.token, data.user);
      nav('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">⚡</span>
          <h1>Territory Run</h1>
          <p>Claim the city, one tile at a time</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <h2>Welcome Back</h2>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="runner@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <div className="google-btn-wrapper">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Google sign-in failed')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="signin_with"
              width="360"
            />
          </div>

          <p className="auth-link">No account? <Link to="/register">Create one</Link></p>
        </form>
      </div>
    </div>
  );
}
