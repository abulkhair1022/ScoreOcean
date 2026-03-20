import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Profile from './pages/Profile';
import Stats from './pages/Stats';
import Teams from './pages/Teams';
import Tournaments from './pages/Tournaments';
import TournamentManagement from './pages/TournamentManagement';
import Match from './pages/Match';
import Auction from './pages/Auction';
import LeagueAuction from './pages/LeagueAuction';
import Certificates from './pages/Certificates';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(10, 22, 40, 0.95)',
            border: '1px solid rgba(0, 180, 216, 0.3)',
            color: '#f8fafc',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderRadius: '6px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(3,4,94,0.8), 0 0 24px rgba(0,180,216,0.1)',
          },
          success: {
            iconTheme: { primary: '#00b4d8', secondary: '#020817' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#020817' },
            style: {
              border: '1px solid rgba(248, 113, 113, 0.3)',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
        <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
        <Route path="/matches/:matchId" element={<ProtectedRoute><Match /></ProtectedRoute>} />
        <Route path="/auctions/:auctionId" element={<ProtectedRoute><Auction /></ProtectedRoute>} />
        <Route path="/league-auctions/:auctionId" element={<ProtectedRoute><LeagueAuction /></ProtectedRoute>} />
        <Route path="/tournaments/:tournamentId/manage" element={<ProtectedRoute><TournamentManagement /></ProtectedRoute>} />
        <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;