import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
    // Auth state
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('cinestream_user');
        return saved ? JSON.parse(saved) : null;
    });

    // Watchlist
    const [watchlist, setWatchlist] = useState(() => {
        const saved = localStorage.getItem('cinestream_watchlist');
        return saved ? JSON.parse(saved) : [];
    });

    // Settings
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('cinestream_settings');
        return saved ? JSON.parse(saved) : {
            darkMode: true,
            autoplay: true,
            notifications: true,
            language: 'English',
            quality: 'Auto',
        };
    });

    // Persist
    useEffect(() => {
        if (user) localStorage.setItem('cinestream_user', JSON.stringify(user));
        else localStorage.removeItem('cinestream_user');
    }, [user]);

    useEffect(() => {
        localStorage.setItem('cinestream_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        localStorage.setItem('cinestream_settings', JSON.stringify(settings));
    }, [settings]);

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <AppContext.Provider value={{
            user, login, logout,
            watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
            settings, updateSettings,
            isSidebarOpen, setIsSidebarOpen
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
