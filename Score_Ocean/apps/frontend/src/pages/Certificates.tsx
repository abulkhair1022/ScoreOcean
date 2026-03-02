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
    if (!accessToken) {
      navigate('/login');
      return;
    }
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
      // 404 means no certificates endpoint yet — treat as empty
      if (err.response?.status === 404) {
        setCertificates([]);
      } else {
        setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load certificates');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificateId: string) => {
    try {
      setDownloadingId(certificateId);
      const response = await apiClient.get(`/certificates/${certificateId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${certificateId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download certificate');
    } finally {
      setDownloadingId(null);
    }
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
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading certificates...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 p-8 mb-8 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full border-4 border-white" />
          <div className="absolute -bottom-6 right-24 w-48 h-48 rounded-full border-4 border-white" />
          <div className="absolute top-8 left-1/2 w-20 h-20 rounded-full border-2 border-white" />
        </div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My Certificates</h1>
            </div>
            <p className="text-white/80">View, download and verify your tournament certificates</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full font-medium backdrop-blur-sm">
              {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}
            </span>
            <button
              onClick={() => setVerifyMode(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-colors shadow-lg text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify Certificate
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="flex-1 text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Verify Certificate Modal */}
      {verifyMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verify Certificate</h3>
                <p className="text-xs text-gray-500">Check certificate authenticity</p>
              </div>
            </div>

            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter verification code"
              className="w-full input-field mb-4 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />

            {verifiedCertificate && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-green-100 rounded-full">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-green-900 text-sm">Certificate Verified ✓</span>
                </div>
                <div className="text-sm text-gray-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Recipient</span>
                    <span className="font-semibold">{verifiedCertificate.user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tournament</span>
                    <span className="font-semibold">{verifiedCertificate.tournament?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Team</span>
                    <span className="font-semibold">{verifiedCertificate.team?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Issued</span>
                    <span className="font-semibold">{formatDate(verifiedCertificate.issuedAt)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setVerifyMode(false); setVerificationCode(''); setVerifiedCertificate(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Close
              </button>
              <button
                onClick={handleVerify}
                disabled={!verificationCode || verifying}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                )}
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Certificates Yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            Participate and perform in tournaments to earn certificates of achievement.
          </p>
          <button
            onClick={() => navigate('/tournaments')}
            className="btn-primary px-6 py-2.5 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Browse Tournaments
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              {/* Certificate Header */}
              <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 p-6 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-4 -translate-x-4" />
                <div className="relative text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm ring-2 ring-white/30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-0.5">Certificate of</p>
                  <h3 className="text-lg font-bold text-white">Participation</h3>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="p-6">
                <div className="space-y-3 mb-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-0.5">Tournament</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{certificate.tournament?.name}</span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-0.5">Team</span>
                    <span className="text-sm font-medium text-gray-700 text-right">{certificate.team?.name}</span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-0.5">Issued On</span>
                    <span className="text-sm font-medium text-gray-700 text-right">{formatDate(certificate.issuedAt)}</span>
                  </div>
                  <div className="h-px bg-gray-50" />
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-0.5">Verify Code</span>
                    <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                      {certificate.verificationCode}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(certificate.id)}
                  disabled={downloadingId === certificate.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {downloadingId === certificate.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  {downloadingId === certificate.id ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

export default Certificates;
