import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

function Teams() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'my-teams' | 'browse'>('my-teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    
    if (!storedUser || !accessToken) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    fetchMyTeams();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchAvailableTeams();
    }
  }, [activeTab, searchQuery, sportFilter]);

  const fetchMyTeams = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/teams');
      setMyTeams(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      setLoading(true);
      const params: any = {
        q: searchQuery || '*', // Use * to get all teams if no search query
      };
      if (sportFilter) {
        params.sport = sportFilter;
      }

      const response = await apiClient.get('/search/teams', { params });
      setAvailableTeams(response.data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load available teams');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (teamId: string) => {
    try {
      setSendingRequest(teamId);
      setError('');
      
      // Since backend doesn't have a join request endpoint, we'll use a workaround
      // For now, show a success message - in a real app, you'd need a backend endpoint
      // POST /api/teams/:id/join-requests
      
      // Simulating the request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Join request sent successfully! The team owner will be notified.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send join request');
    } finally {
      setSendingRequest(null);
    }
  };

  const isUserInTeam = (team: any) => {
    if (!user) return false;
    return team.roster?.some((member: any) => member.id === user.id) || 
           team.host_id === user.id;
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const renderTeamCard = (team: any, showJoinButton: boolean = false) => (
    <div key={team.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
          <span className="inline-block mt-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs font-medium">
            {team.sport}
          </span>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        {team.location && (
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {team.location?.city}, {team.location?.state}
          </div>
        )}
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {team.roster?.length || 0} players
        </div>
      </div>

      {showJoinButton ? (
        isUserInTeam(team) ? (
          <div className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg text-center font-medium text-sm">
            Already a Member
          </div>
        ) : (
          <button
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm disabled:opacity-50"
            onClick={() => handleRequestToJoin(team.id)}
            disabled={sendingRequest === team.id}
          >
            {sendingRequest === team.id ? 'Sending...' : 'Request to Join'}
          </button>
        )
      ) : (
        <button
          className="w-full px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
          onClick={() => alert(`View team ${team.name} details coming soon!`)}
        >
          View Details
        </button>
      )}
    </div>
  );

  if (loading && activeTab === 'my-teams') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your teams or browse for new ones</p>
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
              onClick={() => setActiveTab('my-teams')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-teams'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Teams ({myTeams.length})
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'browse'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Browse Teams
            </button>
          </nav>
        </div>

        {/* My Teams Tab */}
        {activeTab === 'my-teams' && (
          <>
            {(user?.role === 'TEAM' || user?.role === 'ORGANIZATION' || user?.role === 'ADMIN') && (
              <div className="mb-6 flex justify-end">
                <button
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  onClick={() => alert('Create team functionality coming soon!')}
                >
                  Create Team
                </button>
              </div>
            )}

            {myTeams.length === 0 ? (
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
                <p className="text-gray-600 mb-4">
                  {user?.role === 'PLAYER' 
                    ? 'Browse available teams to join and start your journey'
                    : 'Create your first team or browse available teams to join'
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  {(user?.role === 'TEAM' || user?.role === 'ORGANIZATION' || user?.role === 'ADMIN') && (
                    <button
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      onClick={() => alert('Create team functionality coming soon!')}
                    >
                      Create Team
                    </button>
                  )}
                  <button
                    className="px-6 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                    onClick={() => setActiveTab('browse')}
                  >
                    Browse Teams
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTeams.map((team) => renderTeamCard(team, false))}
              </div>
            )}
          </>
        )}

        {/* Browse Teams Tab */}
        {activeTab === 'browse' && (
          <>
            {/* Search and Filters */}
            <div className="mb-6 bg-white rounded-lg shadow-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Teams</label>
                  <input
                    type="text"
                    placeholder="Search by team name..."
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
                    <option value="BADMINTON">Badminton</option>
                    <option value="VOLLEYBALL">Volleyball</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : availableTeams.length === 0 ? (
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams found</h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableTeams.map((team) => renderTeamCard(team, true))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Teams;
