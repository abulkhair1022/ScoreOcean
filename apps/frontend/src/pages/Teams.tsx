import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';
import { showToast } from '../utils/toast';

const SPORT_META: Record<string, { icon: string; accent: string; border: string; bg: string }> = {
  CRICKET:    { icon: '🏏', accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.07)' },
  FOOTBALL:   { icon: '⚽', accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.07)'   },
  KABADDI:    { icon: '🤼', accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.07)'  },
  VOLLEYBALL: { icon: '🏐', accent: '#caf0f8', border: 'rgba(202,240,248,0.25)', bg: 'rgba(202,240,248,0.05)' },
  BASKETBALL: { icon: '🏀', accent: '#0096c7', border: 'rgba(0,150,199,0.3)',    bg: 'rgba(0,150,199,0.07)'   },
  BADMINTON:  { icon: '🏸', accent: '#0077b6', border: 'rgba(0,119,182,0.3)',    bg: 'rgba(0,119,182,0.07)'   },
};

const ALL_SPORTS = ['CRICKET', 'FOOTBALL', 'KABADDI', 'VOLLEYBALL', 'BASKETBALL', 'BADMINTON'];

function Teams() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [pendingOrgInvites, setPendingOrgInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'my-teams' | 'browse'>('my-teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<Set<string>>(new Set());
  const [managingTeam, setManagingTeam] = useState<any>(null);
  const [manageReadOnly, setManageReadOnly] = useState(false);
  const [manageTab, setManageTab] = useState<'overview' | 'sports' | 'roster'>('overview');
  const [teamSports, setTeamSports] = useState<any[]>([]);
  const [teamRoster, setTeamRoster] = useState<any[]>([]);
  const [addSportValue, setAddSportValue] = useState('');
  const [addSportLoading, setAddSportLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [assigningCaptainId, setAssigningCaptainId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmCaptainId, setConfirmCaptainId] = useState<string | null>(null);
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([]);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [myLeaveRequest, setMyLeaveRequest] = useState<any>(null);
  const [requestingLeave, setRequestingLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [approvingLeave, setApprovingLeave] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (!storedUser || !accessToken) { navigate('/login'); return; }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchMyTeams(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'browse') fetchAvailableTeams();
  }, [activeTab, searchQuery, sportFilter]);

  const fetchMyTeams = async (currentUser?: any) => {
    const u = currentUser || user;
    try {
      setLoading(true);
      if (u?.role === 'ORGANIZATION') {
        const r = await apiClient.get('/teams/org-affiliates');
        setMyTeams(r.data?.data || r.data || []);
      } else {
        const r = await apiClient.get('/teams');
        setMyTeams(r.data?.data || r.data || []);
      }
      if (u?.role === 'TEAM') {
        try { const ir = await apiClient.get('/teams/org-invitations/pending'); setPendingOrgInvites(ir.data || []); } catch {}
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load teams'); }
    finally { setLoading(false); }
  };

  const fetchAvailableTeams = async () => {
    try {
      setBrowseLoading(true);
      const params: any = {};
      if (sportFilter) params.sport = sportFilter;
      const r = await apiClient.get('/teams/browse', { params });
      let teams = r.data?.data || r.data || [];
      if (searchQuery) { const q = searchQuery.toLowerCase(); teams = teams.filter((t: any) => t.name?.toLowerCase().includes(q)); }
      setAvailableTeams(teams);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load teams'); }
    finally { setBrowseLoading(false); }
  };

  const handleRequestToJoin = async (teamId: string) => {
    try { setSendingRequest(teamId); await new Promise(r => setTimeout(r, 900)); showToast.success('Join request sent!'); }
    catch { showToast.error('Failed to send join request'); }
    finally { setSendingRequest(null); }
  };

  const handleSendOrgInvite = async (teamId: string) => {
    try { setSendingInvite(teamId); await apiClient.post(`/teams/${teamId}/org-invite`); setInviteSent(p => new Set([...p, teamId])); showToast.success('Invite sent!'); }
    catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to send invite'); }
    finally { setSendingInvite(null); }
  };

  const handleAcceptOrgInvite = async (inviteId: string) => {
    try { setAcceptingInvite(inviteId); await apiClient.post(`/teams/org-invitations/${inviteId}/accept`); setPendingOrgInvites(p => p.filter(i => i.id !== inviteId)); fetchMyTeams(); showToast.success('Invitation accepted!'); }
    catch { showToast.error('Failed to accept invite'); }
    finally { setAcceptingInvite(null); }
  };

  const handleRejectOrgInvite = async (inviteId: string) => {
    try { await apiClient.post(`/teams/org-invitations/${inviteId}/reject`); setPendingOrgInvites(p => p.filter(i => i.id !== inviteId)); showToast.info('Invitation declined.'); }
    catch { showToast.error('Failed to reject invite'); }
  };

  const handleOpenManage = async (team: any, readOnly = false) => {
    setManagingTeam(team); setManageReadOnly(readOnly); setManageTab('overview');
    setTeamSports([]); setTeamRoster([]); setInviteEmail(''); setConfirmRemoveId(null); setConfirmCaptainId(null);
    setPlayerSearchResults([]); setShowPlayerDropdown(false); setLeaveRequests([]); setMyLeaveRequest(null); setLeaveReason(''); setShowLeaveModal(false);
    try {
      const [sR, rR] = await Promise.allSettled([apiClient.get(`/teams/${team.id}/sports`), apiClient.get(`/teams/${team.id}/roster`)]);
      if (sR.status === 'fulfilled') setTeamSports(sR.value.data?.data || sR.value.data || []);
      if (rR.status === 'fulfilled') setTeamRoster(rR.value.data?.data || rR.value.data || []);
    } catch {}
    if (!readOnly && user?.role === 'TEAM') { try { const lr = await apiClient.get(`/teams/${team.id}/leave-requests`); setLeaveRequests(lr.data || []); } catch {} }
    if (user?.role === 'PLAYER') { try { const c = await apiClient.get(`/teams/${team.id}/leave-requests/my`); setMyLeaveRequest(c.data || null); } catch {} }
  };

  const handlePlayerSearch = async (query: string) => {
    setInviteEmail(query);
    if (!query.trim() || query.trim().length < 2) { setPlayerSearchResults([]); setShowPlayerDropdown(false); return; }
    try {
      setPlayerSearchLoading(true);
      const sp = managingTeam?.sport ? `&sport=${managingTeam.sport}` : '';
      const r = await apiClient.get(`/users/search?q=${encodeURIComponent(query.trim())}${sp}`);
      const results = r.data?.data || r.data || [];
      setPlayerSearchResults(results); setShowPlayerDropdown(results.length > 0);
    } catch { setPlayerSearchResults([]); }
    finally { setPlayerSearchLoading(false); }
  };

  const handleRequestLeave = async () => {
    if (!managingTeam) return;
    try {
      setRequestingLeave(true);
      await apiClient.post(`/teams/${managingTeam.id}/leave-request`, { reason: leaveReason.trim() || undefined });
      showToast.success('Leave request submitted!'); setMyLeaveRequest({ status: 'PENDING', reason: leaveReason }); setShowLeaveModal(false); setLeaveReason('');
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to submit leave request'); }
    finally { setRequestingLeave(false); }
  };

  const handleApproveLeave = async (requestId: string) => {
    if (!managingTeam) return;
    try {
      setApprovingLeave(requestId);
      await apiClient.post(`/teams/${managingTeam.id}/leave-requests/${requestId}/approve`);
      setLeaveRequests(p => p.filter(r => r.id !== requestId));
      const rR = await apiClient.get(`/teams/${managingTeam.id}/roster`); setTeamRoster(rR.data?.data || rR.data || []);
      showToast.success('Leave approved.');
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to approve'); }
    finally { setApprovingLeave(null); }
  };

  const handleRejectLeave = async (requestId: string) => {
    if (!managingTeam) return;
    try { await apiClient.post(`/teams/${managingTeam.id}/leave-requests/${requestId}/reject`); setLeaveRequests(p => p.filter(r => r.id !== requestId)); showToast.info('Rejected.'); }
    catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to reject'); }
  };

  const handleInviteByPlayer = async (player: any) => {
    if (!managingTeam) return;
    try { setInviteLoading(true); setShowPlayerDropdown(false); await apiClient.post(`/teams/${managingTeam.id}/invitations`, { playerId: player.id }); showToast.success(`Invite sent to ${player.name || player.email}!`); setInviteEmail(''); setPlayerSearchResults([]); }
    catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
    finally { setInviteLoading(false); }
  };

  const handleAddSport = async () => {
    if (!managingTeam || !addSportValue) return;
    try {
      setAddSportLoading(true);
      await apiClient.post(`/teams/${managingTeam.id}/sports`, { sport: addSportValue });
      const r = await apiClient.get(`/teams/${managingTeam.id}/sports`); setTeamSports(r.data?.data || r.data || []); setAddSportValue(''); showToast.success(`${addSportValue} added!`);
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed to add sport'); }
    finally { setAddSportLoading(false); }
  };

  const handleRemoveTeamSport = async (sport: string) => {
    if (!managingTeam) return;
    try { await apiClient.delete(`/teams/${managingTeam.id}/sports/${sport}`); setTeamSports(p => p.filter((s: any) => s.sport !== sport)); showToast.success(`${sport} removed.`); }
    catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const handleSetPrimaryTeamSport = async (sport: string) => {
    if (!managingTeam) return;
    try { await apiClient.put(`/teams/${managingTeam.id}/primary-sport`, { sport }); setManagingTeam((p: any) => ({ ...p, sport })); fetchMyTeams(user); showToast.success(`${sport} is now primary.`); }
    catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const handleInvitePlayer = async () => {
    if (!managingTeam || !inviteEmail.trim()) { showToast.error('Please enter a player email or ID.'); return; }
    try {
      setInviteLoading(true);
      const sp = managingTeam?.sport ? `&sport=${managingTeam.sport}` : '';
      const search = await apiClient.get(`/users/search?q=${encodeURIComponent(inviteEmail.trim())}${sp}`);
      const found = (search.data?.data || search.data || [])[0];
      if (!found) { showToast.error('Player not found.'); return; }
      await apiClient.post(`/teams/${managingTeam.id}/invitations`, { playerId: found.id }); showToast.success(`Invite sent to ${found.name || found.email}!`); setInviteEmail('');
    } catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
    finally { setInviteLoading(false); }
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (!managingTeam) return;
    try { setRemovingPlayerId(playerId); await apiClient.delete(`/teams/${managingTeam.id}/roster/${playerId}`); setTeamRoster(p => p.filter((pl: any) => (pl.id || pl.playerId) !== playerId)); showToast.success(`${playerName} removed.`); }
    catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
    finally { setRemovingPlayerId(null); }
  };

  const handleAssignCaptain = async (playerId: string, playerName: string) => {
    if (!managingTeam) return;
    try { setAssigningCaptainId(playerId); await apiClient.put(`/teams/${managingTeam.id}/captain`, { captainId: playerId }); setTeamRoster(p => p.map((pl: any) => ({ ...pl, isCaptain: (pl.id || pl.playerId) === playerId }))); showToast.success(`${playerName} is now captain!`); }
    catch (err: any) { showToast.error(err.response?.data?.error?.message || 'Failed'); }
    finally { setAssigningCaptainId(null); }
  };

  const isUserInTeam = (team: any) => !user ? false : team.roster?.some((m: any) => m.id === user.id) || team.host_id === user.id;

  const Spinner = ({ dark }: { dark?: boolean }) => (
    <svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={dark ? 'rgba(2,8,23,0.3)' : 'rgba(0,180,216,0.2)'} strokeWidth="4"/>
      <path fill={dark ? '#020817' : '#00b4d8'} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading teams...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const renderTeamCard = (team: any, showJoin = false) => {
    const meta = SPORT_META[team.sport] || SPORT_META.FOOTBALL;
    const inTeam = isUserInTeam(team);
    return (
      <div key={team.id} className="card-hover" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>{team.name}</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 4, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.accent, fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {meta.icon} {team.sport}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {team.location?.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(248,250,252,0.45)' }}>
              <span>📍</span><span>{[team.location.city, team.location.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(248,250,252,0.45)' }}>
            <span>👥</span><span>{team.roster?.length || team.rosterCount || 0} players</span>
          </div>
        </div>

        {showJoin ? (
          user?.role === 'ORGANIZATION' ? (
            inviteSent.has(team.id) ? (
              <div style={{ width: '100%', padding: '10px 0', background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 8, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00b4d8' }}>
                ✓ Invite Sent
              </div>
            ) : (
              <button onClick={() => handleSendOrgInvite(team.id)} disabled={sendingInvite === team.id}
                style={{ width: '100%', padding: '10px 0', background: 'linear-gradient(135deg,#0077b6,#00b4d8)', color: '#020817', border: 'none', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: sendingInvite === team.id ? 0.6 : 1 }}>
                {sendingInvite === team.id ? <><Spinner dark />Sending...</> : '📩 Send Invite'}
              </button>
            )
          ) : user?.role === 'TEAM' ? (
            <button onClick={() => handleOpenManage(team, true)}
              style={{ width: '100%', padding: '10px 0', background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00b4d8', cursor: 'pointer' }}>
              View Team →
            </button>
          ) : inTeam ? (
            <div style={{ width: '100%', padding: '10px 0', background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 8, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00b4d8' }}>
              ✓ Member
            </div>
          ) : (
            <button onClick={() => handleRequestToJoin(team.id)} disabled={sendingRequest === team.id}
              style={{ width: '100%', padding: '10px 0', background: 'linear-gradient(135deg,#0077b6,#00b4d8)', color: '#020817', border: 'none', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: sendingRequest === team.id ? 0.6 : 1 }}>
              {sendingRequest === team.id ? <><Spinner dark />Sending...</> : 'Request to Join'}
            </button>
          )
        ) : (
          <button onClick={() => handleOpenManage(team)}
            style={{ width: '100%', padding: '10px 0', background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00b4d8', cursor: 'pointer', transition: 'background 120ms' }}>
            Manage Team →
          </button>
        )}
      </div>
    );
  };

  const I = { fontFamily: 'Barlow Condensed, sans-serif' as const };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, fontFamily: 'Barlow, sans-serif', fontSize: 13, color: '#f8fafc', background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(0,180,216,0.15)', outline: 'none', boxSizing: 'border-box' as const };
  const selectStyle = { ...inputStyle, appearance: 'none' as const, WebkitAppearance: 'none' as const, cursor: 'pointer' };
  const labelStyle = { display: 'block' as const, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(248,250,252,0.45)', marginBottom: 7 };
  const miniBtn = { padding: '7px 16px', borderRadius: 7, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'linear-gradient(135deg,#0077b6,#00b4d8)', color: '#020817', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 };
  const ghostBtn = { padding: '7px 14px', borderRadius: 7, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'transparent', color: 'rgba(248,250,252,0.4)', border: '1px solid rgba(0,180,216,0.15)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Page Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, marginBottom: 6 }}>Teams</h1>
              <p style={{ fontSize: 14, color: 'rgba(248,250,252,0.45)', fontWeight: 300 }}>
                {user?.role === 'ORGANIZATION' ? 'Invite teams to join your organization' : 'Manage your teams and discover new ones'}
              </p>
            </div>
            {(user?.role === 'TEAM' || user?.role === 'ADMIN') && (
              <button onClick={() => showToast.info('Create team functionality coming soon!')} style={{ ...miniBtn, padding: '10px 20px', fontSize: 13 }}>
                + Create Team
              </button>
            )}
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.12)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
            {[
              { id: 'my-teams', label: user?.role === 'ORGANIZATION' ? 'Our Teams' : 'My Teams', count: myTeams.length },
              { id: 'browse',   label: user?.role === 'ORGANIZATION' ? 'Find Teams' : 'Browse Teams', count: null },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                style={{ padding: '8px 18px', borderRadius: 7, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 150ms', background: activeTab === tab.id ? 'linear-gradient(135deg,#0077b6,#00b4d8)' : 'transparent', color: activeTab === tab.id ? '#020817' : 'rgba(248,250,252,0.45)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {tab.label}
                {tab.count !== null && (
                  <span style={{ padding: '1px 7px', borderRadius: 9999, fontSize: 10, fontWeight: 900, background: activeTab === tab.id ? 'rgba(2,8,23,0.2)' : 'rgba(0,180,216,0.12)', color: activeTab === tab.id ? '#020817' : '#00b4d8' }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* My Teams Tab */}
          {activeTab === 'my-teams' && (
            <>
              {user?.role === 'TEAM' && pendingOrgInvites.length > 0 && (
                <div className="card" style={{ padding: 20, border: '1px solid rgba(0,180,216,0.25)', background: 'rgba(0,180,216,0.05)' }}>
                  <h3 style={{ ...I, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00b4d8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,180,216,0.2)', border: '1px solid rgba(0,180,216,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#00b4d8' }}>{pendingOrgInvites.length}</span>
                    Organization Invites
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingOrgInvites.map((inv) => (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.15)', borderRadius: 8, padding: '10px 14px' }}>
                        <div>
                          <p style={{ ...I, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc' }}>{inv.orgName}</p>
                          <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)', marginTop: 2 }}>wants "{inv.teamName}" to join their organization</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => handleRejectOrgInvite(inv.id)} style={{ ...ghostBtn }}>Decline</button>
                          <button onClick={() => handleAcceptOrgInvite(inv.id)} disabled={acceptingInvite === inv.id} style={{ ...miniBtn, opacity: acceptingInvite === inv.id ? 0.6 : 1 }}>
                            {acceptingInvite === inv.id ? '...' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {myTeams.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 14 }}>{user?.role === 'ORGANIZATION' ? '🏢' : '🛡️'}</div>
                  <h3 style={{ ...I, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(248,250,252,0.6)', marginBottom: 8 }}>
                    {user?.role === 'ORGANIZATION' ? 'No affiliated teams yet' : 'No teams yet'}
                  </h3>
                  <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' }}>
                    {user?.role === 'ORGANIZATION' ? 'Browse teams and send invites' : user?.role === 'PLAYER' ? 'Browse available teams to request to join' : 'Create your first team or browse available ones'}
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {(user?.role === 'TEAM' || user?.role === 'ADMIN') && (
                      <button onClick={() => showToast.info('Create team coming soon!')} style={{ ...miniBtn, padding: '10px 20px', fontSize: 13 }}>Create Team</button>
                    )}
                    <button onClick={() => setActiveTab('browse')} style={{ ...ghostBtn, padding: '10px 20px', fontSize: 13, border: '1px solid rgba(0,180,216,0.3)', color: '#00b4d8' }}>
                      {user?.role === 'ORGANIZATION' ? 'Find & Invite Teams' : 'Browse Teams'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {myTeams.map((t) => renderTeamCard(t, false))}
                </div>
              )}
            </>
          )}

          {/* Browse Tab */}
          {activeTab === 'browse' && (
            <>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>Search Teams</label>
                    <input type="text" placeholder="Search by team name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={inputStyle} className="input-field" />
                  </div>
                  <div>
                    <label style={labelStyle}>Sport</label>
                    <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} style={selectStyle} className="input-field">
                      <option value="">All Sports</option>
                      {Object.keys(SPORT_META).map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {browseLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ color: 'rgba(248,250,252,0.35)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Searching teams...</p>
                </div>
              ) : availableTeams.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 14 }}>🔍</div>
                  <h3 style={{ ...I, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(248,250,252,0.6)', marginBottom: 6 }}>No teams found</h3>
                  <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)' }}>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {availableTeams.map((t) => renderTeamCard(t, true))}
                </div>
              )}
            </>
          )}
        </main>

        {/* Manage Modal */}
        {managingTeam && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,23,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(10px)' }} onClick={() => setManagingTeam(null)}>
            <div style={{ background: 'rgba(10,22,40,0.97)', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 18, boxShadow: '0 8px 40px rgba(3,4,94,0.7)', backdropFilter: 'blur(20px)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>

              {/* Modal Header */}
              <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.5))', borderBottom: '1px solid rgba(0,180,216,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: (SPORT_META[managingTeam.sport] || SPORT_META.FOOTBALL).bg, border: `1px solid ${(SPORT_META[managingTeam.sport] || SPORT_META.FOOTBALL).border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {(SPORT_META[managingTeam.sport] || SPORT_META.FOOTBALL).icon}
                    </div>
                    <div>
                      <h3 style={{ ...I, fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc', marginBottom: 3 }}>{managingTeam.name}</h3>
                      <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>{managingTeam.sport}{managingTeam.location?.city ? ` · ${managingTeam.location.city}` : ''}</p>
                      {manageReadOnly && <span style={{ display: 'inline-flex', marginTop: 5, padding: '2px 8px', borderRadius: 4, background: 'rgba(248,250,252,0.06)', border: '1px solid rgba(248,250,252,0.1)', fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.4)' }}>👁 View Only</span>}
                    </div>
                  </div>
                  <button onClick={() => setManagingTeam(null)} style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', color: 'rgba(248,250,252,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: 4, background: 'rgba(0,180,216,0.06)', borderRadius: 8, padding: 4 }}>
                  {(['overview', 'sports', 'roster'] as const).map((tab) => (
                    <button key={tab} onClick={() => setManageTab(tab)}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 150ms', background: manageTab === tab ? 'linear-gradient(135deg,#0077b6,#00b4d8)' : 'transparent', color: manageTab === tab ? '#020817' : 'rgba(248,250,252,0.4)' }}>
                      {tab === 'overview' ? '📋 Overview' : tab === 'sports' ? '🎯 Sports' : '👥 Roster'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Overview */}
                {manageTab === 'overview' && (
                  <>
                    {[
                      { label: 'Primary Sport', value: managingTeam.sport },
                      { label: 'Location', value: [managingTeam.location?.city, managingTeam.location?.state].filter(Boolean).join(', ') || '—' },
                      { label: 'Players', value: `${managingTeam.roster?.length ?? managingTeam.rosterCount ?? 0} players` },
                      { label: 'Sports Active', value: `${teamSports.length} sport(s)` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.1)' }}>
                        <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.45)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.03em' }}>{value}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Sports */}
                {manageTab === 'sports' && (
                  <>
                    <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.35)' }}>Manage sports this team participates in. Primary sport is used for tournament matching.</p>
                    {teamSports.length === 0 ? (
                      <div style={{ borderRadius: 8, background: 'rgba(0,180,216,0.04)', padding: '20px', textAlign: 'center' }}>
                        <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)' }}>No sport profiles yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {teamSports.map((sp: any) => {
                          const meta = SPORT_META[sp.sport] || SPORT_META.FOOTBALL;
                          const isPrimary = sp.sport === managingTeam.sport;
                          return (
                            <div key={sp.id || sp.sport} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, border: `1px solid ${isPrimary ? meta.border : 'rgba(0,180,216,0.1)'}`, background: isPrimary ? meta.bg : 'rgba(0,180,216,0.03)' }}>
                              <div style={{ width: 36, height: 36, borderRadius: 7, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{meta.icon}</div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: isPrimary ? meta.accent : '#f8fafc' }}>{sp.sport}</p>
                                {isPrimary && <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)' }}>Primary sport</p>}
                              </div>
                              {user?.role === 'TEAM' && !manageReadOnly && (
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  {!isPrimary && (
                                    <button onClick={() => handleSetPrimaryTeamSport(sp.sport)} style={{ padding: '4px 10px', borderRadius: 5, background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', color: '#00b4d8', fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>★ Primary</button>
                                  )}
                                  <button onClick={() => handleRemoveTeamSport(sp.sport)} style={{ padding: '4px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 11, cursor: 'pointer' }}>✕</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {user?.role === 'TEAM' && !manageReadOnly && (() => {
                      const existing = teamSports.map((s: any) => s.sport);
                      const available = ALL_SPORTS.filter(s => !existing.includes(s));
                      if (available.length === 0) return <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.3)', textAlign: 'center' }}>All sports added.</p>;
                      return (
                        <div style={{ borderRadius: 8, border: '1px dashed rgba(0,180,216,0.2)', padding: 14 }}>
                          <p style={labelStyle}>Add New Sport</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <select value={addSportValue || available[0]} onChange={(e) => setAddSportValue(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                              {available.map(s => <option key={s} value={s}>{SPORT_META[s]?.icon} {s}</option>)}
                            </select>
                            <button onClick={handleAddSport} disabled={addSportLoading} style={{ ...miniBtn, opacity: addSportLoading ? 0.6 : 1 }}>
                              {addSportLoading ? <Spinner dark /> : '+ Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Roster */}
                {manageTab === 'roster' && (
                  <>
                    {/* Leave requests */}
                    {!manageReadOnly && user?.role === 'TEAM' && leaveRequests.length > 0 && (
                      <div style={{ borderRadius: 8, border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.05)', padding: 14 }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fbbf24' }}>{leaveRequests.length}</span>
                          Pending Leave Requests
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {leaveRequests.map((req: any) => (
                            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.1)', borderRadius: 7, padding: '10px 12px' }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0077b6,#00b4d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#020817', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                                {(req.playerName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc' }}>{req.playerName}</p>
                                {req.reason && <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{req.reason}"</p>}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button onClick={() => handleApproveLeave(req.id)} disabled={approvingLeave === req.id} style={{ ...miniBtn, opacity: approvingLeave === req.id ? 0.6 : 1 }}>
                                  {approvingLeave === req.id ? '...' : '✓'}
                                </button>
                                <button onClick={() => handleRejectLeave(req.id)} style={{ ...ghostBtn }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Player leave request */}
                    {user?.role === 'PLAYER' && !manageReadOnly && (
                      <div style={{ borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', padding: 14 }}>
                        <p style={labelStyle}>Leave Team</p>
                        {myLeaveRequest ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 7, padding: '10px 12px' }}>
                            <span style={{ fontSize: 18 }}>⏳</span>
                            <div>
                              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#fbbf24' }}>Leave Request Pending</p>
                              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 2 }}>Waiting for host approval.</p>
                            </div>
                          </div>
                        ) : showLeaveModal ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Reason for leaving (optional)..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={handleRequestLeave} disabled={requestingLeave} style={{ flex: 1, padding: '9px 0', borderRadius: 7, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: requestingLeave ? 0.6 : 1 }}>
                                {requestingLeave ? <><Spinner />Submitting...</> : '📤 Submit Request'}
                              </button>
                              <button onClick={() => { setShowLeaveModal(false); setLeaveReason(''); }} style={{ ...ghostBtn }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setShowLeaveModal(true)} style={{ width: '100%', padding: '9px 0', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                            🚪 Request to Leave Team
                          </button>
                        )}
                      </div>
                    )}

                    {/* Invite player */}
                    {!manageReadOnly && user?.role === 'TEAM' && (
                      <div style={{ borderRadius: 8, border: '1px dashed rgba(0,180,216,0.2)', padding: 14, background: 'rgba(0,180,216,0.03)' }}>
                        <p style={labelStyle}>Invite Player by Email / Username</p>
                        <div style={{ position: 'relative' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" value={inviteEmail} onChange={(e) => handlePlayerSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInvitePlayer()} onFocus={() => playerSearchResults.length > 0 && setShowPlayerDropdown(true)} onBlur={() => setTimeout(() => setShowPlayerDropdown(false), 150)} placeholder="Search player by name or email..." style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={handleInvitePlayer} disabled={inviteLoading || !inviteEmail.trim()} style={{ ...miniBtn, opacity: (inviteLoading || !inviteEmail.trim()) ? 0.5 : 1 }}>
                              {inviteLoading ? <Spinner dark /> : '📩 Invite'}
                            </button>
                          </div>
                          {showPlayerDropdown && playerSearchResults.length > 0 && (
                            <div style={{ position: 'absolute', zIndex: 60, top: 'calc(100% + 4px)', left: 0, right: 0, background: 'rgba(10,22,40,0.98)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(3,4,94,0.6)' }}>
                              {playerSearchResults.map((p: any) => (
                                <button key={p.id} onMouseDown={() => handleInviteByPlayer(p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(0,180,216,0.08)', transition: 'background 120ms' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,180,216,0.08)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#03045e,#0077b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                                    {(p.name || p.username || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc' }}>{p.name || p.username}</p>
                                    <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 1 }}>{p.email}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {playerSearchLoading && <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 4 }}>Searching...</p>}
                        </div>
                      </div>
                    )}

                    {/* Roster list */}
                    {teamRoster.length === 0 ? (
                      <div style={{ borderRadius: 8, background: 'rgba(0,180,216,0.04)', padding: '20px', textAlign: 'center' }}>
                        <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)' }}>No players in roster yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {teamRoster.map((player: any) => {
                          const pid = player.id || player.playerId;
                          const pname = player.name || player.username || 'Player';
                          const isConfirmRemove = confirmRemoveId === pid;
                          const isConfirmCaptain = confirmCaptainId === pid;
                          return (
                            <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 8, background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.1)', transition: 'border-color 150ms' }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#03045e,#0077b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                                {pname.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pname}</p>
                                <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 1 }}>{player.role || player.sport_role || 'Player'}</p>
                              </div>
                              {player.isCaptain && (
                                <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fbbf24', flexShrink: 0 }}>👑 Captain</span>
                              )}
                              {!manageReadOnly && user?.role === 'TEAM' && (
                                <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                                  {!player.isCaptain && (
                                    isConfirmCaptain ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)' }}>Captain?</span>
                                        <button onClick={() => { setConfirmCaptainId(null); handleAssignCaptain(pid, pname); }} disabled={assigningCaptainId === pid} style={{ ...miniBtn, padding: '3px 8px', fontSize: 10, opacity: assigningCaptainId === pid ? 0.6 : 1 }}>✓</button>
                                        <button onClick={() => setConfirmCaptainId(null)} style={{ ...ghostBtn, padding: '3px 8px', fontSize: 10 }}>✕</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setConfirmCaptainId(pid); setConfirmRemoveId(null); }} style={{ padding: '4px 8px', borderRadius: 5, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 11, cursor: 'pointer' }}>👑</button>
                                    )
                                  )}
                                  {isConfirmRemove ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)' }}>Remove?</span>
                                      <button onClick={() => { setConfirmRemoveId(null); handleRemovePlayer(pid, pname); }} disabled={removingPlayerId === pid} style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: removingPlayerId === pid ? 0.6 : 1 }}>✓</button>
                                      <button onClick={() => setConfirmRemoveId(null)} style={{ ...ghostBtn, padding: '3px 8px', fontSize: 10 }}>✕</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setConfirmRemoveId(pid); setConfirmCaptainId(null); }} style={{ padding: '4px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 11, cursor: 'pointer' }}>✕</button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Teams;