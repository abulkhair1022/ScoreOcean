import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

const SPORT_META: Record<string, { icon: string; accent: string; border: string; bg: string }> = {
  CRICKET:    { icon: '🏏', accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.07)' },
  FOOTBALL:   { icon: '⚽', accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.07)'   },
  KABADDI:    { icon: '🤼', accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.07)'  },
  VOLLEYBALL: { icon: '🏐', accent: '#caf0f8', border: 'rgba(202,240,248,0.25)', bg: 'rgba(202,240,248,0.05)' },
  BASKETBALL: { icon: '🏀', accent: '#0096c7', border: 'rgba(0,150,199,0.3)',    bg: 'rgba(0,150,199,0.07)'   },
  BADMINTON:  { icon: '🏸', accent: '#0077b6', border: 'rgba(0,119,182,0.3)',    bg: 'rgba(0,119,182,0.07)'   },
};

const ROLE_CONFIG: Record<string, { accent: string; border: string; bg: string }> = {
  PLAYER:       { accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.1)' },
  TEAM:         { accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.1)'   },
  ORGANIZATION: { accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.1)'  },
  ADMIN:        { accent: '#fca5a5', border: 'rgba(239,68,68,0.3)',    bg: 'rgba(239,68,68,0.1)'   },
};

