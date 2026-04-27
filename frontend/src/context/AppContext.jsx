/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import {
    addMovieToWatchlist,
    changeUserPassword as changeUserPasswordRequest,
    deleteUserAccount as deleteUserAccountRequest,
    fetchUserState,
    loginWithGoogle as loginWithGoogleRequest,
    loginUser,
    removeMovieFromWatchlist,
    signupUser,
    updateUserProfile as updateUserProfileRequest,
    updateUserEmail as updateUserEmailRequest,
    updateUserSettings as persistUserSettings,
} from '../api/api';

const AppContext = createContext();
const AUTH_STORAGE_KEY = 'cinestream_user';

const getStorageBucketKey = (user, suffix) => {
    const identity = user?.email?.trim().toLowerCase() || 'guest';
    return `cinestream_${suffix}_${identity}`;
};

const DEFAULT_SETTINGS = {
    darkMode: true,
    autoplay: true,
    notifications: true,
    emailDigest: false,
    language: 'English',
    quality: 'Auto',
};

const DEFAULT_STATS = {
    ratedMovieIds: [],
    commentCount: 0,
};

const DEFAULT_AUTH_MODAL = {
    isOpen: false,
    message: 'Please log in or sign up to continue',
};

export function AppProvider({ children }) {
    // Auth state
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    });

    const readWatchlist = (currentUser) => {
        const saved = localStorage.getItem(getStorageBucketKey(currentUser, 'watchlist'));
        return saved ? JSON.parse(saved) : [];
    };

    const readSettings = (currentUser) => {
        const saved = localStorage.getItem(getStorageBucketKey(currentUser, 'settings'));
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    };

    const readStats = (currentUser) => {
        const saved = localStorage.getItem(getStorageBucketKey(currentUser, 'stats'));
        return saved ? JSON.parse(saved) : DEFAULT_STATS;
    };

    // User-scoped state
    const [watchlist, setWatchlist] = useState(() => readWatchlist(user));
    const [settings, setSettings] = useState(() => readSettings(user));
    const [userStats, setUserStats] = useState(() => readStats(user));
    const [authModal, setAuthModal] = useState(DEFAULT_AUTH_MODAL);

    const applyUserState = (payload) => {
        setUser(payload.user || null);
        setWatchlist(payload.watchlist || []);
        setSettings({ ...DEFAULT_SETTINGS, ...(payload.settings || {}) });
        setUserStats({ ...DEFAULT_STATS, ...(payload.stats || {}) });
        setAuthModal(DEFAULT_AUTH_MODAL);
    };

    const isGuestUser = Boolean(user?.isGuest);

    const openAuthModal = (message = DEFAULT_AUTH_MODAL.message) => {
        setAuthModal({
            isOpen: true,
            message,
        });
    };

    const closeAuthModal = () => {
        setAuthModal(DEFAULT_AUTH_MODAL);
    };

    // Persist
    useEffect(() => {
        if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        else localStorage.removeItem(AUTH_STORAGE_KEY);
    }, [user]);

    useEffect(() => {
        let isCancelled = false;

        if (user?.id) {
            fetchUserState(user.id)
                .then((res) => {
                    if (isCancelled) return;
                    setWatchlist(res.data.watchlist || []);
                    setSettings({ ...DEFAULT_SETTINGS, ...(res.data.settings || {}) });
                    setUserStats({ ...DEFAULT_STATS, ...(res.data.stats || {}) });
                })
                .catch((error) => {
                    if (isCancelled) return;
                    if (error?.response?.status === 404) {
                        logout();
                        return;
                    }
                    console.error('Failed to sync user state', error);
                });

            return () => {
                isCancelled = true;
            };
        }

        Promise.resolve().then(() => {
            if (isCancelled) return;
            setWatchlist(readWatchlist(user));
            setSettings(readSettings(user));
            setUserStats(readStats(user));
        });

        return () => {
            isCancelled = true;
        };
    }, [user]);

    useEffect(() => {
        if (user?.id) return;
        localStorage.setItem(getStorageBucketKey(user, 'watchlist'), JSON.stringify(watchlist));
    }, [user, watchlist]);

    useEffect(() => {
        if (user?.id) return;
        localStorage.setItem(getStorageBucketKey(user, 'settings'), JSON.stringify(settings));
    }, [user, settings]);

    useEffect(() => {
        if (user?.id) return;
        localStorage.setItem(getStorageBucketKey(user, 'stats'), JSON.stringify(userStats));
    }, [user, userStats]);

    const login = async (credentials) => {
        const res = await loginUser(credentials);
        applyUserState(res.data);
        return res.data.user;
    };

    const signup = async (credentials) => {
        const res = await signupUser(credentials);
        applyUserState(res.data);
        return res.data.user;
    };

    const loginWithGoogle = async (payload) => {
        const res = await loginWithGoogleRequest(payload);
        applyUserState(res.data);
        return res.data.user;
    };



    const logout = () => {
        setUser(null);
        setWatchlist([]);
        setSettings({ ...DEFAULT_SETTINGS });
        setUserStats({ ...DEFAULT_STATS });
        closeAuthModal();
    };

    const continueAsGuest = () => {
        applyUserState({
            user: {
                id: null,
                name: 'Guest Viewer',
                email: '',
                avatar: 'G',
                isGuest: true,
                authProviders: ['guest'],
            },
            watchlist: [],
            settings: DEFAULT_SETTINGS,
            stats: DEFAULT_STATS,
        });
    };

    const addToWatchlist = async (movie) => {
        if (isGuestUser) {
            openAuthModal();
            return;
        }

        if (user?.id) {
            const res = await addMovieToWatchlist(user.id, movie.id);
            setWatchlist(res.data.watchlist || []);
            return;
        }

        setWatchlist((prev) => {
            if (prev.find((m) => m.id === movie.id)) return prev;
            return [...prev, movie];
        });
    };

    const removeFromWatchlist = async (movieId) => {
        if (isGuestUser) {
            openAuthModal();
            return;
        }

        if (user?.id) {
            const res = await removeMovieFromWatchlist(user.id, movieId);
            setWatchlist(res.data.watchlist || []);
            return;
        }

        setWatchlist((prev) => prev.filter((m) => m.id !== movieId));
    };

    const isInWatchlist = (movieId) => watchlist.some((m) => m.id === movieId);

    const updateSettings = async (newSettings) => {
        if (isGuestUser) {
            openAuthModal();
            return;
        }

        if (user?.id) {
            const res = await persistUserSettings(user.id, newSettings);
            setSettings({ ...DEFAULT_SETTINGS, ...(res.data.settings || {}) });
            setUserStats({ ...DEFAULT_STATS, ...(res.data.stats || {}) });
            return;
        }

        setSettings((prev) => ({ ...prev, ...newSettings }));
    };

    const updateProfile = async (payload) => {
        if (isGuestUser || !user?.id) {
            openAuthModal();
            return null;
        }

        const res = await updateUserProfileRequest(user.id, payload);
        applyUserState(res.data);
        return res.data.user;
    };

    const changeEmail = async (payload) => {
        if (isGuestUser || !user?.id) {
            openAuthModal();
            return null;
        }

        const res = await updateUserEmailRequest(user.id, payload);
        applyUserState(res.data);
        return res.data.user;
    };

    const changePassword = async (payload) => {
        if (isGuestUser || !user?.id) {
            openAuthModal();
            return null;
        }

        const res = await changeUserPasswordRequest(user.id, payload);
        return res.data;
    };

    const deleteAccount = async () => {
        if (isGuestUser || !user?.id) {
            openAuthModal();
            return null;
        }

        const res = await deleteUserAccountRequest(user.id);
        logout();
        return res.data;
    };

    const markMovieRated = (movieId) => {
        const normalizedMovieId = String(movieId);
        setUserStats((prev) => ({
            ...prev,
            ratedMovieIds: prev.ratedMovieIds.includes(normalizedMovieId)
                ? prev.ratedMovieIds
                : [...prev.ratedMovieIds, normalizedMovieId],
        }));
    };

    const incrementCommentCount = () => {
        setUserStats((prev) => ({
            ...prev,
            commentCount: prev.commentCount + 1,
        }));
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <AppContext.Provider value={{
            user, isGuestUser, authModal, openAuthModal, closeAuthModal,
            login, signup, loginWithGoogle, continueAsGuest, logout,
            updateProfile, changePassword, deleteAccount,
            watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
            userStats, markMovieRated, incrementCommentCount,
            settings, updateSettings,
            isSidebarOpen, setIsSidebarOpen,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
