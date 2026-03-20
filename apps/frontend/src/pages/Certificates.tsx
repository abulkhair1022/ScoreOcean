import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Layout from '../components/Layout';

function Certificates() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyMode, setVerifyMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedCertificate, setVerifiedCertificate] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) { navigate('/login'); return; }
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      fetchCertificates(parsed.id);
    }
  }, [navigate]);

  const fetchCertificates = async (userId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/certificates/user/${userId}`);
      setCertificates(response.data?.certificates || response.data || []);
    } catch (err: any) {
      if (err.response?.status === 404) setCertificates([]);
      else setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load certificates');
    } finally { setLoading(false); }
  };

  const handleDownload = async (certificateId: string) => {
    try {
      setDownloadingId(certificateId);
      const response = await apiClient.get(`/certificates/${certificateId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download certificate');
    } finally { setDownloadingId(null); }
  };

  const handleVerify = async () => {
    if (!verificationCode) return;
    try {
      setVerifying(true);
      const response = await apiClient.get(`/certificates/verify/${verificationCode}`);
      setVerifiedCertificate(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Certificate not found');
      setVerifiedCertificate(null);
    } finally { setVerifying(false); }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading certificates...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

        .cert-page { display:flex; flex-direction:column; gap:24px; animation:fadeUp 0.4s ease both; }

        .cert-hero {
          position:relative; overflow:hidden; border-radius:18px; padding:36px;
          background-color:#020817;
          background-image:
            radial-gradient(ellipse 80% 80% at 0% 0%, rgba(0,180,216,0.3) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,119,182,0.2) 0%, transparent 60%);
          border:1px solid rgba(0,180,216,0.2);
        }
        .cert-hero-grid {
          position:absolute; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),
            linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px);
          background-size:40px 40px;
        }
        .cert-hero-orb {
          position:absolute; border-radius:50%; filter:blur(50px); pointer-events:none;
        }
        .cert-hero-inner {
          position:relative; z-index:10; display:flex; flex-direction:column; gap:16px;
        }
        @media(min-width:640px){ .cert-hero-inner { flex-direction:row; align-items:center; justify-content:space-between; } }

        .cert-hero-icon { width:52px; height:52px; border-radius:12px; background:rgba(0,180,216,0.15); border:1px solid rgba(0,180,216,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cert-hero-title { font-family:'Barlow Condensed',sans-serif; font-size:34px; font-weight:900; color:#f8fafc; text-transform:uppercase; letter-spacing:0.02em; line-height:1; margin-bottom:8px; }
        .cert-hero-sub   { font-size:14px; font-weight:300; color:rgba(248,250,252,0.5); }
        .cert-hero-btns  { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .cert-count {
          padding:4px 12px; border-radius:9999px; font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          background:rgba(0,180,216,0.12); border:1px solid rgba(0,180,216,0.25); color:#00b4d8;
        }
        .cert-verify-btn {
          display:flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px;
          font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
          box-shadow:0 0 20px rgba(0,180,216,0.4); transition:transform 120ms,box-shadow 120ms,filter 120ms;
        }
        .cert-verify-btn:hover { transform:translateY(-1px); box-shadow:0 0 32px rgba(0,180,216,0.55); filter:brightness(1.08); }

        .cert-error {
          display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:10px;
          background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); color:#fca5a5; font-size:13px;
        }

        .cert-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; }

        .cert-card {
          border-radius:14px; overflow:hidden;
          background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15);
          backdrop-filter:blur(12px);
          transition:transform 220ms,border-color 220ms,box-shadow 220ms;
        }
        .cert-card:hover { transform:translateY(-4px); border-color:rgba(0,180,216,0.3); box-shadow:0 0 28px rgba(0,180,216,0.1); }

        .cert-card-header {
          position:relative; overflow:hidden; padding:24px;
          background:linear-gradient(135deg,rgba(3,4,94,0.9),rgba(0,119,182,0.7));
          border-bottom:1px solid rgba(0,180,216,0.15); text-align:center;
        }
        .cert-card-header-orb-1 { position:absolute; width:80px; height:80px; border-radius:50%; background:rgba(0,180,216,0.12); top:-20px; right:-20px; }
        .cert-card-header-orb-2 { position:absolute; width:56px; height:56px; border-radius:50%; background:rgba(0,119,182,0.12); bottom:-10px; left:-10px; }

        .cert-medal {
          position:relative; z-index:10; width:60px; height:60px; border-radius:50%;
          background:rgba(0,180,216,0.15); border:1px solid rgba(0,180,216,0.35);
          display:flex; align-items:center; justify-content:center; margin:0 auto 12px;
          box-shadow:0 0 24px rgba(0,180,216,0.25);
        }
        .cert-card-type  { position:relative; z-index:10; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(0,180,216,0.7); margin-bottom:3px; }
        .cert-card-title { position:relative; z-index:10; font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:900; letter-spacing:0.04em; text-transform:uppercase; color:#f8fafc; }

        .cert-card-body { padding:20px; display:flex; flex-direction:column; gap:10px; }
        .cert-row {
          display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
          padding:9px 12px; border-radius:7px; background:rgba(0,180,216,0.04); border:1px solid rgba(0,180,216,0.08);
        }
        .cert-row-label { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.35); flex-shrink:0; }
        .cert-row-value { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.02em; color:#f8fafc; text-align:right; }
        .cert-row-mono  { font-family:'JetBrains Mono',monospace; font-size:11px; color:#00b4d8; background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.15); padding:3px 8px; border-radius:5px; }

        .cert-download-btn {
          width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
          padding:12px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif;
          font-size:13px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
          background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
          box-shadow:0 0 16px rgba(0,180,216,0.3); transition:transform 120ms,box-shadow 120ms,filter 120ms;
          position:relative; overflow:hidden;
        }
        .cert-download-btn::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(105deg,transparent 40%,rgba(202,240,248,0.2) 50%,transparent 60%);
          transform:translateX(-100%); transition:transform 0.5s;
        }
        .cert-download-btn:hover { transform:translateY(-1px); box-shadow:0 0 24px rgba(0,180,216,0.5); filter:brightness(1.08); }
        .cert-download-btn:hover::after { transform:translateX(100%); }
        .cert-download-btn:disabled { opacity:0.55; cursor:not-allowed; transform:none; }

        .cert-empty {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:64px 32px; text-align:center; gap:14px;
          background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; backdrop-filter:blur(12px);
        }
        .cert-empty-icon  { font-size:44px; opacity:0.3; }
        .cert-empty-title { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:900; letter-spacing:0.04em; text-transform:uppercase; color:rgba(248,250,252,0.6); }
        .cert-empty-sub   { font-size:13px; color:rgba(248,250,252,0.3); max-width:280px; line-height:1.6; }
        .cert-empty-btn {
          display:inline-flex; align-items:center; gap:8px; padding:11px 24px; border-radius:8px;
          font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
          background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
          box-shadow:0 0 20px rgba(0,180,216,0.4); transition:transform 120ms,box-shadow 120ms;
        }
        .cert-empty-btn:hover { transform:translateY(-2px); box-shadow:0 0 32px rgba(0,180,216,0.55); }

        .cert-modal-overlay {
          position:fixed; inset:0; background:rgba(2,8,23,0.88); backdrop-filter:blur(10px);
          display:flex; align-items:center; justify-content:center; z-index:50; padding:16px;
        }
        .cert-modal {
          background:rgba(10,22,40,0.97); border:1px solid rgba(0,180,216,0.25); border-radius:18px;
          box-shadow:0 8px 40px rgba(3,4,94,0.7),0 0 40px rgba(0,180,216,0.08);
          backdrop-filter:blur(20px); width:100%; max-width:440px; overflow:hidden;
          animation:fadeUp 200ms ease both;
        }
        .cert-modal-header {
          padding:20px 24px; background:linear-gradient(135deg,rgba(3,4,94,0.8),rgba(0,119,182,0.5));
          border-bottom:1px solid rgba(0,180,216,0.15); display:flex; align-items:center; justify-content:space-between;
        }
        .cert-modal-icon  { width:40px; height:40px; border-radius:8px; background:rgba(0,180,216,0.15); border:1px solid rgba(0,180,216,0.3); display:flex; align-items:center; justify-content:center; }
        .cert-modal-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; letter-spacing:0.03em; text-transform:uppercase; color:#f8fafc; }
        .cert-modal-sub   { font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(0,180,216,0.6); margin-top:2px; }
        .cert-modal-close { width:30px; height:30px; border-radius:6px; background:rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.2); color:rgba(248,250,252,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 120ms,color 120ms; }
        .cert-modal-close:hover { background:rgba(0,180,216,0.18); color:#f8fafc; }
        .cert-modal-body  { padding:24px; display:flex; flex-direction:column; gap:16px; }

        .cert-input {
          width:100%; padding:11px 16px; border-radius:10px; font-family:'JetBrains Mono',monospace;
          font-size:13px; color:#f8fafc; background:rgba(10,22,40,0.8); border:1px solid rgba(0,180,216,0.15);
          outline:none; transition:border-color 120ms,background 120ms,box-shadow 120ms; box-sizing:border-box;
        }
        .cert-input::placeholder { color:rgba(248,250,252,0.22); }
        .cert-input:focus { border-color:rgba(0,180,216,0.55); background:rgba(0,180,216,0.06); box-shadow:0 0 0 3px rgba(0,180,216,0.12); }

        .cert-verified-card {
          border-radius:10px; padding:16px; background:rgba(0,180,216,0.06); border:1px solid rgba(0,180,216,0.2);
        }
        .cert-verified-title { display:flex; align-items:center; gap:8px; font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#00b4d8; margin-bottom:12px; }
        .cert-verified-check { width:22px; height:22px; border-radius:50%; background:rgba(0,180,216,0.15); border:1px solid rgba(0,180,216,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cert-verified-row   { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(0,180,216,0.08); }
        .cert-verified-row:last-child { border-bottom:none; }
        .cert-verified-label { font-size:11px; color:rgba(248,250,252,0.4); }
        .cert-verified-value { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.03em; color:#f8fafc; }

        .cert-btn-row  { display:flex; gap:10px; }
        .cert-ghost-btn {
          flex:1; padding:11px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif;
          font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          background:transparent; color:rgba(248,250,252,0.4); border:1px solid rgba(0,180,216,0.15); cursor:pointer;
          transition:background 120ms,border-color 120ms,color 120ms;
        }
        .cert-ghost-btn:hover { background:rgba(0,180,216,0.06); border-color:rgba(0,180,216,0.3); color:#f8fafc; }
        .cert-primary-btn {
          flex:1; padding:11px 0; border-radius:8px; font-family:'Barlow Condensed',sans-serif;
          font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
          background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none; cursor:pointer;
          box-shadow:0 0 16px rgba(0,180,216,0.35); transition:transform 120ms,box-shadow 120ms,filter 120ms;
          display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .cert-primary-btn:hover { transform:translateY(-1px); box-shadow:0 0 24px rgba(0,180,216,0.5); filter:brightness(1.08); }
        .cert-primary-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        .cert-spinner { animation:spin 0.8s linear infinite; }
      `}</style>

      <Layout>
        <div className="cert-page">

          {/* Hero */}
          <div className="cert-hero">
            <div className="cert-hero-grid" />
            <div className="cert-hero-orb" style={{ width: 200, height: 200, background: 'radial-gradient(circle,rgba(0,180,216,0.18) 0%,transparent 70%)', top: -60, right: -40 }} />
            <div className="cert-hero-orb" style={{ width: 140, height: 140, background: 'radial-gradient(circle,rgba(3,4,94,0.4) 0%,transparent 70%)', bottom: -30, left: '20%' }} />
            <div className="cert-hero-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="cert-hero-icon">
                  <svg width="24" height="24" fill="none" stroke="#00b4d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h1 className="cert-hero-title">My Certificates</h1>
                  <p className="cert-hero-sub">View, download and verify your tournament certificates</p>
                </div>
              </div>
              <div className="cert-hero-btns">
                <span className="cert-count">{certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}</span>
                <button className="cert-verify-btn" onClick={() => setVerifyMode(true)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verify Certificate
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="cert-error">
              <svg width="18" height="18" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
              <p style={{ flex: 1 }}>{error}</p>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: 0 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}

          {/* Certificates Grid */}
          {certificates.length === 0 ? (
            <div className="cert-empty">
              <div className="cert-empty-icon">🎖️</div>
              <div className="cert-empty-title">No Certificates Yet</div>
              <div className="cert-empty-sub">Participate and perform in tournaments to earn certificates of achievement.</div>
              <button className="cert-empty-btn" onClick={() => navigate('/tournaments')}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                Browse Tournaments
              </button>
            </div>
          ) : (
            <div className="cert-grid">
              {certificates.map((certificate) => (
                <div key={certificate.id} className="cert-card">
                  <div className="cert-card-header">
                    <div className="cert-card-header-orb-1" />
                    <div className="cert-card-header-orb-2" />
                    <div className="cert-medal">
                      <svg width="28" height="28" fill="none" stroke="#00b4d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <p className="cert-card-type">Certificate of</p>
                    <h3 className="cert-card-title">Participation</h3>
                  </div>

                  <div className="cert-card-body">
                    <div className="cert-row">
                      <span className="cert-row-label">Tournament</span>
                      <span className="cert-row-value">{certificate.tournament?.name}</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-row-label">Team</span>
                      <span className="cert-row-value">{certificate.team?.name}</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-row-label">Issued On</span>
                      <span className="cert-row-value">{formatDate(certificate.issuedAt)}</span>
                    </div>
                    <div className="cert-row">
                      <span className="cert-row-label">Verify Code</span>
                      <span className="cert-row-mono">{certificate.verificationCode}</span>
                    </div>

                    <button
                      className="cert-download-btn"
                      onClick={() => handleDownload(certificate.id)}
                      disabled={downloadingId === certificate.id}>
                      {downloadingId === certificate.id ? (
                        <>
                          <svg className="cert-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="rgba(2,8,23,0.3)" strokeWidth="4"/>
                            <path fill="#020817" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                          </svg>
                          Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verify Modal */}
        {verifyMode && (
          <div className="cert-modal-overlay" onClick={() => { setVerifyMode(false); setVerificationCode(''); setVerifiedCertificate(null); }}>
            <div className="cert-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cert-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="cert-modal-icon">
                    <svg width="18" height="18" fill="none" stroke="#00b4d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="cert-modal-title">Verify Certificate</div>
                    <div className="cert-modal-sub">Check certificate authenticity</div>
                  </div>
                </div>
                <button className="cert-modal-close" onClick={() => { setVerifyMode(false); setVerificationCode(''); setVerifiedCertificate(null); }}>✕</button>
              </div>

              <div className="cert-modal-body">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  className="cert-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />

                {verifiedCertificate && (
                  <div className="cert-verified-card">
                    <div className="cert-verified-title">
                      <div className="cert-verified-check">
                        <svg width="12" height="12" fill="none" stroke="#00b4d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                      Certificate Verified ✓
                    </div>
                    {[
                      { label: 'Recipient',   value: verifiedCertificate.user?.name },
                      { label: 'Tournament',  value: verifiedCertificate.tournament?.name },
                      { label: 'Team',        value: verifiedCertificate.team?.name },
                      { label: 'Issued',      value: formatDate(verifiedCertificate.issuedAt) },
                    ].map(({ label, value }) => (
                      <div key={label} className="cert-verified-row">
                        <span className="cert-verified-label">{label}</span>
                        <span className="cert-verified-value">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="cert-btn-row">
                  <button className="cert-ghost-btn" onClick={() => { setVerifyMode(false); setVerificationCode(''); setVerifiedCertificate(null); }}>Close</button>
                  <button className="cert-primary-btn" onClick={handleVerify} disabled={!verificationCode || verifying}>
                    {verifying ? (
                      <svg className="cert-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(2,8,23,0.3)" strokeWidth="4"/>
                        <path fill="#020817" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                    {verifying ? '...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}

export default Certificates;