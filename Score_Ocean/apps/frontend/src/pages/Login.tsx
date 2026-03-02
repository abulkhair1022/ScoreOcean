import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-950 via-[#1a1040] to-[#0a1628]">
        {/* Decorative blobs */}
        <div className="absolute w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', top: '-80px', left: '-80px' }} />
        <div className="absolute w-64 h-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #06d5ef 0%, transparent 70%)', bottom: '10%', right: '-40px' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center shadow-glow">
              <span className="text-white font-black text-sm">SO</span>
            </div>
            <span className="text-white font-black text-2xl tracking-tight">Score<span className="gradient-text">Ocean</span></span>
          </Link>

          {/* Center content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
                Welcome back,<br />
                <span className="gradient-text">champion.</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Sign in to track your performance, manage teams, and compete in tournaments.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-4">
              {[
                { icon: '📊', text: 'Real-time performance statistics' },
                { icon: '🏆', text: 'Tournament management & fixtures' },
                { icon: '⚡', text: 'Live match scoring & updates' },
                { icon: '🎖️', text: 'Digital achievement certificates' },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-gray-300 text-sm">
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-base">{f.icon}</span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom note */}
          <p className="text-gray-500 text-xs">
            &copy; 2026 Score Ocean &bull; India's Digital Sports Platform
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">SO</span>
            </div>
            <span className="font-black text-xl text-gray-900">Score<span className="gradient-text">Ocean</span></span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              Sign in
            </h1>
            <p className="text-gray-500">
              New to Score Ocean?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:underline">
                Create account
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <button type="button" className="text-xs text-primary-600 hover:underline font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="input-field pr-12"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {showPass
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-2xl hover:from-primary-700 hover:to-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>

            <p className="text-center text-sm text-gray-500 pt-2">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:underline">
                Register for free
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
