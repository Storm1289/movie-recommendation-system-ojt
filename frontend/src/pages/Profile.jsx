import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUserRatings, fetchUserReviews } from '../api/api';
import MovieCard from '../components/MovieCard';
import { useApp } from '../context/AppContext';
import { fetchWikiImageFallback, getValidImageUrl } from '../utils/imageUtils';
import { moviePath } from '../utils/movieRoutes';
import Settings from './Settings';

function EmptyState({ icon, title, copy, ctaLabel, ctaTo }) {
    return (
        <div className="text-center py-20 bg-surface-container-low rounded-2xl border border-white/5">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-6 opacity-40 block">{icon}</span>
            <p className="text-white font-headline text-2xl font-black uppercase tracking-tight mb-2">{title}</p>
            <p className="text-on-surface-variant text-base mb-8 max-w-md mx-auto">{copy}</p>
            {ctaLabel && ctaTo ? (
                <Link to={ctaTo} className="inline-block px-10 py-4 bg-primary text-black font-headline font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-lg">
                    {ctaLabel}
                </Link>
            ) : null}
        </div>
    );
}

function ActivityCard({ label, value, isActive, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`min-w-[108px] rounded-2xl border px-4 py-3 text-left transition-all ${
                isActive
                    ? 'border-primary bg-primary/10 shadow-[0_0_32px_rgba(245,158,11,0.15)]'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
            }`}
        >
            <span className="block text-primary font-headline font-black text-3xl">{value}</span>
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-label">{label}</span>
        </button>
    );
}

