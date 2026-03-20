import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';
import { showToast } from '../utils/toast';

const SPORT_COLORS: Record<string, string> = {
  CRICKET: 'from-emerald-600 to-teal-700',
  FOOTBALL: 'from-blue-600 to-indigo-700',
  KABADDI: 'from-orange-600 to-red-700',
  VOLLEYBALL: 'from-yellow-500 to-orange-600',
  BASKETBALL: 'from-orange-500 to-red-600',
  BADMINTON: 'from-purple-600 to-violet-700',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  REGISTRATION_OPEN: 'bg-green-100 text-green-700 border border-green-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-gray-100 text-gray-600 border border-gray-200',
};

function TournamentManagement() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'matches'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [loadingPlayerDetails, setLoadingPlayerDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    venue: '',
    registrationFee: 0,
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    teamCapacity: 0,
    rules: '',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (!storedUser || !accessToken) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchTournament();
  }, [tournamentId, navigate]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tournaments/${tournamentId}`);
      setTournament(response.data);
      setEditFormData({
        name: response.data.name,
        venue: response.data.venue,
        registrationFee: response.data.registrationFee,
        startDate: response.data.dates.startDate.split('T')[0],
        endDate: response.data.dates.endDate.split('T')[0],
        registrationDeadline: response.data.registrationDeadline.split('T')[0],
        teamCapacity: response.data.teamCapacity,
        rules: response.data.rules?.description || '',
      });
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to load tournament');
      navigate('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await apiClient.post(`/tournaments/${tournamentId}/publish`);
      showToast.success('Tournament published successfully!');
      fetchTournament();
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to publish tournament');
    }
  };

  const handleUpdateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const start = new Date(editFormData.startDate);
      const end = new Date(editFormData.endDate);
      const deadline = new Date(editFormData.registrationDeadline);
      if (end <= start) { showToast.error('End date must be after start date'); return; }
      if (deadline >= start) { showToast.error('Registration deadline must be before start date'); return; }
      const updateData = {
        name: editFormData.name,
        venue: editFormData.venue,
        registrationFee: editFormData.registrationFee,
        dates: { startDate: editFormData.startDate, endDate: editFormData.endDate },
        registrationDeadline: editFormData.registrationDeadline,
        teamCapacity: editFormData.teamCapacity,
        rules: editFormData.rules ? { description: editFormData.rules } : {},
      };
      await apiClient.put(`/tournaments/${tournamentId}`, updateData);
      showToast.success('Tournament updated successfully!');
      setShowEditModal(false);
      fetchTournament();
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to update tournament');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewPlayerDetails = async (playerId: string, registration: any) => {
    try {
      setLoadingPlayerDetails(true);
      setShowPlayerDetailsModal(true);
      const response = await apiClient.get(`/users/${playerId}`);
      setSelectedPlayer({ ...response.data, registration });
    } catch {
      showToast.error('Failed to load player details');
      setShowPlayerDetailsModal(false);
    } finally {
      setLoadingPlayerDetails(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'registrations', label: `Registrations (${tournament?.registrations?.length || 0})` },
    { id: 'matches', label: 'Matches' },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading tournament...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  const sportGradient = SPORT_COLORS[tournament.sport] || 'from-indigo-600 to-purple-700';
  const regCount = tournament.registrations?.length || 0;
  const capacityPct = tournament.teamCapacity > 0 ? Math.round((regCount / tournament.teamCapacity) * 100) : 0;
  const revenue = regCount * (tournament.registrationFee || 0);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tournaments')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-indigo-600 font-medium text-sm mb-6 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tournaments
        </button>

        {/* Hero Header */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${sportGradient} p-6 sm:p-8 mb-6 shadow-xl`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white" />
          </div>
          <div className="relative flex flex-col sm:flex-row justify-between items-start gap-5">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold uppercase tracking-wide rounded-full border border-white/20 backdrop-blur-sm">
                  {tournament.sport}
                </span>
                <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/20 backdrop-blur-sm">
                  {tournament.format}
                </span>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[tournament.status] || 'bg-gray-100 text-gray-600'}`}>
                  {tournament.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{tournament.name}</h1>
              <div className="flex flex-wrap gap-4 text-white/70 text-sm mt-2">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {tournament.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(tournament.dates.startDate)} – {formatDate(tournament.dates.endDate)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-medium text-sm transition-all backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              {tournament.status === 'DRAFT' && (
                <button
                  onClick={handlePublish}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-green-700 rounded-xl font-semibold text-sm hover:bg-green-50 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Publish
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Registrations', value: regCount, sub: `of ${tournament.teamCapacity}`, icon: (
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ), bg: 'bg-purple-50' },
            { label: 'Total Revenue', value: `₹${revenue.toLocaleString()}`, sub: `@₹${tournament.registrationFee}/team`, icon: (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ), bg: 'bg-green-50' },
            { label: 'Capacity Filled', value: `${capacityPct}%`, sub: `Deadline: ${formatDate(tournament.registrationDeadline)}`, icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ), bg: 'bg-blue-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Tournament Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Venue', value: tournament.venue },
                { label: 'Registration Fee', value: `₹${tournament.registrationFee}` },
                { label: 'Start Date', value: formatDate(tournament.dates.startDate) },
                { label: 'End Date', value: formatDate(tournament.dates.endDate) },
                { label: 'Registration Deadline', value: formatDate(tournament.registrationDeadline) },
                { label: tournament.format === 'LEAGUE' ? 'Player Capacity' : 'Team Capacity', value: `${regCount} / ${tournament.teamCapacity}` },
              ].map((item) => (
                <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="font-semibold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
            {/* Capacity Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
                <span>Registration Progress</span>
                <span>{regCount} / {tournament.teamCapacity} ({capacityPct}%)</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-700 bg-gradient-to-r ${sportGradient}`}
                  style={{ width: `${Math.min(capacityPct, 100)}%` }}
                />
              </div>
            </div>
            {tournament.rules?.description && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Rules & Description</p>
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{tournament.rules.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Registrations Tab */}
        {activeTab === 'registrations' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {tournament.format === 'LEAGUE' ? 'Registered Players' : 'Registered Teams'}
              </h2>
            </div>
            {tournament.registrations && tournament.registrations.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {tournament.registrations.map((reg: any, index: number) => {
                  const isPlayer = reg.playerId !== undefined;
                  const displayName = isPlayer
                    ? (reg.playerName || `Player ${index + 1}`)
                    : (reg.teamName || `Team ${index + 1}`);
                  return (
                    <div key={reg.id} className="px-6 py-4 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-indigo-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {isPlayer ? (
                              <button
                                onClick={() => handleViewPlayerDetails(reg.playerId, reg)}
                                className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left text-sm"
                              >
                                {displayName}
                              </button>
                            ) : (
                              <span className="font-semibold text-gray-900 text-sm">{displayName}</span>
                            )}
                            {isPlayer && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Player</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Registered {formatDate(reg.registeredAt || tournament.dates.startDate)}
                          </p>
                          {isPlayer && reg.playerDetails?.role && (
                            <p className="text-xs text-gray-500 mt-0.5">Role: {reg.playerDetails.role.replace(/_/g, ' ')}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        reg.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 border border-green-200' :
                        reg.status === 'PENDING' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}>
                        {reg.status === 'PENDING' ? 'Payment Pending' : reg.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No registrations yet</h3>
                <p className="text-gray-400 text-sm">
                  {tournament.format === 'LEAGUE'
                    ? 'Players will appear here once they register'
                    : 'Teams will appear here once they register'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Match Schedule</h3>
            <p className="text-gray-400 text-sm">Matches will be scheduled once registration closes</p>
          </div>
        )}
      </main>

      {/* Edit Tournament Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-gray-100">
            <form onSubmit={handleUpdateTournament}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Tournament</h3>
                  {tournament.status === 'REGISTRATION_OPEN' && (
                    <p className="text-xs text-amber-500 mt-0.5">Some fields may be locked after registration opens</p>
                  )}
                </div>
                <button type="button" onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tournament Name *</label>
                  <input type="text" required value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Venue *</label>
                  <input type="text" required value={editFormData.venue} onChange={(e) => setEditFormData({...editFormData, venue: e.target.value})} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Start Date *</label>
                    <input type="date" required value={editFormData.startDate} onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">End Date *</label>
                    <input type="date" required value={editFormData.endDate} onChange={(e) => setEditFormData({...editFormData, endDate: e.target.value})} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Registration Fee (₹)</label>
                    <input type="number" min="0" value={editFormData.registrationFee} onChange={(e) => setEditFormData({...editFormData, registrationFee: parseInt(e.target.value) || 0})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Registration Deadline *</label>
                    <input type="date" required value={editFormData.registrationDeadline} onChange={(e) => setEditFormData({...editFormData, registrationDeadline: e.target.value})} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {tournament.format === 'LEAGUE' ? 'Player' : 'Team'} Capacity *
                  </label>
                  <input
                    type="number" required
                    min={tournament.status === 'REGISTRATION_OPEN' ? tournament.registrations?.length || 2 : 2}
                    max="1000"
                    value={editFormData.teamCapacity}
                    onChange={(e) => setEditFormData({...editFormData, teamCapacity: parseInt(e.target.value) || 16})}
                    className="input-field"
                  />
                  {tournament.status === 'REGISTRATION_OPEN' && (
                    <p className="text-xs text-gray-400 mt-1">Current registrations: {tournament.registrations?.length || 0}. Cannot reduce below.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Rules & Description</label>
                  <textarea value={editFormData.rules} onChange={(e) => setEditFormData({...editFormData, rules: e.target.value})} rows={4} className="input-field resize-none" placeholder="Enter tournament rules..." />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={updating} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                  {updating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      {showPlayerDetailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Player Details</h3>
              <button onClick={() => { setShowPlayerDetailsModal(false); setSelectedPlayer(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {loadingPlayerDetails ? (
                <div className="flex justify-center py-10">
                  <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                </div>
              ) : selectedPlayer ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Name', value: selectedPlayer.profile?.name },
                        { label: 'Email', value: selectedPlayer.email },
                        { label: 'Phone', value: selectedPlayer.profile?.contactDetails?.phone },
                        { label: 'Age', value: selectedPlayer.profile?.age },
                        { label: 'City', value: selectedPlayer.profile?.location?.city },
                        { label: 'Location', value: selectedPlayer.profile?.location
                          ? typeof selectedPlayer.profile.location === 'string'
                            ? selectedPlayer.profile.location
                            : [selectedPlayer.profile.location.city, selectedPlayer.profile.location.state, selectedPlayer.profile.location.country].filter(Boolean).join(', ')
                          : undefined }
                      ].map((item) => item.value ? (
                        <div key={item.label} className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{item.label}</p>
                          <p className="font-medium text-gray-900 text-sm">{item.value}</p>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Registration Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedPlayer.registration?.playerDetails?.role && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Role</p>
                          <p className="font-medium text-gray-900 text-sm">{selectedPlayer.registration.playerDetails.role.replace(/_/g, ' ')}</p>
                        </div>
                      )}
                      {selectedPlayer.registration?.playerDetails?.preferredPosition && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Preferred Position</p>
                          <p className="font-medium text-gray-900 text-sm">{selectedPlayer.registration.playerDetails.preferredPosition}</p>
                        </div>
                      )}
                      {selectedPlayer.registration?.playerDetails?.experience && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Experience</p>
                          <p className="font-medium text-gray-900 text-sm">{selectedPlayer.registration.playerDetails.experience}</p>
                        </div>
                      )}
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${
                          selectedPlayer.registration?.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>{selectedPlayer.registration?.status || 'N/A'}</span>
                      </div>
                    </div>
                    {selectedPlayer.registration?.playerDetails?.additionalInfo && (
                      <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Additional Info</p>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedPlayer.registration.playerDetails.additionalInfo}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No player details available</p>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button onClick={() => { setShowPlayerDetailsModal(false); setSelectedPlayer(null); }} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentManagement;
