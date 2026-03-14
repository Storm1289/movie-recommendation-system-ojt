import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import MovieCard from '../components/MovieCard';

export default function Profile() {
    const { user, watchlist } = useApp();

    return (
        <div>
            {/* Cover + Avatar */}
            <section className="relative w-full mb-8">
                <div className="relative w-full h-64 md:h-80 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-surface-dark to-bg-dark" />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/30 to-transparent" />
                </div>
                <div className="px-6 md:px-10 -mt-20 relative z-10">
                    <div className="flex flex-col md:flex-row items-end md:items-end gap-6">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-primary to-purple-600 ring-4 ring-bg-dark shadow-2xl flex items-center justify-center text-5xl font-black text-white">
                            {user?.avatar || user?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 mb-2 text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{user?.name || 'Guest User'}</h1>
                            <p className="text-slate-400 text-sm md:text-base mt-1">
                                {user?.email || 'Sign in to personalize your experience'}
                            </p>
                            <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-sm text-slate-300">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px] text-gold">star</span> 24 Reviews
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px] text-primary">bookmark</span> {watchlist.length} Watchlist
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 mb-2">
                            {user ? (
                                <Link to="/settings" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
                                    Edit Profile
                                </Link>
                            ) : (
                                <Link to="/login" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
                                    Sign In
                                </Link>
                            )}
                            <button className="p-2.5 bg-surface-dark border border-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
                                <span className="material-symbols-outlined">share</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-4xl mx-auto">
                        <div className="bg-surface-dark border border-slate-800 p-4 rounded-xl flex items-center justify-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gold/20 text-gold flex items-center justify-center">
                                <span className="material-symbols-outlined">trophy</span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">45</div>
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Badges Earned</div>
                            </div>
                        </div>
                        <div className="bg-surface-dark border border-slate-800 p-4 rounded-xl flex items-center justify-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
                                <span className="material-symbols-outlined">favorite</span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{watchlist.length}</div>
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Watchlist</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Profile Content */}
            <div className="px-6 md:px-10 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Watchlist */}
                    <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">bookmark</span>
                            My Watchlist ({watchlist.length})
                        </h3>
                        {watchlist.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {watchlist.map((movie) => (
                                    <MovieCard key={movie.id} movie={movie} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <span className="material-symbols-outlined text-4xl text-slate-600 mb-3 block">playlist_add</span>
                                <p className="text-slate-400 text-sm mb-4">Your watchlist is empty. Browse movies and add them!</p>
                                <Link to="/discover" className="inline-flex px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
                                    Discover Movies
                                </Link>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Preferred Genres */}
                    <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Preferred Genres</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Sci-Fi', pct: 85, color: 'bg-primary' },
                                { name: 'Action', pct: 65, color: 'bg-blue-400' },
                                { name: 'Thriller', pct: 40, color: 'bg-purple-400' },
                                { name: 'Comedy', pct: 25, color: 'bg-green-400' },
                            ].map(g => (
                                <div key={g.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-300">{g.name}</span>
                                        <span className="text-primary font-bold">{g.pct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-2">
                                        <div className={`${g.color} h-2 rounded-full transition-all`} style={{ width: `${g.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Activity */}
                    <section className="bg-surface-dark border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-800" />
                            {[
                                { icon: 'visibility', color: 'bg-primary', text: 'Watched', movie: 'Dune: Part Two', time: '2 hours ago' },
                                { icon: 'rate_review', color: 'bg-green-500', text: 'Reviewed', movie: 'Poor Things', time: '1 day ago' },
                                { icon: 'favorite', color: 'bg-pink-500', text: 'Liked', movie: 'Barbie', time: '2 days ago' },
                            ].map((a, i) => (
                                <div key={i} className="relative flex gap-4">
                                    <div className={`w-8 h-8 rounded-full ${a.color} flex items-center justify-center relative z-10 ring-4 ring-surface-dark shrink-0`}>
                                        <span className="material-symbols-outlined text-white text-[16px]">{a.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-300">
                                            <span className="text-white font-bold">{a.text}</span>{' '}
                                            <Link to="/discover" className="text-primary hover:underline">{a.movie}</Link>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">{a.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
