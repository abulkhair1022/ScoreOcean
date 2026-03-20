import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

const SPORT_META: Record<string, { icon: string; accent: string; border: string; bg: string; color: string }> = {
  CRICKET:    { icon: '🏏', accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.07)', color: '#90e0ef' },
  FOOTBALL:   { icon: '⚽', accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.07)',   color: '#00b4d8' },
  KABADDI:    { icon: '🤼', accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.07)',  color: '#48cae4' },
  VOLLEYBALL: { icon: '🏐', accent: '#caf0f8', border: 'rgba(202,240,248,0.25)', bg: 'rgba(202,240,248,0.05)', color: '#caf0f8' },
  BASKETBALL: { icon: '🏀', accent: '#0096c7', border: 'rgba(0,150,199,0.3)',    bg: 'rgba(0,150,199,0.07)',   color: '#0096c7' },
  BADMINTON:  { icon: '🏸', accent: '#0077b6', border: 'rgba(0,119,182,0.3)',    bg: 'rgba(0,119,182,0.07)',   color: '#0077b6' },
};

const tooltipStyle = {
  background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(0,180,216,0.2)',
  borderRadius: 10, fontSize: 12, color: '#f8fafc',
  boxShadow: '0 4px 20px rgba(3,4,94,0.6)',
};

interface SportProfile { id: string; sport: string; statistics: Record<string, any>; createdAt: string; }

