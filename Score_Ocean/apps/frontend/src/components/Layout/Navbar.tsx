import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import NotificationCenter from '../NotificationCenter';

interface NavbarProps {
  user?: any;
  onLogout?: () => void;
}

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: '⊞', exact: true },
  { to: '/teams', label: 'Teams', icon: '🛡️', exact: false },
  { to: '/tournaments', label: 'Tournaments', icon: '🏆', exact: false },
  { to: '/stats', label: 'Stats', icon: '📊', exact: false },
];

const ROLE_CONFIG: Record<string, { label: string; gradient: string; bg: string; text: string }> = {
  PLAYER:       { label: 'Player',       gradient: 'from-blue-500 to-indigo-600',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  TEAM:         { label: 'Team',         gradient: 'from-emerald-500 to-teal-600',   bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ORGANIZATION: { label: 'Organization', gradient: 'from-violet-500 to-purple-600',  bg: 'bg-violet-50',  text: 'text-violet-700' },
  ADMIN:        { label: 'Admin',        gradient: 'from-rose-500 to-pink-600',      bg: 'bg-rose-50',    text: 'text-rose-700' },
};

export default function Navbar({ user: userProp, onLogout: onLogoutProp }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Self-contained: read user from localStorage if not passed as prop
  const user = userProp ?? (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiClient.get('/users/profile')
      .then((r) => {
        const url = r.data?.profile?.avatarUrl || r.data?.avatarUrl || null;
        setAvatarUrl(url);
      })
      .catch(() => {});
  }, [user?.id]);

  const role = ROLE_CONFIG[user?.role] || ROLE_CONFIG.PLAYER;
  const displayName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    if (onLogoutProp) {
      onLogoutProp();
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center shadow-sm group-hover:shadow-glow transition-shadow duration-300">
              <span className="text-white font-black text-xs">SO</span>
            </div>
            <span className="hidden sm:block text-lg font-black text-gray-900 tracking-tight">
              Score<span className="gradient-text">Ocean</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(link.to, link.exact)
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {link.label}
                {isActive(link.to, link.exact) && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-600" />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationCenter />

            {/* Role badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full ${role.bg} border border-gray-100`}>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${role.gradient}`} />
              <span className={`text-xs font-semibold ${role.text}`}>{role.label}</span>
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden shadow-sm ring-2 ring-white ${
                  avatarUrl ? '' : `bg-gradient-to-br ${role.gradient}`
                } flex items-center justify-center`}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    : <span className="text-white text-xs font-black">{initials}</span>
                  }
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {displayName}
                </span>
                <svg
                  className={`hidden md:block w-4 h-4 text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                    <div className={`px-4 py-4 bg-gradient-to-br ${role.gradient} text-white`}>
                      <div className="font-bold text-sm truncate">{displayName}</div>
                      <div className="text-xs opacity-80 mt-0.5 truncate">{user?.email}</div>
                      <span className="mt-2 inline-block bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {role.label}
                      </span>
                    </div>
                    <div className="p-2">
                      {[
                        { to: '/profile', icon: '👤', label: 'Profile Settings' },
                        { to: '/stats', icon: '📊', label: 'My Statistics' },
                        { to: '/certificates', icon: '🎖️', label: 'Certificates' },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                      <div className="my-2 border-t border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <span className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">🚪</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.to, link.exact)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <span>🚪</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
