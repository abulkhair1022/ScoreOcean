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

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      navigate('/login');
      return;
    }

    fetchCertificates();
  }, [navigate]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/certificates');
      setCertificates(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificateId: string) => {
    try {
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
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) return;
    
    try {
      const response = await apiClient.get(`/certificates/verify/${verificationCode}`);
      setVerifiedCertificate(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Certificate not found');
      setVerifiedCertificate(null);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading certificates...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Certificates</h2>
          <p className="text-gray-600">View and download your tournament certificates</p>
        </div>
        <button
          onClick={() => setVerifyMode(true)}
          className="px-6 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Verify Certificate
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-700 hover:text-red-900">×</button>
        </div>
      )}

      {/* Verify Certificate Modal */}
      {verifyMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Verify Certificate</h3>
            <p className="text-gray-600 mb-4">Enter the verification code to check certificate authenticity</p>
            
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter verification code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
            />

            {verifiedCertificate && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-green-900">Certificate Verified</span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><span className="font-medium">Recipient:</span> {verifiedCertificate.user?.name}</p>
                  <p><span className="font-medium">Tournament:</span> {verifiedCertificate.tournament?.name}</p>
                  <p><span className="font-medium">Team:</span> {verifiedCertificate.team?.name}</p>
                  <p><span className="font-medium">Issued:</span> {formatDate(verifiedCertificate.issuedAt)}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setVerifyMode(false);
                  setVerificationCode('');
                  setVerifiedCertificate(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleVerify}
                disabled={!verificationCode}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 transition-colors"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {certificates.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No certificates yet</h3>
          <p className="text-gray-600">
            Participate in tournaments to earn certificates
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white">
                <div className="flex items-center justify-center mb-4">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
                <h3 className="text-center text-lg font-bold">Certificate of Participation</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div>
                    <span className="text-sm text-gray-600">Tournament</span>
                    <p className="font-semibold text-gray-900">{certificate.tournament?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Team</span>
                    <p className="font-medium text-gray-900">{certificate.team?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Issued On</span>
                    <p className="font-medium text-gray-900">{formatDate(certificate.issuedAt)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Verification Code</span>
                    <p className="font-mono text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {certificate.verificationCode}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(certificate.id)}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Certificate
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
