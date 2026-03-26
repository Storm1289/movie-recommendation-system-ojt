import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Navbar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();
    const { user, isSidebarOpen, setIsSidebarOpen } = useApp();
    
    const dropdownRef = useRef(null);
    const searchTimeout = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        setShowDropdown(true);
        setIsSearching(true);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
                const data = await res.json();
                setResults(data.movies?.slice(0, 6) || []); // Show top 6 results
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 400); // 400ms debounce
        
        return () => clearTimeout(searchTimeout.current);
    }, [query]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
            setShowDropdown(false);
        }
    };
    
    const handleResultClick = () => {
        setShowDropdown(false);
        setQuery('');
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-bg-dark/95 backdrop-blur-md">
            <div className="pl-5 pr-6 md:pr-10 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Menu Toggle + Logo (Visible everywhere) */}
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors mr-2 md:mr-4"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <Link to="/" className="flex items-center gap-2 text-white">
                            <span className="material-symbols-outlined text-primary">movie</span>
                            <h2 className="text-xl font-black tracking-tighter whitespace-nowrap">CineStream</h2>
                        </Link>
                    </div>

                    <div className="flex items-center justify-end gap-6 flex-1 ml-auto">
                        {/* Search */}
                        <div ref={dropdownRef} className="relative w-full max-w-lg hidden md:block group">
                            <form onSubmit={handleSearch} className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">search</span>
                                </div>
                                <input
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        if(e.target.value.trim()) setShowDropdown(true);
                                    }}
                                    onFocus={() => { if(query.trim()) setShowDropdown(true); }}
                                    className="block w-full rounded-lg border-2 border-transparent bg-surface-dark py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-slate-800 focus:bg-[#11111f] transition-all outline-none"
                                    placeholder="Search for movies across our DB and the Web..."
                                    type="text"
                                    autoComplete="off"
                                />
                            </form>
                            
                            {/* Autocomplete Dropdown */}
                            {showDropdown && query.trim() && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-slate-700/50 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50 transform origin-top animate-fade-in-down">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center p-6 text-slate-400">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
                                            Searching knowledge bases...
                                        </div>
                                    ) : results.length > 0 ? (
                                        <ul className="py-2">
                                            {results.map((movie, idx) => {
                                                const isExistentInDB = typeof movie.id === 'number';
                                                // Handle varying poster source logic
                                                let posterUrl = null;
                                                const pPath = movie.poster_path;
                                                if(pPath) {
                                                    posterUrl = pPath.startsWith('http') ? pPath : `https://image.tmdb.org/t/p/w200${pPath}`;
                                                }
                                                
                                                return (
                                                    <li key={movie.id || idx}>
                                                        <Link 
                                                            to={`/movie/${movie.id}`} 
                                                            onClick={handleResultClick}
                                                            className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group/item"
                                                        >
                                                            {/* Thumbnail */}
                                                            <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden flex-shrink-0 relative">
                                                                {posterUrl ? (
                                                                    <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <span className="material-symbols-outlined text-slate-600 text-[20px]">movie</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-white text-sm font-semibold truncate group-hover/item:text-primary transition-colors">
                                                                    {movie.title}
                                                                </h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <p className="text-slate-400 text-xs truncate">
                                                                        {movie.genre || movie.release_date?.split('-')[0] || 'Unknown Genre'}
                                                                    </p>
                                                                    {/* Existence Badge */}
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase ${isExistentInDB ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                        {isExistentInDB ? 'In DB' : 'From Web'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            <span className="material-symbols-outlined text-slate-500 group-hover/item:text-white transform group-hover/item:translate-x-1 transition-all mr-2">
                                                                arrow_forward
                                                            </span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="p-6 text-center text-slate-400">
                                            <span className="material-symbols-outlined text-3xl mb-2 text-slate-500">sentiment_dissatisfied</span>
                                            <p className="text-sm">No movies found across our database or the web.</p>
                                        </div>
                                    )}
                                    {/* Action footer */}
                                    {results.length > 0 && (
                                        <div className="bg-black/30 p-2 text-center border-t border-slate-800">
                                            <button 
                                                onClick={handleSearch}
                                                className="text-primary hover:text-white text-xs font-bold transition-colors w-full p-2"
                                            >
                                                See all results for "{query}"
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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
