import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error || !accessToken || !refreshToken) {
      const errorMessages: Record<string, string> = {
        google_auth_cancelled: 'Google sign-in was cancelled.',
        google_auth_failed: 'Google sign-in failed. Please try again.',
        google_token_failed: 'Could not complete Google sign-in.',
        google_no_email: 'Google account has no email address.',
        invalid_state: 'Security check failed. Please try again.',
      };
      const msg = error ? (errorMessages[error] || 'Authentication failed.') : 'Authentication failed.';
      navigate(`/login?error=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    // Save tokens
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Build user object from params
    const user = {
      id: searchParams.get('userId') || '',
      email: searchParams.get('email') || '',
      role: searchParams.get('role') || '',
      name: searchParams.get('name') || '',
      avatar: searchParams.get('avatar') || '',
    };
    localStorage.setItem('user', JSON.stringify(user));

    navigate('/', { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-ocean-500 flex items-center justify-center mx-auto mb-4">
          <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium">Signing you in…</p>
      </div>
    </div>
  );
}
