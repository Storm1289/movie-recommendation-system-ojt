import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Navbar() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const { user } = useApp();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-bg-dark/95 backdrop-blur-md">
            <div className="px-6 md:px-10 py-3 mx-auto max-w-[1440px]">
                <div className="flex items-center justify-between gap-4">
                    {/* Mobile menu + logo */}
                    <Link to="/" className="flex items-center gap-2 text-white md:hidden">
                        <span className="material-symbols-outlined text-primary">movie</span>
                        <h2 className="text-lg font-black tracking-tighter">CineStream</h2>
                    </Link>

                    <div className="flex items-center justify-end gap-6 flex-1 ml-auto">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="relative w-full max-w-md hidden md:block group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </div>
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="block w-full rounded-lg border-none bg-surface-dark py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:bg-black transition-all outline-none"
                                placeholder="Titles, people, genres"
                                type="text"
                                autoComplete="off"
                            />
                        </form>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button className="relative text-slate-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-bg-dark" />
                            </button>

                            {user ? (
                                <Link to="/profile" className="relative group">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 ring-2 ring-transparent group-hover:ring-primary transition-all duration-300 flex items-center justify-center text-white font-bold text-sm">
                                        {user.avatar || user.name?.[0]?.toUpperCase() || 'A'}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-bg-dark rounded-full" />
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">login</span>
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
