import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { showToast } from '../../utils/toast';

const SPORT_META: Record<string, { icon: string; accent: string; border: string; bg: string }> = {
  CRICKET:    { icon: '🏏', accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.07)' },
  FOOTBALL:   { icon: '⚽', accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.07)'   },
  KABADDI:    { icon: '🤼', accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.07)'  },
  VOLLEYBALL: { icon: '🏐', accent: '#caf0f8', border: 'rgba(202,240,248,0.25)', bg: 'rgba(202,240,248,0.05)' },
  BASKETBALL: { icon: '🏀', accent: '#0096c7', border: 'rgba(0,150,199,0.3)',    bg: 'rgba(0,150,199,0.07)'   },
  BADMINTON:  { icon: '🏸', accent: '#0077b6', border: 'rgba(0,119,182,0.3)',    bg: 'rgba(0,119,182,0.07)'   },
};

const MATCH_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_ACCEPTANCE: { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', label: 'Awaiting Response' },
  SCHEDULED:          { bg: 'rgba(0,180,216,0.1)',    color: '#00b4d8', label: 'Scheduled'         },
  IN_PROGRESS:        { bg: 'rgba(0,180,216,0.15)',   color: '#00b4d8', label: 'Live'               },
  COMPLETED:          { bg: 'rgba(248,250,252,0.06)', color: 'rgba(248,250,252,0.4)', label: 'Completed' },
  CANCELLED:          { bg: 'rgba(239,68,68,0.1)',    color: '#fca5a5', label: 'Cancelled'          },
};

const ALL_SPORTS = ['CRICKET', 'FOOTBALL', 'KABADDI', 'VOLLEYBALL', 'BASKETBALL', 'BADMINTON'];

