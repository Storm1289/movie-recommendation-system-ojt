import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const getStorageBucketKey = (user, suffix) => {
    const identity = user?.email?.trim().toLowerCase() || 'guest';
    return `cinestream_${suffix}_${identity}`;
};

export function AppProvider({ children }) {
    // Auth state
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('cinestream_user');
        return saved ? JSON.parse(saved) : null;
    });

    const defaultSettings = {
        darkMode: true,
        autoplay: true,
        notifications: true,
        language: 'English',
        quality: 'Auto',
    };

    const readWatchlist = (currentUser) => {
        const saved = localStorage.getItem(getStorageBucketKey(currentUser, 'watchlist'));
        return saved ? JSON.parse(saved) : [];
    };

    const readSettings = (currentUser) => {
        const saved = localStorage.getItem(getStorageBucketKey(currentUser, 'settings'));
        return saved ? JSON.parse(saved) : defaultSettings;
    };

    const readStats = (currentUser) => {
        const saved = localStorage.getItem(getStorageBucketKey(currentUser, 'stats'));
        return saved ? JSON.parse(saved) : { ratedMovieIds: [], commentCount: 0 };
    };

    // User-scoped state
    const [watchlist, setWatchlist] = useState(() => readWatchlist(user));
    const [settings, setSettings] = useState(() => readSettings(user));
    const [userStats, setUserStats] = useState(() => readStats(user));

    // Persist
    useEffect(() => {
        if (user) localStorage.setItem('cinestream_user', JSON.stringify(user));
        else localStorage.removeItem('cinestream_user');
    }, [user]);

    useEffect(() => {
        setWatchlist(readWatchlist(user));
        setSettings(readSettings(user));
        setUserStats(readStats(user));
    }, [user]);

    useEffect(() => {
        localStorage.setItem(getStorageBucketKey(user, 'watchlist'), JSON.stringify(watchlist));
    }, [user, watchlist]);

    useEffect(() => {
        localStorage.setItem(getStorageBucketKey(user, 'settings'), JSON.stringify(settings));
    }, [user, settings]);

    useEffect(() => {
        localStorage.setItem(getStorageBucketKey(user, 'stats'), JSON.stringify(userStats));
    }, [user, userStats]);

    const login = (userData) => setUser(userData);
    const logout = () => { setUser(null); };

    const addToWatchlist = (movie) => {
        setWatchlist(prev => {
            if (prev.find(m => m.id === movie.id)) return prev;
            return [...prev, movie];
        });
    };

    const removeFromWatchlist = (movieId) => {
        setWatchlist(prev => prev.filter(m => m.id !== movieId));
    };

    const isInWatchlist = (movieId) => watchlist.some(m => m.id === movieId);

    const updateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const markMovieRated = (movieId) => {
        setUserStats(prev => ({
            ...prev,
            ratedMovieIds: prev.ratedMovieIds.includes(movieId)
                ? prev.ratedMovieIds
                : [...prev.ratedMovieIds, movieId],
        }));
    };

    const incrementCommentCount = () => {
        setUserStats(prev => ({
            ...prev,
            commentCount: prev.commentCount + 1,
        }));
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <AppContext.Provider value={{
            user, login, logout,
            watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
            userStats, markMovieRated, incrementCommentCount,
            settings, updateSettings,
            isSidebarOpen, setIsSidebarOpen
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