function Profile() {
  const navigate = useNavigate();
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [editForm, setEditForm] = useState({ name: '', age: 0, phone: '', avatar: '', location: { city: '', state: '', country: '' } });
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isAddingSport, setIsAddingSport]               = useState(false);
  const [sportForm, setSportForm]                       = useState({ sport: 'CRICKET' });
  const [isAddingSportLoading, setIsAddingSportLoading] = useState(false);
  const [basePriceEdits, setBasePriceEdits]   = useState<Record<string, string>>({});
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
      setProfile({ ...userData, ...(userData.profile || {}) });
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleEditProfile = () => {
    setEditForm({
      name: profile?.name || '', age: profile?.age || 0,
      phone: profile?.contactDetails?.phone || '', avatar: profile?.avatarUrl || '',
      location: profile?.location || { city: '', state: '', country: '' }
    });
    setAvatarPreview(profile?.avatarUrl || '');
    setIsEditing(true); setError('');
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
        name: editForm.name, age: editForm.age || undefined,
        contactDetails: editForm.phone ? { phone: editForm.phone } : undefined,
        avatarUrl: avatarData || undefined,
        location: (editForm.location.city || editForm.location.state || editForm.location.country) ? editForm.location : undefined
      };
      try { await apiClient.put(`/users/${user.id}/profile`, updateData); }
      catch (e: any) { if (e.response?.status === 404) await apiClient.post(`/users/${user.id}/profile`, updateData); else throw e; }
      await fetchProfile();
      setIsEditing(false); setAvatarFile(null); setAvatarPreview('');
      setSuccess('Profile updated successfully!'); setTimeout(() => setSuccess(''), 4000);
      if (editForm.name !== user.name) {
        const updated = { ...user, name: editForm.name };
        setUser(updated); localStorage.setItem('user', JSON.stringify(updated));
      }
    } catch (err: any) { setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update profile'); }
    finally { setIsSaving(false); }
  };

  const handleAddSport = async () => {
    try {
      setIsAddingSportLoading(true); setError('');
      await apiClient.post(`/users/${user.id}/sport-profiles`, sportForm);
      await fetchProfile();
      setIsAddingSport(false); setSportForm({ sport: 'CRICKET' });
      setSuccess('Sport profile added!'); setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) { setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to add sport'); }
    finally { setIsAddingSportLoading(false); }
  };

  const handleSaveBasePrice = async (sportId: string) => {
    const val = parseFloat(basePriceEdits[sportId]);
    if (isNaN(val) || val < 0) return;
    try {
      setBasePriceSaving(sportId);
      await apiClient.put(`/users/${user.id}/sport-profiles/${sportId}`, { base_price: val });
      await fetchProfile();
      setBasePriceEdits(p => { const n = { ...p }; delete n[sportId]; return n; });
      setSuccess('Auction base price saved!'); setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save base price'); }
    finally { setBasePriceSaving(null); }
  };

  const Spinner = ({ dark }: { dark?: boolean }) => (
    <svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={dark ? 'rgba(2,8,23,0.3)' : 'rgba(0,180,216,0.2)'} strokeWidth="4"/>
      <path fill={dark ? '#020817' : '#00b4d8'} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading profile...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || 'Unknown';
  const roleConfig  = ROLE_CONFIG[user?.role] || ROLE_CONFIG.PLAYER;
  const initials    = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    fontFamily: 'Barlow, sans-serif', fontSize: 13, color: '#f8fafc',
    background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(0,180,216,0.15)',
    outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 120ms, background 120ms, box-shadow 120ms',
  };
  const labelStyle = {
    display: 'block' as const, fontFamily: 'Barlow Condensed, sans-serif',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    color: 'rgba(248,250,252,0.45)', marginBottom: 7,
  };
  const primaryBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8,
    fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    background: 'linear-gradient(135deg,#0077b6,#00b4d8)', color: '#020817', border: 'none', cursor: 'pointer',
    boxShadow: '0 0 20px rgba(0,180,216,0.4)', transition: 'transform 120ms,box-shadow 120ms,filter 120ms',
  };
  const ghostBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8,
    fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    background: 'transparent', color: 'rgba(248,250,252,0.4)', border: '1px solid rgba(0,180,216,0.15)', cursor: 'pointer',
    transition: 'background 120ms, border-color 120ms, color 120ms',
  };

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .pf-input:focus   { border-color: rgba(0,180,216,0.55) !important; background: rgba(0,180,216,0.06) !important; box-shadow: 0 0 0 3px rgba(0,180,216,0.12) !important; }
        .pf-input::placeholder { color: rgba(248,250,252,0.22); }
        .pf-sport-btn:hover { border-color: rgba(0,180,216,0.3) !important; background: rgba(0,180,216,0.07) !important; transform: translateX(3px); }
        .pf-primary-btn:hover { transform: translateY(-1px) !important; box-shadow: 0 0 32px rgba(0,180,216,0.55) !important; filter: brightness(1.08) !important; }
        .pf-ghost-btn:hover  { background: rgba(0,180,216,0.06) !important; border-color: rgba(0,180,216,0.3) !important; color: #f8fafc !important; }
        .pf-info-card:hover  { border-color: rgba(0,180,216,0.3) !important; transform: translateY(-2px); }
        .pf-sport-card:hover { border-color: rgba(0,180,216,0.3) !important; }
      `}</style>

      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <main style={{ maxWidth: 1024, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Success toast */}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.25)', color: '#00b4d8', fontSize: 13, animation: 'fadeUp 0.3s ease both' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              <p>{success}</p>
            </div>
          )}

          {error && !isEditing && !isAddingSport && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13 }}>
              <span>⚠️</span><p>{error}</p>
            </div>
          )}

          {/* Profile Hero */}
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '36px', backgroundImage: 'radial-gradient(ellipse 80% 80% at 0% 0%, rgba(0,119,182,0.4) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,180,216,0.15) 0%, transparent 60%)', backgroundColor: '#020817', border: '1px solid rgba(0,180,216,0.2)' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,180,216,0.18) 0%,transparent 70%)', top: -60, right: -40, filter: 'blur(50px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Profile" style={{ width: 88, height: 88, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(0,180,216,0.3)', boxShadow: '0 0 24px rgba(0,180,216,0.2)' }} />
                  ) : (
                    <div style={{ width: 88, height: 88, borderRadius: 14, background: 'linear-gradient(135deg,#03045e,#0077b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 30, color: '#f8fafc', border: '2px solid rgba(0,180,216,0.3)', boxShadow: '0 0 24px rgba(0,180,216,0.2)' }}>
                      {initials}
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: -6, right: -6, width: 26, height: 26, borderRadius: 7, background: 'rgba(0,180,216,0.2)', border: '1px solid rgba(0,180,216,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✨</div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, marginBottom: 6 }}>{displayName}</h1>
                  <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.45)', marginBottom: 12 }}>{user?.email}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 9999, background: roleConfig.bg, border: `1px solid ${roleConfig.border}`, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: roleConfig.accent }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleConfig.accent }} />
                      {user?.role}
                    </span>
                    {profile?.age && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 9999, background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.15)', fontSize: 12, color: 'rgba(248,250,252,0.6)' }}>
                        🎂 {profile.age} years
                      </span>
                    )}
                    {(profile?.location?.city || profile?.location?.country) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 9999, background: 'rgba(0,180,216,0.08)', border: '1px solid rgba(0,180,216,0.15)', fontSize: 12, color: 'rgba(248,250,252,0.6)' }}>
                        📍 {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <button className="pf-primary-btn" style={primaryBtn} onClick={handleEditProfile}>✏️ Edit Profile</button>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
            {[
              { icon: '📧', label: 'Email',    value: user?.email },
              { icon: '📱', label: 'Phone',    value: profile?.contactDetails?.phone || '—' },
              { icon: '🌍', label: 'Location', value: profile?.location ? [profile.location.city, profile.location.state, profile.location.country].filter(Boolean).join(', ') || '—' : '—' },
            ].map((item) => (
              <div key={item.label} className="pf-info-card" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(0,180,216,0.15)', borderRadius: 12, padding: '16px 18px', backdropFilter: 'blur(12px)', transition: 'border-color 150ms, transform 150ms' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.35)' }}>{item.label}</span>
                </div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Sport Profiles */}
          <div style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(0,180,216,0.15)', borderRadius: 14, padding: 24, backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏅</span>
                Sport Profiles
              </span>
              <button className="pf-primary-btn" style={{ ...primaryBtn, padding: '7px 16px', fontSize: 12 }} onClick={() => { setIsAddingSport(true); setError(''); }}>+ Add Sport</button>
            </div>

            {profile?.sportProfiles?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {profile.sportProfiles.map((sp: any) => {
                  const meta = SPORT_META[sp.sport] || SPORT_META.FOOTBALL;
                  return (
                    <div key={sp.id} className="pf-sport-card" style={{ borderRadius: 10, border: `1px solid ${meta.border}`, background: meta.bg, padding: 18, transition: 'border-color 150ms' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{meta.icon}</div>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: meta.accent }}>{sp.sport}</p>
                          <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', marginTop: 2 }}>{Object.keys(sp.statistics || {}).length} stats tracked</p>
                        </div>
                      </div>

                      {Object.keys(sp.statistics || {}).length > 0 && (
                        <div style={{ borderRadius: 7, background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.1)', padding: '10px 12px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {Object.entries(sp.statistics || {}).slice(0, 4).map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, color: meta.accent }}>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ borderTop: '1px solid rgba(0,180,216,0.1)', paddingTop: 12 }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(248,250,252,0.35)', marginBottom: 8 }}>🏷️ Auction Base Price (pts)</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number" min={0}
                            value={basePriceEdits[sp.id] ?? (sp.base_price != null ? String(sp.base_price) : '')}
                            onChange={e => setBasePriceEdits(p => ({ ...p, [sp.id]: e.target.value }))}
                            placeholder="Not set"
                            className="pf-input"
                            style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '7px 10px' }}
                          />
                          {basePriceEdits[sp.id] !== undefined && (
                            <button onClick={() => handleSaveBasePrice(sp.id)} disabled={basePriceSaving === sp.id}
                              style={{ padding: '7px 14px', borderRadius: 7, background: 'linear-gradient(135deg,#0077b6,#00b4d8)', color: '#020817', border: 'none', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: basePriceSaving === sp.id ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                              {basePriceSaving === sp.id ? <Spinner dark /> : 'Save'}
                            </button>
                          )}
                        </div>
                        {sp.base_price != null && basePriceEdits[sp.id] === undefined && (
                          <p style={{ fontSize: 11, color: meta.accent, marginTop: 5, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>Currently {sp.base_price} pts</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', borderRadius: 10, border: '1px dashed rgba(0,180,216,0.2)', background: 'rgba(0,180,216,0.02)' }}>
                <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 14 }}>🏅</div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(248,250,252,0.55)', marginBottom: 6 }}>No sport profiles yet</p>
                <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', marginBottom: 18 }}>Add your sports to start tracking your performance</p>
                <button className="pf-primary-btn" style={primaryBtn} onClick={() => setIsAddingSport(true)}>Add Your First Sport</button>
              </div>
            )}
          </div>
        </main>

        {/* Edit Profile Modal */}
        {isEditing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,23,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(10px)' }} onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(''); setError(''); }}>
            <div style={{ background: 'rgba(10,22,40,0.97)', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 18, boxShadow: '0 8px 40px rgba(3,4,94,0.7)', backdropFilter: 'blur(20px)', width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeUp 200ms ease both' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.5))', borderBottom: '1px solid rgba(0,180,216,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,180,216,0.7)', marginBottom: 3 }}>Your Profile</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc' }}>Edit Profile</div>
                </div>
                <button onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(''); setError(''); }} style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', color: 'rgba(248,250,252,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13 }}>{error}</div>}

                {/* Avatar */}
                <div>
                  <label style={labelStyle}>Profile Photo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flexShrink: 0 }}>
                      {avatarPreview || editForm.avatar ? (
                        <img src={avatarPreview || editForm.avatar} alt="Preview" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(0,180,216,0.3)' }} />
                      ) : (
                        <div style={{ width: 72, height: 72, borderRadius: 10, background: 'linear-gradient(135deg,#03045e,#0077b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: 24, color: '#f8fafc', border: '1px solid rgba(0,180,216,0.3)' }}>{initials}</div>
                      )}
                    </div>
                    <div>
                      <label style={{ ...ghostBtn, display: 'inline-flex', cursor: 'pointer' }}>
                        Choose Photo
                        <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                      </label>
                      <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.3)', marginTop: 6 }}>JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: 12 }}>Basic Information</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input type="text" name="name" value={editForm.name} onChange={handleInputChange} placeholder="Your name" className="pf-input" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Age</label>
                      <input type="number" name="age" value={editForm.age || ''} onChange={handleInputChange} placeholder="Your age" min="1" max="100" className="pf-input" style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Phone</label>
                      <input type="tel" name="phone" value={editForm.phone} onChange={handleInputChange} placeholder="+91 98765 43210" className="pf-input" style={inputStyle} />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: 12 }}>Location</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {(['city', 'state', 'country'] as const).map((field) => (
                      <div key={field}>
                        <label style={labelStyle}>{field}</label>
                        <input type="text" name={`location.${field}`} value={editForm.location[field]} onChange={handleInputChange} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} className="pf-input" style={inputStyle} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,180,216,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
                <button className="pf-ghost-btn" style={ghostBtn} onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(''); setError(''); }} disabled={isSaving}>Cancel</button>
                <button className="pf-primary-btn" style={{ ...primaryBtn, opacity: isSaving ? 0.6 : 1 }} onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <><Spinner dark />Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Sport Modal */}
        {isAddingSport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,23,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, backdropFilter: 'blur(10px)' }} onClick={() => { setIsAddingSport(false); setSportForm({ sport: 'CRICKET' }); setError(''); }}>
            <div style={{ background: 'rgba(10,22,40,0.97)', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 18, boxShadow: '0 8px 40px rgba(3,4,94,0.7)', backdropFilter: 'blur(20px)', width: '100%', maxWidth: 480, overflow: 'hidden', animation: 'fadeUp 200ms ease both' }} onClick={e => e.stopPropagation()}>

              <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.5))', borderBottom: '1px solid rgba(0,180,216,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,180,216,0.7)', marginBottom: 3 }}>Sport Profiles</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: '#f8fafc' }}>Add Sport Profile</div>
                </div>
                <button onClick={() => { setIsAddingSport(false); setSportForm({ sport: 'CRICKET' }); setError(''); }} style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', color: 'rgba(248,250,252,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13 }}>{error}</div>}
                <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)' }}>Statistics will be tracked automatically once you start playing.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(SPORT_META).map(([sport, meta]) => {
                    const isSelected = sportForm.sport === sport;
                    return (
                      <button key={sport} onClick={() => setSportForm({ sport })} className="pf-sport-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${isSelected ? meta.border : 'rgba(0,180,216,0.1)'}`, background: isSelected ? meta.bg : 'rgba(0,180,216,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms,background 150ms,transform 150ms' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 7, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{meta.icon}</div>
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: isSelected ? meta.accent : '#f8fafc' }}>{sport.charAt(0) + sport.slice(1).toLowerCase()}</p>
                        </div>
                        {isSelected && (
                          <svg style={{ marginLeft: 'auto', flexShrink: 0, color: meta.accent }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,180,216,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="pf-ghost-btn" style={ghostBtn} onClick={() => { setIsAddingSport(false); setSportForm({ sport: 'CRICKET' }); setError(''); }} disabled={isAddingSportLoading}>Cancel</button>
                <button className="pf-primary-btn" style={{ ...primaryBtn, opacity: isAddingSportLoading ? 0.6 : 1 }} onClick={handleAddSport} disabled={isAddingSportLoading}>
                  {isAddingSportLoading ? <><Spinner dark />Adding...</> : 'Add Sport Profile'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Profile;