function ActivityListItem({ movie, eyebrow, title, meta, copy, extra }) {
    const [posterUrl, setPosterUrl] = useState(() => getValidImageUrl(movie?.poster_path, 'w200'));
    const [hidePoster, setHidePoster] = useState(false);

    const handlePosterError = async () => {
        if (!movie?.title || hidePoster) {
            setHidePoster(true);
            return;
        }

        const year = movie.release_date?.split('-')[0] || '';
        const fallback = await fetchWikiImageFallback(movie.title, year);
        if (fallback && fallback !== posterUrl) {
            setPosterUrl(fallback);
            return;
        }

        setHidePoster(true);
    };

    return (
        <Link
            to={movie ? moviePath(movie) : '/discover'}
            className="group flex gap-4 rounded-2xl border border-white/5 bg-surface-container-low p-4 transition-colors hover:border-white/10 hover:bg-surface-container"
        >
            <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                {posterUrl && !hidePoster ? (
                    <img src={posterUrl} alt={movie?.title || title} className="h-full w-full object-cover" onError={handlePosterError} />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant">movie</span>
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
                <h3 className="mt-1 truncate text-lg font-black text-white transition-colors group-hover:text-primary">{title}</h3>
                {meta ? <p className="mt-1 text-xs uppercase tracking-widest text-on-surface-variant">{meta}</p> : null}
                {copy ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-300">{copy}</p> : null}
            </div>
            {extra ? <div className="shrink-0 self-start">{extra}</div> : null}
        </Link>
    );
}

export default function Profile() {
    const { user, watchlist, userStats, isUserStateLoading } = useApp();
    const [activeTab, setActiveTab] = useState('overview');
    const [failedAvatarUrl, setFailedAvatarUrl] = useState('');
    const [reviewHistory, setReviewHistory] = useState([]);
    const [ratingHistory, setRatingHistory] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(() => Boolean(user?.id));
    const [ratingsLoading, setRatingsLoading] = useState(() => Boolean(user?.id));
    const [reviewsLoaded, setReviewsLoaded] = useState(false);
    const [ratingsLoaded, setRatingsLoaded] = useState(false);

    useEffect(() => {
        if (!user?.id || reviewsLoaded) {
            return;
        }

        let cancelled = false;
        fetchUserReviews(user.id)
            .then((res) => {
                if (cancelled) return;
                setReviewHistory(res.data?.reviews || []);
                setReviewsLoaded(true);
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error('Failed to load review history', error);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setReviewsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [reviewsLoaded, user?.id]);

    useEffect(() => {
        if (!user?.id || ratingsLoaded) {
            return;
        }

        let cancelled = false;
        fetchUserRatings(user.id)
            .then((res) => {
                if (cancelled) return;
                setRatingHistory(res.data?.ratings || []);
                setRatingsLoaded(true);
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error('Failed to load rating history', error);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setRatingsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [ratingsLoaded, user?.id]);

    const avatarIsImage = typeof user?.avatar === 'string' && user.avatar.startsWith('http') && failedAvatarUrl !== user.avatar;
    const avatarFallback = typeof user?.avatar === 'string' && !user.avatar.startsWith('http')
        ? user.avatar
        : user?.name?.[0]?.toUpperCase() || 'A';

    const scrollToSettings = () => {
        setActiveTab('overview');
        window.requestAnimationFrame(() => {
            document.getElementById('profile-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const sideNavItems = [
        { key: 'overview', icon: 'person', label: 'Profile Overview' },
        { key: 'watchlist', icon: 'bookmark', label: 'Watchlist' },
        { key: 'ratings', icon: 'star', label: 'Ratings' },
        { key: 'reviews', icon: 'forum', label: 'Reviews' },
    ];

    const renderWatchlist = () => (
        <section id="watchlist" className={`px-6 lg:px-12 py-12 flex-1 ${activeTab === 'watchlist' ? 'pt-8' : ''}`}>
            <div className="flex items-center justify-between mb-8">
                <h2 className="font-headline text-3xl font-black tracking-tight text-white uppercase">
                    {activeTab === 'watchlist' ? 'My Watchlist' : 'Saved Movies'}
                </h2>
            </div>

            {watchlist.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {watchlist.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon="movie"
                    title="Your Watchlist is Empty"
                    copy="Discover new cinematic masterpieces and add them to your collection."
                    ctaLabel="Browse Films"
                    ctaTo="/home"
                />
            )}
        </section>
    );

    const renderRatings = () => (
        <section className="px-6 lg:px-12 py-12 flex-1">
            <div className="mb-8">
                <h2 className="font-headline text-3xl font-black tracking-tight text-white uppercase">Ratings History</h2>
                <p className="mt-2 text-sm text-on-surface-variant">Every movie you've explicitly rated from your CineStream account.</p>
            </div>

            {ratingsLoading ? (
                <div className="grid gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-32 animate-pulse rounded-2xl bg-surface-container-low" />
                    ))}
                </div>
            ) : ratingHistory.length > 0 ? (
                <div className="grid gap-4">
                    {ratingHistory.map((entry) => {
                        const movie = entry.movie;
                        const rating = entry.rating;
                        const dateLabel = rating?.created_at ? new Date(rating.created_at).toLocaleDateString() : 'Recently rated';

                        return (
                            <ActivityListItem
                                key={`rating-${rating?.id ?? movie?.id ?? dateLabel}`}
                                movie={movie}
                                eyebrow="Rating"
                                title={movie?.title || 'Unknown movie'}
                                meta={dateLabel}
                                copy={movie?.genre || movie?.overview}
                                extra={(
                                    <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-center">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Score</p>
                                        <p className="text-2xl font-black text-primary">{rating?.rating ?? 'NR'}</p>
                                    </div>
                                )}
                            />
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon="star"
                    title="No Ratings Yet"
                    copy="Once you start rating movies, your scoring history will show up here."
                    ctaLabel="Find Something to Rate"
                    ctaTo="/discover"
                />
            )}
        </section>
    );

    const renderReviews = () => (
        <section className="px-6 lg:px-12 py-12 flex-1">
            <div className="mb-8">
                <h2 className="font-headline text-3xl font-black tracking-tight text-white uppercase">Review History</h2>
                <p className="mt-2 text-sm text-on-surface-variant">All the reviews you've posted, linked back to the exact movie pages.</p>
            </div>

            {reviewsLoading ? (
                <div className="grid gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-36 animate-pulse rounded-2xl bg-surface-container-low" />
                    ))}
                </div>
            ) : reviewHistory.length > 0 ? (
                <div className="grid gap-4">
                    {reviewHistory.map((entry) => {
                        const movie = entry.movie;
                        const comment = entry.comment;
                        const dateLabel = comment?.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Recently reviewed';

                        return (
                            <ActivityListItem
                                key={`review-${comment?.id ?? movie?.id ?? dateLabel}`}
                                movie={movie}
                                eyebrow="Review"
                                title={movie?.title || 'Unknown movie'}
                                meta={`${dateLabel}${comment?.updated_at ? ' • Edited' : ''}`}
                                copy={comment?.content}
                                extra={comment?.rating ? (
                                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Rating</p>
                                        <p className="text-2xl font-black text-amber-300">{comment.rating}</p>
                                    </div>
                                ) : null}
                            />
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon="forum"
                    title="No Reviews Yet"
                    copy="Share your take on a movie and your full review history will start building here."
                    ctaLabel="Browse Films"
                    ctaTo="/home"
                />
            )}
        </section>
    );

    const renderOverview = () => (
        <section id="profile-settings" className="flex-1 px-6 lg:px-12 py-8 w-full max-w-5xl">
            <Settings />
        </section>
    );

    if (isUserStateLoading) {
        return (
            <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-5">
                    <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-on-surface-variant">Loading Profile</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen flex">
            <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#131313] flex-col py-8 z-40 h-screen sticky top-0 shrink-0">
                <div className="px-6 mb-10">
                    <Link to="/home" className="text-xl font-black text-primary font-headline uppercase tracking-tighter hover:opacity-80 transition-opacity">CineStream</Link>
                </div>

                <nav className="flex-1 space-y-1">
                    {sideNavItems.map((item) => (
                        <div
                            key={item.key}
                            className={`flex items-center gap-3 px-6 py-4 font-manrope text-sm font-semibold cursor-pointer transition-colors ${
                                activeTab === item.key
                                    ? 'bg-primary/10 text-primary border-r-4 border-primary'
                                    : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
                            }`}
                            onClick={() => {
                                setActiveTab(item.key);
                                window.scrollTo(0, 0);
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: item.key === 'overview' ? "'FILL' 1" : undefined }}>
                                {item.icon}
                            </span>
                            {item.label}
                        </div>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 min-h-[100vh] relative flex flex-col">
                <header className="lg:hidden flex justify-between items-center px-6 py-4 bg-[#0e0e0e]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
                    <Link to="/home" className="text-xl font-black text-primary font-headline uppercase tracking-tighter">CineStream</Link>
                    <button className="material-symbols-outlined text-white">menu</button>
                </header>

                <div className="hidden lg:flex justify-end items-center px-12 py-4 absolute top-0 right-0 w-full z-10 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto mt-2">
                        <Link to="/home" className="text-sm font-bold text-white hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary pb-1 uppercase tracking-widest">Home</Link>
                    </div>
                </div>

                <section className="px-6 lg:px-12 py-12 lg:py-16 bg-gradient-to-b from-surface-container-low to-surface">
                    <div className="flex flex-col md:flex-row items-end gap-10">
                        <div className="relative group shrink-0">
                            <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden border-4 border-surface shadow-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-8xl font-black text-white">
                                {avatarIsImage ? (
                                    <img
                                        src={user.avatar}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            setFailedAvatarUrl(user?.avatar || '');
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {avatarFallback}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 pb-2 w-full">
                            <h1 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter mb-4 text-white uppercase">{user?.name || 'Guest User'}</h1>
                            <p className="font-body text-on-surface-variant max-w-xl text-base lg:text-lg leading-relaxed">
                                {user?.email || 'A true cinephile traversing the landscapes of visual storytelling. Log in to save your favorite frames and build your collection.'}
                            </p>

                            <div className="flex flex-wrap gap-4 mt-8">
                                <ActivityCard
                                    label="Saved"
                                    value={watchlist.length}
                                    isActive={activeTab === 'watchlist'}
                                    onClick={() => setActiveTab('watchlist')}
                                />
                                <ActivityCard
                                    label="Ratings"
                                    value={userStats?.ratedMovieIds?.length || 0}
                                    isActive={activeTab === 'ratings'}
                                    onClick={() => setActiveTab('ratings')}
                                />
                                <ActivityCard
                                    label="Reviews"
                                    value={userStats?.commentCount || 0}
                                    isActive={activeTab === 'reviews'}
                                    onClick={() => setActiveTab('reviews')}
                                />
                            </div>
                        </div>

                        <button onClick={scrollToSettings} className="hidden md:flex px-8 py-3 bg-white text-black font-headline font-bold text-sm uppercase tracking-widest rounded-full hover:bg-primary hover:text-black transition-all active:scale-95 mb-2 items-center justify-center">
                            Edit Profile
                        </button>
                    </div>
                </section>

                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'watchlist' && renderWatchlist()}
                {activeTab === 'ratings' && renderRatings()}
                {activeTab === 'reviews' && renderReviews()}

                <footer className="w-full py-8 px-6 lg:px-12 text-center border-t border-white/5 mt-auto bg-[#0e0e0e]">
                    <p className="text-on-surface-variant font-inter text-[10px] tracking-widest uppercase mb-2">
                        © {new Date().getFullYear()} CineStream. The Digital Streaming Experience.
                    </p>
                </footer>
            </main>
        </div>
    );
}
