import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTrending, fetchTopMonth, fetchMovies } from '../api/api';
import HeroSlider from '../components/HeroSlider';
import MovieCard from '../components/MovieCard';

export default function Home() {
    const [trending, setTrending] = useState([]);
    const [topMonth, setTopMonth] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [newReleases, setNewReleases] = useState([]);

    useEffect(() => {
        fetchTrending().then(res => setTrending(res.data.movies)).catch(console.error);
        fetchTopMonth().then(res => setTopMonth(res.data.movies)).catch(console.error);
        fetchMovies({ sort_by: 'rating', per_page: 6 }).then(res => setRecommended(res.data.movies)).catch(console.error);
        fetchMovies({ sort_by: 'release_date', per_page: 6 }).then(res => setNewReleases(res.data.movies)).catch(console.error);
    }, []);

    return (
        <div>
            {/* Hero Slider */}
            <HeroSlider movies={trending} />

            <div className="px-4 md:px-10 mt-8 space-y-12">
                {/* Top 10 of the Month - Auto-scrolling */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            🔥 Top 10 Movies of the Month
                            <span className="text-primary text-sm font-normal opacity-80 ml-2">March 2026</span>
                        </h2>
                        <Link to="/discover" className="text-sm font-semibold text-primary hover:text-white transition-colors flex items-center gap-1 group">
                            View all
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </Link>
                    </div>

                    {/* Auto-scrolling container */}
                    <div className="overflow-hidden relative">
                        <div className="auto-scroll flex gap-4 w-max">
                            {/* Duplicate for seamless loop */}
                            {[...topMonth, ...topMonth].map((movie, i) => (
                                <div key={`${movie.id}-${i}`} className="min-w-[160px] md:min-w-[200px]">
                                    <MovieCard movie={movie} rank={i < topMonth.length ? i + 1 : undefined} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Recommended for You */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Based on your recent watch
                            <span className="text-primary text-sm font-normal opacity-80 ml-2">Because you watched Inception</span>
                        </h2>
                        <Link to="/discover" className="text-sm font-semibold text-primary hover:text-white transition-colors flex items-center gap-1 group">
                            View all
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
                        {recommended.map((movie) => (
                            <div key={movie.id} className="min-w-[160px] md:min-w-[200px] snap-start">
                                <MovieCard movie={movie} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Trending */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Trending Now
                            <span className="text-red-500 animate-pulse material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {trending.map((movie, i) => (
                            <MovieCard key={movie.id} movie={movie} rank={i + 1} />
                        ))}
                    </div>
                </section>

                {/* New Releases */}
                <section className="pb-8">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">New Releases</h2>
                        <Link to="/discover?sort=release_date" className="text-sm font-semibold text-primary hover:text-white transition-colors flex items-center gap-1 group">
                            View all
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
                        {newReleases.map((movie) => (
                            <div key={movie.id} className="min-w-[160px] md:min-w-[200px] snap-start">
                                <MovieCard movie={movie} />
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Footer */}
            <footer className="bg-bg-dark border-t border-white/5 py-12 px-10">
                <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col gap-2 text-center md:text-left">
                        <h4 className="text-lg font-bold text-white">CineStream</h4>
                        <p className="text-slate-500 text-sm">© 2026 CineStream. All rights reserved.</p>
                    </div>
                    <div className="flex gap-6">
                        <a className="text-slate-400 hover:text-white text-sm transition-colors" href="#">Privacy Policy</a>
                        <a className="text-slate-400 hover:text-white text-sm transition-colors" href="#">Terms of Service</a>
                        <a className="text-slate-400 hover:text-white text-sm transition-colors" href="#">Help Center</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
