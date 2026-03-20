import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

const SPORT_META: Record<string, { icon: string; gradient: string; bg: string; text: string }> = {
  CRICKET:    { icon: '🏏', gradient: 'from-green-500 to-emerald-600',  bg: 'bg-green-50',  text: 'text-green-700'  },
  FOOTBALL:   { icon: '⚽', gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
  KABADDI:    { icon: '🤼', gradient: 'from-amber-500 to-orange-600',  bg: 'bg-amber-50',  text: 'text-amber-700'  },
  VOLLEYBALL: { icon: '🏐', gradient: 'from-rose-500 to-pink-600',     bg: 'bg-rose-50',   text: 'text-rose-700'   },
  BASKETBALL: { icon: '🏀', gradient: 'from-orange-500 to-red-600',    bg: 'bg-orange-50', text: 'text-orange-700' },
  BADMINTON:  { icon: '🏸', gradient: 'from-teal-500 to-cyan-600',     bg: 'bg-teal-50',   text: 'text-teal-700'   },
};

const ROLE_GRADIENT: Record<string, string> = {
  PLAYER: 'from-primary-600 to-indigo-600',
  TEAM: 'from-emerald-600 to-teal-600',
  ORGANIZATION: 'from-violet-600 to-purple-600',
  ADMIN: 'from-rose-600 to-red-600',
};

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', age: 0, phone: '', avatar: '', location: { city: '', state: '', country: '' } });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isAddingSport, setIsAddingSport] = useState(false);
  const [sportForm, setSportForm] = useState({ sport: 'CRICKET' });
  const [isAddingSportLoading, setIsAddingSportLoading] = useState(false);
  const [basePriceEdits, setBasePriceEdits] = useState<Record<string, string>>({});
  const [basePriceSaving, setBasePriceSaving] = useState<string | null>(null);
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (!storedUser || !accessToken) { navigate('/login'); return; }
    setUser(JSON.parse(storedUser));
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const r = await apiClient.get('/users/profile');
      const userData = r.data;
      // Merge nested profile fields (name, age, location, contactDetails, avatarUrl)
      // into the top-level object so sportProfiles and profile fields are all accessible
      setProfile({ ...userData, ...(userData.profile || {}) });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally { setLoading(false); }
  };

  const handleEditProfile = () => {
    setEditForm({
      name: profile?.name || '',
      age: profile?.age || 0,
      phone: profile?.contactDetails?.phone || '',
      avatar: profile?.avatarUrl || '',
      location: profile?.location || { city: '', state: '', country: '' }
    });
    setAvatarPreview(profile?.avatarUrl || '');
    setIsEditing(true);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('location.')) {
      const f = name.split('.')[1];
      setEditForm(p => ({ ...p, location: { ...p.location, [f]: value } }));
    } else {
      setEditForm(p => ({ ...p, [name]: name === 'age' ? parseInt(value) || 0 : value }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true); setError('');
      const avatarData = avatarFile ? avatarPreview : editForm.avatar;
      const updateData = {
        name: editForm.name,
        age: editForm.age || undefined,
        contactDetails: editForm.phone ? { phone: editForm.phone } : undefined,
        avatarUrl: avatarData || undefined,
        location: (editForm.location.city || editForm.location.state || editForm.location.country) ? editForm.location : undefined
      };
      try {
        await apiClient.put(`/users/${user.id}/profile`, updateData);
      } catch (e: any) {
        if (e.response?.status === 404) {
          await apiClient.post(`/users/${user.id}/profile`, updateData);
        } else throw e;
      }
      await fetchProfile();
      setIsEditing(false); setAvatarFile(null); setAvatarPreview('');
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
      if (editForm.name !== user.name) {
        const updated = { ...user, name: editForm.name };
        setUser(updated); localStorage.setItem('user', JSON.stringify(updated));
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update profile');
    } finally { setIsSaving(false); }
  };

  const handleAddSport = async () => {
    try {
      setIsAddingSportLoading(true); setError('');
      await apiClient.post(`/users/${user.id}/sport-profiles`, sportForm);
      await fetchProfile();
      setIsAddingSport(false); setSportForm({ sport: 'CRICKET' });
      setSuccess('Sport profile added!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to add sport');
    } finally { setIsAddingSportLoading(false); }
  };

  const handleSaveBasePrice = async (sportId: string) => {
    const val = parseFloat(basePriceEdits[sportId]);
    if (isNaN(val) || val < 0) return;
    try {
      setBasePriceSaving(sportId);
      await apiClient.put(`/users/${user.id}/sport-profiles/${sportId}`, { base_price: val });
      await fetchProfile();
      setBasePriceEdits(p => { const n = { ...p }; delete n[sportId]; return n; });
      setSuccess('Auction base price saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save base price');
    } finally { setBasePriceSaving(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
            <p className="text-gray-500 text-sm">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || 'Unknown';
  const roleGrad = ROLE_GRADIENT[user?.role] || 'from-primary-600 to-indigo-600';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Toasts */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-700 font-medium text-sm">{success}</p>
          </div>
        )}

        {error && !isEditing && !isAddingSport && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-rose-700 font-medium text-sm">{error}</p>
          </div>
        )}

        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-indigo-700 p-8 text-white">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-24 h-24 rounded-3xl object-cover border-4 border-white/30 shadow-xl" />
              ) : (
                <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${roleGrad} flex items-center justify-center text-3xl font-black border-4 border-white/30 shadow-xl`} style={{ fontFamily: 'Syne, sans-serif' }}>
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-sm">✨</span>
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>{displayName}</h1>
              <p className="text-primary-200 mb-3">{user?.email}</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-semibold">
                  {user?.role}
                </span>
                {profile?.age && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-sm">
                    🎂 {profile.age} years
                  </span>
                )}
                {(profile?.location?.city || profile?.location?.country) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl text-sm">
                    📍 {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleEditProfile}
              className="flex-shrink-0 px-5 py-2.5 bg-white text-primary-700 rounded-xl font-bold text-sm hover:bg-primary-50 transition-all hover:scale-105 shadow-lg">
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '📧', label: 'Email', value: user?.email },
            { icon: '📱', label: 'Phone', value: profile?.contactDetails?.phone || '—' },
            { icon: '🌍', label: 'Location', value: profile?.location ? [profile.location.city, profile.location.state, profile.location.country].filter(Boolean).join(', ') || '—' : '—' },
          ].map((item) => (
            <div key={item.label} className="card-hover p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="font-semibold text-gray-800 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Sport Profiles */}
        <div className="card p-6">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">🏅</span>
              Sport Profiles
            </h2>
            <button
              onClick={() => { setIsAddingSport(true); setError(''); }}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-primary-700 transition-all shadow-sm">
              + Add Sport
            </button>
          </div>

          {profile?.sportProfiles?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.sportProfiles.map((sp: any) => {
                const meta = SPORT_META[sp.sport] || SPORT_META.CRICKET;
                return (
                  <div key={sp.id} className="group rounded-2xl border-2 border-transparent hover:border-primary-200 bg-gray-50 hover:bg-white hover:shadow-card transition-all p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-2xl shadow-sm`}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{sp.sport}</p>
                        <p className="text-xs text-gray-400">{Object.keys(sp.statistics || {}).length} stats tracked</p>
                      </div>
                    </div>
                    {Object.keys(sp.statistics || {}).length > 0 && (
                      <div className={`rounded-xl ${meta.bg} p-3 space-y-1.5 mb-3`}>
                        {Object.entries(sp.statistics || {}).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className={`text-xs font-bold ${meta.text}`}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Auction base price */}
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">🏷️ Auction Base Price (pts)</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={basePriceEdits[sp.id] ?? (sp.base_price != null ? String(sp.base_price) : '')}
                          onChange={e => setBasePriceEdits(p => ({ ...p, [sp.id]: e.target.value }))}
                          placeholder="Not set (uses import default)"
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-400 bg-white"
                        />
                        {basePriceEdits[sp.id] !== undefined && (
                          <button
                            onClick={() => handleSaveBasePrice(sp.id)}
                            disabled={basePriceSaving === sp.id}
                            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                            {basePriceSaving === sp.id ? '...' : 'Save'}
                          </button>
                        )}
                      </div>
                      {sp.base_price != null && basePriceEdits[sp.id] === undefined && (
                        <p className="text-xs text-indigo-600 font-medium mt-1">Currently set to {sp.base_price} pts</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">🏅</div>
              <p className="font-semibold text-gray-700 mb-1">No sport profiles yet</p>
              <p className="text-sm text-gray-400 mb-4">Add your sports to start tracking your performance</p>
              <button
                onClick={() => setIsAddingSport(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-primary-700 transition-all shadow-sm">
                Add Your First Sport
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Edit Profile Modal ─────────────────────────────────────────── */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="sticky top-0 bg-white rounded-t-3xl p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>Edit Profile</h3>
              <button onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(''); setError(''); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
              )}

              {/* Avatar */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {avatarPreview || editForm.avatar ? (
                      <img src={avatarPreview || editForm.avatar} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200" />
                    ) : (
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${roleGrad} flex items-center justify-center text-white text-xl font-black`}>
                        {initials}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold inline-block transition-colors">
                      Choose Photo
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-400 mt-1.5">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Full Name</label>
                    <input type="text" name="name" value={editForm.name} onChange={handleInputChange} className="input-field" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Age</label>
                    <input type="number" name="age" value={editForm.age || ''} onChange={handleInputChange} className="input-field" placeholder="Your age" min="1" max="100" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Phone</label>
                    <input type="tel" name="phone" value={editForm.phone} onChange={handleInputChange} className="input-field" placeholder="+91 98765 43210" />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['city', 'state', 'country'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5 capitalize">{field}</label>
                      <input type="text" name={`location.${field}`} value={editForm.location[field]} onChange={handleInputChange} className="input-field" placeholder={field.charAt(0).toUpperCase() + field.slice(1)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(''); setError(''); }} disabled={isSaving} className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleSaveProfile} disabled={isSaving} className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-primary-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Sport Modal ──────────────────────────────────────────────── */}
      {isAddingSport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>Add Sport Profile</h3>
              <button onClick={() => { setIsAddingSport(false); setSportForm({ sport: 'CRICKET' }); setError(''); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-4">{error}</div>}
              <p className="text-sm text-gray-500 mb-4">Statistics will be tracked automatically once you start playing.</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(SPORT_META).map(([sport, meta]) => (
                  <button
                    key={sport}
                    onClick={() => setSportForm({ sport })}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      sportForm.sport === sport
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-xl shadow-sm`}>
                      {meta.icon}
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${sportForm.sport === sport ? 'text-primary-700' : 'text-gray-700'}`}>{sport.charAt(0) + sport.slice(1).toLowerCase()}</p>
                    </div>
                    {sportForm.sport === sport && (
                      <svg className="w-5 h-5 text-primary-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setIsAddingSport(false); setSportForm({ sport: 'CRICKET' }); setError(''); }} disabled={isAddingSportLoading} className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleAddSport} disabled={isAddingSportLoading} className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-primary-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                {isAddingSportLoading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Adding...
                  </>
                ) : 'Add Sport Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
