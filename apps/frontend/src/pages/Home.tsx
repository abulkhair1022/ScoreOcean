import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Layout/Navbar';
import PlayerDashboard from './dashboards/PlayerDashboard';
import TeamDashboard from './dashboards/TeamDashboard';
import OrganizationDashboard from './dashboards/OrganizationDashboard';

function useCountUp(end: number, duration = 2000, startCounting = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startCounting) return;
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, startCounting]);
  return count;
}

const SPORTS = [
  { name: 'Cricket',    icon: '🏏', accent: '#00B4D8', glow: 'rgba(0,180,216,0.16)',  stats: ['Runs & Wickets', 'Strike Rate', 'Economy Rate'], tag: 'Most Popular' },
  { name: 'Football',   icon: '⚽', accent: '#90E0EF', glow: 'rgba(144,224,239,0.14)', stats: ['Goals & Assists', 'Pass Accuracy', 'Clean Sheets'], tag: null },
  { name: 'Kabaddi',    icon: '🤼', accent: '#0077B6', glow: 'rgba(0,119,182,0.18)',  stats: ['Raid Points', 'Tackle Points', 'Super Raids'], tag: null },
  { name: 'Volleyball', icon: '🏐', accent: '#CAF0F8', glow: 'rgba(202,240,248,0.12)', stats: ['Spikes & Blocks', 'Aces Served', 'Dig Success'], tag: null },
];

const FEATURES = [
  { icon: '🏆', title: 'Tournament Management', desc: 'Automatic fixture generation, live scoring, and real-time standings for any format.', accent: '#00B4D8' },
  { icon: '📊', title: 'Performance Analytics',  desc: 'Sport-specific stats tracked across every match with interactive charts.', accent: '#90E0EF' },
  { icon: '👥', title: 'Team Coordination',       desc: 'Build rosters, send invitations, and manage your squad from one dashboard.', accent: '#00B4D8' },
  { icon: '⚡', title: 'Live Scoring',            desc: 'WebSocket-powered updates broadcast to every participant within 2 seconds.', accent: '#0077B6' },
  { icon: '🎖️', title: 'Digital Certificates',   desc: 'Auto-generated PDFs with unique verification IDs for every participant.', accent: '#90E0EF' },
  { icon: '💰', title: 'Player Auctions',         desc: 'Live bidding, budget tracking, and roster management in one room.', accent: '#00B4D8' },
];

const ROLES = [
  {
    role: 'Player', number: '01', icon: '🏃',
    accent: '#90E0EF', glow: 'rgba(144,224,239,0.1)', border: 'rgba(144,224,239,0.22)',
    features: ['Sport-specific profile', 'Performance tracking', 'Team invitations', 'Tournament participation', 'Digital certificates'],
  },
  {
    role: 'Team', number: '02', icon: '🛡️',
    accent: '#00B4D8', glow: 'rgba(0,180,216,0.12)', border: 'rgba(0,180,216,0.35)',
    features: ['Roster management', 'Player recruitment', 'Tournament registration', 'Match scheduling', 'Player auctions'],
    featured: true,
  },
  {
    role: 'Organization', number: '03', icon: '🏟️',
    accent: '#0077B6', glow: 'rgba(0,119,182,0.15)', border: 'rgba(0,119,182,0.35)',
    features: ['Tournament creation', 'Fixture generation', 'Fee management', 'Revenue tracking', 'Certificate generation'],
  },
];

