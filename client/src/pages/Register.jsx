import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Register() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm]     = useState({ username: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [btnWidth, setBtnWidth] = useState(360);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const updateWidth = () => {
      if (wrapperRef.current) {
        setBtnWidth(wrapperRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      nav('/dashboard');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs[0].msg : (err.response?.data?.error || 'Registration failed'));
    } finally { setLoading(false); }
  };

  const handleGoogle = async (credentialResponse) => {
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential });
      login(data.token, data.user);
      nav('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-up failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">⚡</span>
          <h1>Territory Run</h1>
          <p>Join the race for territory</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <h2>Create Account</h2>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handle} placeholder="coolrunner99" minLength={3} maxLength={20} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="runner@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="Min 6 characters" minLength={6} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Start Running'}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <div className="google-btn-wrapper" ref={wrapperRef}>
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Google sign-up failed')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="signup_with"
              width={String(btnWidth)}
            />
          </div>

          <p className="auth-link">Have an account? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