const S = `
@keyframes spin  { to { transform:rotate(360deg); } }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes fadeUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

.st-root { min-height:100vh; }
.st-main { max-width:1024px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:20px; }

.st-hero {
  position:relative; overflow:hidden; border-radius:18px; padding:40px 36px;
  background-color:#020817;
  background-image:
    radial-gradient(ellipse 80% 80% at 0% 0%, rgba(0,119,182,0.4) 0%, transparent 60%),
    radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,180,216,0.15) 0%, transparent 60%);
  border:1px solid rgba(0,180,216,0.2); animation:fadeUp 0.4s ease both;
}
.st-hero-grid {
  position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px);
  background-size:40px 40px;
}
.st-hero-orb { position:absolute; border-radius:50%; filter:blur(50px); pointer-events:none; }
.st-hero-sub   { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(0,180,216,0.7); margin-bottom:6px; }
.st-hero-title { font-family:'Barlow Condensed',sans-serif; font-size:40px; font-weight:900; color:#f8fafc; text-transform:uppercase; letter-spacing:0.02em; line-height:1; margin-bottom:10px; }
.st-hero-p     { font-size:14px; font-weight:300; color:rgba(248,250,252,0.5); max-width:480px; line-height:1.6; }

.st-section { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:24px; backdrop-filter:blur(12px); }
.st-section-title { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#f8fafc; margin-bottom:16px; }

.st-stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
@media(min-width:768px){ .st-stats-grid-4 { grid-template-columns:repeat(4,1fr) !important; } }
.st-stats-grid-3 { grid-template-columns:repeat(3,1fr); }

.st-stat-card { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:20px; backdrop-filter:blur(12px); transition:transform 220ms,border-color 220ms; }
.st-stat-card:hover { transform:translateY(-3px); border-color:rgba(0,180,216,0.3); }
.st-stat-icon  { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:14px; background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.2); }
.st-stat-value { font-family:'Barlow Condensed',sans-serif; font-size:34px; font-weight:900; color:#00b4d8; line-height:1; margin-bottom:4px; }
.st-stat-label { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.4); }

.st-error { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); color:#fca5a5; font-size:13px; }

.st-empty { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:48px 32px; text-align:center; backdrop-filter:blur(12px); }
.st-empty-icon  { font-size:40px; opacity:0.3; margin-bottom:14px; }
.st-empty-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.04em; color:rgba(248,250,252,0.6); margin-bottom:6px; }
.st-empty-sub   { font-size:13px; color:rgba(248,250,252,0.3); margin-bottom:20px; }
.st-empty-btn {
  display:inline-flex; align-items:center; gap:8px; padding:10px 22px; border-radius:8px;
  font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer; text-decoration:none;
  box-shadow:0 0 20px rgba(0,180,216,0.4); transition:transform 120ms,box-shadow 120ms;
}
.st-empty-btn:hover { transform:translateY(-2px); box-shadow:0 0 32px rgba(0,180,216,0.55); }

.st-2col { display:grid; grid-template-columns:1fr; gap:16px; }
@media(min-width:1024px){ .st-2col { grid-template-columns:1fr 2fr; } }

.st-sport-btn {
  width:100%; display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px;
  background:rgba(0,180,216,0.04); border:1px solid rgba(0,180,216,0.1); cursor:pointer; text-align:left;
  transition:border-color 150ms,background 150ms;
}
.st-sport-btn:hover   { border-color:rgba(0,180,216,0.25); background:rgba(0,180,216,0.07); }
.st-sport-btn.active  { border-color:rgba(0,180,216,0.3); background:rgba(0,180,216,0.1); }
.st-sport-icon { width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
.st-sport-name { font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#f8fafc; }
.st-sport-count{ font-size:11px; color:rgba(248,250,252,0.35); margin-top:2px; }
.st-sport-dot  { width:8px; height:8px; border-radius:50%; margin-left:auto; flex-shrink:0; }

.st-add-sport-link { display:flex; align-items:center; gap:6px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:rgba(0,180,216,0.6); text-decoration:none; padding-top:14px; margin-top:10px; border-top:1px solid rgba(0,180,216,0.1); transition:color 120ms; }
.st-add-sport-link:hover { color:#00b4d8; }

.st-detail-card { background:rgba(10,22,40,0.7); border-radius:14px; padding:24px; backdrop-filter:blur(12px); }
.st-detail-header { display:flex; align-items:center; gap:14px; margin-bottom:20px; }
.st-detail-icon  { width:52px; height:52px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0; }
.st-detail-sport { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:900; text-transform:uppercase; letter-spacing:0.04em; color:#f8fafc; }
.st-detail-since { font-size:12px; color:rgba(248,250,252,0.35); margin-top:3px; }
.st-chart-label  { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.35); margin-bottom:12px; }
.st-stats-cells  { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.st-stat-cell { padding:12px 14px; border-radius:8px; background:rgba(0,180,216,0.05); border:1px solid rgba(0,180,216,0.1); }
.st-stat-cell-label { font-size:11px; color:rgba(248,250,252,0.35); text-transform:capitalize; margin-bottom:4px; }
.st-stat-cell-value { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:900; color:#00b4d8; }
.st-no-stats { border-radius:10px; padding:20px; text-align:center; background:rgba(0,180,216,0.04); border:1px solid rgba(0,180,216,0.1); }

.st-compete-card { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:18px 20px; display:flex; align-items:center; justify-content:space-between; gap:14px; backdrop-filter:blur(12px); }
.st-compete-title { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#f8fafc; }
.st-compete-sub   { font-size:12px; color:rgba(248,250,252,0.4); margin-top:3px; }
.st-compete-btn {
  padding:9px 18px; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer; text-decoration:none; flex-shrink:0;
  box-shadow:0 0 14px rgba(0,180,216,0.3); transition:transform 120ms,box-shadow 120ms;
}
.st-compete-btn:hover { transform:translateY(-1px); box-shadow:0 0 22px rgba(0,180,216,0.5); }

.st-team-selector { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:16px; backdrop-filter:blur(12px); }
.st-team-chip {
  display:inline-flex; align-items:center; gap:8px; padding:7px 14px; border-radius:8px;
  font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;
  border:1px solid rgba(0,180,216,0.15); background:rgba(0,180,216,0.05); color:rgba(248,250,252,0.5);
  cursor:pointer; transition:all 150ms;
}
.st-team-chip:hover  { border-color:rgba(0,180,216,0.3); color:#f8fafc; background:rgba(0,180,216,0.08); }
.st-team-chip.active { border-color:rgba(0,180,216,0.4); background:rgba(0,180,216,0.12); color:#00b4d8; }

.st-wld-bars { display:flex; flex-direction:column; gap:10px; flex:1; }
.st-wld-bar-row { display:flex; flex-direction:column; gap:4px; }
.st-wld-bar-label { display:flex; justify-content:space-between; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:rgba(248,250,252,0.5); }
.st-wld-bar-track { height:6px; border-radius:9999px; background:rgba(0,180,216,0.1); overflow:hidden; }
.st-wld-bar-fill  { height:100%; border-radius:9999px; }

.st-sport-cell { padding:14px 16px; border-radius:10px; background:rgba(0,180,216,0.04); border:1px solid rgba(0,180,216,0.1); }
.st-sport-cell-name  { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; }
.st-sport-cell-stats { font-size:11px; color:rgba(248,250,252,0.35); margin-top:4px; }

.st-match-row {
  display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border-radius:10px;
  background:rgba(0,180,216,0.04); border:1px solid rgba(0,180,216,0.08);
  transition:border-color 150ms,background 150ms; cursor:pointer;
}
.st-match-row:hover { border-color:rgba(0,180,216,0.25); background:rgba(0,180,216,0.07); }
.st-match-icon { width:36px; height:36px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
.st-match-name { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.02em; color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.st-match-meta { font-size:11px; color:rgba(248,250,252,0.35); margin-top:2px; }
.st-match-score { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:900; color:#f8fafc; }
.st-result-chip { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:900; flex-shrink:0; }
.st-status-chip { padding:3px 8px; border-radius:4px; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; }

.st-overview-grid { display:grid; grid-template-columns:1fr; gap:16px; }
@media(min-width:768px){ .st-overview-grid { grid-template-columns:1fr 1fr; } }

.st-table { width:100%; border-collapse:collapse; font-size:13px; }
.st-table th { padding:10px 12px; text-align:left; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#00b4d8; background:rgba(0,180,216,0.06); border-bottom:1px solid rgba(0,180,216,0.15); }
.st-table td { padding:12px 12px; color:rgba(248,250,252,0.6); border-bottom:1px solid rgba(0,180,216,0.08); transition:background 120ms; }
.st-table tr:last-child td { border-bottom:none; }
.st-table tbody tr:hover td { background:rgba(0,180,216,0.04); }
.st-table td:first-child { font-weight:700; color:#f8fafc; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
`;