// Floating bioluminescent particles
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 6 + 4,
  delay: Math.random() * 4,
  opacity: Math.random() * 0.5 + 0.2,
}));

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [scrollY, setScrollY] = useState(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  const players     = useCountUp(50000, 2000, statsVisible);
  const tournaments = useCountUp(1200,  2000, statsVisible);
  const matches     = useCountUp(25000, 2000, statsVisible);
  const teams       = useCountUp(8500,  2000, statsVisible);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('accessToken');
    if (stored && token) setUser(JSON.parse(stored));
    const onScroll = () => {
      setScrollY(window.scrollY);
      setHeaderSolid(window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.2 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLogout = () => {
    ['accessToken', 'refreshToken', 'user'].forEach(k => localStorage.removeItem(k));
    setUser(null);
    navigate('/login');
  };

  const renderDashboard = () => {
    if (!user) return null;
    switch (user.role) {
      case 'PLAYER':       return <PlayerDashboard />;
      case 'TEAM':         return <TeamDashboard />;
      case 'ORGANIZATION': return <OrganizationDashboard />;
      case 'ADMIN':        return <OrganizationDashboard />;
      default:             return <PlayerDashboard />;
    }
  };

  if (user) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar user={user} onLogout={handleLogout} />
        {renderDashboard()}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes sonarPing  { 0% { transform:scale(0.6); opacity:0.7; } 100% { transform:scale(3); opacity:0; } }
        @keyframes bioFloat   { 0%,100% { transform:translateY(0) translateX(0); opacity:var(--op); } 33% { transform:translateY(-12px) translateX(4px); opacity:calc(var(--op)*1.4); } 66% { transform:translateY(6px) translateX(-6px); opacity:calc(var(--op)*0.7); } }
        @keyframes waveScroll { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        @keyframes fadeUp     { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scrollPulse{ 0%,100%{opacity:0.3;transform:scaleY(1)} 50%{opacity:1;transform:scaleY(0.65)} }
        @keyframes headerGlow { 0%,100%{box-shadow:0 1px 0 rgba(0,180,216,0.2)} 50%{box-shadow:0 1px 0 rgba(0,180,216,0.5),0 2px 20px rgba(0,180,216,0.1)} }
        @keyframes shimmerBtn { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes countFlip  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .so-root {
          font-family: var(--font-body);
          background-color: #020817;
          background-image:
            radial-gradient(ellipse 110% 50% at 50% 0%, rgba(0, 119, 182, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 70% 40% at 15% 50%, rgba(3, 4, 94, 0.4) 0%, transparent 55%),
            radial-gradient(ellipse 70% 40% at 85% 60%, rgba(0, 180, 216, 0.14) 0%, transparent 55%);
          background-attachment: fixed;
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ── HEADER ── */
        .so-header {
          position: fixed; top:0; left:0; right:0; z-index:100;
          transition: background 0.4s ease, border-color 0.4s ease;
          border-bottom: 1px solid transparent;
        }
        .so-header.solid {
          background: rgba(2, 3, 24, 0.92);
          border-bottom-color: rgba(0,180,216,0.2);
          backdrop-filter: blur(24px) saturate(180%);
          animation: headerGlow 4s ease-in-out infinite;
        }
        .so-header-inner { max-width:1280px; margin:0 auto; padding:0 32px; height:70px; display:flex; align-items:center; justify-content:space-between; }

        /* Logo */
        .so-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .so-logo-mark {
          width:38px; height:38px; border-radius:8px;
          background: linear-gradient(135deg, #0077B6, #00B4D8);
          display:flex; align-items:center; justify-content:center;
          font-family:var(--font-display); font-weight:900; font-size:14px;
          color:#03045E; letter-spacing:0.05em;
          box-shadow: 0 0 24px rgba(0,180,216,0.5);
          position: relative; overflow: hidden;
        }
        .so-logo-mark::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(135deg, transparent 40%, rgba(202,240,248,0.25) 50%, transparent 60%);
          animation: shimmerBtn 3s ease-in-out infinite;
        }
        .so-logo-text { font-family:var(--font-display); font-weight:800; font-size:20px; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.08em; }
        .so-logo-text span { color:var(--cyan); }

        /* Nav buttons */
        .so-nav { display:flex; align-items:center; gap:8px; }
        .so-btn-nav-ghost {
          padding:8px 18px; border-radius:var(--radius-md);
          background:transparent; border:1px solid transparent;
          color:var(--text-secondary);
          font-family:var(--font-display); font-size:13px; font-weight:700;
          letter-spacing:0.08em; text-transform:uppercase;
          cursor:pointer; text-decoration:none;
          transition:color var(--fast), border-color var(--fast), background var(--fast);
          display:inline-flex; align-items:center;
        }
        .so-btn-nav-ghost:hover { color:var(--cyan); border-color:var(--cyan-border); background:var(--cyan-subtle); }

        .so-btn-nav-primary {
          padding:9px 22px; border-radius:var(--radius-md);
          background: linear-gradient(135deg, #0077B6, #00B4D8);
          border:none; color:#03045E;
          font-family:var(--font-display); font-size:13px; font-weight:800;
          letter-spacing:0.08em; text-transform:uppercase;
          cursor:pointer; text-decoration:none;
          transition:box-shadow var(--fast), transform var(--fast), filter var(--fast);
          display:inline-flex; align-items:center; gap:6px;
          box-shadow: 0 0 20px rgba(0,180,216,0.45);
          position:relative; overflow:hidden;
        }
        .so-btn-nav-primary::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(202,240,248,0.2) 50%,transparent 60%); transform:translateX(-100%); transition:transform 0.5s; }
        .so-btn-nav-primary:hover { transform:translateY(-1px); box-shadow:0 0 36px rgba(0,180,216,0.65); filter:brightness(1.08); }
        .so-btn-nav-primary:hover::after { transform:translateX(100%); }

        /* ── HERO ── */
        .so-hero {
          position:relative; min-height:100vh;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          overflow:hidden; padding:130px 32px 80px;
        }

        .so-hero-bg { position:absolute; inset:0; pointer-events:none; }

        /* Underwater grid — faint */
        .so-uw-grid {
          position:absolute; inset:0;
          background-image:
            linear-gradient(rgba(0,180,216,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,119,182,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 90% 80% at 50% 40%, black 20%, transparent 100%);
        }

        /* Sonar rings */
        .so-sonar-ring {
          position:absolute; border-radius:50%;
          top:50%; left:50%; transform:translate(-50%,-48%);
          pointer-events:none;
          border:1px solid rgba(0,180,216,0.12);
          animation: sonarPing 5s ease-out infinite;
        }

        /* Deep ocean glow orbs */
        .so-depth-orb {
          position:absolute; border-radius:50%;
          filter:blur(80px); pointer-events:none;
        }
        .so-orb-top {
          width:700px; height:450px;
          background: radial-gradient(ellipse, rgba(0,119,182,0.25) 0%, transparent 65%);
          top:-140px; left:-160px;
        }
        .so-orb-right {
          width:500px; height:420px;
          background: radial-gradient(ellipse, rgba(0,180,216,0.18) 0%, transparent 65%);
          top:20%; right:-80px;
        }
        .so-orb-bottom {
          width:600px; height:300px;
          background: radial-gradient(ellipse, rgba(3,4,94,0.5) 0%, transparent 65%);
          bottom:-80px; left:20%;
        }

        /* Bioluminescent particles */
        .so-particle {
          position:absolute; border-radius:50%;
          background: radial-gradient(circle, rgba(0,180,216,0.9) 0%, transparent 70%);
          pointer-events:none;
          animation: bioFloat var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        /* Animated wave strip at bottom of hero */
        .so-wave-strip {
          position:absolute; bottom:0; left:0; right:0;
          height:120px; overflow:hidden; pointer-events:none;
        }
        .so-wave-inner {
          width:200%; height:100%;
          background-image:
            radial-gradient(ellipse 10% 60% at 10% 100%, rgba(0,119,182,0.4) 0%, transparent 100%),
            radial-gradient(ellipse 10% 60% at 30% 100%, rgba(0,180,216,0.3) 0%, transparent 100%),
            radial-gradient(ellipse 10% 60% at 50% 100%, rgba(0,119,182,0.35) 0%, transparent 100%),
            radial-gradient(ellipse 10% 60% at 70% 100%, rgba(0,180,216,0.25) 0%, transparent 100%),
            radial-gradient(ellipse 10% 60% at 90% 100%, rgba(0,119,182,0.3) 0%, transparent 100%);
          animation: waveScroll 8s linear infinite;
          opacity: 0.6;
        }

        /* Hero content */
        .so-hero-content { position:relative; z-index:2; text-align:center; max-width:980px; width:100%; }

        /* Live tag */
        .so-hero-tag {
          display:inline-flex; align-items:center; gap:8px;
          padding:5px 16px 5px 8px; border-radius:3px;
          background: rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.25);
          font-family:var(--font-display); font-size:11px; font-weight:700;
          letter-spacing:0.12em; text-transform:uppercase; color:var(--cyan);
          margin-bottom:32px; animation: fadeUp 0.5s ease both;
          box-shadow: 0 0 20px rgba(0,180,216,0.1);
        }
        .so-live-dot {
          width:8px; height:8px; border-radius:50%;
          background:var(--cyan); box-shadow:0 0 8px var(--cyan);
          animation: pulseLive 1.2s ease-in-out infinite;
          display:inline-block;
        }

        /* Headlines */
        .so-hero-h1 {
          font-family:var(--font-display); font-weight:900;
          font-size:clamp(64px,11vw,136px); line-height:0.88;
          letter-spacing:0.01em; text-transform:uppercase;
          color:#CAF0F8; margin-bottom:6px;
          animation: fadeUp 0.5s 0.08s ease both;
        }
        .so-hero-h1-ocean {
          font-family:var(--font-display); font-weight:900;
          font-size:clamp(64px,11vw,136px); line-height:0.88;
          letter-spacing:0.01em; text-transform:uppercase;
          background: linear-gradient(135deg, #CAF0F8 0%, #90E0EF 30%, #00B4D8 65%, #0077B6 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          filter: drop-shadow(0 0 60px rgba(0,180,216,0.4));
          display:block; animation: fadeUp 0.5s 0.16s ease both;
        }

        .so-hero-sub {
          font-family:var(--font-body); font-size:clamp(15px,1.8vw,18px); font-weight:300;
          color:rgba(202,240,248,0.6); line-height:1.75;
          max-width:520px; margin:28px auto 44px;
          animation: fadeUp 0.5s 0.24s ease both;
        }

        /* CTA */
        .so-hero-cta { display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; animation: fadeUp 0.5s 0.32s ease both; }

        .so-btn-hero-primary {
          padding:16px 40px; border-radius:var(--radius-md);
          font-family:var(--font-display); font-size:16px; font-weight:800;
          letter-spacing:0.1em; text-transform:uppercase;
          background: linear-gradient(135deg, #0077B6, #00B4D8);
          color:#03045E; border:none; text-decoration:none; cursor:pointer;
          transition:transform var(--fast), box-shadow var(--fast), filter var(--fast);
          display:inline-flex; align-items:center; gap:10px;
          box-shadow: 0 0 48px rgba(0,180,216,0.45);
          position:relative; overflow:hidden;
        }
        .so-btn-hero-primary::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(202,240,248,0.22) 50%,transparent 60%); transform:translateX(-100%); transition:transform 0.5s; }
        .so-btn-hero-primary:hover { transform:translateY(-3px); box-shadow:0 0 72px rgba(0,180,216,0.6); filter:brightness(1.1); }
        .so-btn-hero-primary:hover::after { transform:translateX(100%); }

        .so-btn-hero-secondary {
          padding:15px 36px; border-radius:var(--radius-md);
          font-family:var(--font-display); font-size:16px; font-weight:800;
          letter-spacing:0.1em; text-transform:uppercase;
          background: rgba(0,48,73,0.4); color:#CAF0F8;
          border:1px solid rgba(0,180,216,0.25); text-decoration:none; cursor:pointer;
          transition:all var(--fast); display:inline-flex; align-items:center; gap:10px;
          backdrop-filter: blur(10px);
        }
        .so-btn-hero-secondary:hover { background:rgba(0,119,182,0.25); border-color:var(--cyan-border); color:var(--cyan); transform:translateY(-2px); box-shadow:0 0 28px rgba(0,180,216,0.2); }

        /* Stats */
        .so-hero-stats {
          display:grid; grid-template-columns:repeat(4,1fr); gap:10px;
          margin:64px auto 0; max-width:740px;
          animation: fadeUp 0.5s 0.4s ease both;
        }
        @media(max-width:640px){ .so-hero-stats { grid-template-columns:repeat(2,1fr); } }

        .so-hero-stat {
          padding:16px 12px; border-radius:var(--radius-md);
          background: rgba(0,180,216,0.06); border:1px solid rgba(0,180,216,0.15);
          text-align:center; backdrop-filter:blur(8px);
          transition:border-color var(--base), background var(--base), transform var(--base), box-shadow var(--base);
        }
        .so-hero-stat:hover { border-color:var(--cyan-border); background:rgba(0,180,216,0.12); transform:translateY(-3px); box-shadow:0 0 20px rgba(0,180,216,0.15); }
        .so-hero-stat-value { font-family:var(--font-display); font-size:28px; font-weight:900; color:#CAF0F8; letter-spacing:0.02em; text-transform:uppercase; line-height:1; }
        .so-hero-stat-label { font-family:var(--font-display); font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(202,240,248,0.35); margin-top:4px; }

        /* Scroll hint */
        .so-scroll-hint {
          position:absolute; bottom:36px; left:50%; transform:translateX(-50%);
          display:flex; flex-direction:column; align-items:center; gap:8px;
          font-family:var(--font-display); font-size:10px; font-weight:700;
          letter-spacing:0.14em; text-transform:uppercase;
          color:rgba(202,240,248,0.22); animation: fadeUp 0.5s 0.6s ease both;
        }
        .so-scroll-line { width:1px; height:40px; background:linear-gradient(to bottom, rgba(0,180,216,0.5), transparent); animation:scrollPulse 2s ease-in-out infinite; }

        /* ── SECTION COMMON ── */
        .so-section { padding:112px 32px; }
        .so-container { max-width:1280px; margin:0 auto; }

        .so-eyebrow {
          font-family:var(--font-display); font-size:11px; font-weight:700;
          letter-spacing:0.16em; text-transform:uppercase; color:var(--cyan);
          margin-bottom:14px; display:flex; align-items:center; gap:10px;
        }
        .so-eyebrow::before {
          content:''; width:24px; height:2px; flex-shrink:0;
          background: linear-gradient(90deg, #0077B6, #00B4D8);
          display:inline-block;
          box-shadow: 0 0 8px rgba(0,180,216,0.5);
        }

        .so-section-title {
          font-family:var(--font-display); font-weight:900;
          font-size:clamp(40px,6vw,72px); line-height:0.92;
          letter-spacing:0.01em; text-transform:uppercase;
          color:#CAF0F8; margin-bottom:20px;
        }
        .so-section-sub { font-size:16px; font-weight:300; color:rgba(202,240,248,0.55); line-height:1.75; max-width:480px; }
        .so-section-header { margin-bottom:60px; }
        .so-section-header.centered { text-align:center; }
        .so-section-header.centered .so-eyebrow { justify-content:center; }
        .so-section-header.centered .so-section-sub { margin:0 auto; }

        /* ── SPORTS GRID ── */
        .so-sports-grid {
          display:grid; grid-template-columns:repeat(4,1fr);
          gap:1px; background:rgba(0,180,216,0.1);
          border-radius:var(--radius-xl); overflow:hidden;
          border:1px solid rgba(0,180,216,0.12);
        }
        @media(max-width:900px){ .so-sports-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:500px){ .so-sports-grid { grid-template-columns:1fr; } }

        .so-sport-card {
          position:relative; padding:36px 28px;
          background: rgba(3,4,94,0.6);
          backdrop-filter:blur(10px);
          overflow:hidden; cursor:default;
          transition:background var(--base);
        }
        .so-sport-card:hover { background:rgba(4,18,112,0.8); }
        .so-sport-card:hover .so-sport-glow { opacity:1; }
        .so-sport-card:hover .so-sport-icon  { transform:scale(1.12) rotate(-5deg); }
        .so-sport-card:hover .so-sport-sonar { opacity:1; }

        /* Sonar ping on hover */
        .so-sport-sonar {
          position:absolute; top:50%; left:50%;
          transform:translate(-50%,-50%);
          width:60px; height:60px; border-radius:50%;
          border:1px solid rgba(0,180,216,0.4);
          opacity:0; transition:opacity var(--base);
          animation:sonarPing 2s ease-out infinite;
          pointer-events:none;
        }

        .so-sport-glow { position:absolute; inset:0; opacity:0; transition:opacity var(--slow); pointer-events:none; }
        .so-sport-icon { font-size:48px; display:block; line-height:1; margin-bottom:20px; transition:transform var(--base); position:relative; z-index:1; }
        .so-sport-number { position:absolute; top:18px; right:20px; font-family:var(--font-display); font-size:56px; font-weight:900; color:rgba(0,180,216,0.06); line-height:1; pointer-events:none; user-select:none; }
        .so-sport-name { font-family:var(--font-display); font-size:26px; font-weight:900; letter-spacing:0.04em; text-transform:uppercase; color:#CAF0F8; margin-bottom:14px; line-height:1; position:relative; z-index:1; }
        .so-sport-stats { display:flex; flex-direction:column; gap:7px; position:relative; z-index:1; }
        .so-sport-stat-row { display:flex; align-items:center; gap:8px; font-size:12px; color:rgba(202,240,248,0.38); }
        .so-sport-stat-dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; }
        .so-sport-tag { margin-top:20px; display:inline-flex; align-items:center; gap:5px; font-family:var(--font-display); font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; opacity:0.7; position:relative; z-index:1; }

        /* ── FEATURES GRID ── */
        .so-features-grid {
          display:grid; grid-template-columns:repeat(3,1fr);
          gap:1px; background:rgba(0,180,216,0.1);
          border-radius:var(--radius-xl); overflow:hidden;
          border:1px solid rgba(0,180,216,0.12);
        }
        @media(max-width:900px){ .so-features-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px){ .so-features-grid { grid-template-columns:1fr; } }

        .so-feature-card {
          position:relative; padding:36px 32px;
          background:rgba(3,4,94,0.6); backdrop-filter:blur(10px);
          overflow:hidden; transition:background var(--base);
        }
        .so-feature-card:hover { background:rgba(4,18,112,0.8); }
        .so-feature-card:hover .so-feature-glow   { opacity:1; }
        .so-feature-card:hover .so-feature-bottom  { opacity:1; }
        .so-feature-card:hover .so-feature-icon-wrap { border-color:var(--border-hover); box-shadow:0 0 20px rgba(0,180,216,0.2); }

        /* Corner accent top-left */
        .so-feature-card::before {
          content:''; position:absolute; top:0; left:0;
          width:40px; height:2px;
          background: linear-gradient(90deg, rgba(0,180,216,0), rgba(0,180,216,0));
          transition: background var(--base);
        }
        .so-feature-card:hover::before { background: linear-gradient(90deg, var(--cyan), transparent); }

        .so-feature-glow { position:absolute; top:-20px; left:-20px; width:80px; height:80px; border-radius:50%; filter:blur(30px); background:rgba(0,180,216,0.15); opacity:0; transition:opacity var(--slow); pointer-events:none; }
        .so-feature-icon-wrap { width:52px; height:52px; border-radius:var(--radius-sm); background:rgba(0,180,216,0.08); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:22px; position:relative; z-index:1; transition:border-color var(--base), box-shadow var(--base); }
        .so-feature-title { font-family:var(--font-display); font-size:19px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:#CAF0F8; margin-bottom:12px; position:relative; z-index:1; line-height:1.1; }
        .so-feature-desc  { font-size:13px; font-weight:300; color:rgba(202,240,248,0.5); line-height:1.75; position:relative; z-index:1; }
        .so-feature-bottom { position:absolute; bottom:0; left:0; right:0; height:2px; opacity:0; transition:opacity var(--base); }

        /* ── STATS ── */
        .so-stats-section { position:relative; padding:112px 32px; overflow:hidden; }
        .so-stats-grid {
          display:grid; grid-template-columns:repeat(4,1fr);
          gap:2px; background:rgba(0,180,216,0.1);
          border-radius:var(--radius-xl); overflow:hidden;
          border:1px solid rgba(0,180,216,0.12);
        }
        @media(max-width:800px){ .so-stats-grid { grid-template-columns:repeat(2,1fr); } }

        .so-stat-card {
          padding:44px 32px; background:rgba(3,4,94,0.6);
          backdrop-filter:blur(10px); text-align:center;
          position:relative; overflow:hidden; transition:background var(--base);
        }
        .so-stat-card:hover { background:rgba(4,18,112,0.8); }
        .so-stat-card:hover .so-stat-top-line { opacity:1; }
        .so-stat-card:hover .so-stat-value { filter:drop-shadow(0 0 20px currentColor); }

        .so-stat-top-line { position:absolute; top:0; left:0; right:0; height:2px; opacity:0; transition:opacity var(--base); }
        .so-stat-icon  { font-size:28px; margin-bottom:14px; display:block; }
        .so-stat-value { font-family:var(--font-display); font-size:clamp(36px,5vw,60px); font-weight:900; letter-spacing:-0.01em; line-height:1; margin-bottom:8px; text-transform:uppercase; transition:filter var(--base); animation:countFlip 0.4s ease both; }
        .so-stat-label { font-family:var(--font-display); font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(202,240,248,0.3); }

        /* ── ROLES ── */
        .so-roles-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        @media(max-width:800px){ .so-roles-grid { grid-template-columns:1fr; max-width:440px; margin:0 auto; } }

        .so-role-card {
          position:relative; padding:40px 36px 36px;
          border-radius:var(--radius-xl);
          background:rgba(3,4,94,0.6); backdrop-filter:blur(12px);
          border:1px solid rgba(0,180,216,0.15);
          overflow:hidden; display:flex; flex-direction:column;
          transition:transform var(--base), border-color var(--base), box-shadow var(--base);
        }
        .so-role-card:hover { transform:translateY(-6px); }

        /* Underwater caustic light pattern */
        .so-role-card::before {
          content:''; position:absolute; inset:-50%;
          background: radial-gradient(ellipse 50% 50% at 50% 0%, rgba(0,180,216,0.08) 0%, transparent 60%);
          pointer-events:none;
          animation: drift 10s ease-in-out infinite;
        }

        .so-role-number { position:absolute; top:20px; right:24px; font-family:var(--font-display); font-size:72px; font-weight:900; color:rgba(0,180,216,0.06); line-height:1; pointer-events:none; user-select:none; }
        .so-role-badge { position:absolute; top:20px; left:20px; font-family:var(--font-display); font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; padding:4px 10px; border-radius:2px; background:rgba(0,180,216,0.12); color:var(--cyan); border:1px solid var(--cyan-border); box-shadow:0 0 12px rgba(0,180,216,0.15); }
        .so-role-icon { width:60px; height:60px; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; font-size:26px; margin-bottom:20px; border:1px solid var(--border); position:relative; z-index:1; margin-top:8px; transition:box-shadow var(--base); }
        .so-role-card:hover .so-role-icon { box-shadow:0 0 20px rgba(0,180,216,0.2); }
        .so-role-name { font-family:var(--font-display); font-size:32px; font-weight:900; letter-spacing:0.04em; text-transform:uppercase; line-height:1; margin-bottom:28px; position:relative; z-index:1; }
        .so-role-features { list-style:none; display:flex; flex-direction:column; gap:11px; flex:1; margin-bottom:32px; position:relative; z-index:1; }
        .so-role-feature  { display:flex; align-items:center; gap:10px; font-size:13px; color:rgba(202,240,248,0.55); }
        .so-role-check { width:18px; height:18px; border-radius:2px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .so-role-cta { display:flex; align-items:center; justify-content:center; gap:8px; padding:13px 24px; border-radius:var(--radius-md); font-family:var(--font-display); font-size:13px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; text-decoration:none; transition:opacity var(--fast), transform var(--fast), box-shadow var(--fast), filter var(--fast); position:relative; z-index:1; overflow:hidden; }
        .so-role-cta::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(202,240,248,0.15) 50%,transparent 60%); transform:translateX(-100%); transition:transform 0.5s; }
        .so-role-cta:hover { opacity:0.88; transform:translateY(-1px); }
        .so-role-cta:hover::after { transform:translateX(100%); }

        /* ── CTA BANNER ── */
        .so-cta-section { padding:64px 32px 120px; }
        .so-cta-card {
          max-width:1000px; margin:0 auto;
          border-radius:var(--radius-2xl);
          border:1px solid rgba(0,180,216,0.22);
          padding:80px 64px; text-align:center;
          position:relative; overflow:hidden;
          background:rgba(3,4,94,0.7); backdrop-filter:blur(20px);
        }
        @media(max-width:640px){ .so-cta-card { padding:48px 28px; } }

        .so-cta-bg { position:absolute; inset:0;
          background:
            radial-gradient(ellipse 70% 80% at 20% 50%, rgba(0,119,182,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 80% 50%, rgba(0,180,216,0.1) 0%, transparent 60%);
          pointer-events:none;
        }

        /* Sonar corner accents */
        .so-cta-card::before,
        .so-cta-card::after {
          content:''; position:absolute;
          width:22px; height:22px; border-style:solid;
          border-color:rgba(0,180,216,0.6);
          box-shadow:0 0 8px rgba(0,180,216,0.3);
        }
        .so-cta-card::before { top:16px; left:16px; border-width:2px 0 0 2px; }
        .so-cta-card::after  { bottom:16px; right:16px; border-width:0 2px 2px 0; }

        .so-cta-title { font-family:var(--font-display); font-weight:900; font-size:clamp(40px,6vw,72px); line-height:0.9; letter-spacing:0.02em; text-transform:uppercase; color:#CAF0F8; margin-bottom:20px; position:relative; z-index:1; }
        .so-cta-sub { font-size:16px; font-weight:300; color:rgba(202,240,248,0.55); line-height:1.7; margin-bottom:44px; position:relative; z-index:1; }
        .so-cta-actions { display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; position:relative; z-index:1; }

        /* ── FOOTER ── */
        .so-footer {
          border-top:1px solid rgba(0,119,182,0.3);
          background: linear-gradient(180deg, transparent, rgba(3,4,94,0.3));
          padding:40px 32px;
        }
        .so-footer-inner { max-width:1280px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; }
        .so-footer-copy { font-family:var(--font-display); font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:rgba(202,240,248,0.18); }
        .so-footer-links { display:flex; gap:28px; }
        .so-footer-link { font-family:var(--font-display); font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(202,240,248,0.3); text-decoration:none; transition:color var(--fast), text-shadow var(--fast); }
        .so-footer-link:hover { color:var(--cyan); text-shadow:0 0 12px rgba(0,180,216,0.4); }

        /* ── DIVIDER ── */
        .so-divider {
          height:1px; margin:0 32px;
          background:linear-gradient(90deg, transparent, rgba(0,119,182,0.4), rgba(0,180,216,0.6), rgba(0,119,182,0.4), transparent);
          position:relative;
        }
        .so-divider::after { content:''; position:absolute; top:-2px; left:50%; transform:translateX(-50%); width:60px; height:5px; background:linear-gradient(90deg,transparent,rgba(0,180,216,0.8),transparent); filter:blur(3px); border-radius:50%; }
      `}</style>

      <div className="so-root">

        {/* Header */}
        <header className={`so-header${headerSolid ? ' solid' : ''}`}>
          <div className="so-header-inner">
            <Link to="/" className="so-logo">
              <div className="so-logo-mark">SO</div>
              <span className="so-logo-text"><span style={{ color: '#ffffff' }}>SCORE</span><span style={{ color: '#00b4d8' }}>OCEAN</span></span>
            </Link>
            <div className="so-nav">
              <Link to="/login" className="so-btn-nav-ghost">Sign In</Link>
              <Link to="/register" className="so-btn-nav-primary">
                Dive In
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="so-hero">
          <div className="so-hero-bg">
            <div className="so-uw-grid" />

            {/* Sonar rings — staggered */}
            {[600, 440, 280, 140].map((size, i) => (
              <div key={size} className="so-sonar-ring" style={{
                width: size, height: size,
                marginLeft: -size / 2, marginTop: -size / 2,
                animationDelay: `${i * 1.2}s`,
                animationDuration: `${4 + i * 0.5}s`,
                borderColor: `rgba(0,180,216,${0.06 + i * 0.03})`,
              }} />
            ))}

            {/* Depth orbs with parallax */}
            <div className="so-depth-orb so-orb-top"
              style={{ transform: `translate(${scrollY * 0.04}px, ${scrollY * 0.02}px)` }} />
            <div className="so-depth-orb so-orb-right"
              style={{ transform: `translate(${-scrollY * 0.03}px, ${scrollY * 0.015}px)` }} />
            <div className="so-depth-orb so-orb-bottom" />

            {/* Bioluminescent particles */}
            {PARTICLES.map(p => (
              <div key={p.id} className="so-particle" style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                '--op': p.opacity,
                '--dur': `${p.duration}s`,
                '--delay': `${p.delay}s`,
                boxShadow: `0 0 ${p.size * 3}px rgba(0,180,216,${p.opacity})`,
              } as any} />
            ))}

            {/* Wave strip */}
            <div className="so-wave-strip">
              <div className="so-wave-inner" />
            </div>
          </div>

          <div className="so-hero-content">
            <div className="so-hero-tag">
              <span className="so-live-dot" />
              India's #1 Digital Sports Platform
            </div>
            <h1 className="so-hero-h1">Elevate Your</h1>
            <span className="so-hero-h1-ocean">Sports Journey</span>
            <p className="so-hero-sub">
              Tournaments, analytics, team management, and live scoring — built for players, teams, and organizations across India.
            </p>
            <div className="so-hero-cta">
              <Link to="/register" className="so-btn-hero-primary">
                Get Started Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link to="/login" className="so-btn-hero-secondary">Sign In</Link>
            </div>
            <div className="so-hero-stats">
              {[{ v: '50K+', l: 'Players' }, { v: '1.2K+', l: 'Tournaments' }, { v: '25K+', l: 'Matches' }, { v: '4', l: 'Sports' }].map((s) => (
                <div key={s.l} className="so-hero-stat">
                  <div className="so-hero-stat-value">{s.v}</div>
                  <div className="so-hero-stat-label">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="so-scroll-hint">
            <span>Dive deeper</span>
            <div className="so-scroll-line" />
          </div>
        </section>

        {/* Sports */}
        <section className="so-section">
          <div className="so-container">
            <div className="so-section-header">
              <div className="so-eyebrow">Multi-Sport Platform</div>
              <h2 className="so-section-title">
                One Platform<br />
                <span style={{ background: 'linear-gradient(135deg,#CAF0F8,#00B4D8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Four Sports
                </span>
              </h2>
              <p className="so-section-sub">Sport-specific scoring, stats, and fixture formats — built for each discipline.</p>
            </div>
            <div className="so-sports-grid">
              {SPORTS.map((sport, i) => (
                <div key={sport.name} className="so-sport-card">
                  <div className="so-sport-sonar" />
                  <div className="so-sport-glow" style={{ background: `radial-gradient(ellipse at 30% 30%, ${sport.glow}, transparent 65%)` }} />
                  <div className="so-sport-number">0{i+1}</div>
                  <span className="so-sport-icon">{sport.icon}</span>
                  <div className="so-sport-name">{sport.name}</div>
                  <div className="so-sport-stats">
                    {sport.stats.map(s => (
                      <div key={s} className="so-sport-stat-row">
                        <div className="so-sport-stat-dot" style={{ background: sport.accent, boxShadow: `0 0 4px ${sport.accent}` }} />
                        {s}
                      </div>
                    ))}
                  </div>
                  {sport.tag && (
                    <div className="so-sport-tag" style={{ color: sport.accent }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background:sport.accent, display:'inline-block', boxShadow:`0 0 6px ${sport.accent}` }} />
                      {sport.tag}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="so-divider" />

        {/* Features */}
        <section className="so-section">
          <div className="so-container">
            <div className="so-section-header centered">
              <div className="so-eyebrow">Everything You Need</div>
              <h2 className="so-section-title">
                Built for<br />
                <span style={{ background: 'linear-gradient(135deg,#CAF0F8,#90E0EF,#00B4D8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Serious Sport
                </span>
              </h2>
              <p className="so-section-sub">From grassroots to professional — every tool to run sports at any scale.</p>
            </div>
            <div className="so-features-grid">
              {FEATURES.map(f => (
                <div key={f.title} className="so-feature-card">
                  <div className="so-feature-glow" />
                  <div className="so-feature-icon-wrap">{f.icon}</div>
                  <div className="so-feature-title">{f.title}</div>
                  <div className="so-feature-desc">{f.desc}</div>
                  <div className="so-feature-bottom" style={{ background: `linear-gradient(90deg,transparent,${f.accent}80,transparent)` }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="so-stats-section" ref={statsRef}>
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(0,119,182,0.12) 0%, transparent 70%)' }} />
          <div className="so-container" style={{ position:'relative', zIndex:2 }}>
            <div className="so-section-header centered">
              <div className="so-eyebrow">Growing Every Day</div>
              <h2 className="so-section-title">
                Trusted by Athletes<br />
                <span style={{ background:'linear-gradient(135deg,#CAF0F8,#00B4D8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  Across India
                </span>
              </h2>
            </div>
            <div className="so-stats-grid">
              {[
                { value: players,     suffix:'+', label:'Active Players',     icon:'🏃', color:'#00B4D8', grad:'linear-gradient(90deg,transparent,rgba(0,180,216,0.7),transparent)' },
                { value: tournaments, suffix:'+', label:'Tournaments Hosted', icon:'🏆', color:'#90E0EF', grad:'linear-gradient(90deg,transparent,rgba(144,224,239,0.6),transparent)' },
                { value: matches,     suffix:'+', label:'Matches Played',     icon:'⚡', color:'#CAF0F8', grad:'linear-gradient(90deg,transparent,rgba(202,240,248,0.4),transparent)' },
                { value: teams,       suffix:'+', label:'Teams Registered',   icon:'🛡️', color:'#0077B6', grad:'linear-gradient(90deg,transparent,rgba(0,119,182,0.7),transparent)' },
              ].map(stat => (
                <div key={stat.label} className="so-stat-card">
                  <div className="so-stat-top-line" style={{ background:stat.grad }} />
                  <span className="so-stat-icon">{stat.icon}</span>
                  <div className="so-stat-value" style={{ color:stat.color, textShadow:`0 0 30px ${stat.color}50` }}>
                    {statsVisible ? stat.value.toLocaleString() : '0'}{stat.suffix}
                  </div>
                  <div className="so-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="so-divider" />

        {/* Roles */}
        <section className="so-section">
          <div className="so-container">
            <div className="so-section-header centered">
              <div className="so-eyebrow">Role-Based Access</div>
              <h2 className="so-section-title">
                Choose Your{' '}
                <span style={{ background:'linear-gradient(135deg,#CAF0F8,#00B4D8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  Role
                </span>
              </h2>
              <p className="so-section-sub">Tailored dashboards and tools designed for each type of user.</p>
            </div>
            <div className="so-roles-grid">
              {ROLES.map(r => (
                <div key={r.role} className={`so-role-card${r.featured ? ' featured' : ''}`}
                  style={{ borderColor: r.featured ? r.border : undefined, boxShadow: r.featured ? `0 0 44px ${r.glow}, inset 0 0 40px rgba(0,180,216,0.03)` : undefined }}>
                  <div className="so-role-number">{r.number}</div>
                  {r.featured && <div className="so-role-badge">Most Popular</div>}
                  <div className="so-role-icon" style={{ background:r.glow, borderColor:r.border, marginTop:r.featured?36:0 }}>{r.icon}</div>
                  <div className="so-role-name" style={{
                    background: r.featured ? 'linear-gradient(135deg,#CAF0F8,#00B4D8)' : undefined,
                    WebkitBackgroundClip: r.featured ? 'text' : undefined,
                    WebkitTextFillColor: r.featured ? 'transparent' : undefined,
                    backgroundClip: r.featured ? 'text' : undefined,
                    color: r.featured ? undefined : '#CAF0F8',
                  }}>{r.role}</div>
                  <ul className="so-role-features">
                    {r.features.map(f => (
                      <li key={f} className="so-role-feature">
                        <div className="so-role-check" style={{ background:`${r.accent}18`, color:r.accent, boxShadow:`0 0 6px ${r.accent}30` }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className="so-role-cta"
                    style={{
                      background: r.featured ? 'linear-gradient(135deg,#0077B6,#00B4D8)' : `${r.accent}12`,
                      color: r.featured ? '#03045E' : r.accent,
                      border: r.featured ? 'none' : `1px solid ${r.border}`,
                      boxShadow: r.featured ? '0 0 32px rgba(0,180,216,0.35)' : 'none',
                    }}>
                    Register as {r.role}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="so-cta-section">
          <div className="so-container">
            <div className="so-cta-card">
              <div className="so-cta-bg" />
              <div className="so-cta-title">
                Ready to Make<br />
                <span style={{ background:'linear-gradient(135deg,#CAF0F8,#90E0EF,#00B4D8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  Your Mark?
                </span>
              </div>
              <p className="so-cta-sub">
                Join thousands of athletes, teams, and organizations<br />
                building their sports legacy on <span style={{ color: '#ffffff' }}>SCORE</span><span style={{ color: '#00b4d8' }}>OCEAN</span>.
              </p>
              <div className="so-cta-actions">
                <Link to="/register" className="so-btn-hero-primary">Create Free Account</Link>
                <Link to="/login" className="so-btn-hero-secondary">Sign In</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="so-footer">
          <div className="so-footer-inner">
            <Link to="/" className="so-logo">
              <div className="so-logo-mark" style={{ width:30, height:30, fontSize:11 }}>SO</div>
              <span className="so-logo-text" style={{ fontSize:16 }}><span style={{ color: '#ffffff' }}>SCORE</span><span style={{ color: '#00b4d8' }}>OCEAN</span></span>
            </Link>
            <p className="so-footer-copy">© 2026 <span style={{ color: '#ffffff' }}>SCORE</span><span style={{ color: '#00b4d8' }}>OCEAN</span>. India's Digital Sports Platform.</p>
            <div className="so-footer-links">
              <Link to="/login"    className="so-footer-link">Sign In</Link>
              <Link to="/register" className="so-footer-link">Register</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}