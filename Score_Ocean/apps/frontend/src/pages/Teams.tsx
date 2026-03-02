import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';
import { showToast } from '../utils/toast';

const SPORT_META: Record<string, { icon: string; gradient: string; bg: string; text: string }> = {
  CRICKET:    { icon: '🏏', gradient: 'from-green-500 to-emerald-600',  bg: 'bg-green-50',  text: 'text-green-700'  },
  FOOTBALL:   { icon: '⚽', gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
  KABADDI:    { icon: '🤼', gradient: 'from-amber-500 to-orange-600',  bg: 'bg-amber-50',  text: 'text-amber-700'  },
  VOLLEYBALL: { icon: '🏐', gradient: 'from-rose-500 to-pink-600',     bg: 'bg-rose-50',   text: 'text-rose-700'   },
  BASKETBALL: { icon: '🏀', gradient: 'from-orange-500 to-red-600',    bg: 'bg-orange-50', text: 'text-orange-700' },
  BADMINTON:  { icon: '🏸', gradient: 'from-teal-500 to-cyan-600',     bg: 'bg-teal-50',   text: 'text-teal-700'   },
};

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

  // Team management modal
  const [managingTeam, setManagingTeam] = useState<any>(null);
  const [manageReadOnly, setManageReadOnly] = useState(false);
  const [manageTab, setManageTab] = useState<'overview' | 'sports' | 'roster'>('overview');
  const [teamSports, setTeamSports] = useState<any[]>([]);
  const [teamRoster, setTeamRoster] = useState<any[]>([]);
  const [addSportValue, setAddSportValue] = useState('');
  const [addSportLoading, setAddSportLoading] = useState(false);
  // Player management
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [assigningCaptainId, setAssigningCaptainId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmCaptainId, setConfirmCaptainId] = useState<string | null>(null);
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([]);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  // Leave request state
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [myLeaveRequest, setMyLeaveRequest] = useState<any>(null);
  const [requestingLeave, setRequestingLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [approvingLeave, setApprovingLeave] = useState<string | null>(null);

  const ALL_SPORTS = ['CRICKET', 'FOOTBALL', 'KABADDI', 'VOLLEYBALL', 'BASKETBALL', 'BADMINTON'];

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
        // For orgs — fetch affiliated teams
        const r = await apiClient.get('/teams/org-affiliates');
        setMyTeams(r.data?.data || r.data || []);
      } else {
        const r = await apiClient.get('/teams');
        setMyTeams(r.data?.data || r.data || []);
      }
      // For TEAM role — also load pending org invitations
      if (u?.role === 'TEAM') {
        try {
          const ir = await apiClient.get('/teams/org-invitations/pending');
          setPendingOrgInvites(ir.data || []);
        } catch (_) { /* silently ignore */ }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally { setLoading(false); }
  };

  const fetchAvailableTeams = async () => {
    try {
      setBrowseLoading(true);
      // Use /teams/browse endpoint which doesn't require search params
      const params: any = {};
      if (sportFilter) params.sport = sportFilter;
      const r = await apiClient.get('/teams/browse', { params });
      let teams = r.data?.data || r.data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        teams = teams.filter((t: any) => t.name?.toLowerCase().includes(q));
      }
      setAvailableTeams(teams);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally { setBrowseLoading(false); }
  };

  const handleRequestToJoin = async (teamId: string) => {
    try {
      setSendingRequest(teamId);
      await new Promise(r => setTimeout(r, 900));
      showToast.success('Join request sent! The team manager will be notified.');
    } catch (err: any) {
      showToast.error('Failed to send join request');
    } finally { setSendingRequest(null); }
  };

  const handleSendOrgInvite = async (teamId: string) => {
    try {
      setSendingInvite(teamId);
      await apiClient.post(`/teams/${teamId}/org-invite`);
      setInviteSent((prev) => new Set([...prev, teamId]));
      showToast.success('Invite sent to team!');
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to send invite');
    } finally { setSendingInvite(null); }
  };

  const handleAcceptOrgInvite = async (inviteId: string) => {
    try {
      setAcceptingInvite(inviteId);
      await apiClient.post(`/teams/org-invitations/${inviteId}/accept`);
      setPendingOrgInvites((prev) => prev.filter((i) => i.id !== inviteId));
      fetchMyTeams();
      showToast.success('Organisation invitation accepted!');
    } catch (err: any) {
      showToast.error('Failed to accept invite');
    } finally { setAcceptingInvite(null); }
  };

  const handleRejectOrgInvite = async (inviteId: string) => {
    try {
      await apiClient.post(`/teams/org-invitations/${inviteId}/reject`);
      setPendingOrgInvites((prev) => prev.filter((i) => i.id !== inviteId));
      showToast.info('Invitation declined.');
    } catch (err: any) {
      showToast.error('Failed to reject invite');
    }
  };

  const handleOpenManage = async (team: any, readOnly = false) => {
    setManagingTeam(team);
    setManageReadOnly(readOnly);
    setManageTab('overview');
    setTeamSports([]);
    setTeamRoster([]);
    setInviteEmail('');
    setConfirmRemoveId(null);
    setConfirmCaptainId(null);
    setPlayerSearchResults([]);
    setShowPlayerDropdown(false);
    setLeaveRequests([]);
    setMyLeaveRequest(null);
    setLeaveReason('');
    setShowLeaveModal(false);
    try {
      const [sportsRes, rosterRes] = await Promise.allSettled([
        apiClient.get(`/teams/${team.id}/sports`),
        apiClient.get(`/teams/${team.id}/roster`),
      ]);
      if (sportsRes.status === 'fulfilled') setTeamSports(sportsRes.value.data?.data || sportsRes.value.data || []);
      if (rosterRes.status === 'fulfilled') setTeamRoster(rosterRes.value.data?.data || rosterRes.value.data || []);
    } catch { /* ignore */ }
    // Load leave requests for host
    if (!readOnly && user?.role === 'TEAM') {
      try {
        const lr = await apiClient.get(`/teams/${team.id}/leave-requests`);
        setLeaveRequests(lr.data || []);
      } catch { /* ignore */ }
    }
    // Check if current player has a pending leave request
    if (user?.role === 'PLAYER') {
      try {
        const checkRes = await apiClient.get(`/teams/${team.id}/leave-requests/my`);
        setMyLeaveRequest(checkRes.data || null);
      } catch { /* ignore */ }
    }
  };

  const handlePlayerSearch = async (query: string) => {
    setInviteEmail(query);
    if (!query.trim() || query.trim().length < 2) {
      setPlayerSearchResults([]);
      setShowPlayerDropdown(false);
      return;
    }
    try {
      setPlayerSearchLoading(true);
      const sportParam = managingTeam?.sport ? `&sport=${managingTeam.sport}` : '';
      const r = await apiClient.get(`/users/search?q=${encodeURIComponent(query.trim())}${sportParam}`);
      const results = r.data?.data || r.data || [];
      setPlayerSearchResults(results);
      setShowPlayerDropdown(results.length > 0);
    } catch {
      setPlayerSearchResults([]);
    } finally { setPlayerSearchLoading(false); }
  };

  const handleRequestLeave = async () => {
    if (!managingTeam) return;
    try {
      setRequestingLeave(true);
      await apiClient.post(`/teams/${managingTeam.id}/leave-request`, { reason: leaveReason.trim() || undefined });
      showToast.success('Leave request submitted! The team host will review it.');
      setMyLeaveRequest({ status: 'PENDING', reason: leaveReason });
      setShowLeaveModal(false);
      setLeaveReason('');
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to submit leave request');
    } finally { setRequestingLeave(false); }
  };

  const handleApproveLeave = async (requestId: string) => {
    if (!managingTeam) return;
    try {
      setApprovingLeave(requestId);
      await apiClient.post(`/teams/${managingTeam.id}/leave-requests/${requestId}/approve`);
      setLeaveRequests((p) => p.filter((r) => r.id !== requestId));
      // refresh roster
      const rosterRes = await apiClient.get(`/teams/${managingTeam.id}/roster`);
      setTeamRoster(rosterRes.data?.data || rosterRes.data || []);
      showToast.success('Leave approved. Player removed.');
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to approve');
    } finally { setApprovingLeave(null); }
  };

  const handleRejectLeave = async (requestId: string) => {
    if (!managingTeam) return;
    try {
      await apiClient.post(`/teams/${managingTeam.id}/leave-requests/${requestId}/reject`);
      setLeaveRequests((p) => p.filter((r) => r.id !== requestId));
      showToast.info('Leave request rejected.');
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to reject');
    }
  };

  const handleInviteByPlayer = async (player: any) => {
    if (!managingTeam) return;
    try {
      setInviteLoading(true);
      setShowPlayerDropdown(false);
      await apiClient.post(`/teams/${managingTeam.id}/invitations`, { playerId: player.id });
      showToast.success(`Invite sent to ${player.name || player.email}!`);
      setInviteEmail('');
      setPlayerSearchResults([]);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to send invite');
    } finally { setInviteLoading(false); }
  };

  const handleAddSport = async () => {
    if (!managingTeam || !addSportValue) return;
    try {
      setAddSportLoading(true);
      await apiClient.post(`/teams/${managingTeam.id}/sports`, { sport: addSportValue });
      const r = await apiClient.get(`/teams/${managingTeam.id}/sports`);
      setTeamSports(r.data?.data || r.data || []);
      setAddSportValue('');
      showToast.success(`${addSportValue} added!`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to add sport');
    } finally { setAddSportLoading(false); }
  };

  const handleRemoveTeamSport = async (sport: string) => {
    if (!managingTeam) return;
    try {
      await apiClient.delete(`/teams/${managingTeam.id}/sports/${sport}`);
      setTeamSports((p) => p.filter((s: any) => s.sport !== sport));
      showToast.success(`${sport} removed from team.`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to remove sport');
    }
  };

  const handleSetPrimaryTeamSport = async (sport: string) => {
    if (!managingTeam) return;
    try {
      await apiClient.put(`/teams/${managingTeam.id}/primary-sport`, { sport });
      setManagingTeam((p: any) => ({ ...p, sport }));
      fetchMyTeams(user);
      showToast.success(`${sport} is now the primary sport.`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to change primary sport');
    }
  };

  // ── Player Management ─────────────────────────────────────────────────────
  const handleInvitePlayer = async () => {
    if (!managingTeam || !inviteEmail.trim()) {
      showToast.error('Please enter a player email or ID.');
      return;
    }
    try {
      setInviteLoading(true);
      // Look up player by email first, then invite by id
      const sportParam = managingTeam?.sport ? `&sport=${managingTeam.sport}` : '';
      const search = await apiClient.get(`/users/search?q=${encodeURIComponent(inviteEmail.trim())}${sportParam}`);
      const found = (search.data?.data || search.data || [])[0];
      if (!found) { showToast.error('Player not found. Check the email/username.'); return; }
      await apiClient.post(`/teams/${managingTeam.id}/invitations`, { playerId: found.id });
      showToast.success(`Invite sent to ${found.name || found.email}!`);
      setInviteEmail('');
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to send invite');
    } finally { setInviteLoading(false); }
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (!managingTeam) return;
    try {
      setRemovingPlayerId(playerId);
      await apiClient.delete(`/teams/${managingTeam.id}/roster/${playerId}`);
      setTeamRoster((p) => p.filter((pl: any) => (pl.id || pl.playerId) !== playerId));
      showToast.success(`${playerName} removed from roster.`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to remove player');
    } finally { setRemovingPlayerId(null); }
  };

  const handleAssignCaptain = async (playerId: string, playerName: string) => {
    if (!managingTeam) return;
    try {
      setAssigningCaptainId(playerId);
      await apiClient.put(`/teams/${managingTeam.id}/captain`, { captainId: playerId });
      setTeamRoster((p) => p.map((pl: any) => ({ ...pl, isCaptain: (pl.id || pl.playerId) === playerId })));
      showToast.success(`${playerName} is now captain!`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to assign captain');
    } finally { setAssigningCaptainId(null); }
  };

  const isUserInTeam = (team: any) => {
    if (!user) return false;
    return team.roster?.some((m: any) => m.id === user.id) || team.host_id === user.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
            <p className="text-gray-500 text-sm">Loading teams...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTeamCard = (team: any, showJoin = false) => {
    const meta = SPORT_META[team.sport] || { icon: '🛡️', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700' };
    const inTeam = isUserInTeam(team);
    return (
      <div key={team.id} className="card-hover p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}>
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{team.name}</h3>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg ${meta.bg} ${meta.text} text-xs font-semibold`}>
                {meta.icon} {team.sport}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {team.location?.city && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>📍</span>
              <span>{[team.location.city, team.location.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>👥</span>
            <span>{team.roster?.length || team.rosterCount || 0} players</span>
          </div>
        </div>

        {showJoin ? (
          user?.role === 'ORGANIZATION' ? (
            inviteSent.has(team.id) ? (
              <div className="w-full py-2.5 bg-violet-50 text-violet-700 rounded-xl text-center text-sm font-bold border-2 border-violet-200">
                ✓ Invite Sent
              </div>
            ) : (
              <button
                onClick={() => handleSendOrgInvite(team.id)}
                disabled={sendingInvite === team.id}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sendingInvite === team.id ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending...</>
                ) : '📩 Send Invite'}
              </button>
            )
          ) : user?.role === 'TEAM' ? (
            /* Teams browse other teams to view only — no joining another team */
            <button
              onClick={() => handleOpenManage(team, true)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors">
              View Team →
            </button>
          ) : inTeam ? (
            <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-center text-sm font-bold border-2 border-emerald-200">
              ✓ Member
            </div>
          ) : (
            <button
              onClick={() => handleRequestToJoin(team.id)}
              disabled={sendingRequest === team.id}
              className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-primary-700 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {sendingRequest === team.id ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending...</>
              ) : 'Request to Join'}
            </button>
          )
        ) : (
          <button
            onClick={() => handleOpenManage(team)}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors">
            Manage Team →
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>Teams</h1>
            <p className="text-gray-500 mt-1">
              {user?.role === 'ORGANIZATION'
                ? 'Invite teams to join your organization'
                : 'Manage your teams and discover new ones'}
            </p>
          </div>
          {(user?.role === 'TEAM' || user?.role === 'ADMIN') && (
            <button
              onClick={() => showToast.info('Create team functionality coming soon!')}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-primary-700 transition-all shadow-sm">
              + Create Team
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-rose-700 font-medium text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200/60 p-1 rounded-2xl w-fit">
          {[
            { id: 'my-teams', label: user?.role === 'ORGANIZATION' ? 'Our Teams' : 'My Teams', count: myTeams.length },
            { id: 'browse',   label: user?.role === 'ORGANIZATION' ? 'Find Teams' : 'Browse Teams', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-300 text-gray-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* My Teams */}
        {activeTab === 'my-teams' && (
          <>
            {/* Pending org invitations (for TEAM role) */}
            {user?.role === 'TEAM' && pendingOrgInvites.length > 0 && (
              <div className="card p-5 border-2 border-violet-200 bg-violet-50/30">
                <h3 className="text-sm font-black text-violet-800 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">{pendingOrgInvites.length}</span>
                  Organization Invites
                </h3>
                <div className="space-y-2">
                  {pendingOrgInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between bg-white rounded-2xl p-3 border border-violet-100">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{inv.orgName}</p>
                        <p className="text-xs text-gray-500">wants "{inv.teamName}" to join their organization</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleRejectOrgInvite(inv.id)}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-colors">
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptOrgInvite(inv.id)}
                          disabled={acceptingInvite === inv.id}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold hover:from-violet-700 transition-all disabled:opacity-50">
                          {acceptingInvite === inv.id ? '...' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myTeams.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">
                  {user?.role === 'ORGANIZATION' ? '🏢' : '🛡️'}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {user?.role === 'ORGANIZATION' ? 'No affiliated teams yet' : 'No teams yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {user?.role === 'ORGANIZATION'
                    ? 'Browse teams and send invites to affiliate them with your organization'
                    : user?.role === 'PLAYER'
                    ? 'Browse available teams to request to join'
                    : 'Create your first team or browse available ones'}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {(user?.role === 'TEAM' || user?.role === 'ADMIN') && (
                    <button onClick={() => showToast.info('Create team functionality coming soon!')} className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-primary-700 transition-all shadow-sm">
                      Create Team
                    </button>
                  )}
                  <button onClick={() => setActiveTab('browse')} className="px-5 py-2.5 border-2 border-primary-500 text-primary-600 rounded-xl text-sm font-bold hover:bg-primary-50 transition-colors">
                    {user?.role === 'ORGANIZATION' ? 'Find & Invite Teams' : 'Browse Teams'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myTeams.map((t) => renderTeamCard(t, false))}
              </div>
            )}
          </>
        )}

        {/* Browse Teams */}
        {activeTab === 'browse' && (
          <>
            {/* Search & Filter */}
            <div className="card p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search Teams</label>
                  <input
                    type="text"
                    placeholder="Search by team name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sport</label>
                  <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="input-field">
                    <option value="">All Sports</option>
                    {Object.keys(SPORT_META).map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {browseLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
                <p className="text-gray-400 text-sm">Searching teams...</p>
              </div>
            ) : availableTeams.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">🔍</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No teams found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableTeams.map((t) => renderTeamCard(t, true))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Team Management Modal ── */}
      {managingTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setManagingTeam(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${SPORT_META[managingTeam.sport]?.gradient || 'from-gray-400 to-slate-500'} flex items-center justify-center text-2xl shadow-sm`}>
                    {SPORT_META[managingTeam.sport]?.icon || '🛡️'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{managingTeam.name}</h3>
                    <p className="text-sm text-gray-400">{managingTeam.sport} · {managingTeam.location?.city || ''}</p>
                    {manageReadOnly && <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold mt-1">👁 View Only</span>}
                  </div>
                </div>
                <button onClick={() => setManagingTeam(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0">✕</button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mt-4">
                {(['overview', 'sports', 'roster'] as const).map((tab) => (
                  <button key={tab} onClick={() => setManageTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${manageTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab === 'overview' ? '📋 Overview' : tab === 'sports' ? '🎯 Sports' : '👥 Roster'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {manageTab === 'overview' && (
                <div className="space-y-4">
                  {[
                    { label: 'Primary Sport', value: managingTeam.sport },
                    { label: 'Location', value: [managingTeam.location?.city, managingTeam.location?.state].filter(Boolean).join(', ') || '—' },
                    { label: 'Players', value: `${managingTeam.roster?.length ?? managingTeam.rosterCount ?? 0} players` },
                    { label: 'Sports Active', value: `${teamSports.length} sport(s)` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
                      <span className="text-sm font-semibold text-gray-500">{label}</span>
                      <span className="text-sm font-bold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sports Tab */}
              {manageTab === 'sports' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">Manage the sports this team participates in. The primary sport is used for tournament matching.</p>

                  {/* Existing sports */}
                  {teamSports.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-500">No sport profiles yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teamSports.map((sp: any) => {
                        const meta = SPORT_META[sp.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700' };
                        const isPrimary = sp.sport === managingTeam.sport;
                        return (
                          <div key={sp.id || sp.sport}
                            className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 ${isPrimary ? `${meta.bg} border-current` : 'border-gray-100 bg-gray-50'}`}>
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-sm shadow-sm flex-shrink-0`}>{meta.icon}</div>
                            <div className="flex-1">
                              <p className={`font-bold text-sm ${isPrimary ? meta.text : 'text-gray-800'}`}>{sp.sport}</p>
                              {isPrimary && <p className="text-xs text-gray-400">Primary sport</p>}
                            </div>
                            {/* Only team host can manage — check user role */}
                            {user?.role === 'TEAM' && !manageReadOnly && (
                              <div className="flex gap-1 flex-shrink-0">
                                {!isPrimary && (
                                  <button onClick={() => handleSetPrimaryTeamSport(sp.sport)} title="Set as primary sport"
                                    className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-black transition-colors">
                                    ★ Primary
                                  </button>
                                )}
                                <button onClick={() => handleRemoveTeamSport(sp.sport)} title="Remove sport"
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs transition-colors">✕</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Sport (only for team host, non read-only) */}
                  {user?.role === 'TEAM' && !manageReadOnly && (() => {
                    const existingSports = teamSports.map((s: any) => s.sport);
                    const available = ALL_SPORTS.filter((s) => !existingSports.includes(s));
                    if (available.length === 0) return <p className="text-xs text-gray-400 text-center">All available sports have been added.</p>;
                    return (
                      <div className="rounded-2xl border-2 border-dashed border-gray-200 p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add New Sport</p>
                        <div className="flex gap-2">
                          <select value={addSportValue || available[0]} onChange={(e) => setAddSportValue(e.target.value)}
                            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-400">
                            {available.map((s) => <option key={s} value={s}>{SPORT_META[s]?.icon} {s}</option>)}
                          </select>
                          <button onClick={handleAddSport} disabled={addSportLoading}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                            {addSportLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : '+ Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Roster Tab */}
              {manageTab === 'roster' && (
                <div className="space-y-4">
                  {/* Pending Leave Requests (host only) */}
                  {!manageReadOnly && user?.role === 'TEAM' && leaveRequests.length > 0 && (
                    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">{leaveRequests.length}</span>
                        Pending Leave Requests
                      </p>
                      <div className="space-y-2">
                        {leaveRequests.map((req: any) => (
                          <div key={req.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-amber-100">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(req.playerName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900">{req.playerName}</p>
                              {req.reason && <p className="text-xs text-gray-500 truncate">"{req.reason}"</p>}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleApproveLeave(req.id)}
                                disabled={approvingLeave === req.id}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors">
                                {approvingLeave === req.id ? '...' : '✓ Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectLeave(req.id)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-colors">
                                ✕ Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request to Leave (for PLAYER role) */}
                  {user?.role === 'PLAYER' && !manageReadOnly && (
                    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/30 p-4">
                      <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3">Leave Team</p>
                      {myLeaveRequest ? (
                        <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-amber-200">
                          <span className="text-amber-600 text-lg">⏳</span>
                          <div>
                            <p className="text-sm font-bold text-amber-800">Leave Request Pending</p>
                            <p className="text-xs text-gray-500">Waiting for host approval. You cannot join another {managingTeam?.sport} team until this resolves.</p>
                          </div>
                        </div>
                      ) : showLeaveModal ? (
                        <div className="space-y-3">
                          <textarea
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            placeholder="Reason for leaving (optional)..."
                            rows={2}
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-400 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleRequestLeave}
                              disabled={requestingLeave}
                              className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                              {requestingLeave ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Submitting...</> : '📤 Submit Request'}
                            </button>
                            <button
                              onClick={() => { setShowLeaveModal(false); setLeaveReason(''); }}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-xl transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowLeaveModal(true)}
                          className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-700 text-sm font-bold rounded-xl transition-colors">
                          🚪 Request to Leave Team
                        </button>
                      )}
                    </div>
                  )}

                  {/* Invite Player (team host, non read-only only) */}
                  {!manageReadOnly && user?.role === 'TEAM' && (
                    <div className="rounded-2xl border-2 border-dashed border-emerald-200 p-4 bg-emerald-50/40">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Invite Player by Email / Username</p>
                      <div className="relative">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inviteEmail}
                            onChange={(e) => handlePlayerSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvitePlayer()}
                            onFocus={() => playerSearchResults.length > 0 && setShowPlayerDropdown(true)}
                            onBlur={() => setTimeout(() => setShowPlayerDropdown(false), 150)}
                            placeholder="Search player by name or email..."
                            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-400"
                          />
                          <button onClick={handleInvitePlayer} disabled={inviteLoading || !inviteEmail.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                            {inviteLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : '📩 Invite'}
                          </button>
                        </div>
                        {/* Search dropdown */}
                        {showPlayerDropdown && playerSearchResults.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                            {playerSearchResults.map((p: any) => (
                              <button
                                key={p.id}
                                onMouseDown={() => handleInviteByPlayer(p)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 text-left transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {(p.name || p.username || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{p.name || p.username}</p>
                                  <p className="text-xs text-gray-400">{p.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {playerSearchLoading && (
                          <p className="text-xs text-gray-400 mt-1 pl-1">Searching...</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Roster list */}
                  {teamRoster.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-500">No players in roster yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teamRoster.map((player: any) => {
                        const pid = player.id || player.playerId;
                        const pname = player.name || player.username || 'Player';
                        const isConfirmRemove = confirmRemoveId === pid;
                        const isConfirmCaptain = confirmCaptainId === pid;
                        return (
                          <div key={pid} className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-100 transition-all">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {pname.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{pname}</p>
                              <p className="text-xs text-gray-400">{player.role || player.sport_role || 'Player'}</p>
                            </div>
                            {player.isCaptain && (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">👑 Captain</span>
                            )}
                            {!manageReadOnly && user?.role === 'TEAM' && (
                              <div className="flex gap-1 flex-shrink-0 items-center">
                                {!player.isCaptain && (
                                  isConfirmCaptain ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500 font-semibold">Make captain?</span>
                                      <button onClick={() => { setConfirmCaptainId(null); handleAssignCaptain(pid, pname); }}
                                        disabled={assigningCaptainId === pid}
                                        className="px-2 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50">
                                        {assigningCaptainId === pid ? '...' : '✓ Yes'}
                                      </button>
                                      <button onClick={() => setConfirmCaptainId(null)}
                                        className="px-2 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300">
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setConfirmCaptainId(pid); setConfirmRemoveId(null); }}
                                      title="Make captain"
                                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-bold transition-colors">
                                      👑
                                    </button>
                                  )
                                )}
                                {isConfirmRemove ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500 font-semibold">Remove?</span>
                                    <button onClick={() => { setConfirmRemoveId(null); handleRemovePlayer(pid, pname); }}
                                      disabled={removingPlayerId === pid}
                                      className="px-2 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 disabled:opacity-50">
                                      {removingPlayerId === pid ? '...' : '✓ Yes'}
                                    </button>
                                    <button onClick={() => setConfirmRemoveId(null)}
                                      className="px-2 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300">
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setConfirmRemoveId(pid); setConfirmCaptainId(null); }}
                                    title="Remove from team"
                                    className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors">
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teams;
