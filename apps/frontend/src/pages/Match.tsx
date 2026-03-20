import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';
import { showToast } from '../utils/toast';
import { io, Socket } from 'socket.io-client';

function Match() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isAwayHost, setIsAwayHost] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [scoreForm, setScoreForm] = useState({
    homeScore: 0,
    awayScore: 0
  });
  const [cricketScoreForm, setCricketScoreForm] = useState({
    homeRuns: 0,
    homeWickets: 0,
    homeOvers: 0,
    homeBalls: 0,
    awayRuns: 0,
    awayWickets: 0,
    awayOvers: 0,
    awayBalls: 0
  });
  const [currentInnings, setCurrentInnings] = useState<'home' | 'away'>('home');
  const [ballByBallHistory, setBallByBallHistory] = useState<any[]>([]);
  const [currentOver, setCurrentOver] = useState<any[]>([]);
  const [showExtraRunsModal, setShowExtraRunsModal] = useState(false);
  const [extraType, setExtraType] = useState<'wide' | 'noball' | 'bye' | 'legbye' | null>(null);
  const [extraRuns, setExtraRuns] = useState(0);
  const [currentBowler, setCurrentBowler] = useState('');
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [batsmanScores, setBatsmanScores] = useState<{[key: string]: {runs: number, balls: number, fours: number, sixes: number}}>({});
  const [bowlingFigures, setBowlingFigures] = useState<any[]>([]);
  const [selectedScorecardTab, setSelectedScorecardTab] = useState<'home' | 'away'>('home');
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([]);
  const [playerNameMap, setPlayerNameMap] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    
    if (!storedUser || !accessToken) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    if (matchId) {
      fetchMatch(parsedUser);
      fetchScoreHistory();
      fetchTeamRosters();
      loadCricketStats();
      setupWebSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [matchId, navigate]);

  const setupWebSocket = () => {
    // Use the Vite proxy in dev (same origin → /socket.io proxied to :3000)
    // so we never hardcode a port and benefit from proxy's ws:true setting.
    const socketUrl = import.meta.env.PROD
      ? import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin
      : window.location.origin;

    const newSocket = io(socketUrl, {
      auth: {
        token: localStorage.getItem('accessToken')
      },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      newSocket.emit('join-room', `match:${matchId}`);
    });

    newSocket.on('match:score-update', (data) => {
      console.log('Score update received:', data);
      setMatch((prev: any) => ({
        ...prev,
        score: {
          ...prev.score,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          sportSpecificData: data.sportSpecificData || prev.score.sportSpecificData
        }
      }));
      
      // Update cricket form if it's a cricket match
      if (data.sportSpecificData) {
        const homeData = data.sportSpecificData.home || {};
        const awayData = data.sportSpecificData.away || {};
        setCricketScoreForm({
          homeRuns: homeData.runs || 0,
          homeWickets: homeData.wickets || 0,
          homeOvers: Math.floor((homeData.overs || 0)),
          homeBalls: Math.round(((homeData.overs || 0) % 1) * 10),
          awayRuns: awayData.runs || 0,
          awayWickets: awayData.wickets || 0,
          awayOvers: Math.floor((awayData.overs || 0)),
          awayBalls: Math.round(((awayData.overs || 0) % 1) * 10)
        });
      }
      
      fetchScoreHistory();
    });

    newSocket.on('match:started', () => {
      console.log('Match started');
      const storedUser = localStorage.getItem('user');
      fetchMatch(storedUser ? JSON.parse(storedUser) : user);
    });

    newSocket.on('match:ended', () => {
      console.log('Match ended');
      const storedUser = localStorage.getItem('user');
      fetchMatch(storedUser ? JSON.parse(storedUser) : user);
    });

    setSocket(newSocket);
  };

  const fetchMatch = async (currentUser: any) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/matches/${matchId}`);
      const matchData = response.data;
      setMatch(matchData);
      
      // Set initial score form values
      setScoreForm({
        homeScore: matchData.score.homeScore || 0,
        awayScore: matchData.score.awayScore || 0
      });

      // Set cricket-specific scores if available
      if (matchData.sport === 'CRICKET' && matchData.score.sportSpecificData) {
        const homeData = matchData.score.sportSpecificData.home || {};
        const awayData = matchData.score.sportSpecificData.away || {};
        setCricketScoreForm({
          homeRuns: homeData.runs || 0,
          homeWickets: homeData.wickets || 0,
          homeOvers: Math.floor((homeData.overs || 0)),
          homeBalls: Math.round(((homeData.overs || 0) % 1) * 10),
          awayRuns: awayData.runs || 0,
          awayWickets: awayData.wickets || 0,
          awayOvers: Math.floor((awayData.overs || 0)),
          awayBalls: Math.round(((awayData.overs || 0) % 1) * 10)
        });
      }

      // Team info is now embedded directly in the match response — no extra requests needed
      if (matchData.homeTeam) setHomeTeam(matchData.homeTeam);
      if (matchData.awayTeam) setAwayTeam(matchData.awayTeam);

      // Check if user is host of either team
      const userIsHost = matchData.homeTeam?.hostId === currentUser.id ||
                        matchData.awayTeam?.hostId === currentUser.id;
      setIsHost(userIsHost);
      setIsAwayHost(matchData.awayTeam?.hostId === currentUser.id);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const fetchScoreHistory = async () => {
    try {
      const response = await apiClient.get(`/matches/${matchId}/history`);
      setScoreHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch score history:', error);
    }
  };

  const loadCricketStats = async () => {
    try {
      const response = await apiClient.get(`/cricket-stats/${matchId}`);
      const { batting, balls } = response.data;

      // Restore batsman scores (key by both player_id and batsman_name for flexible lookup)
      if (batting && batting.length > 0) {
        const scores: any = {};
        batting.forEach((b: any) => {
          const scoreData = {
            runs: b.runs,
            balls: b.balls,
            fours: b.fours,
            sixes: b.sixes
          };
          // Key only by player_id (UUID) when available; fall back to batsman_name
          // This prevents duplicate rows in the scorecard
          const key = b.player_id || b.batsman_name;
          if (key) scores[key] = scoreData;
        });
        setBatsmanScores(scores);
      }

      // Restore ball-by-ball history
      if (balls && balls.length > 0) {
        const history = balls.map((b: any) => ({
          runs: b.runs,
          extras: b.extras,
          isWicket: b.isWicket,
          over: b.over_number,
          ball: b.ball_number,
          bowler: b.bowler_name || b.bowler || '',
          batsman: b.batsman_name || b.batsman || '',
          timestamp: b.created_at
        }));
        setBallByBallHistory(history);
      }

      // Load bowling figures
      await loadBowlingFigures();
    } catch (error) {
      console.error('Failed to load cricket stats:', error);
    }
  };

  const loadBowlingFigures = async () => {
    try {
      const response = await apiClient.get(`/cricket-stats/${matchId}/bowling-figures`);
      setBowlingFigures(response.data || []);
    } catch (error) {
      console.error('Failed to load bowling figures:', error);
    }
  };

  const fetchTeamRosters = async () => {
    try {
      const response = await apiClient.get(`/matches/${matchId}/rosters`);
      const { homeTeam, awayTeam } = response.data;
      
      setHomeTeamPlayers(homeTeam.players || []);
      setAwayTeamPlayers(awayTeam.players || []);
      
      // Create a map of player IDs to names for easy lookup
      const nameMap: {[key: string]: string} = {};
      [...homeTeam.players, ...awayTeam.players].forEach((player: any) => {
        nameMap[player.id] = player.name;
      });
      setPlayerNameMap(nameMap);
    } catch (error) {
      console.error('Failed to fetch team rosters:', error);
      showToast.error('Failed to load team players');
    }
  };

  const handleExtraClick = (type: 'wide' | 'noball' | 'bye' | 'legbye') => {
    setExtraType(type);
    setExtraRuns(0);
    setShowExtraRunsModal(true);
  };

  const handleUndoLastBall = async () => {
    if (currentOver.length === 0 && ballByBallHistory.length === 0) {
      showToast.error('No balls to undo');
      return;
    }

    try {
      const battingTeam = currentInnings;
      let lastBall;
      
      if (currentOver.length > 0) {
        lastBall = currentOver[currentOver.length - 1];
        setCurrentOver(prev => prev.slice(0, -1));
      } else {
        lastBall = ballByBallHistory[ballByBallHistory.length - 1];
        setBallByBallHistory(prev => prev.slice(0, -1));
      }

      // Reverse the score changes
      let newRuns = battingTeam === 'home' ? cricketScoreForm.homeRuns : cricketScoreForm.awayRuns;
      let newWickets = battingTeam === 'home' ? cricketScoreForm.homeWickets : cricketScoreForm.awayWickets;
      let newBalls = battingTeam === 'home' ? cricketScoreForm.homeBalls : cricketScoreForm.awayBalls;
      let newOvers = battingTeam === 'home' ? cricketScoreForm.homeOvers : cricketScoreForm.awayOvers;

      // Subtract runs
      newRuns -= lastBall.runs;
      if (lastBall.extras) {
        newRuns -= lastBall.extras.runs;
      }

      // Reverse wicket
      if (lastBall.isWicket) {
        newWickets = Math.max(newWickets - 1, 0);
      }

      // Reverse ball count
      if (!lastBall.extras || (lastBall.extras.type !== 'wide' && lastBall.extras.type !== 'noball')) {
        newBalls -= 1;
        if (newBalls < 0) {
          newOvers = Math.max(newOvers - 1, 0);
          newBalls = 5;
        }
      }

      // Update batsman score
      if (striker && !lastBall.extras) {
        setBatsmanScores(prev => ({
          ...prev,
          [striker]: {
            runs: Math.max((prev[striker]?.runs || 0) - lastBall.runs, 0),
            balls: Math.max((prev[striker]?.balls || 0) - 1, 0),
            fours: Math.max((prev[striker]?.fours || 0) - (lastBall.runs === 4 ? 1 : 0), 0),
            sixes: Math.max((prev[striker]?.sixes || 0) - (lastBall.runs === 6 ? 1 : 0), 0)
          }
        }));
      }

      // Update state
      if (battingTeam === 'home') {
        setCricketScoreForm({
          ...cricketScoreForm,
          homeRuns: newRuns,
          homeWickets: newWickets,
          homeOvers: newOvers,
          homeBalls: newBalls
        });
      } else {
        setCricketScoreForm({
          ...cricketScoreForm,
          awayRuns: newRuns,
          awayWickets: newWickets,
          awayOvers: newOvers,
          awayBalls: newBalls
        });
      }

      // Send update to backend
      const totalOvers = newOvers + (newBalls / 10);
      const runRate = totalOvers > 0 ? newRuns / totalOvers : 0;

      const homeData = battingTeam === 'home' ? {
        runs: newRuns,
        wickets: newWickets,
        overs: totalOvers,
        runRate: parseFloat(runRate.toFixed(2))
      } : {
        runs: cricketScoreForm.homeRuns,
        wickets: cricketScoreForm.homeWickets,
        overs: cricketScoreForm.homeOvers + (cricketScoreForm.homeBalls / 10),
        runRate: cricketScoreForm.homeOvers > 0 ? parseFloat((cricketScoreForm.homeRuns / (cricketScoreForm.homeOvers + (cricketScoreForm.homeBalls / 10))).toFixed(2)) : 0
      };

      const awayData = battingTeam === 'away' ? {
        runs: newRuns,
        wickets: newWickets,
        overs: totalOvers,
        runRate: parseFloat(runRate.toFixed(2))
      } : {
        runs: cricketScoreForm.awayRuns,
        wickets: cricketScoreForm.awayWickets,
        overs: cricketScoreForm.awayOvers + (cricketScoreForm.awayBalls / 10),
        runRate: cricketScoreForm.awayOvers > 0 ? parseFloat((cricketScoreForm.awayRuns / (cricketScoreForm.awayOvers + (cricketScoreForm.awayBalls / 10))).toFixed(2)) : 0
      };

      await apiClient.put(`/matches/${matchId}/score`, {
        homeScore: battingTeam === 'home' ? newRuns : cricketScoreForm.homeRuns,
        awayScore: battingTeam === 'away' ? newRuns : cricketScoreForm.awayRuns,
        sportSpecificData: {
          home: homeData,
          away: awayData
        }
      });

      showToast.success('Last ball undone');
    } catch (error: any) {
      showToast.error(error.response?.data?.error?.message || 'Failed to undo');
    }
  };

  const handleBallUpdate = async (runs: number, extras?: { type: 'wide' | 'noball' | 'bye' | 'legbye', runs: number }, isWicket: boolean = false) => {
    // Validate bowler name is entered
    if (!currentBowler || currentBowler.trim() === '') {
      showToast.error('Please enter bowler name before scoring');
      return;
    }

    // Validate striker name is entered
    if (!striker || striker.trim() === '') {
      showToast.error('Please enter striker name before scoring');
      return;
    }

    try {
      const battingTeam = currentInnings;

      let newRuns = battingTeam === 'home' ? cricketScoreForm.homeRuns : cricketScoreForm.awayRuns;
      let newWickets = battingTeam === 'home' ? cricketScoreForm.homeWickets : cricketScoreForm.awayWickets;
      let newBalls = battingTeam === 'home' ? cricketScoreForm.homeBalls : cricketScoreForm.awayBalls;
      let newOvers = battingTeam === 'home' ? cricketScoreForm.homeOvers : cricketScoreForm.awayOvers;

      // Add runs
      newRuns += runs;
      
      // Add extra runs if any
      if (extras) {
        newRuns += extras.runs;
      }

      // Update batsman score (only if not extras or if it's bye/legbye)
      if (striker && (!extras || extras.type === 'bye' || extras.type === 'legbye')) {
        setBatsmanScores(prev => ({
          ...prev,
          [striker]: {
            runs: (prev[striker]?.runs || 0) + runs,
            balls: (prev[striker]?.balls || 0) + 1,
            fours: (prev[striker]?.fours || 0) + (runs === 4 ? 1 : 0),
            sixes: (prev[striker]?.sixes || 0) + (runs === 6 ? 1 : 0)
          }
        }));
      }

      // Handle wicket
      if (isWicket) {
        newWickets = Math.min(newWickets + 1, 10);
        // Clear striker on wicket
        setStriker('');
      }

      // Rotate strike on odd runs (1, 3, 5) or after over completion
      const shouldRotateStrike = (runs % 2 === 1) || (newBalls === 0);
      if (shouldRotateStrike && !isWicket) {
        // Swap striker and non-striker
        setStriker(nonStriker);
        setNonStriker(striker);
      }

      // Increment ball count (wide and no-ball don't count as legal deliveries)
      if (!extras || (extras.type !== 'wide' && extras.type !== 'noball')) {
        newBalls += 1;
        if (newBalls >= 6) {
          newOvers += 1;
          newBalls = 0;
          setCurrentOver([]); // Reset current over
        }
      }

      // Calculate overs and run rate
      const totalOvers = newOvers + (newBalls / 10);
      const runRate = totalOvers > 0 ? newRuns / totalOvers : 0;

      // Update state
      if (battingTeam === 'home') {
        setCricketScoreForm({
          ...cricketScoreForm,
          homeRuns: newRuns,
          homeWickets: newWickets,
          homeOvers: newOvers,
          homeBalls: newBalls
        });
      } else {
        setCricketScoreForm({
          ...cricketScoreForm,
          awayRuns: newRuns,
          awayWickets: newWickets,
          awayOvers: newOvers,
          awayBalls: newBalls
        });
      }

      // Create ball record
      const ballRecord = {
        runs,
        extras,
        isWicket,
        over: newOvers,
        ball: newBalls === 0 ? 6 : newBalls,
        bowler: currentBowler,
        batsman: striker,
        timestamp: new Date()
      };

      // Add to current over or history
      if (newBalls === 0) {
        // Over completed, move to history
        setBallByBallHistory(prev => [...prev, ...currentOver, ballRecord]);
        setCurrentOver([]);
        setCurrentBowler(''); // Reset bowler for next over
      } else {
        setCurrentOver(prev => [...prev, ballRecord]);
      }

      // Send update to backend
      const homeData = battingTeam === 'home' ? {
        runs: newRuns,
        wickets: newWickets,
        overs: totalOvers,
        runRate: parseFloat(runRate.toFixed(2))
      } : {
        runs: cricketScoreForm.homeRuns,
        wickets: cricketScoreForm.homeWickets,
        overs: cricketScoreForm.homeOvers + (cricketScoreForm.homeBalls / 10),
        runRate: cricketScoreForm.homeOvers > 0 ? parseFloat((cricketScoreForm.homeRuns / (cricketScoreForm.homeOvers + (cricketScoreForm.homeBalls / 10))).toFixed(2)) : 0
      };

      const awayData = battingTeam === 'away' ? {
        runs: newRuns,
        wickets: newWickets,
        overs: totalOvers,
        runRate: parseFloat(runRate.toFixed(2))
      } : {
        runs: cricketScoreForm.awayRuns,
        wickets: cricketScoreForm.awayWickets,
        overs: cricketScoreForm.awayOvers + (cricketScoreForm.awayBalls / 10),
        runRate: cricketScoreForm.awayOvers > 0 ? parseFloat((cricketScoreForm.awayRuns / (cricketScoreForm.awayOvers + (cricketScoreForm.awayBalls / 10))).toFixed(2)) : 0
      };

      await apiClient.put(`/matches/${matchId}/score`, {
        homeScore: battingTeam === 'home' ? newRuns : cricketScoreForm.homeRuns,
        awayScore: battingTeam === 'away' ? newRuns : cricketScoreForm.awayRuns,
        sportSpecificData: {
          home: homeData,
          away: awayData
        },
        ballUpdate: ballRecord
      });

      // Save ball details to database
      try {
        await apiClient.post(`/cricket-stats/${matchId}/ball`, {
          innings: battingTeam === 'home' ? 1 : 2,
          overNumber: ballRecord.over,
          ballNumber: ballRecord.ball,
          bowlerId: currentBowler,
          bowlerName: playerNameMap[currentBowler] || currentBowler,
          batsmanId: striker,
          batsmanName: playerNameMap[striker] || striker,
          runs,
          extras,
          isWicket
        });

        // Reload bowling figures after each ball
        await loadBowlingFigures();
      } catch (error) {
        console.error('Failed to save ball details:', error);
      }

    } catch (error: any) {
      showToast.error(error.response?.data?.error?.message || 'Failed to update score');
    }
  };

  const handleUpdateScore = async () => {
    try {
      setUpdating(true);
      
      if (match?.sport === 'CRICKET') {
        // Calculate overs from overs and balls
        const homeOvers = cricketScoreForm.homeOvers + (cricketScoreForm.homeBalls / 10);
        const awayOvers = cricketScoreForm.awayOvers + (cricketScoreForm.awayBalls / 10);
        
        // Calculate run rates
        const homeRunRate = homeOvers > 0 ? cricketScoreForm.homeRuns / homeOvers : 0;
        const awayRunRate = awayOvers > 0 ? cricketScoreForm.awayRuns / awayOvers : 0;
        
        await apiClient.put(`/matches/${matchId}/score`, {
          homeScore: cricketScoreForm.homeRuns,
          awayScore: cricketScoreForm.awayRuns,
          sportSpecificData: {
            home: {
              runs: cricketScoreForm.homeRuns,
              wickets: cricketScoreForm.homeWickets,
              overs: homeOvers,
              runRate: parseFloat(homeRunRate.toFixed(2))
            },
            away: {
              runs: cricketScoreForm.awayRuns,
              wickets: cricketScoreForm.awayWickets,
              overs: awayOvers,
              runRate: parseFloat(awayRunRate.toFixed(2))
            }
          }
        });
      } else {
        await apiClient.put(`/matches/${matchId}/score`, scoreForm);
      }
      
      showToast.success('Score updated successfully');
    } catch (error: any) {
      showToast.error(error.response?.data?.error?.message || 'Failed to update score');
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptChallenge = async () => {
    try {
      await apiClient.post(`/matches/${matchId}/accept-challenge`);
      showToast.success('Challenge accepted! Match is now scheduled.');
      const storedUser = localStorage.getItem('user');
      if (storedUser) fetchMatch(JSON.parse(storedUser));
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to accept challenge');
    }
  };

  const handleDeclineChallenge = async () => {
    try {
      await apiClient.post(`/matches/${matchId}/decline-challenge`);
      showToast.success('Challenge declined.');
      navigate(-1);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to decline challenge');
    }
  };

  const handleStartMatch = async () => {
    try {
      await apiClient.post(`/matches/${matchId}/start`);
      showToast.success('Match started!');
      // Refresh match state so controls update immediately
      const storedUser = localStorage.getItem('user');
      if (storedUser) fetchMatch(JSON.parse(storedUser));
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to start match';
      // If already in progress, just refresh
      if (msg.toLowerCase().includes('already')) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) fetchMatch(JSON.parse(storedUser));
      } else {
        showToast.error(msg);
      }
    }
  };

  const handleEndMatch = async () => {
    try {
      // Save final batting statistics before ending match
      await saveBattingStatistics();
      
      await apiClient.post(`/matches/${matchId}/end`);
      showToast.success('Match ended!');
      // Refresh match state so the End Match button disappears
      const storedUser = localStorage.getItem('user');
      if (storedUser) fetchMatch(JSON.parse(storedUser));
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to end match';
      // If already completed (race or double-click), just refresh state silently
      if (msg.toLowerCase().includes('in progress') || msg.toLowerCase().includes('already')) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) fetchMatch(JSON.parse(storedUser));
      } else {
        showToast.error(msg);
      }
    }
  };

  const saveBattingStatistics = async () => {
    try {
      const batsmanData = Object.entries(batsmanScores).map(([playerId, stats]) => ({
        playerId,
        name: playerNameMap[playerId] || playerId,
        runs: stats.runs,
        balls: stats.balls,
        fours: stats.fours,
        sixes: stats.sixes,
        strikeRate: stats.balls > 0 ? parseFloat(((stats.runs / stats.balls) * 100).toFixed(2)) : 0,
        dismissal: (playerId === striker || playerId === nonStriker) ? 'not out' : 'out',
        isNotOut: (playerId === striker || playerId === nonStriker)
      }));

      if (batsmanData.length > 0) {
        const teamId = currentInnings === 'home' ? match?.homeTeamId : match?.awayTeamId;
        const innings = currentInnings === 'home' ? 1 : 2;

        await apiClient.post(`/cricket-stats/${matchId}/batting`, {
          teamId,
          innings,
          batsmanData
        });
      }
    } catch (error) {
      console.error('Failed to save batting statistics:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_ACCEPTANCE':
        return 'bg-amber-100 text-amber-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Match not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Sport-colored accent bar */}
          <div className={`h-1.5 w-full ${
            match.sport === 'CRICKET' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
            match.sport === 'FOOTBALL' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
            match.sport === 'KABADDI' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
            match.sport === 'BASKETBALL' ? 'bg-gradient-to-r from-orange-500 to-red-600' :
            match.sport === 'VOLLEYBALL' ? 'bg-gradient-to-r from-rose-500 to-pink-600' :
            match.sport === 'BADMINTON' ? 'bg-gradient-to-r from-teal-500 to-cyan-600' :
            'bg-gradient-to-r from-indigo-500 to-violet-600'
          }`} />
          <div className="p-6">
            {/* Title row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{
                  match.sport === 'CRICKET' ? '🏏' :
                  match.sport === 'FOOTBALL' ? '⚽' :
                  match.sport === 'KABADDI' ? '🤼' :
                  match.sport === 'BASKETBALL' ? '🏀' :
                  match.sport === 'VOLLEYBALL' ? '🏐' :
                  match.sport === 'BADMINTON' ? '🏸' : '🏆'
                }</span>
                <div>
                  <h1 className="text-xl font-black text-gray-900">{match.sport} Match</h1>
                  {match.tournamentId && <p className="text-xs text-gray-400 font-semibold">Tournament Match</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${getStatusColor(match.status)}`}>
                  {match.status.replace(/_/g, ' ')}
                </span>
                {match.status === 'IN_PROGRESS' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase border border-red-200">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

          {/* Score Display */}
          {match.sport === 'CRICKET' ? (
            // Cricket-specific scorecard
            <div>
              <div className="grid grid-cols-2 gap-4">
                {/* Home Team Cricket Score */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border-2 border-indigo-100">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-black text-gray-900">{homeTeam?.name || 'Home Team'}</h2>
                    {match.status === 'IN_PROGRESS' && currentInnings === 'home' && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                        BATTING
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-5xl font-black text-indigo-700">
                      {match.score.sportSpecificData?.home?.runs || match.score.homeScore || 0}
                    </span>
                    <span className="text-2xl font-semibold text-indigo-400">
                      /{match.score.sportSpecificData?.home?.wickets || 0}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Overs</span>
                      <span className="font-bold text-gray-900">
                        {match.score.sportSpecificData?.home?.overs?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Run Rate</span>
                      <span className="font-bold text-gray-900">
                        {match.score.sportSpecificData?.home?.runRate?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* Batsmen Display */}
                  {currentInnings === 'home' && (striker || nonStriker) && (
                    <div className="mt-3 pt-3 border-t border-indigo-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Batsmen</p>
                      <div className="space-y-1">
                        {striker && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <span>🏏</span>
                              <span className="font-bold text-gray-900">{playerNameMap[striker] || striker}</span>
                            </span>
                            <span className="text-gray-500 font-semibold">
                              {batsmanScores[striker]?.runs || 0} ({batsmanScores[striker]?.balls || 0})
                            </span>
                          </div>
                        )}
                        {nonStriker && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-gray-700">{playerNameMap[nonStriker] || nonStriker}</span>
                            <span className="text-gray-500 font-semibold">
                              {batsmanScores[nonStriker]?.runs || 0} ({batsmanScores[nonStriker]?.balls || 0})
                            </span>
                          </div>
                        )}
                      </div>
                      {currentBowler && (
                        <div className="mt-2 pt-2 border-t border-indigo-100">
                          <p className="text-xs text-gray-500">
                            Bowler: <span className="font-bold text-gray-800">{playerNameMap[currentBowler] || currentBowler}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ball-by-Ball Summary for Current Innings */}
                  {currentInnings === 'home' && currentOver.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-indigo-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">This Over</p>
                      <div className="flex flex-wrap gap-1">
                        {currentOver.map((ball, idx) => {
                          const displayText = ball.isWicket 
                            ? 'W' 
                            : ball.extras 
                              ? `${ball.extras.type === 'wide' ? 'Wd' : ball.extras.type === 'noball' ? 'Nb' : ball.extras.type === 'bye' ? 'B' : 'Lb'}${ball.runs + ball.extras.runs}`
                              : ball.runs.toString();
                          
                          return (
                            <div
                              key={idx}
                              className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                                ball.isWicket
                                  ? 'bg-red-500 text-white'
                                  : ball.runs === 6
                                  ? 'bg-purple-600 text-white'
                                  : ball.runs === 4
                                  ? 'bg-blue-500 text-white'
                                  : ball.extras
                                  ? 'bg-amber-400 text-white'
                                  : 'bg-gray-200 text-gray-800'
                              }`}
                            >
                              {displayText}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Away Team Cricket Score */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-5 rounded-2xl border-2 border-violet-100">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-black text-gray-900">{awayTeam?.name || 'Away Team'}</h2>
                    {match.status === 'IN_PROGRESS' && currentInnings === 'away' && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                        BATTING
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-5xl font-black text-violet-700">
                      {match.score.sportSpecificData?.away?.runs || match.score.awayScore || 0}
                    </span>
                    <span className="text-2xl font-semibold text-violet-400">
                      /{match.score.sportSpecificData?.away?.wickets || 0}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Overs</span>
                      <span className="font-bold text-gray-900">
                        {match.score.sportSpecificData?.away?.overs?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Run Rate</span>
                      <span className="font-bold text-gray-900">
                        {match.score.sportSpecificData?.away?.runRate?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* Batsmen Display */}
                  {currentInnings === 'away' && (striker || nonStriker) && (
                    <div className="mt-3 pt-3 border-t border-violet-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Batsmen</p>
                      <div className="space-y-1">
                        {striker && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <span>🏏</span>
                              <span className="font-bold text-gray-900">{playerNameMap[striker] || striker}</span>
                            </span>
                            <span className="text-gray-500 font-semibold">
                              {batsmanScores[striker]?.runs || 0} ({batsmanScores[striker]?.balls || 0})
                            </span>
                          </div>
                        )}
                        {nonStriker && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-gray-700">{playerNameMap[nonStriker] || nonStriker}</span>
                            <span className="text-gray-500 font-semibold">
                              {batsmanScores[nonStriker]?.runs || 0} ({batsmanScores[nonStriker]?.balls || 0})
                            </span>
                          </div>
                        )}
                      </div>
                      {currentBowler && (
                        <div className="mt-2 pt-2 border-t border-violet-100">
                          <p className="text-xs text-gray-500">
                            Bowler: <span className="font-bold text-gray-800">{playerNameMap[currentBowler] || currentBowler}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ball-by-Ball Summary for Current Innings */}
                  {currentInnings === 'away' && currentOver.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-violet-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">This Over</p>
                      <div className="flex flex-wrap gap-1">
                        {currentOver.map((ball, idx) => {
                          const displayText = ball.isWicket 
                            ? 'W' 
                            : ball.extras 
                              ? `${ball.extras.type === 'wide' ? 'Wd' : ball.extras.type === 'noball' ? 'Nb' : ball.extras.type === 'bye' ? 'B' : 'Lb'}${ball.runs + ball.extras.runs}`
                              : ball.runs.toString();
                          
                          return (
                            <div
                              key={idx}
                              className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                                ball.isWicket
                                  ? 'bg-red-500 text-white'
                                  : ball.runs === 6
                                  ? 'bg-purple-600 text-white'
                                  : ball.runs === 4
                                  ? 'bg-blue-500 text-white'
                                  : ball.extras
                                  ? 'bg-amber-400 text-white'
                                  : 'bg-gray-200 text-gray-800'
                              }`}
                            >
                              {displayText}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Summary */}
              {match.status === 'IN_PROGRESS' && match.score.sportSpecificData?.away?.runs > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-sm font-bold text-amber-900">
                    {match.score.sportSpecificData.away.runs > match.score.sportSpecificData.home.runs
                      ? `${awayTeam?.name} need ${(match.score.sportSpecificData.home.runs - match.score.sportSpecificData.away.runs + 1)} runs to win`
                      : `${homeTeam?.name} leading by ${(match.score.sportSpecificData.home.runs - match.score.sportSpecificData.away.runs)} runs`
                    }
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Generic score display for other sports
            <div className="grid grid-cols-3 gap-6 items-center py-4">
              {/* Home Team */}
              <div className="text-center bg-indigo-50 rounded-2xl p-5 border-2 border-indigo-100">
                <h2 className="text-lg font-black text-gray-900 mb-3">{homeTeam?.name || 'Home Team'}</h2>
                <div className="text-6xl font-black text-indigo-700">{match.score.homeScore}</div>

              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-400">VS</div>
              </div>

              {/* Away Team */}
              <div className="text-center bg-violet-50 rounded-2xl p-5 border-2 border-violet-100">
                <h2 className="text-lg font-black text-gray-900 mb-3">{awayTeam?.name || 'Away Team'}</h2>
                <div className="text-6xl font-black text-violet-700">{match.score.awayScore}</div>
              </div>
            </div>
          )}

          {/* Match Info */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Start Time</p>
              <p className="font-bold text-gray-800 text-sm mt-0.5">
                {match.startTime ? formatDate(match.startTime) : 'Not started'}
              </p>
            </div>
            {match.endTime && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">End Time</p>
                <p className="font-bold text-gray-800 text-sm mt-0.5">{formatDate(match.endTime)}</p>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Detailed Scorecard for Cricket */}
        {match.sport === 'CRICKET' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Scorecard</h3>
            
            {/* Team Tabs */}
            <div className="flex space-x-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setSelectedScorecardTab('home')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                  selectedScorecardTab === 'home'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {homeTeam?.name || 'Home Team'} Innings
                {match.score.sportSpecificData?.home?.runs !== undefined && (
                  <span className="ml-2 text-xs">
                    ({match.score.sportSpecificData.home.runs}/{match.score.sportSpecificData.home.wickets})
                  </span>
                )}
              </button>
              <button
                onClick={() => setSelectedScorecardTab('away')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                  selectedScorecardTab === 'away'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {awayTeam?.name || 'Away Team'} Innings
                {match.score.sportSpecificData?.away?.runs !== undefined && (
                  <span className="ml-2 text-xs">
                    ({match.score.sportSpecificData.away.runs}/{match.score.sportSpecificData.away.wickets})
                  </span>
                )}
              </button>
            </div>

            {/* Home Team Scorecard */}
            {selectedScorecardTab === 'home' && (
              <div>
                {/* Batting Scorecard */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {homeTeam?.name} Batting
                  </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batsman</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dismissal</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">B</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">4s</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">6s</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SR</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentInnings === 'home' && Object.entries(batsmanScores).map(([key, stats]) => {
                      const displayName = playerNameMap[key] || key;
                      const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={key}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{displayName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {key === striker || key === nonStriker ? 'not out*' : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.runs}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.balls}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.fours || 0}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.sixes || 0}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{strikeRate}</td>
                        </tr>
                      );
                    })}
                    {(currentInnings !== 'home' || Object.keys(batsmanScores).length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-sm text-gray-500 text-center">
                          {currentInnings !== 'home' ? 'Switch to home team batting to see data' : 'No batting data yet. Enter batsman names to start tracking.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bowling Figures */}
            {bowlingFigures.length > 0 && currentInnings === 'home' && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  {awayTeam?.name} Bowling
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bowler</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">O</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">M</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">W</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Econ</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wd</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">NB</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bowlingFigures.map((bowler, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{bowler.name}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.overs}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.maidens}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.runsConceded}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.wickets}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.economy}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.wides}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.noBalls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ball-by-Ball Summary */}
            {ballByBallHistory.length > 0 && currentInnings === 'home' && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Ball-by-Ball Summary</h4>
                <div className="space-y-3">
                  {(() => {
                    // Group balls by over
                    const overGroups: { [key: number]: any[] } = {};
                    ballByBallHistory.forEach(ball => {
                      const overNum = ball.over;
                      if (!overGroups[overNum]) {
                        overGroups[overNum] = [];
                      }
                      overGroups[overNum].push(ball);
                    });

                    return Object.entries(overGroups).map(([overNum, balls]) => {
                      const overRuns = balls.reduce((sum, ball) => {
                        let runs = ball.runs;
                        if (ball.extras) runs += ball.extras.runs;
                        return sum + runs;
                      }, 0);

                      return (
                        <div key={overNum} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">
                              Over {overNum} • {balls[0]?.bowler || 'Unknown'}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{overRuns} runs</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {balls.map((ball, idx) => {
                              const displayText = ball.isWicket 
                                ? 'W' 
                                : ball.extras 
                                  ? `${ball.extras.type === 'wide' ? 'Wd' : ball.extras.type === 'noball' ? 'Nb' : ball.extras.type === 'bye' ? 'B' : 'Lb'}${ball.runs + ball.extras.runs}`
                                  : ball.runs.toString();
                              
                              return (
                                <div
                                  key={idx}
                                  className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${
                                    ball.isWicket
                                      ? 'bg-red-600 text-white'
                                      : ball.runs === 6
                                      ? 'bg-purple-600 text-white'
                                      : ball.runs === 4
                                      ? 'bg-blue-600 text-white'
                                      : ball.extras
                                      ? 'bg-yellow-500 text-white'
                                      : 'bg-gray-200 text-gray-900'
                                  }`}
                                  title={`${ball.batsman || 'Unknown'} - ${ball.bowler || 'Unknown'}`}
                                >
                                  {displayText}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
              </div>
            )}

            {/* Away Team Scorecard */}
            {selectedScorecardTab === 'away' && (
              <div>
                {/* Batting Scorecard */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {awayTeam?.name} Batting
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batsman</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dismissal</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">B</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">4s</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">6s</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SR</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentInnings === 'away' && Object.entries(batsmanScores).map(([key, stats]) => {
                          const displayName = playerNameMap[key] || key;
                          const strikeRate = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : '0.00';
                          return (
                            <tr key={key}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{displayName}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {key === striker || key === nonStriker ? 'not out*' : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.runs}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.balls}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.fours || 0}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{stats.sixes || 0}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{strikeRate}</td>
                            </tr>
                          );
                        })}
                        {(currentInnings !== 'away' || Object.keys(batsmanScores).length === 0) && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-sm text-gray-500 text-center">
                              {currentInnings !== 'away' ? 'Switch to away team batting to see data' : 'No batting data yet. Enter batsman names to start tracking.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bowling Figures */}
                {bowlingFigures.length > 0 && currentInnings === 'away' && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      {homeTeam?.name} Bowling
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bowler</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">O</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">M</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">R</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">W</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Econ</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wd</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">NB</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bowlingFigures.map((bowler, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{bowler.name}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.overs}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.maidens}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.runsConceded}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.wickets}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.economy}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.wides}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{bowler.noBalls}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Ball-by-Ball Summary for Away Team */}
                {ballByBallHistory.length > 0 && currentInnings === 'away' && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Ball-by-Ball Summary</h4>
                    <div className="space-y-3">
                      {(() => {
                        // Group balls by over
                        const overGroups: { [key: number]: any[] } = {};
                        ballByBallHistory.forEach(ball => {
                          const overNum = ball.over;
                          if (!overGroups[overNum]) {
                            overGroups[overNum] = [];
                          }
                          overGroups[overNum].push(ball);
                        });

                        return Object.entries(overGroups).map(([overNum, balls]) => {
                          const overRuns = balls.reduce((sum, ball) => {
                            let runs = ball.runs;
                            if (ball.extras) runs += ball.extras.runs;
                            return sum + runs;
                          }, 0);

                          return (
                            <div key={overNum} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  Over {overNum} • {balls[0]?.bowler || 'Unknown'}
                                </span>
                                <span className="text-sm font-bold text-gray-900">{overRuns} runs</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {balls.map((ball, idx) => {
                                  const displayText = ball.isWicket 
                                    ? 'W' 
                                    : ball.extras 
                                      ? `${ball.extras.type === 'wide' ? 'Wd' : ball.extras.type === 'noball' ? 'Nb' : ball.extras.type === 'bye' ? 'B' : 'Lb'}${ball.runs + ball.extras.runs}`
                                      : ball.runs.toString();
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${
                                        ball.isWicket
                                          ? 'bg-red-600 text-white'
                                          : ball.runs === 6
                                          ? 'bg-purple-600 text-white'
                                          : ball.runs === 4
                                          ? 'bg-blue-600 text-white'
                                          : ball.extras
                                          ? 'bg-yellow-500 text-white'
                                          : 'bg-gray-200 text-gray-900'
                                      }`}
                                      title={`${ball.batsman || 'Unknown'} - ${ball.bowler || 'Unknown'}`}
                                    >
                                      {displayText}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Match Summary */}
            {match.status === 'COMPLETED' && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <h4 className="font-semibold text-indigo-900 mb-2">Match Result</h4>
                <p className="text-gray-700">
                  {match.score.homeScore > match.score.awayScore
                    ? `${homeTeam?.name} won by ${match.score.homeScore - match.score.awayScore} runs`
                    : match.score.awayScore > match.score.homeScore
                    ? `${awayTeam?.name} won by ${10 - (match.score.sportSpecificData?.away?.wickets || 0)} wickets`
                    : 'Match tied'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Match Controls (Only for team hosts) */}
        {isHost && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Match Controls</h3>

            {/* Pending Acceptance Banner */}
            {match.status === 'PENDING_ACCEPTANCE' && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏳</span>
                  <div className="flex-1">
                    {isAwayHost ? (
                      <>
                        <p className="font-black text-gray-900 mb-1">{homeTeam?.name} has challenged you!</p>
                        <p className="text-sm text-gray-600 mb-4">Accept to schedule the match, or decline to cancel it.</p>
                        <div className="flex gap-3">
                          <button onClick={handleAcceptChallenge}
                            className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                            ✓ Accept Challenge
                          </button>
                          <button onClick={handleDeclineChallenge}
                            className="px-5 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                            Decline
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-black text-gray-900 mb-1">Waiting for {awayTeam?.name} to accept</p>
                        <p className="text-sm text-gray-600">The match can only be started once the opponent team accepts your challenge.</p>
                        <button onClick={handleDeclineChallenge}
                          className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-300 transition-colors">
                          Cancel Challenge
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Start/End Match Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              {match.status === 'SCHEDULED' && (
                <button
                  onClick={handleStartMatch}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 shadow-sm transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Start Match
                </button>
              )}
              {match.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={handleEndMatch}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" /></svg>
                    End Match
                  </button>
                  {match.sport === 'CRICKET' && (
                    <button
                      onClick={() => setCurrentInnings(currentInnings === 'home' ? 'away' : 'home')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-blue-700 shadow-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      Switch Innings ({currentInnings === 'home' ? awayTeam?.name : homeTeam?.name} to Bat)
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Cricket Ball-by-Ball Scoring */}
            {match.status === 'IN_PROGRESS' && match.sport === 'CRICKET' && (
              <div className="space-y-6">
                {/* Current Batting Team */}
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {currentInnings === 'home' ? homeTeam?.name : awayTeam?.name} Batting
                      </h4>
                      <p className="text-sm text-gray-600">
                        Over {currentInnings === 'home' ? cricketScoreForm.homeOvers : cricketScoreForm.awayOvers}.
                        {currentInnings === 'home' ? cricketScoreForm.homeBalls : cricketScoreForm.awayBalls}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">
                        {currentInnings === 'home' ? cricketScoreForm.homeRuns : cricketScoreForm.awayRuns}/
                        {currentInnings === 'home' ? cricketScoreForm.homeWickets : cricketScoreForm.awayWickets}
                      </div>
                    </div>
                  </div>

                  {/* Batsmen and Bowler Info */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Striker 🏏 {striker && '(On Strike)'}
                      </label>
                      <select
                        value={striker}
                        onChange={(e) => setStriker(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select Striker</option>
                        {(currentInnings === 'home' ? homeTeamPlayers : awayTeamPlayers).map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
                          </option>
                        ))}
                      </select>
                      {striker && batsmanScores[striker] && (
                        <p className="text-xs text-gray-600 mt-1">
                          {batsmanScores[striker].runs} ({batsmanScores[striker].balls})
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Non-Striker</label>
                      <select
                        value={nonStriker}
                        onChange={(e) => setNonStriker(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select Non-Striker</option>
                        {(currentInnings === 'home' ? homeTeamPlayers : awayTeamPlayers).map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
                          </option>
                        ))}
                      </select>
                      {nonStriker && batsmanScores[nonStriker] && (
                        <p className="text-xs text-gray-600 mt-1">
                          {batsmanScores[nonStriker].runs} ({batsmanScores[nonStriker].balls})
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Bowler</label>
                      <select
                        value={currentBowler}
                        onChange={(e) => setCurrentBowler(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Bowler</option>
                        {(currentInnings === 'home' ? awayTeamPlayers : homeTeamPlayers).map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    💡 <strong>Tip:</strong> Strike rotates automatically on odd runs (1, 3, 5) and after each over
                  </div>

                  {/* Current Over Display */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">This Over:</p>
                      {currentOver.length > 0 && (
                        <button
                          onClick={handleUndoLastBall}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                        >
                          ↶ Undo Last Ball
                        </button>
                      )}
                    </div>
                    {currentOver.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentOver.map((ball, idx) => {
                          const displayText = ball.isWicket 
                            ? 'W' 
                            : ball.extras 
                              ? `${ball.extras.type === 'wide' ? 'Wd' : ball.extras.type === 'noball' ? 'Nb' : ball.extras.type === 'bye' ? 'B' : 'Lb'}${ball.runs + ball.extras.runs}`
                              : ball.runs.toString();
                          
                          return (
                            <div
                              key={idx}
                              className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${
                                ball.isWicket
                                  ? 'bg-red-600 text-white'
                                  : ball.runs === 6
                                  ? 'bg-purple-600 text-white'
                                  : ball.runs === 4
                                  ? 'bg-blue-600 text-white'
                                  : ball.extras
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-gray-200 text-gray-900'
                              }`}
                              title={`${ball.batsman || 'Unknown'} - ${ball.bowler || 'Unknown'}`}
                            >
                              {displayText}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No balls bowled yet</p>
                    )}
                  </div>

                  {/* Quick Scoring Buttons */}
                  <div className="space-y-3">
                    {/* Runs */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Runs</p>
                      <div className="grid grid-cols-7 gap-2">
                        <button
                          onClick={() => handleBallUpdate(0)}
                          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold text-lg transition-colors"
                        >
                          0
                        </button>
                        <button
                          onClick={() => handleBallUpdate(1)}
                          className="px-4 py-3 bg-green-100 hover:bg-green-200 text-green-900 rounded-lg font-bold text-lg transition-colors"
                        >
                          1
                        </button>
                        <button
                          onClick={() => handleBallUpdate(2)}
                          className="px-4 py-3 bg-green-200 hover:bg-green-300 text-green-900 rounded-lg font-bold text-lg transition-colors"
                        >
                          2
                        </button>
                        <button
                          onClick={() => handleBallUpdate(3)}
                          className="px-4 py-3 bg-green-300 hover:bg-green-400 text-green-900 rounded-lg font-bold text-lg transition-colors"
                        >
                          3
                        </button>
                        <button
                          onClick={() => handleBallUpdate(4)}
                          className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-lg transition-colors"
                        >
                          4
                        </button>
                        <button
                          onClick={() => handleBallUpdate(5)}
                          className="px-4 py-3 bg-purple-400 hover:bg-purple-500 text-white rounded-lg font-bold text-lg transition-colors"
                        >
                          5
                        </button>
                        <button
                          onClick={() => handleBallUpdate(6)}
                          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg transition-colors"
                        >
                          6
                        </button>
                      </div>
                    </div>

                    {/* Extras & Wicket */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Extras & Wicket</p>
                      <div className="grid grid-cols-5 gap-2">
                        <button
                          onClick={() => handleExtraClick('wide')}
                          className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-semibold text-sm transition-colors"
                        >
                          Wide
                        </button>
                        <button
                          onClick={() => handleExtraClick('noball')}
                          className="px-3 py-2 bg-orange-400 hover:bg-orange-500 text-orange-900 rounded-lg font-semibold text-sm transition-colors"
                        >
                          No Ball
                        </button>
                        <button
                          onClick={() => handleExtraClick('bye')}
                          className="px-3 py-2 bg-amber-300 hover:bg-amber-400 text-amber-900 rounded-lg font-semibold text-sm transition-colors"
                        >
                          Bye
                        </button>
                        <button
                          onClick={() => handleExtraClick('legbye')}
                          className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-amber-900 rounded-lg font-semibold text-sm transition-colors"
                        >
                          Leg Bye
                        </button>
                        <button
                          onClick={() => handleBallUpdate(0, undefined, true)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                        >
                          Wicket
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generic Sport Scoring */}
            {match.status === 'IN_PROGRESS' && match.sport !== 'CRICKET' && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Update Score</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {homeTeam?.name} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scoreForm.homeScore}
                      onChange={(e) => setScoreForm({...scoreForm, homeScore: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {awayTeam?.name} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scoreForm.awayScore}
                      onChange={(e) => setScoreForm({...scoreForm, awayScore: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={handleUpdateScore}
                  disabled={updating}
                  className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {updating ? 'Updating...' : 'Update Score'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Score History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Score History</h3>
          {scoreHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No score updates yet</p>
          ) : (
            <div className="space-y-3">
              {scoreHistory.map((entry, index) => (
                <div key={entry.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{formatDate(entry.timestamp)}</span>
                    <span className="font-medium text-gray-900">
                      {entry.home_score} - {entry.away_score}
                    </span>
                  </div>
                  {entry.updated_by_name && (
                    <span className="text-sm text-gray-600">by {entry.updated_by_name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Extra Runs Modal */}
        {showExtraRunsModal && extraType && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {extraType.charAt(0).toUpperCase() + extraType.slice(1)} + Runs
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                How many runs were scored off this {extraType}?
              </p>
              
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[0, 1, 2, 3, 4, 6].map((runs) => (
                  <button
                    key={runs}
                    onClick={() => setExtraRuns(runs)}
                    className={`px-4 py-3 rounded-lg font-bold text-lg transition-colors ${
                      extraRuns === runs
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    {runs}
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowExtraRunsModal(false);
                    setExtraType(null);
                    setExtraRuns(0);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleBallUpdate(extraRuns, { type: extraType, runs: 1 });
                    setShowExtraRunsModal(false);
                    setExtraType(null);
                    setExtraRuns(0);
                  }}
                  className="flex-1 btn-primary py-2.5 text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Match;
