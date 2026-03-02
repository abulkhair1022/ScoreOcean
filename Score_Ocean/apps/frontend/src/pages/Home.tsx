import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Layout/Navbar';
import PlayerDashboard from './dashboards/PlayerDashboard';
import TeamDashboard from './dashboards/TeamDashboard';
import OrganizationDashboard from './dashboards/OrganizationDashboard';

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, startCounting: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting) return;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, startCounting]);
  return count;
}

const SPORTS = [
  { name: 'Cricket', icon: '🏏', color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', border: 'border-green-200', stats: 'Runs, Wickets, Averages' },
  { name: 'Football', icon: '⚽', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'border-blue-200', stats: 'Goals, Assists, Clean Sheets' },
  { name: 'Kabaddi', icon: '🤼', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'border-amber-200', stats: 'Raid Points, Tackle Points' },
  { name: 'Volleyball', icon: '🏐', color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', border: 'border-rose-200', stats: 'Spikes, Blocks, Aces' },
];

const FEATURES = [
  {
    icon: '🏆',
    title: 'Tournament Management',
    desc: 'Create and run tournaments with automatic fixture generation, live scoring, and real-time standings.',
    gradient: 'from-violet-500 to-purple-600',
    delay: '0',
  },
  {
    icon: '📊',
    title: 'Performance Analytics',
    desc: 'Track sport-specific stats across every match. Visualize your progress with interactive charts.',
    gradient: 'from-ocean-500 to-cyan-600',
    delay: '100',
  },
  {
    icon: '👥',
    title: 'Team Coordination',
    desc: 'Build rosters, manage invitations, and coordinate your squad efficiently.',
    gradient: 'from-emerald-500 to-teal-600',
    delay: '200',
  },
  {
    icon: '⚡',
    title: 'Live Scoring',
    desc: 'Real-time score updates broadcast to all participants within 2 seconds via WebSocket.',
    gradient: 'from-amber-500 to-orange-600',
    delay: '300',
  },
  {
    icon: '🎖️',
    title: 'Digital Certificates',
    desc: 'Auto-generated PDF certificates for every tournament participant with unique verification IDs.',
    gradient: 'from-rose-500 to-pink-600',
    delay: '400',
  },
  {
    icon: '💰',
    title: 'Player Auctions',
    desc: 'Conduct live player auctions with real-time bidding, budget tracking, and roster management.',
    gradient: 'from-indigo-500 to-blue-600',
    delay: '500',
  },
];

const ROLES = [
  {
    role: 'Player',
    icon: '🏃',
    color: 'from-blue-500 to-indigo-600',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    features: ['Sport-specific profiles', 'Performance tracking', 'Team invitations', 'Tournament participation', 'Digital certificates'],
  },
  {
    role: 'Team',
    icon: '🛡️',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    features: ['Roster management', 'Player recruitment', 'Tournament registration', 'Match scheduling', 'Player auctions'],
  },
  {
    role: 'Organization',
    icon: '🏟️',
    color: 'from-violet-500 to-purple-600',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
    features: ['Tournament creation', 'Fixture generation', 'Fee management', 'Revenue tracking', 'Certificate generation'],
  },
];

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [scrollY, setScrollY] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  const players = useCountUp(50000, 2000, statsVisible);
  const tournaments = useCountUp(1200, 2000, statsVisible);
  const matches = useCountUp(25000, 2000, statsVisible);
  const teams = useCountUp(8500, 2000, statsVisible);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
    }

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const renderDashboard = () => {
    if (!user) return null;
    switch (user.role) {
      case 'PLAYER': return <PlayerDashboard />;
      case 'TEAM': return <TeamDashboard />;
      case 'ORGANIZATION': return <OrganizationDashboard />;
      case 'ADMIN': return <OrganizationDashboard />;
      default: return <PlayerDashboard />;
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderDashboard()}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a1a]">
        {/* Animated background gradients */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-[800px] h-[800px] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
              top: '-200px', left: '-200px',
              transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px)`,
            }}
          />
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-15"
            style={{
              background: 'radial-gradient(circle, #06d5ef 0%, transparent 70%)',
              bottom: '-100px', right: '-100px',
              transform: `translate(${-scrollY * 0.08}px, ${-scrollY * 0.04}px)`,
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
              top: '40%', left: '50%',
              transform: `translate(-50%, -50%) translate(${scrollY * 0.05}px, ${scrollY * 0.03}px)`,
            }}
          />
          {/* Animated grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Minimal nav */}
        <header className={`relative z-50 transition-all duration-300 ${scrollY > 20 ? 'py-3' : 'py-5'}`}>
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-sm">SO</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">
                Score<span className="gradient-text">Ocean</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-primary-600 to-ocean-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-primary-500 hover:to-ocean-500 transition-all duration-200 shadow-lg hover:shadow-glow hover:-translate-y-0.5"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full py-20">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow"></span>
                India's Premier Digital Sports Platform
              </div>

              {/* Heading */}
              <h1
                className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight mb-6 animate-fade-in-up"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                Elevate Your{' '}
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a5b4fc, #06d5ef, #34d399)' }}
                >
                  Sports Journey
                </span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animate-delay-100">
                Connect players, teams, and organizations. Manage tournaments, track performance,
                and build your digital sports identity — all in one platform.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animate-delay-200">
                <Link
                  to="/register"
                  className="group flex items-center gap-3 bg-gradient-to-r from-primary-600 via-primary-500 to-ocean-500 text-white px-8 py-4 rounded-2xl text-base font-bold hover:from-primary-500 hover:to-ocean-400 transition-all duration-300 shadow-glow-lg hover:-translate-y-1"
                >
                  Start For Free
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 text-gray-300 hover:text-white border border-white/15 hover:border-white/30 px-8 py-4 rounded-2xl text-base font-medium transition-all duration-200 hover:bg-white/5"
                >
                  Sign Into Account
                </Link>
              </div>

              {/* Stats row */}
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up animate-delay-300">
                {[
                  { n: '50K+', label: 'Players' },
                  { n: '1.2K+', label: 'Tournaments' },
                  { n: '25K+', label: 'Matches' },
                  { n: '4', label: 'Sports' },
                ].map((s) => (
                  <div key={s.label} className="glass rounded-2xl px-4 py-4 text-center">
                    <div className="text-2xl font-black text-white">{s.n}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8 animate-bounce-slow">
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <span className="text-xs">Scroll to explore</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Sports Section ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Multi-Sport Platform</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-3 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              One Platform,{' '}
              <span className="gradient-text">Four Sports</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Sport-specific statistics, scoring systems, and fixture formats for each discipline.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SPORTS.map((sport, i) => (
              <div
                key={sport.name}
                className={`group relative rounded-3xl p-8 border-2 ${sport.border || 'border-gray-100'} ${sport.bg} hover:scale-105 transition-all duration-300 cursor-default overflow-hidden`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${sport.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-3xl`} />
                <div className="text-5xl mb-4">{sport.icon}</div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{sport.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{sport.stats}</p>
                <div className={`mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r ${sport.color} text-white text-xs font-semibold`}>
                  Full stats tracking
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="py-24 bg-[#f8fafc] bg-mesh">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-ocean-600 font-semibold text-sm uppercase tracking-widest">Everything You Need</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-3 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Built for{' '}
              <span className="gradient-text">Serious Sport</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              From grassroots to professional — every tool you need to manage sports at any scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="card-hover group p-8 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Counter Section ── */}
      <section ref={statsRef} className="py-24 bg-gradient-to-br from-primary-950 via-[#1a1040] to-[#0a1628] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-primary-400 font-semibold text-sm uppercase tracking-widest">Growing Every Day</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-16" style={{ fontFamily: 'Syne, sans-serif' }}>
            Trusted by Athletes Across India
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: players, suffix: '+', label: 'Active Players', icon: '🏃' },
              { value: tournaments, suffix: '+', label: 'Tournaments Hosted', icon: '🏆' },
              { value: matches, suffix: '+', label: 'Matches Played', icon: '⚡' },
              { value: teams, suffix: '+', label: 'Teams Registered', icon: '🛡️' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-3xl p-8 hover:scale-105 transition-transform duration-300">
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="text-5xl font-black text-white tabular-nums">
                  {statsVisible ? stat.value.toLocaleString() : '0'}{stat.suffix}
                </div>
                <div className="text-gray-400 mt-2 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles Section ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Role-Based Access</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-3 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
              Choose Your{' '}
              <span className="gradient-text">Role</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Each role gets a tailored experience with features designed for your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ROLES.map((r) => (
              <div
                key={r.role}
                className={`relative rounded-3xl border-2 ${r.border} ${r.bg} p-8 hover:scale-105 transition-all duration-300 group overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${r.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-3xl`} />
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center text-3xl mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {r.icon}
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">{r.role}</h3>
                <ul className="space-y-3">
                  {r.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center flex-shrink-0`}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/register`}
                  className={`mt-8 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r ${r.color} text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg`}
                >
                  Register as {r.role}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-24 bg-gradient-to-br from-primary-600 via-primary-700 to-ocean-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute w-96 h-96 rounded-full bg-white/5 -top-20 -left-20 animate-float" />
          <div className="absolute w-64 h-64 rounded-full bg-white/5 -bottom-10 -right-10 animate-float-delay" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
            Ready to Make Your Mark?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Join thousands of athletes, teams, and organizations building their sports legacy on Score Ocean.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="bg-white text-primary-700 px-8 py-4 rounded-2xl text-base font-bold hover:bg-primary-50 transition-all duration-200 shadow-xl hover:-translate-y-1 w-full sm:w-auto"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="border-2 border-white/40 text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-white/10 transition-all duration-200 w-full sm:w-auto"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0a0a1a] text-gray-500 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">SO</span>
              </div>
              <span className="text-white font-bold">Score Ocean</span>
            </div>
            <p className="text-sm">© 2026 Score Ocean. India's Digital Sports Platform.</p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
