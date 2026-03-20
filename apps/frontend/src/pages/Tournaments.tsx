import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

const SPORT_META: Record<string, { icon: string; accent: string; border: string; bg: string }> = {
  CRICKET:    { icon: '🏏', accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.07)' },
  FOOTBALL:   { icon: '⚽', accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.07)'   },
  KABADDI:    { icon: '🤼', accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.07)'  },
  VOLLEYBALL: { icon: '🏐', accent: '#caf0f8', border: 'rgba(202,240,248,0.25)', bg: 'rgba(202,240,248,0.05)' },
  BASKETBALL: { icon: '🏀', accent: '#0096c7', border: 'rgba(0,150,199,0.3)',    bg: 'rgba(0,150,199,0.07)'   },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  REGISTRATION_OPEN:   { bg: 'rgba(0,180,216,0.1)',    color: '#00b4d8', dot: '#00b4d8', label: 'Registration Open'   },
  REGISTRATION_CLOSED: { bg: 'rgba(0,119,182,0.1)',    color: '#0077b6', dot: '#0077b6', label: 'Registration Closed' },
  ONGOING:             { bg: 'rgba(0,180,216,0.1)',    color: '#00b4d8', dot: '#00b4d8', label: 'Ongoing'             },
  IN_PROGRESS:         { bg: 'rgba(0,180,216,0.1)',    color: '#00b4d8', dot: '#00b4d8', label: 'In Progress'         },
  AUCTION_PENDING:     { bg: 'rgba(251,191,36,0.1)',   color: '#fbbf24', dot: '#fbbf24', label: '🔨 Auction Pending'  },
  COMPLETED:           { bg: 'rgba(248,250,252,0.06)', color: 'rgba(248,250,252,0.4)', dot: 'rgba(248,250,252,0.3)', label: 'Completed' },
  ACTIVE:              { bg: 'rgba(0,180,216,0.1)',    color: '#00b4d8', dot: '#00b4d8', label: 'Active'              },
  UPCOMING:            { bg: 'rgba(144,224,239,0.1)',  color: '#90e0ef', dot: '#90e0ef', label: 'Upcoming'            },
  CANCELLED:           { bg: 'rgba(239,68,68,0.1)',    color: '#fca5a5', dot: '#ef4444', label: 'Cancelled'           },
  DRAFT:               { bg: 'rgba(248,250,252,0.05)', color: 'rgba(248,250,252,0.3)', dot: 'rgba(248,250,252,0.25)', label: 'Draft' },
};

const getEffectiveStatusKey = (t: any): string => {
  const dbStatus = t.status || 'UPCOMING';
  if (['COMPLETED', 'CANCELLED', 'DRAFT', 'IN_PROGRESS'].includes(dbStatus)) return dbStatus;
  const now = Date.now();
  const dates = t.dates || {};
  const startDate   = dates.startDate   || t.startDate;
  const endDate     = dates.endDate     || t.endDate;
  const regDeadline = dates.registrationDeadline || t.registrationDeadline;
  if (endDate     && now > new Date(endDate).getTime())     return 'COMPLETED';
  if (startDate   && now >= new Date(startDate).getTime())  return 'ONGOING';
  if (regDeadline && now > new Date(regDeadline).getTime()) return 'REGISTRATION_CLOSED';
  return dbStatus;
};