const S = `
@keyframes spin   { to { transform:rotate(360deg); } }
@keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes shimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

.td-space { display:flex; flex-direction:column; gap:16px; }
.td-2col  { display:grid; grid-template-columns:1fr; gap:16px; }
@media(min-width:1024px){ .td-2col { grid-template-columns:2fr 1fr; } }

.td-hero {
  position:relative; overflow:hidden; border-radius:18px; padding:40px 36px;
  background-color:#020817;
  background-image:
    radial-gradient(ellipse 80% 80% at 0% 0%, rgba(0,119,182,0.4) 0%, transparent 60%),
    radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,180,216,0.15) 0%, transparent 60%);
  border:1px solid rgba(0,180,216,0.2); animation:fadeUp 0.4s ease both;
}
.td-hero-grid {
  position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px);
  background-size:40px 40px;
}
.td-hero-orb { position:absolute; border-radius:50%; filter:blur(50px); pointer-events:none; }
.td-hero-inner { position:relative; z-index:10; display:flex; flex-direction:column; gap:20px; }
@media(min-width:768px){ .td-hero-inner { flex-direction:row; align-items:center; justify-content:space-between; } }
.td-greeting { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(0,180,216,0.7); margin-bottom:6px; }
.td-hero-name { font-family:'Barlow Condensed',sans-serif; font-size:42px; font-weight:900; color:#f8fafc; text-transform:uppercase; letter-spacing:0.02em; line-height:1; margin-bottom:10px; }
.td-hero-sub  { font-size:14px; font-weight:300; color:rgba(248,250,252,0.5); max-width:380px; line-height:1.6; }
.td-hero-btns { display:flex; gap:10px; flex-wrap:wrap; flex-shrink:0; }

.td-btn-ghost {
  padding:10px 20px; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.25); color:#f8fafc;
  cursor:pointer; transition:background 120ms,border-color 120ms,transform 120ms;
}
.td-btn-ghost:hover { background:rgba(0,180,216,0.15); border-color:rgba(0,180,216,0.4); transform:translateY(-1px); }
.td-btn-ghost:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
.td-btn-solid {
  padding:10px 20px; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none;
  text-decoration:none; box-shadow:0 0 20px rgba(0,180,216,0.4); cursor:pointer;
  transition:transform 120ms,box-shadow 120ms,filter 120ms; position:relative; overflow:hidden;
}
.td-btn-solid::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(202,240,248,0.2) 50%,transparent 60%); transform:translateX(-100%); transition:transform 0.5s; }
.td-btn-solid:hover { transform:translateY(-2px); box-shadow:0 0 36px rgba(0,180,216,0.55); filter:brightness(1.08); }
.td-btn-solid:hover::after { transform:translateX(100%); }

.td-stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; animation:fadeUp 0.45s ease both 0.05s; }
@media(min-width:1024px){ .td-stats-grid { grid-template-columns:repeat(4,1fr); } }
.td-stat-card { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:20px; backdrop-filter:blur(12px); transition:transform 220ms,border-color 220ms; }
.td-stat-card:hover { transform:translateY(-3px); border-color:rgba(0,180,216,0.3); }
.td-stat-icon  { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:14px; background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.2); }
.td-stat-value { font-family:'Barlow Condensed',sans-serif; font-size:34px; font-weight:900; color:#00b4d8; line-height:1; margin-bottom:4px; }
.td-stat-label { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.4); }

.td-wld-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.td-wld-card { border-radius:12px; padding:16px; text-align:center; border:1px solid rgba(0,180,216,0.12); background:rgba(10,22,40,0.5); }
.td-wld-icon  { font-size:22px; margin-bottom:6px; }
.td-wld-value { font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:900; color:#00b4d8; line-height:1; }
.td-wld-label { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.35); margin-top:3px; }

.td-section { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:24px; backdrop-filter:blur(12px); animation:fadeUp 0.5s ease both 0.1s; }
.td-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
.td-section-title  { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#f8fafc; display:flex; align-items:center; gap:10px; }
.td-section-icon   { width:30px; height:30px; border-radius:6px; background:rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.2); display:flex; align-items:center; justify-content:center; font-size:14px; }
.td-section-badge  { width:20px; height:20px; border-radius:50%; background:rgba(0,180,216,0.2); border:1px solid rgba(0,180,216,0.3); display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:900; color:#00b4d8; }
.td-mini-btn {
  padding:7px 16px; border-radius:7px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
  box-shadow:0 0 12px rgba(0,180,216,0.3); transition:transform 120ms,box-shadow 120ms,filter 120ms; text-decoration:none;
  display:inline-flex; align-items:center; gap:6px;
}
.td-mini-btn:hover { transform:translateY(-1px); box-shadow:0 0 20px rgba(0,180,216,0.5); filter:brightness(1.08); }
.td-mini-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

.td-row {
  display:flex; align-items:center; gap:14px; padding:13px 16px; border-radius:10px;
  border:1px solid rgba(0,180,216,0.1); background:rgba(0,180,216,0.03);
  transition:border-color 150ms,background 150ms,transform 150ms;
}
.td-row:hover { border-color:rgba(0,180,216,0.25); background:rgba(0,180,216,0.06); transform:translateX(3px); }
.td-row.clickable { cursor:pointer; }
.td-row.selected { border-color:rgba(0,180,216,0.3); background:rgba(0,180,216,0.08); }

.td-sport-icon { width:44px; height:44px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
.td-name  { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:800; letter-spacing:0.03em; text-transform:uppercase; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.td-meta  { font-size:12px; color:rgba(248,250,252,0.4); margin-top:2px; }
.td-status{ display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:4px; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; white-space:nowrap; }
.td-status-dot { width:5px; height:5px; border-radius:50%; }

.td-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; text-align:center; gap:12px; }
.td-empty-icon  { font-size:40px; opacity:0.3; }
.td-empty-title { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:rgba(248,250,252,0.55); }
.td-empty-sub   { font-size:12px; color:rgba(248,250,252,0.3); max-width:220px; line-height:1.6; }

.td-manage-btn {
  padding:6px 14px; border-radius:6px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  background:rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.2); color:#00b4d8;
  text-decoration:none; flex-shrink:0; transition:background 120ms,border-color 120ms;
}
.td-manage-btn:hover { background:rgba(0,180,216,0.18); border-color:rgba(0,180,216,0.4); }

.td-accept-btn {
  padding:7px 14px; border-radius:7px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
  box-shadow:0 0 12px rgba(0,180,216,0.3); transition:transform 120ms,box-shadow 120ms;
  display:flex; align-items:center; gap:5px;
}
.td-accept-btn:hover { transform:translateY(-1px); box-shadow:0 0 20px rgba(0,180,216,0.5); }
.td-accept-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
.td-decline-btn {
  padding:7px 12px; border-radius:7px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  background:transparent; color:rgba(248,250,252,0.4); border:1px solid rgba(0,180,216,0.15); cursor:pointer;
  transition:background 120ms,border-color 120ms,color 120ms;
}
.td-decline-btn:hover { background:rgba(239,68,68,0.08); border-color:rgba(239,68,68,0.25); color:#fca5a5; }
.td-decline-btn:disabled { opacity:0.5; cursor:not-allowed; }

.td-action-card {
  display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px;
  border:1px solid rgba(0,180,216,0.1); background:rgba(10,22,40,0.5);
  text-decoration:none; transition:transform 180ms,border-color 180ms,background 180ms; cursor:pointer; width:100%; text-align:left;
}
.td-action-card:hover { transform:translateX(3px); background:rgba(0,180,216,0.06); border-color:rgba(0,180,216,0.2); }
.td-action-icon { width:38px; height:38px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.15); }
.td-action-name { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:#f8fafc; }
.td-action-desc { font-size:11px; color:rgba(248,250,252,0.35); margin-top:1px; }
.td-action-arrow { margin-left:auto; color:rgba(248,250,252,0.2); transition:color 150ms; }
.td-action-card:hover .td-action-arrow { color:rgba(0,180,216,0.6); }

.td-modal-overlay { position:fixed; inset:0; background:rgba(2,8,23,0.88); display:flex; align-items:center; justify-content:center; z-index:50; padding:16px; backdrop-filter:blur(10px); }
.td-modal {
  background:rgba(10,22,40,0.97); border:1px solid rgba(0,180,216,0.25); border-radius:18px;
  box-shadow:0 8px 40px rgba(3,4,94,0.7),0 0 40px rgba(0,180,216,0.08);
  backdrop-filter:blur(20px); width:100%; max-width:480px; overflow:hidden;
}
.td-modal-lg { max-width:540px; max-height:90vh; display:flex; flex-direction:column; }
.td-modal-header-gradient { padding:20px 24px; background:linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.5)); border-bottom:1px solid rgba(0,180,216,0.15); }
.td-modal-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; letter-spacing:0.04em; text-transform:uppercase; color:#f8fafc; }
.td-modal-sub   { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(0,180,216,0.7); margin-bottom:4px; }
.td-modal-body  { padding:24px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }
.td-modal-close { width:32px; height:32px; border-radius:6px; background:rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.2); color:rgba(248,250,252,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 120ms,color 120ms; }
.td-modal-close:hover { background:rgba(0,180,216,0.18); color:#f8fafc; }

.td-label { display:block; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.5); margin-bottom:7px; }
.td-input, .td-select {
  width:100%; padding:11px 16px; border-radius:10px; font-family:'Barlow',sans-serif; font-size:14px; color:#f8fafc;
  background:rgba(10,22,40,0.8); border:1px solid rgba(0,180,216,0.15); outline:none;
  transition:border-color 120ms,background 120ms,box-shadow 120ms; -webkit-appearance:none; box-sizing:border-box;
}
.td-input::placeholder { color:rgba(248,250,252,0.22); }
.td-input:hover,.td-select:hover { border-color:rgba(0,180,216,0.3); }
.td-input:focus,.td-select:focus { border-color:rgba(0,180,216,0.55); background:rgba(0,180,216,0.06); box-shadow:0 0 0 3px rgba(0,180,216,0.12); }
.td-select option { background:#020817; color:#f8fafc; }

.td-btn-row { display:flex; gap:10px; }
.td-spinner { animation:spin 0.8s linear infinite; }

.td-divider { height:1px; background:rgba(0,180,216,0.1); margin:4px 0; }

.td-team-selector-card {
  background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:16px; backdrop-filter:blur(12px);
}
.td-team-selector-label { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.35); margin-bottom:12px; }
.td-team-chip {
  display:inline-flex; align-items:center; gap:8px; padding:7px 14px; border-radius:8px;
  font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;
  border:1px solid rgba(0,180,216,0.15); background:rgba(0,180,216,0.05); color:rgba(248,250,252,0.5);
  cursor:pointer; transition:all 150ms;
}
.td-team-chip:hover { border-color:rgba(0,180,216,0.3); color:#f8fafc; background:rgba(0,180,216,0.08); }
.td-team-chip.active { border-color:rgba(0,180,216,0.4); background:rgba(0,180,216,0.12); color:#00b4d8; }

.td-league-row {
  display:flex; align-items:center; justify-content:space-between; gap:12px; border-radius:10px; padding:12px 16px; border:1px solid rgba(0,180,216,0.15); background:rgba(0,180,216,0.05);
}
.td-league-open {
  padding:5px 14px; border-radius:6px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; text-decoration:none; cursor:pointer; flex-shrink:0;
}

.td-score-header { padding:20px 24px; background:linear-gradient(135deg,rgba(3,4,94,0.9),rgba(0,119,182,0.6)); }
.td-score-teams  { display:flex; align-items:center; justify-content:space-between; }
.td-score-team   { flex:1; text-align:center; }
.td-score-team-label { font-size:11px; font-weight:700; font-family:'Barlow Condensed',sans-serif; letter-spacing:0.08em; text-transform:uppercase; color:rgba(248,250,252,0.5); margin-bottom:4px; }
.td-score-team-name  { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:900; letter-spacing:0.03em; text-transform:uppercase; color:#f8fafc; line-height:1.1; }
.td-score-big        { font-family:'Barlow Condensed',sans-serif; font-size:36px; font-weight:900; color:#f8fafc; line-height:1; margin-top:4px; }
.td-score-overs      { font-size:11px; color:rgba(248,250,252,0.5); margin-top:2px; }
.td-score-vs         { font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:900; color:rgba(248,250,252,0.3); padding:0 16px; }
.td-result-chip      { display:inline-block; margin-top:6px; padding:2px 8px; border-radius:4px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:900; letter-spacing:0.08em; }

.td-scorecard { background:rgba(0,180,216,0.05); border:1px solid rgba(0,180,216,0.12); border-radius:10px; padding:14px; }
.td-scorecard-title { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.35); margin-bottom:10px; }
.td-scorecard-grid  { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:10px; }
.td-scorecard-stat  { background:rgba(0,180,216,0.06); border-radius:8px; padding:8px; text-align:center; }
.td-scorecard-stat-label { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:rgba(248,250,252,0.35); }
.td-scorecard-stat-value { font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:900; color:#00b4d8; }
`;

