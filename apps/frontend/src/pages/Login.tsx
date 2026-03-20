import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(decodeURIComponent(urlError));
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', formData);
      if (response.data.success) {
        const { user, tokens } = response.data.data;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <style>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          background-color: #020817;
          background-image:
            radial-gradient(ellipse 110% 50% at 50% 0%, rgba(0,119,182,0.3) 0%, transparent 60%),
            radial-gradient(ellipse 70% 40% at 15% 50%, rgba(3,4,94,0.4) 0%, transparent 55%),
            radial-gradient(ellipse 70% 40% at 85% 60%, rgba(0,180,216,0.14) 0%, transparent 55%);
          background-attachment: fixed;
          font-family: 'Barlow', system-ui, sans-serif;
        }

        .login-left {
          display: none;
          position: relative;
          overflow: hidden;
          background-color: rgba(3, 4, 94, 0.4);
          border-right: 1px solid rgba(0,180,216,0.15);
          backdrop-filter: blur(20px);
        }
        @media (min-width: 1024px) {
          .login-left { display: flex; width: 50%; }
        }

        .login-left-orb-1 {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,119,182,0.25) 0%, transparent 70%);
          top: -100px; left: -80px;
          filter: blur(60px);
          pointer-events: none;
        }
        .login-left-orb-2 {
          position: absolute;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,180,216,0.2) 0%, transparent 70%);
          bottom: 5%; right: -40px;
          filter: blur(60px);
          pointer-events: none;
        }
        .login-left-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,180,216,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,216,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }

        .login-left-inner {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          width: 100%;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .login-logo-mark {
          width: 38px; height: 38px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0077b6, #00b4d8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900;
          font-size: 14px;
          color: #020817;
          box-shadow: 0 0 24px rgba(0,180,216,0.45);
        }
        .login-logo-text {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 800;
          font-size: 20px;
          color: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .login-logo-text span { color: #00b4d8; }

        .login-hero-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 48px;
          font-weight: 900;
          color: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          line-height: 0.95;
          margin-bottom: 16px;
        }
        .login-hero-title span {
          background: linear-gradient(135deg, #caf0f8 0%, #00b4d8 50%, #0077b6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-hero-sub {
          font-size: 15px;
          font-weight: 300;
          color: rgba(248,250,252,0.55);
          line-height: 1.7;
        }

        .login-feature-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 36px;
        }
        .login-feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 14px;
          font-weight: 400;
          color: rgba(248,250,252,0.65);
        }
        .login-feature-icon {
          width: 38px; height: 38px;
          border-radius: 8px;
          background: rgba(0,180,216,0.1);
          border: 1px solid rgba(0,180,216,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .login-copyright {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(248,250,252,0.2);
        }

        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
        }

        .login-form-wrap {
          width: 100%;
          max-width: 420px;
        }

        .login-mobile-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
        }
        @media (min-width: 1024px) { .login-mobile-logo { display: none; } }

        .login-heading {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 40px;
          font-weight: 900;
          color: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          line-height: 1;
          margin-bottom: 8px;
        }
        .login-subheading {
          font-size: 14px;
          font-weight: 300;
          color: rgba(248,250,252,0.5);
        }
        .login-subheading a {
          color: #00b4d8;
          font-weight: 600;
          text-decoration: none;
        }
        .login-subheading a:hover { text-decoration: underline; }

        .login-error {
          margin: 20px 0;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 400;
        }
        .login-error-icon {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: rgba(239,68,68,0.3);
          border: 1px solid rgba(239,68,68,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .login-form { display: flex; flex-direction: column; gap: 18px; margin-top: 28px; }

        .login-label {
          display: block;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(248,250,252,0.55);
          margin-bottom: 8px;
        }

        .login-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          font-family: 'Barlow', sans-serif;
          font-size: 14px;
          color: #f8fafc;
          background: rgba(10,22,40,0.8);
          border: 1px solid rgba(0,180,216,0.15);
          outline: none;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
          -webkit-appearance: none;
        }
        .login-input::placeholder { color: rgba(248,250,252,0.25); }
        .login-input:hover { border-color: rgba(0,180,216,0.3); background: rgba(0,119,182,0.1); }
        .login-input:focus {
          border-color: rgba(0,180,216,0.55);
          background: rgba(0,180,216,0.06);
          box-shadow: 0 0 0 3px rgba(0,180,216,0.12);
        }
        .login-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-pass-wrap { position: relative; }
        .login-pass-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px; height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: rgba(248,250,252,0.35);
          cursor: pointer;
          transition: color 120ms, background 120ms;
        }
        .login-pass-toggle:hover { color: rgba(248,250,252,0.7); background: rgba(0,180,216,0.1); }

        .login-forgot {
          font-size: 12px;
          font-weight: 600;
          color: #00b4d8;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'Barlow', sans-serif;
        }
        .login-forgot:hover { text-decoration: underline; }

        .login-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .login-submit {
          width: 100%;
          padding: 14px 24px;
          border-radius: 10px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #0077b6, #00b4d8);
          color: #020817;
          border: none;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
          box-shadow: 0 0 24px rgba(0,180,216,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          position: relative;
          overflow: hidden;
        }
        .login-submit::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(202,240,248,0.18) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }
        .login-submit:hover { transform: translateY(-2px); box-shadow: 0 0 44px rgba(0,180,216,0.6); filter: brightness(1.08); }
        .login-submit:hover::after { transform: translateX(100%); }
        .login-submit:active { transform: translateY(0); }
        .login-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 0;
        }
        .login-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(0,180,216,0.15);
        }
        .login-divider-text {
          font-size: 11px;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(248,250,252,0.25);
        }

        .login-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 13px 24px;
          border-radius: 10px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #f8fafc;
          background: rgba(10,22,40,0.7);
          border: 1px solid rgba(0,180,216,0.2);
          text-decoration: none;
          transition: background 120ms, border-color 120ms, transform 120ms, box-shadow 120ms;
          backdrop-filter: blur(10px);
        }
        .login-google:hover {
          background: rgba(0,119,182,0.15);
          border-color: rgba(0,180,216,0.4);
          transform: translateY(-1px);
          box-shadow: 0 0 20px rgba(0,180,216,0.12);
        }

        .login-footer-note {
          text-align: center;
          font-size: 13px;
          color: rgba(248,250,252,0.4);
          padding-top: 8px;
        }
        .login-footer-note a {
          color: #00b4d8;
          font-weight: 600;
          text-decoration: none;
        }
        .login-footer-note a:hover { text-decoration: underline; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .login-spinner { animation: spin 0.8s linear infinite; }
      `}</style>

      <div className="login-root">

        {/* Left branding panel */}
        <div className="login-left">
          <div className="login-left-orb-1" />
          <div className="login-left-orb-2" />
          <div className="login-left-grid" />

          <div className="login-left-inner">
            <Link to="/" className="login-logo">
              <div className="login-logo-mark">SO</div>
              <span className="login-logo-text">Score<span>Ocean</span></span>
            </Link>

            <div>
              <h2 className="login-hero-title">
                Welcome back,<br />
                <span>Champion.</span>
              </h2>
              <p className="login-hero-sub">
                Sign in to track your performance, manage teams, and compete in tournaments.
              </p>

              <ul className="login-feature-list">
                {[
                  { icon: '📊', text: 'Real-time performance statistics' },
                  { icon: '🏆', text: 'Tournament management & fixtures' },
                  { icon: '⚡', text: 'Live match scoring & updates' },
                  { icon: '🎖️', text: 'Digital achievement certificates' },
                ].map((f) => (
                  <li key={f.text} className="login-feature-item">
                    <span className="login-feature-icon">{f.icon}</span>
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>

            <p className="login-copyright">
              &copy; 2026 <span style={{ color: '#ffffff' }}>SCORE</span><span style={{ color: '#00b4d8' }}>OCEAN</span> &bull; India's Digital Sports Platform
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-right">
          <div className="login-form-wrap">

            {/* Mobile logo */}
            <div className="login-mobile-logo">
              <div className="login-logo-mark" style={{ width: 32, height: 32, fontSize: 12 }}>SO</div>
              <span className="login-logo-text" style={{ fontSize: 17 }}>Score<span>Ocean</span></span>
            </div>

            <div>
              <h1 className="login-heading">Sign In</h1>
              <p className="login-subheading">
                New to <span style={{ color: '#ffffff' }}>SCORE</span><span style={{ color: '#00b4d8' }}>OCEAN</span>?{' '}
                <Link to="/register">Create account</Link>
              </p>
            </div>

            {error && (
              <div className="login-error">
                <div className="login-error-icon">
                  <svg width="10" height="10" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </div>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div>
                <label className="login-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="login-input"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <div className="login-label-row">
                  <label className="login-label" style={{ margin: 0 }}>Password</label>
                  <button type="button" className="login-forgot">Forgot password?</button>
                </div>
                <div className="login-pass-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="login-input"
                    style={{ paddingRight: 48 }}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button type="button" className="login-pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass
                      ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit">
                {loading ? (
                  <>
                    <svg className="login-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(2,8,23,0.3)" strokeWidth="4"/>
                      <path fill="#020817" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing In...
                  </>
                ) : 'Sign In →'}
              </button>

              <div className="login-divider">
                <div className="login-divider-line" />
                <span className="login-divider-text">or</span>
                <div className="login-divider-line" />
              </div>

              <a href={`${BACKEND_URL}/api/auth/google`} className="login-google">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </a>

              <p className="login-footer-note">
                Don't have an account?{' '}
                <Link to="/register">Register for free</Link>
              </p>
            </form>
          </div>
        </div>

      </div>
    </>
  );
}

export default Login;