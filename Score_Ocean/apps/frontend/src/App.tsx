import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
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
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <Teams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments"
            element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:matchId"
            element={
              <ProtectedRoute>
                <Match />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/:auctionId"
            element={
              <ProtectedRoute>
                <Auction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/league-auctions/:auctionId"
            element={
              <ProtectedRoute>
                <LeagueAuction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:tournamentId/manage"
            element={
              <ProtectedRoute>
                <TournamentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <Certificates />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
