import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

export default function Login() {
    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || 'dummy'}>
            <LoginInner />
        </GoogleOAuthProvider>
    );
}

function LoginInner() {
    const { login, signup, loginWithGoogle, continueAsGuest } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSignup, setIsSignup] = useState(new URLSearchParams(location.search).get('mode') === 'signup');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState('');

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }
        if (isSignup && !formData.name) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        try {
            if (isSignup) {
                await signup({
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                });
            } else {
                await login({
                    email: formData.email.trim(),
                    password: formData.password,
                });
            }
            navigate('/home');
        } catch (err) {
            setError(err?.response?.data?.detail || 'Unable to sign in right now');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGoogleLoginSuccess = (credentialResponse) => {
        setError('');

        if (!credentialResponse?.credential) {
            setError('Google sign-in did not return a valid credential.');
            return;
        }

        setSocialLoading('Google');
        loginWithGoogle({ credential: credentialResponse.credential })
            .then(() => { navigate('/home'); })
            .catch((err) => { setError(err?.response?.data?.detail || 'Unable to sign in with Google'); })
            .finally(() => { setSocialLoading(''); });
    };

    const handleGoogleLoginError = () => {
        setSocialLoading('');
        setError('Google sign-in failed. Please try again.');
    };

    const googleConfigured = Boolean(googleClientId && googleClientId !== 'dummy');
    const googleBusy = socialLoading === 'Google';
    const handleGuestAccess = () => {
        setError('');
        continueAsGuest();
        navigate('/home');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/15 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-900/15 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex items-center gap-3 group">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">CineStream</h1>
                    </Link>
                    <p className="text-slate-400 mt-3 text-sm">
                        {isSignup ? 'Create your account and start streaming' : 'Welcome back! Sign in to continue'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-surface-dark/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isSignup && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px]">person</span>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        type="text"
                                        placeholder="Alex Morgan"
                                        className="w-full bg-bg-dark border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px]">mail</span>
                                <input
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full bg-bg-dark border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px]">lock</span>
                                <input
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-bg-dark border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">error</span> {error}
                            </div>
                        )}

                        {!isSignup && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 text-slate-400 hover:text-white cursor-pointer transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded bg-bg-dark border-slate-600 text-primary focus:ring-primary" />
                                    <span>Remember me</span>
                                </label>
                                <a href="#" className="text-primary hover:text-white transition-colors font-semibold">Forgot password?</a>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || Boolean(socialLoading)}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">{isSignup ? 'person_add' : 'login'}</span>
                                    {isSignup ? 'Create Account' : 'Sign In'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-slate-500 text-xs font-bold uppercase">or continue with</span>
                        <div className="flex-1 h-px bg-slate-700" />
                    </div>

                    {/* Social login */}
                    <div className="w-full">
                        {googleConfigured ? (
                            <div className="relative min-h-[48px] w-full overflow-hidden rounded-xl">
                                <div className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-bg-dark px-4 text-sm font-bold text-slate-200 shadow-sm transition-all hover:border-amber-400/60 hover:bg-white/[0.04] hover:text-white">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white">
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    </span>
                                    <span>{isSignup ? 'Sign up with Google' : 'Continue with Google'}</span>
                                </div>
                                <div className="absolute inset-0 z-10 opacity-0 [&>div]:!h-full [&>div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full">
                                    <GoogleLogin
                                        onSuccess={handleGoogleLoginSuccess}
                                        onError={handleGoogleLoginError}
                                        theme="filled_black"
                                        size="large"
                                        shape="rectangular"
                                        text={isSignup ? 'signup_with' : 'signin_with'}
                                        logo_alignment="center"
                                        width="336"
                                    />
                                </div>
                                {googleBusy && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-bg-dark/85">
                                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled
                                className="w-full flex items-center justify-center gap-2 bg-bg-dark border border-slate-700 rounded-xl py-3 px-4 text-slate-500 text-sm font-semibold opacity-60 cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                Google sign-in unavailable
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleGuestAccess}
                        disabled={loading || Boolean(socialLoading)}
                        className="mt-4 w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continue as Guest
                    </button>

                    <p className="mt-3 text-center text-xs text-slate-500">
                        Guest mode is limited to the homepage preview only.
                    </p>

                    {/* Toggle signup/login */}
                    <p className="text-center text-sm text-slate-400 mt-6">
                        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button onClick={() => { setIsSignup(!isSignup); setError(''); }} className="text-primary hover:text-white font-bold transition-colors">
                            {isSignup ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
