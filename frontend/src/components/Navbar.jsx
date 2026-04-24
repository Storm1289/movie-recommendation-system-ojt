import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { searchMovies } from '../api/api';
import { getValidImageUrl } from '../utils/imageUtils';

const primaryNavItems = [
    { label: 'Home', path: '/home' },
    { label: 'Genres', path: '/genres' },
    { label: 'New & Popular', path: '/category/trending' },
    { label: 'My List', path: '/profile' },
];

export default function Navbar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useApp();
    const isHomePage = location.pathname === '/home';
    const isGuest = Boolean(user?.isGuest);

    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const searchTimeout = useRef(null);
    const desktopNavRef = useRef(null);
    const mobileNavRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
                setIsSearchOpen(false);
                setQuery('');
                setResults([]);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 24);

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!isSearchOpen) return undefined;

        const timer = setTimeout(() => inputRef.current?.focus(), 60);
        return () => clearTimeout(timer);
    }, [isSearchOpen]);

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
                const res = await searchMovies(query.trim());
                setResults(res.data.movies?.slice(0, 6) || []);
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(searchTimeout.current);
    }, [query]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
        setShowDropdown(false);
        setIsSearchOpen(false);
    };

    const handleResultClick = () => {
        setShowDropdown(false);
        setIsSearchOpen(false);
        setQuery('');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActiveLink = (path) => {
        const [pathname] = path.split('?');
        return location.pathname === pathname;
    };

    const handleNavWheel = (ref) => (e) => {
        const el = ref.current;
        if (!el) return;

        const hasHorizontalOverflow = el.scrollWidth > el.clientWidth;
        if (!hasHorizontalOverflow) return;

        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        }
    };

    const avatarIsImage = typeof user?.avatar === 'string' && user.avatar.startsWith('http');

    return (
        <header
            className={`top-0 z-40 w-full transition-all duration-300 ${isHomePage ? 'fixed left-0 right-0' : 'sticky'
                } ${isScrolled || !isHomePage
                    ? 'bg-[#111111]/96 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md'
                    : 'bg-gradient-to-b from-black/85 via-black/35 to-transparent'
                }`}
        >
            <div className="px-4 py-4 md:px-10">
                <div className="flex items-center gap-4">
                    <Link to="/home" className="shrink-0 text-white flex items-center gap-2">
                        <img src="/vite.svg" alt="CineStream Logo" className="w-8 h-8 md:w-9 md:h-9" />
                        <h1 className="text-xl font-black tracking-[-0.04em] text-white md:text-[1.35rem]">CineStream</h1>
                    </Link>

                    <nav
                        ref={desktopNavRef}
                        onWheel={handleNavWheel(desktopNavRef)}
                        className="hidden min-w-0 flex-1 items-center gap-5 overflow-x-auto whitespace-nowrap text-[0.82rem] font-medium text-white/80 lg:flex"
                    >
                        {(isGuest ? primaryNavItems.filter((item) => item.path === '/home') : primaryNavItems).map((item) => (
                            <Link
                                key={item.label}
                                to={item.path}
                                className={`transition-colors ${isActiveLink(item.path) ? 'text-white' : 'hover:text-white'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-1.5 md:gap-3">
                        {!isGuest && <div ref={searchRef} className="relative hidden md:block">
                            <div
                                className={`relative h-9 overflow-hidden border transition-[width,border-radius,border-color,background-color] duration-300 ease-out ${isSearchOpen
                                    ? isScrolled
                                        ? 'w-64 rounded-md border-white/30 bg-white/8'
                                        : 'w-64 rounded-md border-white/20 bg-black/25'
                                    : 'w-9 rounded-full border-transparent bg-transparent hover:border-white/15 hover:bg-white/[0.06]'
                                    }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setIsSearchOpen((value) => !value)}
                                    className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-white/75 transition-all duration-300 hover:text-white ${isSearchOpen ? 'left-0' : 'right-0'
                                        }`}
                                    aria-label={isSearchOpen ? 'Close search' : 'Open search'}
                                >
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                </button>

                                <form onSubmit={handleSearch} className="h-full w-full">
                                    <input
                                        ref={inputRef}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onFocus={() => {
                                            setIsSearchOpen(true);
                                            if (query.trim()) setShowDropdown(true);
                                        }}
                                        className={`h-full w-full bg-transparent py-2 pr-3 text-[0.82rem] text-white outline-none transition-[padding,opacity] duration-300 placeholder:text-white/45 ${isSearchOpen ? 'pl-9 opacity-100' : 'pointer-events-none pl-3 opacity-0'
                                            }`}
                                        placeholder="Search titles"
                                        type="text"
                                        autoComplete="off"
                                    />
                                </form>
                            </div>

                            {showDropdown && query.trim() && (
                                <div className="absolute right-0 top-full z-50 mt-3 min-w-[22rem] overflow-hidden rounded-2xl border border-white/8 bg-[#141414]/95 shadow-2xl shadow-black/80">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center p-6 text-slate-400">
                                            <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            Searching your database...
                                        </div>
                                    ) : results.length > 0 ? (
                                        <ul className="py-2">
                                            {results.map((movie, idx) => {
                                                const posterUrl = getValidImageUrl(movie.poster_path, 'w200');

                                                return (
                                                    <li key={movie.id || idx}>
                                                        <Link
                                                            to={`/movie/${movie.id}`}
                                                            onClick={handleResultClick}
                                                            className="group/item flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/5"
                                                        >
                                                            <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-800">
                                                                {posterUrl ? (
                                                                    <>
                                                                        <img src={posterUrl} alt={movie.title} className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                                                                        <div className="hidden h-full w-full items-center justify-center bg-slate-800">
                                                                            <span className="material-symbols-outlined text-[20px] text-slate-600">movie</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center">
                                                                        <span className="material-symbols-outlined text-[20px] text-slate-600">movie</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="truncate text-sm font-semibold text-white transition-colors group-hover/item:text-primary">
                                                                    {movie.title}
                                                                </h4>
                                                                <div className="mt-1 flex items-center gap-2">
                                                                    <p className="truncate text-xs text-slate-400">
                                                                        {movie.genre || movie.release_date?.split('-')[0] || 'Unknown Genre'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <span className="material-symbols-outlined mr-1 text-slate-500 transition-all group-hover/item:translate-x-1 group-hover/item:text-white">
                                                                arrow_forward
                                                            </span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="p-6 text-center text-slate-400">
                                            <span className="material-symbols-outlined mb-2 text-3xl text-slate-500">sentiment_dissatisfied</span>
                                            <p className="text-sm">No movies found in your database.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>}



                        {user ? (
                            <>
                                {!isGuest && (
                                    <Link to="/profile" className="flex items-center gap-2 text-white">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-amber-600 to-amber-800 text-[0.72rem] font-bold text-white overflow-hidden">
                                            {avatarIsImage ? (
                                                <img 
                                                    src={user.avatar} 
                                                    alt={user.name || 'Profile'} 
                                                    className="h-full w-full object-cover" 
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=0D8ABC&color=fff&size=128`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {user?.avatar || user?.name?.[0]?.toUpperCase() || 'A'}
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                )}
                                {isGuest && (
                                    <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/75 md:inline-flex">
                                        Guest
                                    </span>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="hidden text-[0.8rem] font-medium text-white/80 transition-colors hover:text-red-400 xl:block"
                                >
                                    {isGuest ? 'Exit Guest' : 'Log Out'}
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="rounded bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-black transition-colors hover:bg-white/85"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>

                <nav
                    ref={mobileNavRef}
                    onWheel={handleNavWheel(mobileNavRef)}
                    className="mt-4 flex gap-4 overflow-x-auto whitespace-nowrap text-[0.8rem] font-medium text-white/75 lg:hidden"
                >
                    {(isGuest ? primaryNavItems.filter((item) => item.path === '/home') : primaryNavItems).map((item) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`pb-1 transition-colors ${isActiveLink(item.path) ? 'text-white' : 'hover:text-white'
                                }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}
