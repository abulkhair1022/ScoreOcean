import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const ROLES = [
  {
    value: 'PLAYER',
    label: 'Player',
    icon: '🏃',
    desc: 'Individual athlete',
    gradient: 'from-blue-500 to-indigo-600',
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  {
    value: 'TEAM',
    label: 'Team',
    icon: '🛡️',
    desc: 'Team manager',
    gradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  {
    value: 'ORGANIZATION',
    label: 'Organization',
    icon: '🏟️',
    desc: 'Tournament host',
    gradient: 'from-violet-500 to-purple-600',
    border: 'border-violet-300',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.email || !formData.password || !formData.role || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

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
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-950 via-[#1a1040] to-[#0a1628] flex-shrink-0">
        <div className="absolute w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', top: '-80px', left: '-80px' }} />
        <div className="absolute w-64 h-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #06d5ef 0%, transparent 70%)', bottom: '15%', right: '-40px' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center shadow-glow">
              <span className="text-white font-black text-sm">SO</span>
            </div>
            <span className="text-white font-black text-2xl tracking-tight">Score<span className="gradient-text">Ocean</span></span>
          </Link>

          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
                Join thousands of<br />
                <span className="gradient-text">Indian athletes.</span>
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                Build your digital sports identity, compete in tournaments, and elevate your game.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🏃', label: 'Players', value: '50K+' },
                { icon: '🏆', label: 'Tournaments', value: '1.2K+' },
                { icon: '🛡️', label: 'Teams', value: '8.5K+' },
                { icon: '⚡', label: 'Matches', value: '25K+' },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-white font-black text-xl">{s.value}</div>
                  <div className="text-gray-400 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-xs">
            &copy; 2026 Score Ocean &bull; India's Digital Sports Platform
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">SO</span>
            </div>
            <span className="font-black text-xl text-gray-900">Score<span className="gradient-text">Ocean</span></span>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step > s ? 'bg-emerald-500 text-white' :
                  step === s ? 'bg-primary-600 text-white shadow-glow-sm' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 3 && <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step > s ? 'bg-emerald-500' : 'bg-gray-200'} w-12`} />}
              </div>
            ))}
            <div className="ml-3 text-sm text-gray-500">
              {step === 1 ? 'Choose role' : step === 2 ? 'Account details' : 'Profile info'}
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
              {step === 1 ? 'Choose your role' : step === 2 ? 'Create your account' : 'Profile information'}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === 1 ? 'How will you use Score Ocean?' :
               step === 2 ? 'Set up your login credentials' :
               'Optional details to complete your profile'}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Role selection */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.value })}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.01] ${
                      formData.role === r.value
                        ? `${r.border} ${r.bg} shadow-card`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
                      {r.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold text-base ${formData.role === r.value ? r.text : 'text-gray-900'}`}>
                        {r.label}
                      </div>
                      <div className="text-sm text-gray-500">{r.desc}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.role === r.value ? `border-transparent bg-gradient-to-r ${r.gradient}` : 'border-gray-300'
                    }`}>
                      {formData.role === r.value && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-2xl hover:from-primary-700 hover:to-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-glow hover:-translate-y-0.5 mt-2"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* Step 2: Account details */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                {selectedRole && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${selectedRole.bg} border ${selectedRole.border}`}>
                    <span className="text-xl">{selectedRole.icon}</span>
                    <span className={`text-sm font-semibold ${selectedRole.text}`}>
                      Registering as {selectedRole.label}
                    </span>
                    <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
                      Change
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name <span className="text-rose-500">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required
                      className="input-field" placeholder="Your full name" disabled={loading} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email <span className="text-rose-500">*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required
                      className="input-field" placeholder="you@example.com" disabled={loading} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required
                        className="input-field pr-12" placeholder="Min 8 characters" disabled={loading} />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showPass
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password <span className="text-rose-500">*</span></label>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required
                      className="input-field" placeholder="Re-enter password" disabled={loading} />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-6 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors">
                    ← Back
                  </button>
                  <button type="button" onClick={() => setStep(3)} disabled={!canProceedStep2}
                    className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-2xl hover:from-primary-700 hover:to-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-glow">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Optional profile info */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange} min="5" max="120"
                      className="input-field" placeholder="Your age" disabled={loading} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      className="input-field" placeholder="+91 XXXXXXXXXX" disabled={loading} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange}
                      className="input-field" placeholder="Mumbai" disabled={loading} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange}
                      className="input-field" placeholder="Maharashtra" disabled={loading} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                  <input type="text" name="country" value={formData.country} onChange={handleChange}
                    className="input-field" placeholder="India" disabled={loading} />
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(2)}
                    className="px-6 py-4 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold rounded-2xl hover:from-primary-700 hover:to-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-glow">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : 'Create Account 🎉'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