function Stats() {
  const navigate = useNavigate();
  const [user, setUser]           = useState<any>(null);
  const [sportProfiles, setSportProfiles] = useState<SportProfile[]>([]);
  const [tournaments, setTournaments]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [myTeams, setMyTeams]     = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamSports, setTeamSports] = useState<any[]>([]);
  const [teamMatches, setTeamMatches] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (!storedUser || !accessToken) { navigate('/login'); return; }
    const parsed = JSON.parse(storedUser); setUser(parsed);
    if (parsed.role === 'ORGANIZATION') fetchOrgStats();
    else if (parsed.role === 'TEAM') fetchTeamStats();
    else fetchStats();
  }, [navigate]);

  const fetchOrgStats = async () => {
    try { setLoading(true); const r = await apiClient.get('/tournaments'); setTournaments(r.data?.data || r.data || []); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to load stats'); }
    finally { setLoading(false); }
  };

  const fetchTeamStats = async () => {
    try {
      setLoading(true);
      const r = await apiClient.get('/teams');
      const teams = r.data?.data || r.data || [];
      setMyTeams(Array.isArray(teams) ? teams : []);
      if (teams.length > 0) await loadTeamStatsDetail(teams[0]);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load team stats'); }
    finally { setLoading(false); }
  };

  const loadTeamStatsDetail = async (team: any) => {
    setSelectedTeam(team);
    try {
      const [sR, mR] = await Promise.allSettled([apiClient.get(`/teams/${team.id}/sports`), apiClient.get(`/matches/team/${team.id}`)]);
      if (sR.status === 'fulfilled') setTeamSports(sR.value.data?.data || sR.value.data || []);
      if (mR.status === 'fulfilled') { const ml = mR.value.data?.data || mR.value.data || []; setTeamMatches(Array.isArray(ml) ? ml : []); }
    } catch {}
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      try { await apiClient.post('/cricket-stats/recalculate'); } catch {}
      const r = await apiClient.get('/users/profile');
      const profiles = r.data.sportProfiles || [];
      setSportProfiles(profiles);
      if (profiles.length > 0) setActiveProfile(profiles[0].id);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load statistics'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading stats...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const displayName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'Athlete';
  const currentProfile = sportProfiles.find(sp => sp.id === activeProfile) || sportProfiles[0];

  const Hero = ({ sub, title, text }: { sub: string; title: string; text: string }) => (
    <div className="st-hero">
      <div className="st-hero-grid" />
      <div className="st-hero-orb" style={{ width: 200, height: 200, background: 'radial-gradient(circle,rgba(0,180,216,0.18) 0%,transparent 70%)', top: -60, right: -40, animation: 'float 5s ease-in-out infinite' }} />
      <div style={{ position: 'relative', zIndex: 10 }}>
        <p className="st-hero-sub">{sub}</p>
        <h1 className="st-hero-title">{title}</h1>
        <p className="st-hero-p">{text}</p>
      </div>
    </div>
  );

  // ── Team view ──────────────────────────────────────────────────────────
  if (user?.role === 'TEAM') {
    const completed = teamMatches.filter((m: any) => m.status === 'COMPLETED');
    const wins   = completed.filter((m: any) => { const ih = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id; const hs = m.homeScore ?? m.home_score ?? 0; const as_ = m.awayScore ?? m.away_score ?? 0; return (ih && hs > as_) || (!ih && as_ > hs); }).length;
    const losses = completed.filter((m: any) => { const ih = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id; const hs = m.homeScore ?? m.home_score ?? 0; const as_ = m.awayScore ?? m.away_score ?? 0; return (ih && hs < as_) || (!ih && as_ < hs); }).length;
    const draws  = completed.length - wins - losses;
    const teamName = selectedTeam?.name || user?.name || 'Team';
    const chartData = teamSports.map((sp: any) => { const s = sp.statistics || sp.stats || {}; return { name: sp.sport.charAt(0) + sp.sport.slice(1).toLowerCase(), Played: s.matchesPlayed || 0, Wins: s.wins || 0 }; });

    return (
      <>
        <style>{S}</style>
        <div className="st-root">
          <Navbar />
          <main className="st-main">
            <Hero sub="Team Performance" title={`${teamName}'s Stats`} text="Track your team's match performance and sport profiles." />

            {myTeams.length > 1 && (
              <div className="st-team-selector">
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.35)', marginBottom: 12 }}>Select Team</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {myTeams.map((t: any) => {
                    const meta = SPORT_META[t.sport] || SPORT_META.FOOTBALL;
                    return (
                      <button key={t.id} onClick={() => loadTeamStatsDetail(t)}
                        className={`st-team-chip${selectedTeam?.id === t.id ? ' active' : ''}`}
                        style={selectedTeam?.id === t.id ? { borderColor: meta.border, color: meta.accent } : {}}>
                        {meta.icon} {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`st-stats-grid st-stats-grid-4`} style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {[
                { icon: '⚔️', label: 'Matches Played', value: completed.length },
                { icon: '🏆', label: 'Wins',           value: wins },
                { icon: '❌', label: 'Losses',         value: losses },
                { icon: '🤝', label: 'Draws',          value: draws },
              ].map((s) => (
                <div key={s.label} className="st-stat-card">
                  <div className="st-stat-icon">{s.icon}</div>
                  <div className="st-stat-value">{s.value}</div>
                  <div className="st-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {error && <div className="st-error"><span>⚠️</span><p>{error}</p></div>}

            {completed.length > 0 && (
              <div className="st-section">
                <div className="st-section-title">Win / Loss / Draw</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={[{ name:'Wins',value:wins||0 },{ name:'Losses',value:losses||0 },{ name:'Draws',value:draws||0 }].filter(d=>d.value>0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        <Cell fill="#00b4d8" /><Cell fill="#fca5a5" /><Cell fill="rgba(248,250,252,0.2)" />
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="st-wld-bars">
                    {[
                      { label: 'Wins',   value: wins,   fill: '#00b4d8', pct: completed.length ? Math.round((wins   / completed.length) * 100) : 0 },
                      { label: 'Losses', value: losses, fill: '#fca5a5', pct: completed.length ? Math.round((losses / completed.length) * 100) : 0 },
                      { label: 'Draws',  value: draws,  fill: 'rgba(248,250,252,0.3)', pct: completed.length ? Math.round((draws  / completed.length) * 100) : 0 },
                    ].map(s => (
                      <div key={s.label} className="st-wld-bar-row">
                        <div className="st-wld-bar-label"><span>{s.label}</span><span style={{ color: s.fill }}>{s.value} ({s.pct}%)</span></div>
                        <div className="st-wld-bar-track"><div className="st-wld-bar-fill" style={{ width: `${s.pct}%`, background: s.fill }} /></div>
                      </div>
                    ))}
                    <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.25)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>{completed.length} completed matches</p>
                  </div>
                </div>
              </div>
            )}

            {teamSports.length > 0 && (
              <div className="st-section">
                <div className="st-section-title">Sport Profiles</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
                  {teamSports.map((sp: any) => {
                    const meta = SPORT_META[sp.sport] || SPORT_META.FOOTBALL;
                    const stats = sp.statistics || sp.stats || {};
                    const isPrimary = sp.sport === selectedTeam?.sport;
                    return (
                      <div key={sp.id || sp.sport} className="st-sport-cell" style={{ borderColor: isPrimary ? meta.border : 'rgba(0,180,216,0.1)', background: isPrimary ? meta.bg : 'rgba(0,180,216,0.03)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 7, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>{meta.icon}</div>
                        <div className="st-sport-cell-name" style={{ color: isPrimary ? meta.accent : '#f8fafc' }}>{sp.sport}</div>
                        {isPrimary && <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.35)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Primary</div>}
                        <div className="st-sport-cell-stats">{stats.matchesPlayed || 0} played · {stats.wins || 0} wins</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {chartData.length > 0 && chartData.some(d => d.Played > 0 || d.Wins > 0) && (
              <div className="st-section">
                <div className="st-section-title">Performance by Sport</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,180,216,0.05)', radius: 8 }} />
                    <Bar dataKey="Played" fill="rgba(0,180,216,0.2)" radius={[6,6,0,0]} maxBarSize={40} />
                    <Bar dataKey="Wins"   fill="#00b4d8"              radius={[6,6,0,0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {(() => {
              if (teamMatches.length < 2) return null;
              const byMonth: Record<string, { played: number; won: number }> = {};
              teamMatches.forEach((m: any) => {
                if (!m.created_at) return;
                const key = new Date(m.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                if (!byMonth[key]) byMonth[key] = { played: 0, won: 0 };
                byMonth[key].played += 1;
                if (m.status === 'COMPLETED') {
                  const ih = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
                  const hs = m.homeScore ?? m.home_score ?? 0; const as_ = m.awayScore ?? m.away_score ?? 0;
                  if ((ih && hs > as_) || (!ih && as_ > hs)) byMonth[key].won += 1;
                }
              });
              const lineData = Object.entries(byMonth).reverse().map(([month, v]) => ({ month, ...v }));
              if (lineData.length < 2) return null;
              return (
                <div className="st-section">
                  <div className="st-section-title">Match Activity</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={lineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,216,0.08)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: 'rgba(248,250,252,0.5)' }} />
                      <Line type="monotone" dataKey="played" stroke="#0077b6" strokeWidth={2.5} dot={{ r: 4, fill: '#0077b6' }} name="Played" />
                      <Line type="monotone" dataKey="won"    stroke="#00b4d8" strokeWidth={2.5} dot={{ r: 4, fill: '#00b4d8' }} name="Won" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {teamMatches.length > 0 && (
              <div className="st-section">
                <div className="st-section-title">Recent Matches</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {teamMatches.slice(0, 10).map((m: any) => {
                    const meta = SPORT_META[m.sport] || SPORT_META.FOOTBALL;
                    const ih = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
                    const hs = m.homeScore ?? m.home_score ?? 0; const as_ = m.awayScore ?? m.away_score ?? 0;
                    const myScore = ih ? hs : as_; const theirScore = ih ? as_ : hs;
                    const opponentName = ih ? (m.away_team_name || m.awayTeamName || 'Opponent') : (m.home_team_name || m.homeTeamName || 'Opponent');
                    const myTeamName  = ih ? (m.home_team_name || m.homeTeamName || selectedTeam?.name) : (m.away_team_name || m.awayTeamName || selectedTeam?.name);
                    let result = '', rBg = '', rColor = '';
                    if (m.status === 'COMPLETED') {
                      if (myScore > theirScore)      { result='W'; rBg='rgba(0,180,216,0.12)';  rColor='#00b4d8'; }
                      else if (myScore < theirScore) { result='L'; rBg='rgba(239,68,68,0.12)';  rColor='#fca5a5'; }
                      else                           { result='D'; rBg='rgba(248,250,252,0.06)'; rColor='rgba(248,250,252,0.4)'; }
                    }
                    const statusBg = m.status === 'COMPLETED' ? 'rgba(248,250,252,0.06)' : m.status === 'IN_PROGRESS' ? 'rgba(0,180,216,0.12)' : 'rgba(144,224,239,0.1)';
                    const statusColor = m.status === 'COMPLETED' ? 'rgba(248,250,252,0.4)' : m.status === 'IN_PROGRESS' ? '#00b4d8' : '#90e0ef';
                    const statusLabel = m.status === 'COMPLETED' ? 'Done' : m.status === 'IN_PROGRESS' ? 'Live' : 'Scheduled';
                    return (
                      <div key={m.id} className="st-match-row" onClick={() => navigate(`/matches/${m.id}`)}>
                        <div className="st-match-icon" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="st-match-name">{myTeamName} <span style={{ color: 'rgba(248,250,252,0.3)', fontWeight: 400 }}>vs</span> {opponentName}</div>
                          <div className="st-match-meta">{m.sport} · {m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {m.status === 'COMPLETED' && <span className="st-match-score">{myScore}–{theirScore}</span>}
                          {result && <span className="st-result-chip" style={{ background: rBg, color: rColor }}>{result}</span>}
                          <span className="st-status-chip" style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>
                          <svg width="14" height="14" fill="none" stroke="rgba(248,250,252,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {teamMatches.length === 0 && teamSports.length === 0 && !error && (
              <div className="st-empty">
                <div className="st-empty-icon">📊</div>
                <div className="st-empty-title">No stats yet</div>
                <div className="st-empty-sub">Add sports to your team and play matches to see stats here.</div>
                <Link to="/teams" className="st-empty-btn">Manage Teams →</Link>
              </div>
            )}
          </main>
        </div>
      </>
    );
  }

  // ── Org view ──────────────────────────────────────────────────────────
  if (user?.role === 'ORGANIZATION') {
    const activeTournaments  = tournaments.filter((t: any) => ['ACTIVE','IN_PROGRESS','REGISTRATION_OPEN'].includes(t.status)).length;
    const totalRegistrations = tournaments.reduce((s: number, t: any) => s + (t.registrations?.length || t.currentTeams || 0), 0);
    const totalRevenue       = tournaments.reduce((s: number, t: any) => s + (t.registrationFee || 0) * (t.registrations?.length || t.currentTeams || 0), 0);
    const chartData = tournaments.slice(0, 8).map((t: any) => ({
      name: t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name,
      Registrations: t.registrations?.length || t.currentTeams || 0,
      Capacity: t.teamCapacity || t.maxTeams || 0,
    }));
    const orgName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'Organization';

    return (
      <>
        <style>{S}</style>
        <div className="st-root">
          <Navbar />
          <main className="st-main">
            <Hero sub="Organisation Dashboard" title={`${orgName}'s Stats`} text="Overview of tournaments hosted, registrations and revenue." />

            <div className="st-stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {[
                { icon: '🏆', label: 'Tournaments Hosted', value: tournaments.length },
                { icon: '⚡', label: 'Active Events',       value: activeTournaments },
                { icon: '📝', label: 'Registrations',       value: totalRegistrations },
                { icon: '💰', label: 'Total Revenue',        value: `₹${(totalRevenue/1000).toFixed(1)}K` },
              ].map((s) => (
                <div key={s.label} className="st-stat-card">
                  <div className="st-stat-icon">{s.icon}</div>
                  <div className="st-stat-value">{s.value}</div>
                  <div className="st-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {error && <div className="st-error"><span>⚠️</span><p>{error}</p></div>}

            {tournaments.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-icon">🏆</div>
                <div className="st-empty-title">No tournaments hosted yet</div>
                <div className="st-empty-sub">Create your first tournament to see stats here.</div>
                <Link to="/tournaments" className="st-empty-btn">Go to Tournaments →</Link>
              </div>
            ) : (
              <>
                {chartData.length > 0 && (
                  <div className="st-section">
                    <div className="st-section-title">Registrations per Tournament</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,180,216,0.05)', radius: 8 }} />
                        <Bar dataKey="Registrations" fill="#0077b6" radius={[6,6,0,0]} maxBarSize={40} />
                        <Bar dataKey="Capacity"      fill="rgba(0,180,216,0.15)" radius={[6,6,0,0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="st-section">
                  <div className="st-section-title">All Tournaments</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="st-table">
                      <thead>
                        <tr>{['Name', 'Sport', 'Format', 'Status', 'Registrations', 'Fee'].map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {tournaments.map((t: any) => {
                          const regs = t.registrations?.length || t.currentTeams || 0;
                          const cap  = t.teamCapacity || t.maxTeams || '—';
                          const statusBg = t.status === 'REGISTRATION_OPEN' ? 'rgba(0,180,216,0.1)' : t.status === 'IN_PROGRESS' ? 'rgba(0,180,216,0.1)' : t.status === 'COMPLETED' ? 'rgba(248,250,252,0.06)' : 'rgba(144,224,239,0.08)';
                          const statusColor = t.status === 'REGISTRATION_OPEN' ? '#00b4d8' : t.status === 'IN_PROGRESS' ? '#00b4d8' : t.status === 'COMPLETED' ? 'rgba(248,250,252,0.4)' : '#90e0ef';
                          return (
                            <tr key={t.id}>
                              <td>{t.name}</td>
                              <td>{t.sport}</td>
                              <td>{t.format}</td>
                              <td><span style={{ padding: '3px 8px', borderRadius: 4, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: statusBg, color: statusColor }}>{t.status?.replace(/_/g, ' ')}</span></td>
                              <td>{regs}/{cap}</td>
                              <td>{t.registrationFee ? `₹${t.registrationFee}` : 'Free'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </>
    );
  }

  // ── Player view ──────────────────────────────────────────────────────
  const totalSportsTracked = sportProfiles.length;
  const totalStatEntries   = sportProfiles.reduce((acc, sp) => acc + Object.keys(sp.statistics || {}).length, 0);

  return (
    <>
      <style>{S}</style>
      <div className="st-root">
        <Navbar />
        <main className="st-main">
          <Hero sub="Performance Dashboard" title={`${displayName}'s Stats`} text="Track your athletic performance and progress across all sports you play." />

          <div className="st-stats-grid st-stats-grid-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {[
              { icon: '🏅', label: 'Sports Tracked', value: totalSportsTracked },
              { icon: '📊', label: 'Stats Recorded', value: totalStatEntries   },
              { icon: '🏆', label: 'Tournaments',     value: 0                  },
            ].map((s) => (
              <div key={s.label} className="st-stat-card">
                <div className="st-stat-icon">{s.icon}</div>
                <div className="st-stat-value">{s.value}</div>
                <div className="st-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {error && <div className="st-error"><span>⚠️</span><p>{error}</p></div>}

          {sportProfiles.length === 0 ? (
            <div className="st-empty">
              <div className="st-empty-icon">📊</div>
              <div className="st-empty-title">No sport profiles yet</div>
              <div className="st-empty-sub">Add sports to your profile to start tracking your performance statistics.</div>
              <Link to="/profile" className="st-empty-btn">Go to Profile →</Link>
            </div>
          ) : (
            <>
              {sportProfiles.length >= 2 && (() => {
                const overviewData = sportProfiles.map((sp) => ({
                  name: sp.sport.charAt(0) + sp.sport.slice(1).toLowerCase(),
                  Stats: Object.keys(sp.statistics || {}).length,
                }));
                return (
                  <div className="st-section">
                    <div className="st-section-title">Sports Overview</div>
                    <div className="st-overview-grid">
                      <div>
                        <p className="st-chart-label">Stats Tracked per Sport</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={overviewData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,180,216,0.05)', radius: 8 }} />
                            <Bar dataKey="Stats" fill="#0077b6" radius={[6,6,0,0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="st-chart-label">Distribution</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={overviewData.filter(d => d.Stats > 0)} cx="50%" cy="50%" outerRadius={65} dataKey="Stats" nameKey="name" paddingAngle={3}>
                              {overviewData.map((_, i) => <Cell key={i} fill={['#0077b6','#00b4d8','#48cae4','#90e0ef','#caf0f8','#0096c7'][i%6]} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(248,250,252,0.5)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="st-2col">
                {/* Sport selector */}
                <div className="st-section" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 20 }}>
                  <div className="st-section-title">Your Sports</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sportProfiles.map((sp) => {
                      const meta = SPORT_META[sp.sport] || SPORT_META.FOOTBALL;
                      const isActive = sp.id === activeProfile;
                      return (
                        <button key={sp.id} onClick={() => setActiveProfile(sp.id)}
                          className={`st-sport-btn${isActive ? ' active' : ''}`}
                          style={isActive ? { borderColor: meta.border, background: meta.bg } : {}}>
                          <div className="st-sport-icon" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>{meta.icon}</div>
                          <div>
                            <div className="st-sport-name" style={isActive ? { color: meta.accent } : {}}>{sp.sport}</div>
                            <div className="st-sport-count">{Object.keys(sp.statistics || {}).length} stats</div>
                          </div>
                          {isActive && <div className="st-sport-dot" style={{ background: meta.accent }} />}
                        </button>
                      );
                    })}
                  </div>
                  <Link to="/profile" className="st-add-sport-link">+ Add Sport</Link>
                </div>

                {/* Detail panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {currentProfile && (() => {
                    const meta = SPORT_META[currentProfile.sport] || SPORT_META.FOOTBALL;
                    const stats = Object.entries(currentProfile.statistics || {});
                    const numericStats = stats.filter(([,v]) => !isNaN(parseFloat(String(v))));
                    const chartData = numericStats.map(([key, value]) => ({
                      name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                      value: parseFloat(String(value)),
                    }));
                    return (
                      <>
                        <div className="st-detail-card" style={{ border: `1px solid ${meta.border}` }}>
                          <div className="st-detail-header">
                            <div className="st-detail-icon" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>{meta.icon}</div>
                            <div>
                              <div className="st-detail-sport" style={{ color: meta.accent }}>{currentProfile.sport}</div>
                              <div className="st-detail-since">Tracking since {new Date(currentProfile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
                            </div>
                          </div>

                          {stats.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {chartData.length > 0 && (
                                <div>
                                  <p className="st-chart-label">Performance Chart</p>
                                  <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fontSize: 10, fill: 'rgba(248,250,252,0.35)' }} axisLine={false} tickLine={false} />
                                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,180,216,0.05)', radius: 8 }} />
                                      <Bar dataKey="value" fill={meta.color} radius={[6,6,0,0]} maxBarSize={48} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                              <div className="st-stats-cells">
                                {stats.map(([key, value]) => (
                                  <div key={key} className="st-stat-cell" style={{ background: meta.bg, borderColor: meta.border }}>
                                    <div className="st-stat-cell-label">{key.replace(/_/g, ' ')}</div>
                                    <div className="st-stat-cell-value" style={{ color: meta.accent }}>{String(value)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="st-no-stats">
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.accent }}>No stats recorded yet</p>
                              <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.3)', marginTop: 4 }}>Play matches to start building your stats</p>
                            </div>
                          )}
                        </div>

                        <div className="st-compete-card">
                          <div>
                            <div className="st-compete-title">Ready to compete?</div>
                            <div className="st-compete-sub">Find {currentProfile.sport.toLowerCase()} tournaments near you</div>
                          </div>
                          <Link to="/tournaments" className="st-compete-btn">Find Tournaments →</Link>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default Stats;