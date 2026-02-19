import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import socketService from '../services/socket';
import Layout from '../components/Layout';

function Match() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<any>(null);
  const [pointsTable, setPointsTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scoreEntryMode, setScoreEntryMode] = useState(false);
  const [scoreData, setScoreData] = useState({
    homeScore: 0,
    awayScore: 0,
  });

  useEffect(() => {
    if (!matchId) {
      navigate('/tournaments');
      return;
    }

    fetchMatch();
    fetchPointsTable();
    
    // Subscribe to real-time updates
    socketService.connect();
    socketService.subscribeToMatch(matchId, handleMatchUpdate);

    return () => {
      socketService.unsubscribeFromMatch(matchId);
    };
  }, [matchId, navigate]);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/matches/${matchId}`);
      setMatch(response.data);
      setScoreData({
        homeScore: response.data.score.homeScore || 0,
        awayScore: response.data.score.awayScore || 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const fetchPointsTable = async () => {
    try {
      if (match?.tournamentId) {
        const response = await apiClient.get(`/tournaments/${match.tournamentId}/points-table`);
        setPointsTable(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load points table:', err);
    }
  };

  const handleMatchUpdate = (data: any) => {
    setMatch((prev: any) => ({ ...prev, ...data }));
    if (data.score) {
      setScoreData({
        homeScore: data.score.homeScore || 0,
        awayScore: data.score.awayScore || 0,
      });
    }
  };

  const handleUpdateScore = async () => {
    try {
      await apiClient.put(`/matches/${matchId}/score`, scoreData);
      setScoreEntryMode(false);
      fetchMatch();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update score');
    }
  };

  const handleFinalizeMatch = async () => {
    if (!confirm('Are you sure you want to finalize this match? This action cannot be undone.')) return;
    
    try {
      await apiClient.post(`/matches/${matchId}/finalize`);
      fetchMatch();
      fetchPointsTable();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize match');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading match...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!match) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Match not found</p>
        </div>
      </Layout>
    );
  }

  const isLive = match.status === 'IN_PROGRESS';
  const isCompleted = match.status === 'COMPLETED';

  return (
    <Layout>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-700 hover:text-red-900">×</button>
        </div>
      )}

      {/* Match Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
              {match.sport}
            </span>
            {isLive && (
              <span className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
            {isCompleted && (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                COMPLETED
              </span>
            )}
          </div>
          {!isCompleted && (
            <div className="flex gap-2">
              <button
                onClick={() => setScoreEntryMode(true)}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Update Score
              </button>
              {isLive && (
                <button
                  onClick={handleFinalizeMatch}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Finalize Match
                </button>
              )}
            </div>
          )}
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{match.homeTeam?.name || 'Home Team'}</h3>
            <div className="text-4xl font-bold text-primary-600">{match.score.homeScore}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">VS</div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{match.awayTeam?.name || 'Away Team'}</h3>
            <div className="text-4xl font-bold text-primary-600">{match.score.awayScore}</div>
          </div>
        </div>

        {/* Sport-specific data */}
        {match.score.sportSpecificData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Match Details</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {Object.entries(match.score.sportSpecificData).map(([key, value]) => (
                <div key={key}>
                  <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <p className="font-medium text-gray-900">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Score Entry Modal */}
      {scoreEntryMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Score</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {match.homeTeam?.name} Score
                </label>
                <input
                  type="number"
                  value={scoreData.homeScore}
                  onChange={(e) => setScoreData({ ...scoreData, homeScore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {match.awayTeam?.name} Score
                </label>
                <input
                  type="number"
                  value={scoreData.awayScore}
                  onChange={(e) => setScoreData({ ...scoreData, awayScore: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={() => setScoreEntryMode(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateScore}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score History */}
      {match.scoreHistory && match.scoreHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score History</h3>
          <div className="space-y-2">
            {match.scoreHistory.map((update: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-600">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-medium text-gray-900">
                  {update.homeScore} - {update.awayScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points Table */}
      {pointsTable && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Points Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Rank</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Team</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">P</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">W</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">L</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">D</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Pts</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.standings?.map((standing: any) => (
                  <tr key={standing.teamId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{standing.rank}</td>
                    <td className="py-3 px-2 text-gray-900">{standing.teamName}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{standing.played}</td>
                    <td className="py-3 px-2 text-center text-green-600">{standing.won}</td>
                    <td className="py-3 px-2 text-center text-red-600">{standing.lost}</td>
                    <td className="py-3 px-2 text-center text-gray-600">{standing.drawn}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-900">{standing.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Match;