const SPORT_ROLES: Record<string, string[]> = {
  CRICKET:    ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'],
  FOOTBALL:   ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'],
  KABADDI:    ['RAIDER', 'DEFENDER', 'ALL_ROUNDER'],
  VOLLEYBALL: ['SETTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'LIBERO'],
  BASKETBALL: ['POINT_GUARD', 'SHOOTING_GUARD', 'SMALL_FORWARD', 'POWER_FORWARD', 'CENTER'],
};

const EXPERIENCE_OPTIONS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'];
const toLocaleDateStr = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const S = `
@keyframes spin   { to { transform:rotate(360deg); } }
@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

.tn-root { min-height:100vh; }
.tn-main { max-width:1280px; margin:0 auto; padding:32px 24px; display:flex; flex-direction:column; gap:20px; }

.tn-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.tn-title  { font-family:'Barlow Condensed',sans-serif; font-size:36px; font-weight:900; color:#f8fafc; text-transform:uppercase; letter-spacing:0.02em; line-height:1; margin-bottom:6px; }
.tn-sub    { font-size:14px; color:rgba(248,250,252,0.45); font-weight:300; }

.tn-create-btn {
  padding:10px 20px; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
  box-shadow:0 0 20px rgba(0,180,216,0.4); transition:transform 120ms,box-shadow 120ms,filter 120ms; position:relative; overflow:hidden;
}
.tn-create-btn:hover { transform:translateY(-1px); box-shadow:0 0 32px rgba(0,180,216,0.55); filter:brightness(1.08); }

.tn-error { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:10px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); color:#fca5a5; font-size:13px; }

.tn-tabs { display:flex; gap:4px; background:rgba(0,180,216,0.06); border:1px solid rgba(0,180,216,0.12); padding:4px; border-radius:10px; width:fit-content; }
.tn-tab  { padding:8px 18px; border-radius:7px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; border:none; cursor:pointer; transition:all 150ms; display:flex; align-items:center; gap:6px; }
.tn-tab.active { background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; }
.tn-tab.idle   { background:transparent; color:rgba(248,250,252,0.45); }
.tn-tab-count  { padding:1px 7px; border-radius:9999px; font-size:10px; font-weight:900; }
.tn-tab.active .tn-tab-count { background:rgba(2,8,23,0.2); color:#020817; }
.tn-tab.idle   .tn-tab-count { background:rgba(0,180,216,0.12); color:#00b4d8; }

.tn-filters { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:20px; backdrop-filter:blur(12px); }
.tn-filters-grid { display:grid; grid-template-columns:1fr; gap:14px; }
@media(min-width:768px){ .tn-filters-grid { grid-template-columns:2fr 1fr 1fr; } }
.tn-filter-label { display:block; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.45); margin-bottom:7px; }
.tn-input, .tn-select {
  width:100%; padding:10px 14px; border-radius:8px; font-family:'Barlow',sans-serif; font-size:13px; color:#f8fafc;
  background:rgba(10,22,40,0.8); border:1px solid rgba(0,180,216,0.15); outline:none;
  transition:border-color 120ms,background 120ms,box-shadow 120ms; -webkit-appearance:none; box-sizing:border-box;
}
.tn-input::placeholder { color:rgba(248,250,252,0.22); }
.tn-input:focus,.tn-select:focus { border-color:rgba(0,180,216,0.55); background:rgba(0,180,216,0.06); box-shadow:0 0 0 3px rgba(0,180,216,0.12); }
.tn-select option { background:#020817; color:#f8fafc; }

.tn-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }

.tn-card { border-radius:14px; overflow:hidden; background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); backdrop-filter:blur(12px); display:flex; flex-direction:column; transition:transform 220ms,border-color 220ms,box-shadow 220ms; }
.tn-card:hover { transform:translateY(-4px); border-color:rgba(0,180,216,0.3); box-shadow:0 0 28px rgba(0,180,216,0.1); }

.tn-card-header { padding:20px; background:linear-gradient(135deg,rgba(3,4,94,0.9),rgba(0,119,182,0.6)); border-bottom:1px solid rgba(0,180,216,0.15); position:relative; overflow:hidden; }
.tn-card-header-orb { position:absolute; width:70px; height:70px; border-radius:50%; background:rgba(0,180,216,0.1); top:-15px; right:-15px; }
.tn-card-header-inner { position:relative; z-index:10; display:flex; align-items:flex-start; justify-content:space-between; }
.tn-card-icon { width:48px; height:48px; border-radius:10px; background:rgba(0,180,216,0.15); border:1px solid rgba(0,180,216,0.3); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
.tn-card-name { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:0.03em; color:#f8fafc; line-height:1.1; }
.tn-card-venue { font-size:11px; color:rgba(248,250,252,0.45); margin-top:3px; }
.tn-host-chip { padding:3px 8px; border-radius:4px; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; background:rgba(0,180,216,0.2); border:1px solid rgba(0,180,216,0.3); color:#00b4d8; flex-shrink:0; }

.tn-card-body { padding:16px; flex:1; display:flex; flex-direction:column; gap:12px; }
.tn-badges { display:flex; flex-wrap:wrap; gap:6px; }
.tn-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:4px; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; }
.tn-badge-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }

.tn-details { display:flex; flex-direction:column; gap:5px; }
.tn-detail  { display:flex; align-items:center; gap:8px; font-size:12px; color:rgba(248,250,252,0.45); }
.tn-detail strong { color:rgba(248,250,252,0.7); }
.tn-progress-track { flex:1; height:4px; border-radius:9999px; background:rgba(0,180,216,0.1); overflow:hidden; }
.tn-progress-bar   { height:100%; border-radius:9999px; background:linear-gradient(90deg,#0077b6,#00b4d8); box-shadow:0 0 6px rgba(0,180,216,0.4); }

.tn-card-actions { margin-top:auto; display:flex; flex-direction:column; gap:6px; }
.tn-action-primary {
  width:100%; padding:10px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:6px;
  box-shadow:0 0 14px rgba(0,180,216,0.3); transition:transform 120ms,box-shadow 120ms,filter 120ms;
}
.tn-action-primary:hover { transform:translateY(-1px); box-shadow:0 0 22px rgba(0,180,216,0.5); filter:brightness(1.08); }
.tn-action-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
.tn-action-ghost {
  width:100%; padding:10px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.2); color:#00b4d8; cursor:pointer;
  transition:background 120ms,border-color 120ms;
}
.tn-action-ghost:hover { background:rgba(0,180,216,0.14); border-color:rgba(0,180,216,0.35); }
.tn-action-registered { width:100%; padding:10px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.2); color:#00b4d8; text-align:center; }
.tn-action-restrict  { width:100%; padding:10px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; background:rgba(0,180,216,0.04); border:1px dashed rgba(0,180,216,0.15); color:rgba(0,180,216,0.5); text-align:center; }
.tn-action-muted     { width:100%; padding:10px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; background:rgba(248,250,252,0.04); border:1px dashed rgba(248,250,252,0.1); color:rgba(248,250,252,0.3); text-align:center; }

.tn-empty { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:48px 32px; text-align:center; backdrop-filter:blur(12px); }
.tn-empty-icon  { font-size:40px; opacity:0.3; margin-bottom:14px; }
.tn-empty-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.04em; color:rgba(248,250,252,0.6); margin-bottom:6px; }
.tn-empty-sub   { font-size:13px; color:rgba(248,250,252,0.3); }

.tn-modal-overlay { position:fixed; inset:0; background:rgba(2,8,23,0.88); display:flex; align-items:center; justify-content:center; z-index:50; padding:16px; backdrop-filter:blur(10px); }
.tn-modal { background:rgba(10,22,40,0.97); border:1px solid rgba(0,180,216,0.25); border-radius:18px; box-shadow:0 8px 40px rgba(3,4,94,0.7),0 0 40px rgba(0,180,216,0.08); backdrop-filter:blur(20px); width:100%; animation:fadeUp 200ms ease both; }
.tn-modal-sm { max-width:480px; overflow:hidden; }
.tn-modal-md { max-width:540px; overflow:hidden; }
.tn-modal-lg { max-width:560px; max-height:90vh; overflow-y:auto; }

.tn-modal-hdr { padding:20px 24px; background:linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.5)); border-bottom:1px solid rgba(0,180,216,0.15); }
.tn-modal-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:0.03em; color:#f8fafc; }
.tn-modal-sub   { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(0,180,216,0.7); margin-bottom:4px; }
.tn-modal-venue { font-size:12px; color:rgba(248,250,252,0.4); margin-top:3px; }
.tn-modal-close { width:30px; height:30px; border-radius:6px; background:rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.2); color:rgba(248,250,252,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 120ms,color 120ms; }
.tn-modal-close:hover { background:rgba(0,180,216,0.18); color:#f8fafc; }
.tn-modal-body { padding:24px; display:flex; flex-direction:column; gap:14px; }

.tn-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.tn-detail-cell { padding:10px 14px; border-radius:8px; background:rgba(0,180,216,0.04); border:1px solid rgba(0,180,216,0.1); }
.tn-detail-cell-label { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.35); margin-bottom:4px; display:flex; align-items:center; gap:5px; }
.tn-detail-cell-value { font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:0.02em; color:#f8fafc; }

.tn-cap-bar { background:rgba(0,180,216,0.1); border-radius:9999px; height:6px; overflow:hidden; }
.tn-cap-fill { height:100%; border-radius:9999px; background:linear-gradient(90deg,#0077b6,#00b4d8); box-shadow:0 0 8px rgba(0,180,216,0.4); transition:width 0.5s; }

.tn-field-label { display:block; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.45); margin-bottom:7px; }
.tn-field-input, .tn-field-select, .tn-field-textarea {
  width:100%; padding:10px 14px; border-radius:8px; font-family:'Barlow',sans-serif; font-size:13px; color:#f8fafc;
  background:rgba(10,22,40,0.8); border:1px solid rgba(0,180,216,0.15); outline:none;
  transition:border-color 120ms,background 120ms,box-shadow 120ms; -webkit-appearance:none; box-sizing:border-box;
}
.tn-field-input::placeholder,.tn-field-textarea::placeholder { color:rgba(248,250,252,0.22); }
.tn-field-input:focus,.tn-field-select:focus,.tn-field-textarea:focus { border-color:rgba(0,180,216,0.55); background:rgba(0,180,216,0.06); box-shadow:0 0 0 3px rgba(0,180,216,0.12); }
.tn-field-select option { background:#020817; color:#f8fafc; }
.tn-field-textarea { resize:none; }
.tn-field-hint { font-size:11px; color:rgba(251,191,36,0.8); margin-top:5px; }

.tn-form-2col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.tn-btn-row   { display:flex; gap:10px; }

.tn-btn-primary {
  flex:1; padding:11px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
  background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
  box-shadow:0 0 16px rgba(0,180,216,0.35); transition:transform 120ms,box-shadow 120ms,filter 120ms;
  display:flex; align-items:center; justify-content:center; gap:6px;
}
.tn-btn-primary:hover { transform:translateY(-1px); box-shadow:0 0 24px rgba(0,180,216,0.5); filter:brightness(1.08); }
.tn-btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
.tn-btn-ghost {
  flex:1; padding:11px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  background:transparent; color:rgba(248,250,252,0.4); border:1px solid rgba(0,180,216,0.15); cursor:pointer;
  transition:background 120ms,border-color 120ms,color 120ms;
}
.tn-btn-ghost:hover { background:rgba(0,180,216,0.06); border-color:rgba(0,180,216,0.3); color:#f8fafc; }

.tn-team-radio {
  display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:8px; cursor:pointer;
  border:1px solid rgba(0,180,216,0.12); background:rgba(0,180,216,0.04); transition:border-color 150ms,background 150ms;
}
.tn-team-radio.checked { border-color:rgba(0,180,216,0.35); background:rgba(0,180,216,0.1); }
.tn-team-name { font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:0.03em; color:#f8fafc; }
.tn-team-meta { font-size:11px; color:rgba(248,250,252,0.35); margin-top:2px; }

.tn-fee-card { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:8px; background:rgba(0,180,216,0.06); border:1px solid rgba(0,180,216,0.2); }
.tn-fee-label { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.45); }
.tn-fee-value { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:900; color:#00b4d8; }

.tn-step-indicators { display:flex; align-items:center; gap:6px; margin-top:14px; }
.tn-step-dot   { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:900; transition:all 150ms; }
.tn-step-label { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:rgba(248,250,252,0.4); }
.tn-step-line  { flex:1; height:1px; background:rgba(0,180,216,0.2); border-radius:9999px; }

.tn-success-icon { width:64px; height:64px; border-radius:50%; background:rgba(0,180,216,0.12); border:1px solid rgba(0,180,216,0.25); display:flex; align-items:center; justify-content:center; margin:0 auto; font-size:28px; }
.tn-league-info { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; border-radius:8px; background:rgba(0,180,216,0.05); border:1px solid rgba(0,180,216,0.15); }

.tn-spinner { animation:spin 0.8s linear infinite; }
`;

function Tournaments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const manageId = searchParams.get('manage');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeringTournament, setRegisteringTournament] = useState<any | null>(null);
  const [registerStep, setRegisterStep] = useState<'details' | 'payment' | 'done'>('details');
  const [registerForm, setRegisterForm] = useState({ role: '', experience: 'BEGINNER', preferredPosition: '', additionalInfo: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const rf = (field: string, value: string) => setRegisterForm((p) => ({ ...p, [field]: value }));
  const [myRegTeams, setMyRegTeams] = useState<any[]>([]);
  const [selectedRegTeamId, setSelectedRegTeamId] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    name: '', sport: 'CRICKET', format: 'KNOCKOUT', competitionType: 'TOURNAMENT',
    venue: '', startDate: '', endDate: '', registrationDeadline: '', registrationFee: 0, teamCapacity: 16,
  });
  const cf = (field: string, value: any) => setCreateForm((p) => ({ ...p, [field]: value }));
  const [auctionMap, setAuctionMap] = useState<Record<string, { id: string; auctionStatus: string }>>({});
  const [showAuctionSetup, setShowAuctionSetup] = useState(false);
  const [auctionSetupTournament, setAuctionSetupTournament] = useState<any | null>(null);
  const [auctionSetupForm, setAuctionSetupForm] = useState({ teamBudget: 1000, bidIncrement: 50, bidTimeout: 30, minSquadSize: 11, maxSquadSize: 15 });
  const [creatingAuction, setCreatingAuction] = useState(false);
  const af = (field: string, value: any) => setAuctionSetupForm((p) => ({ ...p, [field]: value }));

  const Spinner = ({ dark }: { dark?: boolean }) => (
    <svg className="tn-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={dark ? 'rgba(2,8,23,0.3)' : 'rgba(0,180,216,0.2)'} strokeWidth="4"/>
      <path fill={dark ? '#020817' : '#00b4d8'} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );

  const handleStartAuction = async () => {
    if (!auctionSetupTournament) return;
    setCreatingAuction(true);
    try {
      const r = await apiClient.post(`/league-auctions/tournament/${auctionSetupTournament.id}/create`, auctionSetupForm);
      const auction = r.data?.data || r.data;
      setAuctionMap(prev => ({ ...prev, [auctionSetupTournament.id]: { id: auction.id, auctionStatus: auction.status || 'SETUP' } }));
      setShowAuctionSetup(false);
      navigate(`/league-auctions/${auction.id}`);
    } catch (e: any) {
      alert(e.response?.data?.error || e.response?.data?.message || 'Failed to create auction');
    } finally { setCreatingAuction(false); }
  };

  const handleRegisterOpen = async (t: any) => {
    setRegisteringTournament(t); setRegisterStep('details');
    setRegisterForm({ role: '', experience: 'BEGINNER', preferredPosition: '', additionalInfo: '' });
    setSelectedRegTeamId('');
    if (user?.role === 'TEAM') {
      try { const r = await apiClient.get('/teams'); const teams = r.data?.data || r.data || []; setMyRegTeams(teams); if (teams.length > 0) setSelectedRegTeamId(teams[0].id); }
      catch { setMyRegTeams([]); }
    }
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = async () => {
    const t = registeringTournament;
    try {
      setRegisteringId(t.id);
      if (user?.role === 'TEAM') {
        if (!selectedRegTeamId) { alert('Please select a team.'); return; }
        await apiClient.post(`/tournaments/${t.id}/register`, { teamId: selectedRegTeamId });
      } else {
        if (!registerForm.role) { alert('Please select your playing role.'); return; }
        await apiClient.post(`/tournaments/${t.id}/register`, { playerDetails: registerForm });
      }
      if (Number(t.registrationFee) > 0) setRegisterStep('payment');
      else { setRegisterStep('done'); fetchTournaments(user); }
    } catch (err: any) { alert(err.response?.data?.error?.message || 'Registration failed.'); }
    finally { setRegisteringId(null); }
  };

  const handlePayment = async () => {
    const t = registeringTournament;
    try {
      setPaymentLoading(true);
      const res = await apiClient.post('/payments/initiate', { tournamentId: t.id, amount: t.registrationFee });
      const { orderId, amount, currency, keyId } = res.data.data;
      const loadRazorpay = () => new Promise<void>((resolve) => {
        if ((window as any).Razorpay) { resolve(); return; }
        const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = () => resolve(); document.body.appendChild(s);
      });
      await loadRazorpay();
      const rzp = new (window as any).Razorpay({
        key: keyId, amount, currency, order_id: orderId, name: 'Score Ocean',
        description: `Registration fee for ${t.name}`,
        handler: async (response: any) => {
          try { await apiClient.post('/payments/verify', { orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }); setRegisterStep('done'); fetchTournaments(user); }
          catch { alert('Payment verification failed.'); }
        },
        prefill: { email: user?.email || '' }, theme: { color: '#00b4d8' },
      });
      rzp.open();
    } catch (err: any) {
      if (err.response?.status === 503) { alert('Payment gateway not configured (dev mode).'); setShowRegisterModal(false); fetchTournaments(user); }
      else alert(err.response?.data?.error?.message || 'Payment initiation failed.');
    } finally { setPaymentLoading(false); }
  };

  const handlePublish = async (id: string) => {
    try { await apiClient.post(`/tournaments/${id}/publish`); fetchTournaments(user); }
    catch (err: any) { alert(err.response?.data?.error?.message || 'Failed to publish'); }
  };

  const handleCreateTournament = async () => {
    if (!createForm.name || !createForm.venue || !createForm.startDate || !createForm.endDate || !createForm.registrationDeadline) { alert('Please fill in all required fields.'); return; }
    if (new Date(createForm.registrationDeadline) >= new Date(createForm.startDate)) { alert('Registration deadline must be before start date.'); return; }
    if (new Date(createForm.endDate) <= new Date(createForm.startDate)) { alert('End date must be after start date.'); return; }
    try {
      setCreating(true);
      await apiClient.post('/tournaments', {
        name: createForm.name, sport: createForm.sport, format: createForm.format, competitionType: createForm.competitionType,
        venue: createForm.venue,
        dates: { startDate: new Date(createForm.startDate), endDate: new Date(createForm.endDate) },
        registrationDeadline: new Date(createForm.registrationDeadline),
        registrationFee: Number(createForm.registrationFee), teamCapacity: Number(createForm.teamCapacity),
        rules: { matchDuration: 90, pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', sport: 'CRICKET', format: 'KNOCKOUT', competitionType: 'TOURNAMENT', venue: '', startDate: '', endDate: '', registrationDeadline: '', registrationFee: 0, teamCapacity: 16 });
      fetchTournaments(user);
    } catch (err: any) { alert(err.response?.data?.error?.message || 'Failed to create tournament'); }
    finally { setCreating(false); }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user'); const accessToken = localStorage.getItem('accessToken');
    if (!storedUser || !accessToken) { navigate('/login'); return; }
    const parsedUser = JSON.parse(storedUser); setUser(parsedUser); fetchTournaments(parsedUser);
  }, [navigate]);

  useEffect(() => { if (user) fetchTournaments(user); }, [searchQuery, sportFilter, statusFilter]);

  useEffect(() => {
    const leagueTournaments = allTournaments.filter((t: any) => t.format === 'LEAGUE' || t.competitionType === 'LEAGUE');
    leagueTournaments.forEach(async (t: any) => {
      if (auctionMap[t.id]) return;
      try { const r = await apiClient.get(`/league-auctions/tournament/${t.id}`); const auction = r.data?.data || r.data; if (auction?.id) setAuctionMap(prev => ({ ...prev, [t.id]: { id: auction.id, auctionStatus: auction.status || 'SETUP' } })); }
      catch {}
    });
  }, [allTournaments]);

  useEffect(() => {
    if (!manageId) return;
    const all = [...allTournaments, ...myTournaments];
    const found = all.find((t: any) => t.id === manageId);
    if (found) { setSelectedTournament(found); setActiveTab('my'); }
  }, [manageId, allTournaments, myTournaments]);

  const fetchTournaments = async (currentUser: any) => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery) params.q = searchQuery;
      if (sportFilter) params.sport = sportFilter;
      if (statusFilter) params.status = statusFilter;
      const r = await apiClient.get('/tournaments', { params: { ...params, includeDrafts: true } });
      const list = r.data?.data || r.data || [];
      setAllTournaments(list.filter((t: any) => t.status !== 'DRAFT'));
      setMyTournaments(list.filter((t: any) =>
        t.hostId === currentUser.id || t.host_id === currentUser.id ||
        t.registrations?.some((reg: any) => reg.playerId === currentUser.id || reg.team?.members?.some((m: any) => m.id === currentUser.id))));
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load tournaments'); }
    finally { setLoading(false); }
  };

  const isRegistered = (t: any) => {
    if (!user) return false;
    const isLeague = t.format === 'LEAGUE' || t.competitionType === 'LEAGUE';
    if (isLeague) return t.registrations?.some((reg: any) => reg.playerId === user.id || reg.player?.id === user.id);
    return t.registrations?.some((reg: any) => reg.team?.members?.some((m: any) => m.id === user.id));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading tournaments...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const renderCard = (t: any) => {
    const meta = SPORT_META[t.sport] || SPORT_META.FOOTBALL;
    const statusKey = getEffectiveStatusKey(t);
    const isLeague = t.format === 'LEAGUE' || t.competitionType === 'LEAGUE';
    const auctionEntry = auctionMap[t.id];
    const displayStatusKey = (isLeague && statusKey === 'ONGOING' && auctionEntry?.auctionStatus !== 'COMPLETED') ? 'AUCTION_PENDING' : statusKey;
    const ss = STATUS_STYLE[displayStatusKey] || STATUS_STYLE.UPCOMING;
    const registered = isRegistered(t);
    const isHost = t.hostId === user?.id || t.host_id === user?.id;
    const userRole = user?.role;
    const canUserRegisterThisType = userRole === 'PLAYER' ? isLeague : userRole === 'TEAM' ? !isLeague : false;
    const isOpen = (statusKey === 'REGISTRATION_OPEN' || statusKey === 'UPCOMING' || statusKey === 'ACTIVE') && !['ONGOING', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED'].includes(statusKey);
    const canRegister = isOpen && !registered && !isHost && canUserRegisterThisType;
    const showTypeRestriction = isOpen && !registered && !isHost && !canUserRegisterThisType && userRole !== 'ORGANIZATION' && userRole !== 'ADMIN';
    const dates = t.dates || {};
    const startDate = dates.startDate || t.startDate;
    const endDate   = dates.endDate   || t.endDate;
    const capacity = t.teamCapacity || t.maxTeams || '—';
    const registrations = t.registrations?.length || t.currentTeams || 0;
    const fee = t.registrationFee != null ? `₹${t.registrationFee.toLocaleString('en-IN')}` : 'Free';

    return (
      <div key={t.id} className="tn-card">
        <div className="tn-card-header">
          <div className="tn-card-header-orb" />
          <div className="tn-card-header-inner">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div className="tn-card-icon" style={{ borderColor: meta.border, background: meta.bg }}>{meta.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div className="tn-card-name">{t.name}</div>
                <div className="tn-card-venue">{t.venue || 'Venue TBD'}</div>
              </div>
            </div>
            {isHost && <span className="tn-host-chip">Host</span>}
          </div>
        </div>

        <div className="tn-card-body">
          <div className="tn-badges">
            <span className="tn-badge" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.bg}` }}>
              {displayStatusKey !== 'AUCTION_PENDING' && <span className="tn-badge-dot" style={{ background: ss.dot }} />}
              {ss.label}
            </span>
            <span className="tn-badge" style={{ background: 'rgba(0,180,216,0.08)', color: '#00b4d8', border: '1px solid rgba(0,180,216,0.15)' }}>
              {isLeague ? '👤 League' : '👥 Tournament'}
            </span>
            {t.format && t.format !== 'LEAGUE' && (
              <span className="tn-badge" style={{ background: 'rgba(248,250,252,0.05)', color: 'rgba(248,250,252,0.4)', border: '1px solid rgba(248,250,252,0.08)' }}>{t.format}</span>
            )}
          </div>

          <div className="tn-details">
            {startDate && (
              <div className="tn-detail">
                <span>📅</span>
                <span>{toLocaleDateStr(startDate)}{endDate ? ` – ${toLocaleDateStr(endDate)}` : ''}</span>
              </div>
            )}
            <div className="tn-detail">
              <span>👥</span>
              <span>{registrations} / {capacity} teams</span>
              <div className="tn-progress-track">
                <div className="tn-progress-bar" style={{ width: typeof capacity === 'number' ? `${Math.min(100, (registrations / capacity) * 100)}%` : '0%' }} />
              </div>
            </div>
            <div className="tn-detail">
              <span>💰</span>
              <strong>{fee} registration fee</strong>
            </div>
          </div>

          <div className="tn-card-actions">
            {registered ? (
              <div className="tn-action-registered">✓ Registered</div>
            ) : canRegister ? (
              <button className="tn-action-primary" onClick={() => handleRegisterOpen(t)} disabled={registeringId === t.id}>
                {registeringId === t.id ? <><Spinner dark />Registering...</> : isLeague ? 'Register as Player →' : 'Register Team →'}
              </button>
            ) : showTypeRestriction ? (
              <div className="tn-action-restrict">{isLeague ? '👤 Players only' : '👥 Teams only'}</div>
            ) : isHost && displayStatusKey === 'DRAFT' ? (
              <button className="tn-action-primary" onClick={() => handlePublish(t.id)}>🚀 Publish Tournament</button>
            ) : (
              <button className="tn-action-ghost" onClick={() => setSelectedTournament(t)}>View Details</button>
            )}
            {isLeague && auctionEntry?.id && (isHost || registered || user?.role === 'TEAM') && (
              <button className="tn-action-primary" onClick={() => navigate(`/league-auctions/${auctionEntry.id}`)}>
                🔨 {isHost ? 'Manage Auction' : 'View Auction'}
              </button>
            )}
            {isLeague && isHost && !auctionEntry && statusKey !== 'DRAFT' && (
              statusKey === 'REGISTRATION_CLOSED' ? (
                <button className="tn-action-primary" onClick={() => { setAuctionSetupTournament(t); setShowAuctionSetup(true); }}>🔨 Start Auction</button>
              ) : (statusKey === 'ONGOING' || statusKey === 'COMPLETED') ? (
                <div className="tn-action-muted">🔒 Auction window passed</div>
              ) : (
                <div className="tn-action-restrict">⏳ Available after registration closes</div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const displayed = activeTab === 'all' ? allTournaments : myTournaments;

  return (
    <>
      <style>{S}</style>
      <div className="tn-root">
        <Navbar />
        <main className="tn-main">

          {/* Header */}
          <div className="tn-header">
            <div>
              <h1 className="tn-title">Tournaments</h1>
              <p className="tn-sub">Browse, register and compete in tournaments</p>
            </div>
            {(user?.role === 'ORGANIZATION' || user?.role === 'ADMIN') && (
              <button className="tn-create-btn" onClick={() => setShowCreateModal(true)}>+ Create Tournament</button>
            )}
          </div>

          {error && (
            <div className="tn-error">
              <span>⚠️</span><p style={{ flex: 1 }}>{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="tn-tabs">
            {[
              { id: 'all', label: 'All Tournaments', count: allTournaments.length },
              { id: 'my',  label: 'My Tournaments',  count: myTournaments.length  },
            ].map((tab) => (
              <button key={tab.id} className={`tn-tab ${activeTab === tab.id ? 'active' : 'idle'}`} onClick={() => setActiveTab(tab.id as any)}>
                {tab.label}
                <span className="tn-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="tn-filters">
            <div className="tn-filters-grid">
              <div>
                <label className="tn-filter-label">Search</label>
                <input type="text" placeholder="Search tournaments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="tn-input" />
              </div>
              <div>
                <label className="tn-filter-label">Sport</label>
                <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="tn-select">
                  <option value="">All Sports</option>
                  {Object.keys(SPORT_META).map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="tn-filter-label">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="tn-select">
                  <option value="">All Status</option>
                  <option value="REGISTRATION_OPEN">Registration Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid */}
          {displayed.length === 0 ? (
            <div className="tn-empty">
              <div className="tn-empty-icon">🏆</div>
              <div className="tn-empty-title">{activeTab === 'my' ? 'Not in any tournaments' : 'No tournaments found'}</div>
              <div className="tn-empty-sub">{activeTab === 'my' ? 'Register for a tournament to see it here' : 'Check back later or adjust your filters'}</div>
            </div>
          ) : (
            <div className="tn-grid">{displayed.map((t) => renderCard(t))}</div>
          )}
        </main>

        {/* Detail Modal */}
        {selectedTournament && (() => {
          const t = selectedTournament;
          const meta = SPORT_META[t.sport] || SPORT_META.FOOTBALL;
          const statusKey = getEffectiveStatusKey(t);
          const isLeague = t.format === 'LEAGUE' || t.competitionType === 'LEAGUE';
          const auctionEntry = auctionMap[t.id];
          const displayStatusKey = (isLeague && statusKey === 'ONGOING' && auctionEntry?.auctionStatus !== 'COMPLETED') ? 'AUCTION_PENDING' : statusKey;
          const ss = STATUS_STYLE[displayStatusKey] || STATUS_STYLE.UPCOMING;
          const dates = t.dates || {};
          const startDate = dates.startDate || t.startDate;
          const endDate   = dates.endDate   || t.endDate;
          const regs = t.registrations?.length || t.currentTeams || 0;
          const cap  = t.teamCapacity || t.maxTeams || '—';
          const fee  = t.registrationFee != null ? `₹${t.registrationFee.toLocaleString('en-IN')}` : 'Free';
          return (
            <div className="tn-modal-overlay" onClick={() => setSelectedTournament(null)}>
              <div className="tn-modal tn-modal-md" onClick={(e) => e.stopPropagation()}>
                <div className="tn-modal-hdr">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{meta.icon}</div>
                      <div>
                        <div className="tn-modal-title">{t.name}</div>
                        <div className="tn-modal-venue">{t.venue || 'Venue TBD'}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                          <span className="tn-badge" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.bg}` }}>
                            <span className="tn-badge-dot" style={{ background: ss.dot }} />{ss.label}
                          </span>
                          <span className="tn-badge" style={{ background: 'rgba(0,180,216,0.1)', color: '#00b4d8', border: '1px solid rgba(0,180,216,0.2)' }}>
                            {isLeague ? '👤 League' : '👥 Tournament'}
                          </span>
                          {t.format && t.format !== 'LEAGUE' && (
                            <span className="tn-badge" style={{ background: 'rgba(248,250,252,0.05)', color: 'rgba(248,250,252,0.4)', border: '1px solid rgba(248,250,252,0.08)' }}>{t.format}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="tn-modal-close" onClick={() => setSelectedTournament(null)}>✕</button>
                  </div>
                </div>

                <div className="tn-modal-body">
                  <div className="tn-detail-grid">
                    {[
                      { icon: '📅', label: 'Start Date', value: startDate ? toLocaleDateStr(startDate) : '—' },
                      { icon: '📅', label: 'End Date',   value: endDate   ? toLocaleDateStr(endDate)   : '—' },
                      { icon: '👥', label: 'Teams',      value: `${regs} / ${cap}` },
                      { icon: '💰', label: 'Entry Fee',  value: fee },
                      { icon: '🏅', label: 'Sport',      value: t.sport },
                      { icon: '📋', label: 'Format',     value: t.format || '—' },
                    ].map((row) => (
                      <div key={row.label} className="tn-detail-cell">
                        <div className="tn-detail-cell-label"><span>{row.icon}</span>{row.label}</div>
                        <div className="tn-detail-cell-value" style={{ color: meta.accent }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                  {typeof cap === 'number' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(248,250,252,0.35)', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        <span>Registration progress</span><span>{Math.round((regs / cap) * 100)}%</span>
                      </div>
                      <div className="tn-cap-bar"><div className="tn-cap-fill" style={{ width: `${Math.min(100, (regs / cap) * 100)}%` }} /></div>
                    </div>
                  )}
                  {t.description && <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.45)', lineHeight: 1.6 }}>{t.description}</p>}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Register Modal */}
        {showRegisterModal && registeringTournament && (() => {
          const t = registeringTournament;
          const meta = SPORT_META[t.sport] || SPORT_META.FOOTBALL;
          const roles = SPORT_ROLES[t.sport] || ['PLAYER'];
          const fee = Number(t.registrationFee);
          const steps = ['details', fee > 0 ? 'payment' : null, 'done'].filter(Boolean) as string[];
          return (
            <div className="tn-modal-overlay" onClick={() => setShowRegisterModal(false)}>
              <div className="tn-modal tn-modal-sm" onClick={(e) => e.stopPropagation()}>
                <div className="tn-modal-hdr">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="tn-modal-sub">{registerStep === 'details' ? (user?.role === 'TEAM' ? 'Team Registration' : 'Player Registration') : registerStep === 'payment' ? 'Payment' : 'Confirmed!'}</div>
                      <div className="tn-modal-title">{t.name}</div>
                      <div className="tn-modal-venue">{meta.icon} {t.sport}{t.venue ? ` · ${t.venue}` : ''}</div>
                    </div>
                    <button className="tn-modal-close" onClick={() => setShowRegisterModal(false)}>✕</button>
                  </div>
                  <div className="tn-step-indicators">
                    {steps.map((step, i) => (
                      <React.Fragment key={step}>
                        <div className="tn-step-dot" style={{
                          background: step === registerStep ? '#00b4d8' : steps.indexOf(step) < steps.indexOf(registerStep) ? 'rgba(0,180,216,0.4)' : 'rgba(0,180,216,0.1)',
                          color: step === registerStep ? '#020817' : steps.indexOf(step) < steps.indexOf(registerStep) ? '#f8fafc' : 'rgba(248,250,252,0.4)',
                        }}>{i + 1}</div>
                        <span className="tn-step-label">{step}</span>
                        {i < steps.length - 1 && <div className="tn-step-line" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="tn-modal-body">
                  {registerStep === 'details' && (
                    <>
                      {user?.role === 'TEAM' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.5)' }}>Select the team to register:</p>
                          {myRegTeams.length === 0
                            ? <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', textAlign: 'center', padding: '16px 0' }}>No teams found. Create a team first.</p>
                            : myRegTeams.map((team: any) => (
                              <label key={team.id} className={`tn-team-radio${selectedRegTeamId === team.id ? ' checked' : ''}`}>
                                <input type="radio" name="regTeam" value={team.id} checked={selectedRegTeamId === team.id} onChange={() => setSelectedRegTeamId(team.id)} style={{ accentColor: '#00b4d8' }} />
                                <div>
                                  <div className="tn-team-name">{team.name}</div>
                                  <div className="tn-team-meta">{team.sport}{team.location ? ` · ${team.location}` : ''}</div>
                                </div>
                              </label>
                            ))
                          }
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="tn-field-label">Playing Role *</label>
                            <select value={registerForm.role} onChange={(e) => rf('role', e.target.value)} className="tn-field-select">
                              <option value="">Select your role…</option>
                              {roles.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="tn-field-label">Experience Level *</label>
                            <select value={registerForm.experience} onChange={(e) => rf('experience', e.target.value)} className="tn-field-select">
                              {EXPERIENCE_OPTIONS.map((e) => <option key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase()}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="tn-field-label">Preferred Position</label>
                            <input type="text" value={registerForm.preferredPosition} onChange={(e) => rf('preferredPosition', e.target.value)} placeholder="e.g. Opening Batsman" className="tn-field-input" />
                          </div>
                          <div>
                            <label className="tn-field-label">Additional Info</label>
                            <textarea value={registerForm.additionalInfo} onChange={(e) => rf('additionalInfo', e.target.value)} placeholder="Any additional information…" rows={2} className="tn-field-textarea" />
                          </div>
                        </>
                      )}
                      {fee > 0 && (
                        <div className="tn-fee-card">
                          <span style={{ fontSize: 22 }}>💳</span>
                          <div><div className="tn-fee-label">Registration Fee</div><div className="tn-fee-value">₹{fee.toLocaleString('en-IN')}</div></div>
                        </div>
                      )}
                      <div className="tn-btn-row">
                        <button className="tn-btn-ghost" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                        <button className="tn-btn-primary" onClick={handleRegisterSubmit} disabled={registeringId === t.id || (user?.role === 'TEAM' ? !selectedRegTeamId : !registerForm.role)}>
                          {registeringId === t.id ? <><Spinner dark />Submitting…</> : fee > 0 ? 'Continue to Payment →' : 'Register for Free →'}
                        </button>
                      </div>
                    </>
                  )}

                  {registerStep === 'payment' && (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <div className="tn-success-icon">✓</div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, textTransform: 'uppercase', color: '#f8fafc', marginTop: 12 }}>Details Submitted!</p>
                        <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.45)', marginTop: 4 }}>Complete payment to confirm your spot in <strong style={{ color: '#00b4d8' }}>{t.name}</strong>.</p>
                      </div>
                      <div className="tn-fee-card" style={{ justifyContent: 'center', flexDirection: 'column', textAlign: 'center' }}>
                        <div className="tn-fee-label">Amount Due</div>
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 900, color: '#00b4d8' }}>₹{fee.toLocaleString('en-IN')}</div>
                      </div>
                      <button className="tn-btn-primary" style={{ flex: 'none', width: '100%', padding: '14px 0', fontSize: 14 }} onClick={handlePayment} disabled={paymentLoading}>
                        {paymentLoading ? <><Spinner dark />Processing…</> : `💳 Pay ₹${fee.toLocaleString('en-IN')}`}
                      </button>
                      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(248,250,252,0.25)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>Secured by Razorpay</p>
                    </>
                  )}

                  {registerStep === 'done' && (
                    <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 44 }}>🎉</div>
                      <div>
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', color: '#f8fafc' }}>You're In!</div>
                        <div style={{ fontSize: 13, color: 'rgba(248,250,252,0.45)', marginTop: 4 }}>Successfully registered for <strong style={{ color: '#00b4d8' }}>{t.name}</strong>.</div>
                      </div>
                      <button className="tn-btn-primary" style={{ flex: 'none', width: '100%', padding: '12px 0' }} onClick={() => setShowRegisterModal(false)}>Done</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Auction Setup Modal */}
        {showAuctionSetup && auctionSetupTournament && (
          <div className="tn-modal-overlay" onClick={() => setShowAuctionSetup(false)}>
            <div className="tn-modal tn-modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="tn-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="tn-modal-sub">Start Auction</div>
                  <div className="tn-modal-title">🔨 Auction Setup</div>
                  <div className="tn-modal-venue">{auctionSetupTournament.name}</div>
                </div>
                <button className="tn-modal-close" onClick={() => setShowAuctionSetup(false)}>✕</button>
              </div>
              <div className="tn-modal-body">
                <div>
                  <label className="tn-field-label">Starting Budget per Team</label>
                  <input type="number" value={auctionSetupForm.teamBudget} onChange={e => af('teamBudget', Number(e.target.value))} className="tn-field-input" />
                  <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.3)', marginTop: 5 }}>Can be points, credits, or money — host decides the unit</p>
                </div>
                <div className="tn-form-2col">
                  <div><label className="tn-field-label">Bid Increment</label><input type="number" value={auctionSetupForm.bidIncrement} onChange={e => af('bidIncrement', Number(e.target.value))} className="tn-field-input" /></div>
                  <div><label className="tn-field-label">Bid Timeout (sec)</label><input type="number" value={auctionSetupForm.bidTimeout} onChange={e => af('bidTimeout', Number(e.target.value))} className="tn-field-input" /></div>
                </div>
                <div className="tn-form-2col">
                  <div><label className="tn-field-label">Min Squad Size</label><input type="number" value={auctionSetupForm.minSquadSize} onChange={e => af('minSquadSize', Number(e.target.value))} className="tn-field-input" /></div>
                  <div><label className="tn-field-label">Max Squad Size</label><input type="number" value={auctionSetupForm.maxSquadSize} onChange={e => af('maxSquadSize', Number(e.target.value))} className="tn-field-input" /></div>
                </div>
                <button className="tn-btn-primary" style={{ flex: 'none', width: '100%', padding: '13px 0', fontSize: 13 }} onClick={handleStartAuction} disabled={creatingAuction}>
                  {creatingAuction ? <><Spinner dark />Creating...</> : '🔨 Create Auction & Open Dashboard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Tournament Modal */}
        {showCreateModal && (
          <div className="tn-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="tn-modal tn-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="tn-modal-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="tn-modal-sub">New Event</div>
                  <div className="tn-modal-title">Create Tournament</div>
                </div>
                <button className="tn-modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>
              <div className="tn-modal-body">
                <div>
                  <label className="tn-field-label">Tournament Name *</label>
                  <input type="text" value={createForm.name} onChange={(e) => cf('name', e.target.value)} placeholder="e.g. Champions Cricket League 2026" className="tn-field-input" />
                </div>
                <div className="tn-form-2col">
                  <div>
                    <label className="tn-field-label">Sport *</label>
                    <select value={createForm.sport} onChange={(e) => cf('sport', e.target.value)} className="tn-field-select">
                      {Object.keys(SPORT_META).map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="tn-field-label">Type *</label>
                    <select value={createForm.competitionType} onChange={(e) => { cf('competitionType', e.target.value); if (e.target.value === 'LEAGUE') cf('format', 'LEAGUE'); else if (createForm.format === 'LEAGUE') cf('format', 'KNOCKOUT'); }} className="tn-field-select">
                      <option value="TOURNAMENT">🏆 Tournament (Teams)</option>
                      <option value="LEAGUE">👤 League (Players)</option>
                    </select>
                  </div>
                </div>
                {createForm.competitionType !== 'LEAGUE' ? (
                  <div>
                    <label className="tn-field-label">Format *</label>
                    <select value={createForm.format} onChange={(e) => cf('format', e.target.value)} className="tn-field-select">
                      <option value="KNOCKOUT">⚔️ Knockout</option>
                      <option value="GROUP_KNOCKOUT">🏟️ Group + Knockout</option>
                    </select>
                  </div>
                ) : (
                  <div className="tn-league-info">
                    <span style={{ fontSize: 18 }}>🔄</span>
                    <div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#00b4d8' }}>League Format</div>
                      <div style={{ fontSize: 12, color: 'rgba(248,250,252,0.35)', marginTop: 2 }}>Round-robin style — all teams/players compete against each other</div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="tn-field-label">Venue *</label>
                  <input type="text" value={createForm.venue} onChange={(e) => cf('venue', e.target.value)} placeholder="e.g. SportsPlex, Mumbai" className="tn-field-input" />
                </div>
                <div className="tn-form-2col">
                  <div><label className="tn-field-label">Start Date *</label><input type="date" value={createForm.startDate} onChange={(e) => cf('startDate', e.target.value)} className="tn-field-input" /></div>
                  <div><label className="tn-field-label">End Date *</label><input type="date" value={createForm.endDate} onChange={(e) => cf('endDate', e.target.value)} className="tn-field-input" /></div>
                </div>
                <div>
                  <label className="tn-field-label">Registration Deadline *</label>
                  <input type="date" value={createForm.registrationDeadline} onChange={(e) => cf('registrationDeadline', e.target.value)} className="tn-field-input" />
                  <p className="tn-field-hint">⚠️ Must be strictly before the start date</p>
                </div>
                <div className="tn-form-2col">
                  <div><label className="tn-field-label">Entry Fee (₹)</label><input type="number" min="0" value={createForm.registrationFee} onChange={(e) => cf('registrationFee', e.target.value)} className="tn-field-input" /></div>
                  <div><label className="tn-field-label">Team Capacity</label><input type="number" min="2" value={createForm.teamCapacity} onChange={(e) => cf('teamCapacity', e.target.value)} className="tn-field-input" /></div>
                </div>
                <div className="tn-btn-row">
                  <button className="tn-btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button className="tn-btn-primary" onClick={handleCreateTournament} disabled={creating}>
                    {creating ? <><Spinner dark />Creating…</> : '+ Create Tournament'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Tournaments;