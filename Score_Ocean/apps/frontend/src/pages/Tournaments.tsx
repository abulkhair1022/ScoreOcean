import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

function Tournaments() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [registeringTournament, setRegisteringTournament] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    
    if (!storedUser || !accessToken) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchTournaments(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchTournaments(user);
    }
  }, [searchQuery, sportFilter, statusFilter]);

  const fetchTournaments = async (currentUser: any) => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (searchQuery) params.q = searchQuery;
      if (sportFilter) params.sport = sportFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await apiClient.get('/tournaments', { params });
      const tournaments = response.data;
      
      setAllTournaments(tournaments);
      
      // Filter tournaments where user is host or team is registered
      const userTournaments = tournaments.filter((t: any) => 
        t.host_id === currentUser.id || 
        t.registrations?.some((r: any) => r.team?.members?.some((m: any) => m.id === currentUser.id))
      );
      
      setMyTournaments(userTournaments);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTeam = async (tournamentId: string) => {
    try {
      setRegisteringTournament(tournamentId);
      setError('');
      
      // For now, show alert about team selection - in a full implementation,
      // this would show a modal to select which team to register
      alert('Team registration functionality: Please select a team to register for this tournament. This will integrate with payment gateway for registration fee.');
      
      // Example implementation:
      // const response = await apiClient.post(`/tournaments/${tournamentId}/register`, { teamId: selectedTeamId });
      // Show success message and refresh tournaments
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register for tournament');
    } finally {
      setRegisteringTournament(null);
    }
  };

  const isUserRegistered = (tournament: any) => {
    if (!user) return false;
    return tournament.registrations?.some((r: any) => 
      r.team?.members?.some((m: any) => m.id === user.id)
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTournamentCard = (tournament: any) => {
    const isRegistered = isUserRegistered(tournament);
    const canRegister = tournament.status === 'REGISTRATION_OPEN' && !isRegistered;
    const isHost = tournament.host_id === user?.id;

    return (
      <div key={tournament.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
            {isHost && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                Host
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs font-medium">
              {tournament.sport}
            </span>
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
              {tournament.format}
            </span>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(tournament.status)}`}>
              {tournament.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {tournament.venue}
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(tournament.dates.startDate)} - {formatDate(tournament.dates.endDate)}
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ₹{tournament.registrationFee}
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {tournament.registrations?.length || 0} / {tournament.teamCapacity} teams
          </div>
        </div>

        <div className="space-y-2">
          {isRegistered ? (
            <div className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg text-center font-medium text-sm">
              ✓ Registered
            </div>
          ) : canRegister ? (
            <button
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50"
              onClick={() => handleRegisterTeam(tournament.id)}
              disabled={registeringTournament === tournament.id}
            >
              {registeringTournament === tournament.id ? 'Processing...' : 'Register Team'}
            </button>
          ) : (
            <button
              className="w-full px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
              onClick={() => alert(`View tournament ${tournament.name} details coming soon!`)}
            >
              View Details
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading && activeTab === 'all') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  const displayTournaments = activeTab === 'all' ? allTournaments : myTournaments;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
          <p className="mt-1 text-sm text-gray-500">Browse and register for tournaments</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Tournaments ({allTournaments.length})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Tournaments ({myTournaments.length})
            </button>
          </nav>
        </div>

        {/* Filters and Create Button */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Tournaments</label>
              <input
                type="text"
                placeholder="Search by tournament name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Sports</option>
                <option value="CRICKET">Cricket</option>
                <option value="FOOTBALL">Football</option>
                <option value="BASKETBALL">Basketball</option>
                <option value="VOLLEYBALL">Volleyball</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          
          {(user?.role === 'TEAM' || user?.role === 'ORGANIZATION') && (
            <div className="mt-4 flex justify-end">
              <button
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                onClick={() => alert('Create tournament functionality coming soon!')}
              >
                Create Tournament
              </button>
            </div>
          )}
        </div>

        {/* Tournament Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : displayTournaments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'my' ? 'No tournaments yet' : 'No tournaments available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'my' 
                ? 'Register for tournaments to see them here'
                : 'Check back later for upcoming tournaments'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTournaments.map((tournament) => renderTournamentCard(tournament))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Tournaments;