export default function TeamDashboard() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [sportProfiles, setSportProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [browsedTeams, setBrowsedTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('');

  const [showAddSport, setShowAddSport] = useState(false);
  const [addSportValue, setAddSportValue] = useState('CRICKET');
  const [addSportLoading, setAddSportLoading] = useState(false);

  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ awayTeamId: '', sport: '', scheduledAt: '' });
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeActionLoading, setChallengeActionLoading] = useState<string | null>(null);
  const cf = (k: string, v: string) => setChallengeForm((p) => ({ ...p, [k]: v }));

  const [matchDetail, setMatchDetail] = useState<any>(null);
  const [matchDetailLoading, setMatchDetailLoading] = useState(false);

  const [leagueInvites, setLeagueInvites] = useState<any[]>([]);
  const [leagueInviteLoading, setLeagueInviteLoading] = useState<string | null>(null);
  const [respondingInvite, setRespondingInvite] = useState<any>(null);
  const [leagueTeamName, setLeagueTeamName] = useState('');
  const [myLeagueSlots, setMyLeagueSlots] = useState<any[]>([]);

  const openMatchDetail = async (match: any) => {
    setMatchDetail({ _loading: true, ...match });
    setMatchDetailLoading(true);
    try {
      const res = await apiClient.get(`/matches/${match.id}`);
      setMatchDetail(res.data);
    } catch { setMatchDetail(match); }
    finally { setMatchDetailLoading(false); }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, profileRes] = await Promise.allSettled([
        apiClient.get('/teams'),
        apiClient.get('/users/profile'),
      ]);
      if (profileRes.status === 'fulfilled') {
        const pName = profileRes.value.data?.profile?.name || profileRes.value.data?.name || '';
        if (pName) setProfileName(pName);
      }
      const teamList = teamsRes.status === 'fulfilled' ? (teamsRes.value.data?.data || teamsRes.value.data || []) : [];
      const tl = Array.isArray(teamList) ? teamList : [];
      setTeams(tl);
      if (tl.length > 0) await loadTeamDetails(tl[0]);
      try { const br = await apiClient.get('/teams/browse'); setBrowsedTeams(br.data?.data || br.data || []); } catch {}
      try { const lr = await apiClient.get('/league-auctions/my/invitations'); setLeagueInvites(lr.data || []); } catch {}
      try { const slotRes = await apiClient.get('/league-auctions/my/teams'); setMyLeagueSlots(slotRes.data || []); } catch {}
    } catch (err) { console.error('Dashboard error:', err); }
    finally { setLoading(false); }
  };

  const handleLeagueInviteRespond = async (inv: any, accept: boolean) => {
    setLeagueInviteLoading(inv.id + (accept ? '_accept' : '_decline'));
    try {
      await apiClient.post(`/league-auctions/invitations/${inv.id}/respond`, {
        accept,
        leagueTeamName: accept ? leagueTeamName.trim() || inv.team_name : undefined,
      });
      setLeagueInvites((prev) => prev.filter((i) => i.id !== inv.id));
      setRespondingInvite(null);
      setLeagueTeamName('');
      showToast.success(accept ? 'Invitation accepted!' : 'Invitation declined');
    } catch (e: any) { showToast.error(e.response?.data?.error || 'Failed to respond'); }
    finally { setLeagueInviteLoading(null); }
  };

  const loadTeamDetails = async (team: any) => {
    setSelectedTeam(team);
    try {
      const [sportsRes, matchesRes] = await Promise.allSettled([
        apiClient.get(`/teams/${team.id}/sports`),
        apiClient.get(`/matches/team/${team.id}`),
      ]);
      if (sportsRes.status === 'fulfilled') setSportProfiles(sportsRes.value.data?.data || sportsRes.value.data || []);
      if (matchesRes.status === 'fulfilled') {
        const ml = matchesRes.value.data?.data || matchesRes.value.data || [];
        setMatches(Array.isArray(ml) ? ml : []);
      }
    } catch {}
  };

  const handleAddSport = async () => {
    if (!selectedTeam || !addSportValue) return;
    try {
      setAddSportLoading(true);
      await apiClient.post(`/teams/${selectedTeam.id}/sports`, { sport: addSportValue });
      const r = await apiClient.get(`/teams/${selectedTeam.id}/sports`);
      setSportProfiles(r.data?.data || r.data || []);
      setShowAddSport(false);
      showToast.success(`${addSportValue} added!`);
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to add sport'); }
    finally { setAddSportLoading(false); }
  };

  const handleRemoveSport = async (sport: string) => {
    if (!selectedTeam) return;
    try {
      await apiClient.delete(`/teams/${selectedTeam.id}/sports/${sport}`);
      setSportProfiles((p) => p.filter((s: any) => s.sport !== sport));
      showToast.success(`${sport} removed.`);
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to remove sport'); }
  };

  const handleSetPrimarySport = async (sport: string) => {
    if (!selectedTeam) return;
    try {
      await apiClient.put(`/teams/${selectedTeam.id}/primary-sport`, { sport });
      const r = await apiClient.get('/teams');
      const list = r.data?.data || r.data || [];
      setTeams(list);
      setSelectedTeam(list.find((t: any) => t.id === selectedTeam.id) || { ...selectedTeam, sport });
      showToast.success(`${sport} is now primary.`);
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const handleChallenge = async () => {
    if (!challengeForm.awayTeamId || !challengeForm.sport) { showToast.error('Please select an opponent and sport.'); return; }
    try {
      setChallengeLoading(true);
      await apiClient.post('/matches/direct', {
        homeTeamId: selectedTeam!.id,
        awayTeamId: challengeForm.awayTeamId,
        sport: challengeForm.sport,
        scheduledAt: challengeForm.scheduledAt || null,
      });
      showToast.success('Challenge sent!');
      setShowChallenge(false);
      setChallengeForm({ awayTeamId: '', sport: '', scheduledAt: '' });
      const r = await apiClient.get(`/matches/team/${selectedTeam!.id}`);
      setMatches(r.data?.data || r.data || []);
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to create match'); }
    finally { setChallengeLoading(false); }
  };

  const handleAcceptChallenge = async (matchId: string) => {
    try {
      setChallengeActionLoading(matchId + '_accept');
      await apiClient.post(`/matches/${matchId}/accept-challenge`);
      showToast.success('Challenge accepted!');
      const r = await apiClient.get(`/matches/team/${selectedTeam!.id}`);
      setMatches(r.data?.data || r.data || []);
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
    finally { setChallengeActionLoading(null); }
  };

  const handleDeclineChallenge = async (matchId: string) => {
    try {
      setChallengeActionLoading(matchId + '_decline');
      await apiClient.post(`/matches/${matchId}/decline-challenge`);
      showToast.success('Challenge declined.');
      const r = await apiClient.get(`/matches/team/${selectedTeam!.id}`);
      setMatches(r.data?.data || r.data || []);
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
    finally { setChallengeActionLoading(null); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const name = profileName || user?.name || user?.email?.split('@')[0] || 'Team Manager';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const wins = completedMatches.filter((m) => { const ih = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id; const hs = m.homeScore ?? m.home_score ?? 0; const as_ = m.awayScore ?? m.away_score ?? 0; return (ih && hs > as_) || (!ih && as_ > hs); }).length;
  const losses = completedMatches.filter((m) => { const ih = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id; const hs = m.homeScore ?? m.home_score ?? 0; const as_ = m.awayScore ?? m.away_score ?? 0; return (ih && hs < as_) || (!ih && as_ < hs); }).length;
  const draws = completedMatches.filter((m) => { const hs = m.homeScore ?? m.home_score ?? 0; const as_ = m.awayScore ?? m.away_score ?? 0; return hs === as_; }).length;
  const totalPlayers = teams.reduce((s: number, t: any) => s + (t.rosterCount || t.roster?.length || 0), 0);
  const existingSports = sportProfiles.map((sp: any) => sp.sport);
  const availableSports = ALL_SPORTS.filter((s) => !existingSports.includes(s));
  const challengeOpponents = browsedTeams.filter((t) => t.id !== selectedTeam?.id);

  const Spinner = () => (
    <svg className="td-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(2,8,23,0.3)" strokeWidth="4"/>
      <path fill="#020817" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );

  const renderMatchDetail = () => {
    if (!matchDetail) return null;
    const m = matchDetail;
    const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
    const ssd = m.score?.sportSpecificData || {};
    const homeInnings = ssd.home || {};
    const awayInnings = ssd.away || {};
    const hs = m.score?.homeScore ?? m.homeScore ?? m.home_score ?? 0;
    const as_ = m.score?.awayScore ?? m.awayScore ?? m.away_score ?? 0;
    const myScore = isHome ? hs : as_;
    const theirScore = isHome ? as_ : hs;
    const homeTeamName = m.homeTeam?.name || m.home_team_name || m.homeTeamName || 'Home';
    const awayTeamName = m.awayTeam?.name || m.away_team_name || m.awayTeamName || 'Away';
    const meta = SPORT_META[m.sport] || SPORT_META.FOOTBALL;
    const isCricket = m.sport === 'CRICKET';
    let result = '', resultBg = '', resultColor = '';
    if (m.status === 'COMPLETED') {
      if (myScore > theirScore)      { result = 'WIN';  resultBg = 'rgba(0,180,216,0.15)'; resultColor = '#00b4d8'; }
      else if (myScore < theirScore) { result = 'LOSS'; resultBg = 'rgba(239,68,68,0.15)'; resultColor = '#fca5a5'; }
      else                           { result = 'DRAW'; resultBg = 'rgba(248,250,252,0.08)'; resultColor = 'rgba(248,250,252,0.5)'; }
    }
    const dateStr = m.startTime
      ? new Date(m.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
    const statusStyle = MATCH_STATUS[m.status] || MATCH_STATUS.SCHEDULED;

    return (
      <div className="td-modal-overlay" onClick={() => setMatchDetail(null)}>
        <div className="td-modal td-modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="td-score-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{meta.icon}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: meta.accent }}>{m.sport}</span>
              </div>
              <button className="td-modal-close" onClick={() => setMatchDetail(null)}>✕</button>
            </div>
            <div className="td-score-teams">
              <div className="td-score-team">
                <div className="td-score-team-label">{isHome ? 'Your Team' : 'Opponent'}</div>
                <div className="td-score-team-name">{homeTeamName}</div>
                {isCricket && homeInnings.runs !== undefined
                  ? <div className="td-score-big">{homeInnings.runs}<span style={{ fontSize: 18, color: 'rgba(248,250,252,0.5)' }}>/{homeInnings.wickets ?? 0}</span></div>
                  : <div className="td-score-big">{hs}</div>
                }
                {isCricket && homeInnings.overs !== undefined && <div className="td-score-overs">{homeInnings.overs} overs</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="td-score-vs">vs</div>
                {result && <span className="td-result-chip" style={{ background: resultBg, color: resultColor }}>{result}</span>}
              </div>
              <div className="td-score-team">
                <div className="td-score-team-label">{isHome ? 'Opponent' : 'Your Team'}</div>
                <div className="td-score-team-name">{awayTeamName}</div>
                {isCricket && awayInnings.runs !== undefined
                  ? <div className="td-score-big">{awayInnings.runs}<span style={{ fontSize: 18, color: 'rgba(248,250,252,0.5)' }}>/{awayInnings.wickets ?? 0}</span></div>
                  : <div className="td-score-big">{as_}</div>
                }
                {isCricket && awayInnings.overs !== undefined && <div className="td-score-overs">{awayInnings.overs} overs</div>}
              </div>
            </div>
          </div>

          <div className="td-modal-body">
            {matchDetailLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span className="td-status" style={{ background: 'rgba(0,180,216,0.08)', color: 'rgba(248,250,252,0.5)', border: '1px solid rgba(0,180,216,0.12)' }}>📅 {dateStr}</span>
              <span className="td-status" style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.bg}` }}>
                <span className="td-status-dot" style={{ background: statusStyle.color }} />{statusStyle.label}
              </span>
              {m.tournamentId && <span className="td-status" style={{ background: 'rgba(0,180,216,0.08)', color: '#00b4d8', border: '1px solid rgba(0,180,216,0.2)' }}>🏆 Tournament</span>}
            </div>

            {isCricket && !matchDetailLoading && (homeInnings.runs !== undefined || awayInnings.runs !== undefined) && (
              <div>
                <div className="td-scorecard-title">Scorecard</div>
                {[
                  { label: homeTeamName, inn: homeInnings, tag: isHome ? 'Your Team' : 'Opponent' },
                  { label: awayTeamName, inn: awayInnings, tag: isHome ? 'Opponent' : 'Your Team' },
                ].map(({ label, inn, tag }) => inn.runs !== undefined ? (
                  <div key={label} className="td-scorecard" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc' }}>{label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 2 }}>{tag}</div>
                      </div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: '#00b4d8' }}>
                        {inn.runs}<span style={{ fontSize: 16, color: 'rgba(248,250,252,0.4)' }}>/{inn.wickets ?? 0}</span>
                      </div>
                    </div>
                    <div className="td-scorecard-grid">
                      {[['Overs', inn.overs ?? 0], ['Run Rate', inn.runRate ?? 0], ['Wickets', inn.wickets ?? 0]].map(([l, v]) => (
                        <div key={l as string} className="td-scorecard-stat">
                          <div className="td-scorecard-stat-label">{l}</div>
                          <div className="td-scorecard-stat-value">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null)}
              </div>
            )}

            {!isCricket && m.status === 'COMPLETED' && (
              <div className="td-scorecard">
                <div className="td-scorecard-title">Final Score</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{homeTeamName}</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 900, color: '#00b4d8' }}>{hs}</div>
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'rgba(248,250,252,0.2)' }}>—</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{awayTeamName}</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 900, color: '#00b4d8' }}>{as_}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="td-btn-row">
              <button onClick={() => setMatchDetail(null)} className="td-btn-ghost" style={{ flex: 1 }}>Close</button>
              <button onClick={() => { setMatchDetail(null); navigate(`/matches/${m.id}`); }} className="td-btn-solid" style={{ flex: 1 }}>
                Full Details →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{S}</style>

      <div style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
          <div className="td-space">

            {/* Hero */}
        <div className="td-hero">
          <div className="td-hero-grid" />
          <div className="td-hero-orb" style={{ width: 220, height: 220, background: 'radial-gradient(circle,rgba(0,119,182,0.25) 0%,transparent 70%)', top: -60, right: -40, animation: 'float 5s ease-in-out infinite' }} />
          <div className="td-hero-orb" style={{ width: 160, height: 160, background: 'radial-gradient(circle,rgba(0,180,216,0.1) 0%,transparent 70%)', bottom: -30, left: '30%', animation: 'float 7s ease-in-out infinite 1s' }} />
          <div className="td-hero-inner">
            <div>
              <p className="td-greeting">{greeting} 👋</p>
              <h1 className="td-hero-name">{name}</h1>
              <p className="td-hero-sub">Manage your teams, track performance, and challenge opponents.</p>
            </div>
            <div className="td-hero-btns">
              <button className="td-btn-ghost" onClick={() => selectedTeam && setShowChallenge(true)} disabled={!selectedTeam}>⚔️ Challenge Team</button>
              <Link to="/tournaments" className="td-btn-solid">Find Tournaments</Link>
            </div>
          </div>
        </div>

        {/* Team selector */}
        {teams.length > 1 && (
          <div className="td-team-selector-card">
            <div className="td-team-selector-label">Select Team to View</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {teams.map((t) => {
                const meta = SPORT_META[t.sport] || SPORT_META.FOOTBALL;
                return (
                  <button key={t.id} onClick={() => loadTeamDetails(t)}
                    className={`td-team-chip${selectedTeam?.id === t.id ? ' active' : ''}`}
                    style={selectedTeam?.id === t.id ? { borderColor: meta.border, color: meta.accent } : {}}>
                    {meta.icon} {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="td-stats-grid">
          {[
            { icon: '🛡️', label: 'My Teams',      value: teams.length },
            { icon: '🏃', label: 'Total Players',  value: totalPlayers },
            { icon: '✅', label: 'Wins',           value: wins },
            { icon: '📊', label: 'Matches Played', value: completedMatches.length },
          ].map((s) => (
            <div key={s.label} className="td-stat-card">
              <div className="td-stat-icon">{s.icon}</div>
              <div className="td-stat-value">{s.value}</div>
              <div className="td-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* W/L/D */}
        {completedMatches.length > 0 && (
          <div className="td-wld-grid">
            {[
              { icon: '🏆', label: 'Wins',   value: wins,   color: '#00b4d8' },
              { icon: '❌', label: 'Losses', value: losses, color: '#fca5a5' },
              { icon: '🤝', label: 'Draws',  value: draws,  color: 'rgba(248,250,252,0.45)' },
            ].map((s) => (
              <div key={s.label} className="td-wld-card">
                <div className="td-wld-icon">{s.icon}</div>
                <div className="td-wld-value" style={{ color: s.color }}>{s.value}</div>
                <div className="td-wld-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="td-2col">
          <div className="td-space">

            {/* League Slots */}
            {myLeagueSlots.length > 0 && (
              <div className="td-section">
                <div className="td-section-header">
                  <span className="td-section-title"><span className="td-section-icon">🔨</span>My League Auctions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myLeagueSlots.map((slot: any) => (
                    <div key={slot.league_team_id} className="td-league-row">
                      <div style={{ minWidth: 0 }}>
                        <div className="td-name">{slot.league_team_name}</div>
                        <div className="td-meta">🏆 {slot.tournament_name} · {slot.remaining_budget?.toLocaleString()} / {slot.budget?.toLocaleString()} pts</div>
                      </div>
                      <Link to={`/league-auctions/${slot.auction_id}`} className="td-league-open">Open →</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* League Invites */}
            {leagueInvites.length > 0 && (
              <div className="td-section">
                <div className="td-section-header">
                  <span className="td-section-title">
                    <span className="td-section-icon">🔨</span>
                    League Invitations
                    <span className="td-section-badge">{leagueInvites.length}</span>
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {leagueInvites.map((inv: any) => (
                    <div key={inv.id} className="td-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="td-name">🏆 {inv.tournament_name}</div>
                        <div className="td-meta">Team: {inv.team_name}{inv.inviter_name ? ` · By ${inv.inviter_name}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className="td-accept-btn" onClick={() => { setRespondingInvite(inv); setLeagueTeamName(inv.team_name || ''); }} disabled={!!leagueInviteLoading}>Accept</button>
                        <button className="td-decline-btn" onClick={() => handleLeagueInviteRespond(inv, false)} disabled={leagueInviteLoading === inv.id + '_decline'}>
                          {leagueInviteLoading === inv.id + '_decline' ? '...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Teams */}
            <div className="td-section">
              <div className="td-section-header">
                <span className="td-section-title"><span className="td-section-icon">🛡️</span>My Teams</span>
                <Link to="/teams" className="td-mini-btn">+ Create Team</Link>
              </div>
              {teams.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {teams.map((team: any) => {
                    const meta = SPORT_META[team.sport] || SPORT_META.FOOTBALL;
                    const isSel = selectedTeam?.id === team.id;
                    return (
                      <div key={team.id} className={`td-row clickable${isSel ? ' selected' : ''}`}
                        style={isSel ? { borderColor: meta.border, background: meta.bg } : {}}
                        onClick={() => loadTeamDetails(team)}>
                        <div className="td-sport-icon" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="td-name" style={isSel ? { color: meta.accent } : {}}>{team.name}</span>
                            {isSel && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: meta.accent }}>● Viewing</span>}
                          </div>
                          <div className="td-meta">{team.sport} · {team.rosterCount || team.roster?.length || 0} players</div>
                        </div>
                        <Link to="/teams" onClick={(e) => e.stopPropagation()} className="td-manage-btn">Manage →</Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="td-empty">
                  <div className="td-empty-icon">🛡️</div>
                  <div className="td-empty-title">No teams yet</div>
                  <div className="td-empty-sub">Create your first team to start recruiting players</div>
                  <Link to="/teams" className="td-btn-solid" style={{ marginTop: 8, fontSize: 12, padding: '9px 18px' }}>Create Team</Link>
                </div>
              )}
            </div>

            {/* Sport Profiles */}
            {selectedTeam && (
              <div className="td-section">
                <div className="td-section-header">
                  <span className="td-section-title"><span className="td-section-icon">🎯</span>Sports — {selectedTeam.name}</span>
                  {availableSports.length > 0 && (
                    <button className="td-mini-btn" onClick={() => { setAddSportValue(availableSports[0]); setShowAddSport(true); }}>+ Add Sport</button>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.35)', marginBottom: 14, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em' }}>
                  Primary: <strong style={{ color: '#00b4d8' }}>{selectedTeam.sport}</strong> · {sportProfiles.length} sport(s)
                </p>
                {sportProfiles.length === 0 ? (
                  <div className="td-empty" style={{ padding: '24px' }}>
                    <div className="td-empty-sub">No sport profiles yet.</div>
                    <button className="td-mini-btn" onClick={() => { setAddSportValue(ALL_SPORTS[0]); setShowAddSport(true); }}>+ Add first sport</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {sportProfiles.map((sp: any) => {
                      const meta = SPORT_META[sp.sport] || SPORT_META.FOOTBALL;
                      const isPrimary = sp.sport === selectedTeam.sport;
                      return (
                        <div key={sp.id || sp.sport} className="td-row"
                          style={{ borderColor: isPrimary ? meta.border : 'rgba(0,180,216,0.1)', background: isPrimary ? meta.bg : 'rgba(0,180,216,0.03)' }}>
                          <div className="td-sport-icon" style={{ width: 36, height: 36, background: meta.bg, border: `1px solid ${meta.border}`, fontSize: 18 }}>{meta.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: isPrimary ? meta.accent : '#f8fafc' }}>{sp.sport}</div>
                            {isPrimary && <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.35)' }}>Primary</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {!isPrimary && <button onClick={() => handleSetPrimarySport(sp.sport)} style={{ padding: '4px 8px', borderRadius: 5, background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', color: '#00b4d8', fontSize: 11, cursor: 'pointer' }}>★</button>}
                            <button onClick={() => handleRemoveSport(sp.sport)} style={{ padding: '4px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 11, cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pending Challenges */}
            {selectedTeam && matches.some(m => m.status === 'PENDING_ACCEPTANCE') && (() => {
              const pending = matches.filter(m => m.status === 'PENDING_ACCEPTANCE');
              const received = pending.filter(m => (m.away_team_id || m.awayTeamId) === selectedTeam.id);
              const sent = pending.filter(m => (m.home_team_id || m.homeTeamId) === selectedTeam.id);
              if (!received.length && !sent.length) return null;
              return (
                <div className="td-section">
                  <div className="td-section-header">
                    <span className="td-section-title">
                      <span className="td-section-icon">📩</span>Pending Challenges
                      <span className="td-section-badge">{pending.length}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {received.map((match: any) => {
                      const meta = SPORT_META[match.sport] || SPORT_META.FOOTBALL;
                      return (
                        <div key={match.id} className="td-row" style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.05)' }}>
                          <div className="td-sport-icon" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>{meta.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div className="td-name">{match.home_team_name || match.homeTeamName || 'Opponent'} challenged you!</div>
                            <div className="td-meta">{match.sport}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="td-accept-btn" onClick={() => handleAcceptChallenge(match.id)} disabled={challengeActionLoading === match.id + '_accept'}>
                              {challengeActionLoading === match.id + '_accept' ? <><Spinner />...</> : '✓ Accept'}
                            </button>
                            <button className="td-decline-btn" onClick={() => handleDeclineChallenge(match.id)} disabled={challengeActionLoading === match.id + '_decline'}>
                              {challengeActionLoading === match.id + '_decline' ? '...' : 'Decline'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {sent.map((match: any) => {
                      const meta = SPORT_META[match.sport] || SPORT_META.FOOTBALL;
                      return (
                        <div key={match.id} className="td-row" style={{ borderColor: 'rgba(0,180,216,0.2)', background: 'rgba(0,180,216,0.05)' }}>
                          <div className="td-sport-icon" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>{meta.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div className="td-name">Sent to {match.away_team_name || match.awayTeamName || 'Opponent'}</div>
                            <div className="td-meta">{match.sport} · Waiting for response...</div>
                          </div>
                          <button className="td-decline-btn" onClick={() => handleDeclineChallenge(match.id)} disabled={challengeActionLoading === match.id + '_decline'}>
                            {challengeActionLoading === match.id + '_decline' ? '...' : 'Cancel'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Match History */}
            {selectedTeam && (
              <div className="td-section">
                <div className="td-section-header">
                  <span className="td-section-title"><span className="td-section-icon">⚔️</span>Match History</span>
                  <button className="td-mini-btn" onClick={() => setShowChallenge(true)}>+ Challenge</button>
                </div>
                {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').length === 0 ? (
                  <div className="td-empty">
                    <div className="td-empty-icon">⚔️</div>
                    <div className="td-empty-title">No matches yet</div>
                    <div className="td-empty-sub">Challenge another team or register for a tournament</div>
                    <button className="td-btn-solid" style={{ marginTop: 8, fontSize: 12, padding: '9px 18px' }} onClick={() => setShowChallenge(true)}>⚔️ Create Challenge</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').slice(0, 8).map((match: any) => {
                      const meta = SPORT_META[match.sport] || SPORT_META.FOOTBALL;
                      const isHome = match.homeTeamId === selectedTeam.id || match.home_team_id === selectedTeam.id;
                      const hs = match.homeScore ?? match.home_score ?? 0;
                      const as_ = match.awayScore ?? match.away_score ?? 0;
                      const myScore = isHome ? hs : as_;
                      const theirScore = isHome ? as_ : hs;
                      const opponentName = isHome ? (match.away_team_name || match.awayTeamName || 'Opponent') : (match.home_team_name || match.homeTeamName || 'Opponent');
                      const myTeamName  = isHome ? (match.home_team_name || match.homeTeamName || selectedTeam.name) : (match.away_team_name || match.awayTeamName || selectedTeam.name);
                      let result = '', resultBg = '', resultColor = '';
                      if (match.status === 'COMPLETED') {
                        if (myScore > theirScore)      { result = 'W'; resultBg = 'rgba(0,180,216,0.12)'; resultColor = '#00b4d8'; }
                        else if (myScore < theirScore) { result = 'L'; resultBg = 'rgba(239,68,68,0.12)'; resultColor = '#fca5a5'; }
                        else                           { result = 'D'; resultBg = 'rgba(248,250,252,0.06)'; resultColor = 'rgba(248,250,252,0.4)'; }
                      }
                      const statusStyle = MATCH_STATUS[match.status] || MATCH_STATUS.SCHEDULED;
                      const dateStr = match.created_at ? new Date(match.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A';
                      return (
                        <div key={match.id} className="td-row clickable" onClick={() => openMatchDetail(match)}>
                          <div className="td-sport-icon" style={{ width: 38, height: 38, background: meta.bg, border: `1px solid ${meta.border}`, fontSize: 18 }}>{meta.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {myTeamName} <span style={{ color: 'rgba(248,250,252,0.3)', fontWeight: 400 }}>vs</span> {opponentName}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 2 }}>📅 {dateStr} · {match.sport}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {match.status === 'COMPLETED' && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 900, color: '#f8fafc' }}>{myScore}–{theirScore}</span>}
                            {result && <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 900, background: resultBg, color: resultColor }}>{result}</span>}
                            <span className="td-status" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                            <svg width="14" height="14" fill="none" stroke="rgba(248,250,252,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                          </div>
                        </div>
                      );
                    })}
                    {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').length > 8 && (
                      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(248,250,252,0.3)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em', paddingTop: 4 }}>
                        + {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').length - 8} more matches
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="td-space">
            <div className="td-section">
              <div className="td-section-header">
                <span className="td-section-title"><span className="td-section-icon">⚡</span>Quick Actions</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '➕', label: 'Create Team',      desc: 'Start a new team',        href: '/teams',       onClick: null },
                  { icon: '🏆', label: 'Find Tournaments', desc: 'Register your team',      href: '/tournaments', onClick: null },
                  { icon: '⚔️', label: 'Challenge a Team', desc: 'Create a direct match',   href: null,           onClick: () => setShowChallenge(true) },
                  { icon: '🎯', label: 'Manage Sports',    desc: 'Add or switch sports',    href: null,           onClick: () => setShowAddSport(true)  },
                  { icon: '⚙️', label: 'Settings',         desc: 'Profile & team info',     href: '/profile',     onClick: null },
                ].map((action: any) => {
                  const inner = (
                    <>
                      <div className="td-action-icon">{action.icon}</div>
                      <div>
                        <div className="td-action-name">{action.label}</div>
                        <div className="td-action-desc">{action.desc}</div>
                      </div>
                      <svg className="td-action-arrow" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                    </>
                  );
                  return action.onClick
                    ? <button key={action.label} className="td-action-card" onClick={action.onClick}>{inner}</button>
                    : <Link key={action.label} to={action.href} className="td-action-card">{inner}</Link>;
                })}
              </div>
            </div>

            {selectedTeam && sportProfiles.length > 0 && (
              <div className="td-section">
                <span className="td-section-title" style={{ marginBottom: 14, display: 'flex' }}>Active Sports</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sportProfiles.map((sp: any) => {
                    const meta = SPORT_META[sp.sport] || SPORT_META.FOOTBALL;
                    const stats = sp.statistics || sp.stats || {};
                    const isPrimary = sp.sport === selectedTeam.sport;
                    return (
                      <div key={sp.id || sp.sport} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: meta.bg, border: `1px solid ${meta.border}` }}>
                        <span style={{ fontSize: 18 }}>{meta.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: meta.accent }}>{sp.sport}</div>
                          <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 1 }}>{stats.matchesPlayed || 0} played · {stats.wins || 0} wins</div>
                        </div>
                        {isPrimary && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.3)' }}>Primary</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Sport Modal */}
      {showAddSport && (
        <div className="td-modal-overlay" onClick={() => setShowAddSport(false)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-modal-header-gradient" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="td-modal-sub">Team Sports</div>
                <div className="td-modal-title">Add Sport to Team</div>
              </div>
              <button className="td-modal-close" onClick={() => setShowAddSport(false)}>✕</button>
            </div>
            <div className="td-modal-body">
              <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.5)' }}>Add a sport that <strong style={{ color: '#00b4d8' }}>{selectedTeam?.name}</strong> plays.</p>
              <div>
                <label className="td-label">Select Sport</label>
                <select value={addSportValue} onChange={(e) => setAddSportValue(e.target.value)} className="td-select">
                  {availableSports.map((s) => <option key={s} value={s}>{SPORT_META[s]?.icon} {s}</option>)}
                </select>
              </div>
              <div className="td-btn-row">
                <button className="td-btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddSport(false)}>Cancel</button>
                <button className="td-btn-solid" style={{ flex: 1 }} onClick={handleAddSport} disabled={addSportLoading}>
                  {addSportLoading ? <><Spinner />Adding...</> : '+ Add Sport'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* League accept modal */}
      {respondingInvite && (
        <div className="td-modal-overlay" onClick={() => setRespondingInvite(null)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-modal-header-gradient" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="td-modal-sub">League Invitation</div>
                <div className="td-modal-title">Accept Invitation</div>
              </div>
              <button className="td-modal-close" onClick={() => setRespondingInvite(null)}>✕</button>
            </div>
            <div className="td-modal-body">
              <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.5)' }}>Joining <strong style={{ color: '#00b4d8' }}>{respondingInvite.tournament_name}</strong>. Choose your league team name:</p>
              <div>
                <label className="td-label">League Team Name</label>
                <input type="text" placeholder={respondingInvite.team_name} value={leagueTeamName} onChange={(e) => setLeagueTeamName(e.target.value)} className="td-input" />
              </div>
              <div className="td-btn-row">
                <button className="td-btn-solid" style={{ flex: 1 }} onClick={() => handleLeagueInviteRespond(respondingInvite, true)} disabled={!!leagueInviteLoading}>
                  {leagueInviteLoading ? <><Spinner />...</> : '✅ Accept & Join'}
                </button>
                <button className="td-btn-ghost" style={{ flex: 0 }} onClick={() => setRespondingInvite(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Modal */}
      {showChallenge && selectedTeam && (
        <div className="td-modal-overlay" onClick={() => setShowChallenge(false)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-modal-header-gradient" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="td-modal-sub">Challenge Match</div>
                <div className="td-modal-title">{selectedTeam.name} vs ?</div>
              </div>
              <button className="td-modal-close" onClick={() => setShowChallenge(false)}>✕</button>
            </div>
            <div className="td-modal-body">
              <div>
                <label className="td-label">Opponent Team *</label>
                <select value={challengeForm.awayTeamId} onChange={(e) => cf('awayTeamId', e.target.value)} className="td-select">
                  <option value="">Select opponent team...</option>
                  {challengeOpponents.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.sport})</option>)}
                </select>
              </div>
              <div>
                <label className="td-label">Sport *</label>
                <select value={challengeForm.sport} onChange={(e) => cf('sport', e.target.value)} className="td-select">
                  <option value="">Select sport...</option>
                  {(sportProfiles.length > 0 ? sportProfiles : ALL_SPORTS.map((s) => ({ sport: s }))).map((sp: any) => (
                    <option key={sp.sport} value={sp.sport}>{SPORT_META[sp.sport]?.icon} {sp.sport}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="td-label">Scheduled Date (Optional)</label>
                <input type="datetime-local" value={challengeForm.scheduledAt} onChange={(e) => cf('scheduledAt', e.target.value)} className="td-input" />
              </div>
              <div className="td-btn-row">
                <button className="td-btn-ghost" style={{ flex: 1 }} onClick={() => setShowChallenge(false)}>Cancel</button>
                <button className="td-btn-solid" style={{ flex: 1 }} onClick={handleChallenge} disabled={challengeLoading}>
                  {challengeLoading ? <><Spinner />Creating...</> : '⚔️ Send Challenge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Detail Modal */}
      {renderMatchDetail()}
        </div>
      </div>
    </>
  );
}