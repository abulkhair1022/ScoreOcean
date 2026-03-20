import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

const ROLES = [
  {
    value: 'PLAYER',
    label: 'Player',
    icon: '🏃',
    desc: 'Individual athlete',
    accent: '#90e0ef',
    glow: 'rgba(144,224,239,0.12)',
    border: 'rgba(144,224,239,0.3)',
    activeBg: 'rgba(144,224,239,0.08)',
  },
  {
    value: 'TEAM',
    label: 'Team',
    icon: '🛡️',
    desc: 'Team manager',
    accent: '#00b4d8',
    glow: 'rgba(0,180,216,0.12)',
    border: 'rgba(0,180,216,0.3)',
    activeBg: 'rgba(0,180,216,0.08)',
  },
  {
    value: 'ORGANIZATION',
    label: 'Organization',
    icon: '🏟️',
    desc: 'Tournament host',
    accent: '#0077b6',
    glow: 'rgba(0,119,182,0.12)',
    border: 'rgba(0,119,182,0.35)',
    activeBg: 'rgba(0,119,182,0.1)',
  },
];

function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    name: '',
    age: '',
    city: '',
    state: '',
    country: 'India',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const selectedRole = ROLES.find((r) => r.value === formData.role);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (!formData.email || !formData.password || !formData.role || !formData.name) { setError('Please fill in all required fields'); return; }
    setLoading(true);
    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        phone: formData.phone || undefined,
      };
      const response = await apiClient.post('/auth/register', registrationData);
      if (response.data.success) {
        const { user, tokens } = response.data.data;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const canProceedStep1 = formData.role !== '';
  const canProceedStep2 = formData.name && formData.email && formData.password && formData.confirmPassword;

  return (
    <>
      <style>{`
        .reg-root {
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

        .reg-left {
          display: none;
          position: relative;
          overflow: hidden;
          background-color: rgba(3,4,94,0.4);
          border-right: 1px solid rgba(0,180,216,0.15);
          backdrop-filter: blur(20px);
          flex-shrink: 0;
        }
        @media (min-width: 1024px) { .reg-left { display: flex; width: 420px; } }
        @media (min-width: 1280px) { .reg-left { width: 50%; } }

        .reg-left-orb-1 {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,119,182,0.25) 0%, transparent 70%);
          top: -100px; left: -80px; filter: blur(60px); pointer-events: none;
        }
        .reg-left-orb-2 {
          position: absolute; width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,180,216,0.2) 0%, transparent 70%);
          bottom: 10%; right: -40px; filter: blur(60px); pointer-events: none;
        }
        .reg-left-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,180,216,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,216,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }
        .reg-left-inner {
          position: relative; z-index: 10;
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 48px; width: 100%;
        }

        .reg-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .reg-logo-mark {
          width: 38px; height: 38px; border-radius: 8px;
          background: linear-gradient(135deg, #0077b6, #00b4d8);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 14px;
          color: #020817; box-shadow: 0 0 24px rgba(0,180,216,0.45);
        }
        .reg-logo-text {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 20px;
          color: #f8fafc; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .reg-logo-text span { color: #00b4d8; }

        .reg-hero-title {
          font-family: 'Barlow Condensed', sans-serif; font-size: 44px; font-weight: 900;
          color: #f8fafc; text-transform: uppercase; letter-spacing: 0.02em;
          line-height: 0.95; margin-bottom: 14px;
        }
        .reg-hero-title span {
          background: linear-gradient(135deg, #caf0f8 0%, #00b4d8 50%, #0077b6 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .reg-hero-sub {
          font-size: 14px; font-weight: 300; color: rgba(248,250,252,0.55); line-height: 1.7;
        }

        .reg-stats-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 32px;
        }
        .reg-stat-card {
          padding: 16px 12px; border-radius: 12px; text-align: center;
          background: rgba(0,180,216,0.06); border: 1px solid rgba(0,180,216,0.15);
          backdrop-filter: blur(10px);
        }
        .reg-stat-icon  { font-size: 22px; margin-bottom: 6px; display: block; }
        .reg-stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 900; color: #f8fafc; letter-spacing: 0.02em; line-height: 1; }
        .reg-stat-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(248,250,252,0.35); margin-top: 3px; }

        .reg-copyright {
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: rgba(248,250,252,0.2);
        }

        .reg-right {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 48px 32px; overflow-y: auto;
        }
        .reg-form-wrap { width: 100%; max-width: 480px; }

        .reg-mobile-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
        @media (min-width: 1024px) { .reg-mobile-logo { display: none; } }

        .reg-steps {
          display: flex; align-items: center; gap: 8px; margin-bottom: 32px;
        }
        .reg-step-dot {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 800;
          transition: all 220ms ease; flex-shrink: 0;
        }
        .reg-step-dot.done  { background: linear-gradient(135deg, #0077b6, #00b4d8); color: #020817; box-shadow: 0 0 16px rgba(0,180,216,0.4); }
        .reg-step-dot.active{ background: linear-gradient(135deg, #0077b6, #00b4d8); color: #020817; box-shadow: 0 0 20px rgba(0,180,216,0.5); }
        .reg-step-dot.idle  { background: rgba(0,180,216,0.08); color: rgba(248,250,252,0.3); border: 1px solid rgba(0,180,216,0.15); }
        .reg-step-bar {
          flex: 1; height: 2px; border-radius: 9999px; max-width: 48px;
          transition: background 400ms ease;
        }
        .reg-step-bar.done   { background: linear-gradient(90deg, #0077b6, #00b4d8); box-shadow: 0 0 8px rgba(0,180,216,0.4); }
        .reg-step-bar.idle   { background: rgba(0,180,216,0.12); }
        .reg-step-label {
          font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: rgba(248,250,252,0.4);
          margin-left: 8px;
        }

        .reg-heading {
          font-family: 'Barlow Condensed', sans-serif; font-size: 34px; font-weight: 900;
          color: #f8fafc; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; margin-bottom: 6px;
        }
        .reg-subheading { font-size: 13px; font-weight: 300; color: rgba(248,250,252,0.45); margin-bottom: 24px; }

        .reg-error {
          display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px; color: #fca5a5; font-size: 13px; margin-bottom: 20px;
        }
        .reg-error-icon {
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(239,68,68,0.3); border: 1px solid rgba(239,68,68,0.4);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
        }

        .reg-role-btn {
          width: 100%; display: flex; align-items: center; gap: 16px;
          padding: 18px 20px; border-radius: 12px; border: 1px solid rgba(0,180,216,0.15);
          background: rgba(10,22,40,0.6); cursor: pointer; text-align: left;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
          backdrop-filter: blur(10px);
        }
        .reg-role-btn:hover { transform: translateX(3px); border-color: rgba(0,180,216,0.3); background: rgba(0,180,216,0.06); }
        .reg-role-icon {
          width: 52px; height: 52px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 24px;
          background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.15);
          transition: box-shadow 180ms;
        }
        .reg-role-name {
          font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 800;
          letter-spacing: 0.04em; text-transform: uppercase; color: #f8fafc; line-height: 1;
        }
        .reg-role-desc { font-size: 12px; font-weight: 300; color: rgba(248,250,252,0.45); margin-top: 3px; }
        .reg-role-radio {
          width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(0,180,216,0.25);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: auto;
          transition: all 180ms ease;
        }
        .reg-role-radio.checked {
          background: linear-gradient(135deg, #0077b6, #00b4d8);
          border-color: transparent; box-shadow: 0 0 12px rgba(0,180,216,0.4);
        }

        .reg-selected-role {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 10px; margin-bottom: 4px;
          background: rgba(0,180,216,0.06); border: 1px solid rgba(0,180,216,0.2);
        }
        .reg-selected-role-name {
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: #00b4d8;
        }
        .reg-change-btn {
          margin-left: auto; font-size: 11px; font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(248,250,252,0.35); background: none; border: none; cursor: pointer;
          transition: color 120ms;
        }
        .reg-change-btn:hover { color: #00b4d8; }

        .reg-label {
          display: block; font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(248,250,252,0.5); margin-bottom: 7px;
        }
        .reg-label span { color: rgba(239,68,68,0.8); }

        .reg-input {
          width: 100%; padding: 11px 16px; border-radius: 10px;
          font-family: 'Barlow', sans-serif; font-size: 14px; color: #f8fafc;
          background: rgba(10,22,40,0.8); border: 1px solid rgba(0,180,216,0.15);
          outline: none; transition: border-color 120ms, background 120ms, box-shadow 120ms;
          -webkit-appearance: none;
        }
        .reg-input::placeholder { color: rgba(248,250,252,0.22); }
        .reg-input:hover { border-color: rgba(0,180,216,0.3); background: rgba(0,119,182,0.08); }
        .reg-input:focus {
          border-color: rgba(0,180,216,0.55); background: rgba(0,180,216,0.06);
          box-shadow: 0 0 0 3px rgba(0,180,216,0.12);
        }
        .reg-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .reg-input-wrap { position: relative; }
        .reg-pass-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          border-radius: 6px; background: transparent; border: none;
          color: rgba(248,250,252,0.3); cursor: pointer; transition: color 120ms, background 120ms;
        }
        .reg-pass-toggle:hover { color: rgba(248,250,252,0.65); background: rgba(0,180,216,0.1); }

        .reg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .reg-field   { display: flex; flex-direction: column; }
        .reg-form-gap { display: flex; flex-direction: column; gap: 16px; }

        .reg-btn-primary {
          width: 100%; padding: 13px 24px; border-radius: 10px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase;
          background: linear-gradient(135deg, #0077b6, #00b4d8); color: #020817;
          border: none; cursor: pointer;
          transition: transform 120ms, box-shadow 120ms, filter 120ms;
          box-shadow: 0 0 24px rgba(0,180,216,0.4);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          position: relative; overflow: hidden;
        }
        .reg-btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(202,240,248,0.18) 50%, transparent 60%);
          transform: translateX(-100%); transition: transform 0.5s;
        }
        .reg-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 44px rgba(0,180,216,0.6); filter: brightness(1.08); }
        .reg-btn-primary:hover::after { transform: translateX(100%); }
        .reg-btn-primary:active { transform: translateY(0); }
        .reg-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .reg-btn-back {
          padding: 13px 22px; border-radius: 10px; flex-shrink: 0;
          font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          background: transparent; color: rgba(248,250,252,0.5);
          border: 1px solid rgba(0,180,216,0.18); cursor: pointer;
          transition: background 120ms, border-color 120ms, color 120ms;
        }
        .reg-btn-back:hover { background: rgba(0,180,216,0.06); border-color: rgba(0,180,216,0.3); color: #f8fafc; }

        .reg-btn-row { display: flex; gap: 10px; margin-top: 6px; }

        .reg-divider {
          display: flex; align-items: center; gap: 12px; padding: 4px 0; margin-top: 20px;
        }
        .reg-divider-line { flex: 1; height: 1px; background: rgba(0,180,216,0.15); }
        .reg-divider-text {
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: rgba(248,250,252,0.22);
        }

        .reg-google {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 13px 24px; border-radius: 10px; margin-top: 12px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #f8fafc; background: rgba(10,22,40,0.7); border: 1px solid rgba(0,180,216,0.2);
          text-decoration: none; transition: background 120ms, border-color 120ms, transform 120ms, box-shadow 120ms;
          backdrop-filter: blur(10px);
        }
        .reg-google:hover {
          background: rgba(0,119,182,0.15); border-color: rgba(0,180,216,0.4);
          transform: translateY(-1px); box-shadow: 0 0 20px rgba(0,180,216,0.12);
        }

        .reg-footer {
          text-align: center; font-size: 13px; color: rgba(248,250,252,0.38); margin-top: 20px;
        }
        .reg-footer a { color: #00b4d8; font-weight: 600; text-decoration: none; }
        .reg-footer a:hover { text-decoration: underline; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .reg-spinner { animation: spin 0.8s linear infinite; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .reg-step-anim { animation: fadeUp 0.3s ease both; }
      `}</style>

      <div className="reg-root">

        {/* Left branding panel */}
        <div className="reg-left">
          <div className="reg-left-orb-1" />
          <div className="reg-left-orb-2" />
          <div className="reg-left-grid" />
          <div className="reg-left-inner">
            <Link to="/" className="reg-logo">
              <div className="reg-logo-mark">SO</div>
              <span className="reg-logo-text">Score<span>Ocean</span></span>
            </Link>

            <div>
              <h2 className="reg-hero-title">
                Join thousands of<br />
                <span>Indian Athletes.</span>
              </h2>
              <p className="reg-hero-sub">
                Build your digital sports identity, compete in tournaments, and elevate your game.
              </p>
              <div className="reg-stats-grid">
                {[
                  { icon: '🏃', label: 'Players',     value: '50K+' },
                  { icon: '🏆', label: 'Tournaments', value: '1.2K+' },
                  { icon: '🛡️', label: 'Teams',       value: '8.5K+' },
                  { icon: '⚡', label: 'Matches',     value: '25K+' },
                ].map((s) => (
                  <div key={s.label} className="reg-stat-card">
                    <span className="reg-stat-icon">{s.icon}</span>
                    <div className="reg-stat-value">{s.value}</div>
                    <div className="reg-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <p className="reg-copyright">&copy; 2026 <span style={{ color: '#ffffff' }}>SCORE</span><span style={{ color: '#00b4d8' }}>OCEAN</span> &bull; India's Digital Sports Platform</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="reg-right">
          <div className="reg-form-wrap">

            {/* Mobile logo */}
            <div className="reg-mobile-logo">
              <div className="reg-logo-mark" style={{ width: 32, height: 32, fontSize: 12 }}>SO</div>
              <span className="reg-logo-text" style={{ fontSize: 17 }}>Score<span>Ocean</span></span>
            </div>

            {/* Step indicator */}
            <div className="reg-steps">
              {[1, 2, 3].map((s) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={`reg-step-dot ${step > s ? 'done' : step === s ? 'active' : 'idle'}`}>
                    {step > s
                      ? <svg width="12" height="12" fill="none" stroke="#020817" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                      : s
                    }
                  </div>
                  {s < 3 && <div className={`reg-step-bar ${step > s ? 'done' : 'idle'}`} />}
                </div>
              ))}
              <span className="reg-step-label">
                {step === 1 ? 'Choose role' : step === 2 ? 'Account details' : 'Profile info'}
              </span>
            </div>

            <h1 className="reg-heading">
              {step === 1 ? 'Choose Your Role' : step === 2 ? 'Create Account' : 'Profile Info'}
            </h1>
            <p className="reg-subheading">
              {step === 1 ? 'How will you use SCORE OCEAN?' :
               step === 2 ? 'Set up your login credentials' :
               'Optional details to complete your profile'}
            </p>

            {error && (
              <div className="reg-error">
                <div className="reg-error-icon">
                  <svg width="10" height="10" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </div>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Step 1 — Role */}
              {step === 1 && (
                <div className="reg-form-gap reg-step-anim">
                  {ROLES.map((r) => {
                    const active = formData.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r.value })}
                        className="reg-role-btn"
                        style={active ? {
                          borderColor: r.border,
                          background: r.activeBg,
                          boxShadow: `0 0 20px ${r.glow}`,
                          transform: 'translateX(4px)',
                        } : {}}
                      >
                        <div className="reg-role-icon" style={active ? { borderColor: r.border, boxShadow: `0 0 16px ${r.glow}` } : {}}>
                          {r.icon}
                        </div>
                        <div>
                          <div className="reg-role-name" style={active ? { color: r.accent } : {}}>{r.label}</div>
                          <div className="reg-role-desc">{r.desc}</div>
                        </div>
                        <div className={`reg-role-radio${active ? ' checked' : ''}`}>
                          {active && (
                            <svg width="10" height="10" fill="none" stroke="#020817" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  <button type="button" disabled={!canProceedStep1} onClick={() => setStep(2)} className="reg-btn-primary" style={{ marginTop: 4 }}>
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 2 — Account */}
              {step === 2 && (
                <div className="reg-form-gap reg-step-anim">
                  {selectedRole && (
                    <div className="reg-selected-role">
                      <span style={{ fontSize: 18 }}>{selectedRole.icon}</span>
                      <span className="reg-selected-role-name">Registering as {selectedRole.label}</span>
                      <button type="button" className="reg-change-btn" onClick={() => setStep(1)}>Change</button>
                    </div>
                  )}

                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">Full Name <span>*</span></label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required className="reg-input" placeholder="Your full name" disabled={loading} />
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">Email <span>*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className="reg-input" placeholder="you@example.com" disabled={loading} />
                    </div>
                  </div>

                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">Password <span>*</span></label>
                      <div className="reg-input-wrap">
                        <input type={showPass ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required className="reg-input" style={{ paddingRight: 44 }} placeholder="Min 8 characters" disabled={loading} />
                        <button type="button" className="reg-pass-toggle" onClick={() => setShowPass(!showPass)}>
                          {showPass
                            ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">Confirm Password <span>*</span></label>
                      <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="reg-input" placeholder="Re-enter password" disabled={loading} />
                    </div>
                  </div>

                  <div className="reg-btn-row">
                    <button type="button" className="reg-btn-back" onClick={() => setStep(1)}>← Back</button>
                    <button type="button" className="reg-btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={!canProceedStep2}>Continue →</button>
                  </div>
                </div>
              )}

              {/* Step 3 — Profile */}
              {step === 3 && (
                <div className="reg-form-gap reg-step-anim">
                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">Age</label>
                      <input type="number" name="age" value={formData.age} onChange={handleChange} min="5" max="120" className="reg-input" placeholder="Your age" disabled={loading} />
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">Phone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="reg-input" placeholder="+91 XXXXXXXXXX" disabled={loading} />
                    </div>
                  </div>
                  <div className="reg-grid-2">
                    <div className="reg-field">
                      <label className="reg-label">City</label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange} className="reg-input" placeholder="Mumbai" disabled={loading} />
                    </div>
                    <div className="reg-field">
                      <label className="reg-label">State</label>
                      <input type="text" name="state" value={formData.state} onChange={handleChange} className="reg-input" placeholder="Maharashtra" disabled={loading} />
                    </div>
                  </div>
                  <div className="reg-field">
                    <label className="reg-label">Country</label>
                    <input type="text" name="country" value={formData.country} onChange={handleChange} className="reg-input" placeholder="India" disabled={loading} />
                  </div>

                  <div className="reg-btn-row">
                    <button type="button" className="reg-btn-back" onClick={() => setStep(2)}>← Back</button>
                    <button type="submit" className="reg-btn-primary" style={{ flex: 1 }} disabled={loading}>
                      {loading ? (
                        <>
                          <svg className="reg-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="rgba(2,8,23,0.3)" strokeWidth="4"/>
                            <path fill="#020817" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Creating Account...
                        </>
                      ) : 'Create Account 🎉'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <p className="reg-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>

            <div className="reg-divider">
              <div className="reg-divider-line" />
              <span className="reg-divider-text">or sign up with</span>
              <div className="reg-divider-line" />
            </div>

            <a href={`${BACKEND_URL}/api/auth/google`} className="reg-google">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

          </div>
        </div>
      </div>
    </>
  );
}

export default Register;