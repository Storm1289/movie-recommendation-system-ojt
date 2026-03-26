import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Login() {
    const { login } = useApp();
    const navigate = useNavigate();
    const [isSignup, setIsSignup] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
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
        // Simulate API call
        setTimeout(() => {
            login({
                name: formData.name || formData.email.split('@')[0],
                email: formData.email,
                avatar: formData.name?.[0]?.toUpperCase() || formData.email[0].toUpperCase(),
            });
            setLoading(false);
            navigate('/home');
        }, 800);
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex items-center gap-3 group">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
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
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 bg-bg-dark border border-slate-700 rounded-xl py-2.5 text-slate-300 hover:text-white hover:border-slate-500 transition-all text-sm font-semibold">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Google
                        </button>
                        <button className="flex items-center justify-center gap-2 bg-bg-dark border border-slate-700 rounded-xl py-2.5 text-slate-300 hover:text-white hover:border-slate-500 transition-all text-sm font-semibold">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                            GitHub
                        </button>
                    </div>

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
