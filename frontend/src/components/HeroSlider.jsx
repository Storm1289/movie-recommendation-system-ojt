import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function HeroSlider({ movies }) {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useApp();
    const scrollContainerRef = useRef(null);

    if (!movies.length) {
        return (
            <div className="relative w-full px-4 md:px-10 py-6">
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl aspect-[21/9] bg-surface-dark shimmer" />
            </div>
        );
    }

    // Limit to top 10 movies as requested
    const displayMovies = movies.slice(0, 10);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -scrollContainerRef.current.clientWidth, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: scrollContainerRef.current.clientWidth, behavior: 'smooth' });
        }
    };

    return (
        <section className="relative w-full px-4 md:px-10 py-6 group">
            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-2xl shadow-2xl"
                style={{ scrollBehavior: 'smooth' }}
            >
                {displayMovies.map((movie, index) => {
                    const backdropUrl = movie.backdrop_path?.startsWith('http')
                        ? movie.backdrop_path
                        : movie.backdrop_path
                            ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
                            : null;
                    const year = movie.release_date?.split('-')[0] || '';
                    const genre = movie.genre || '';
                    const inList = isInWatchlist(movie.id);

                    const handleWatchlist = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (inList) removeFromWatchlist(movie.id);
                        else addToWatchlist(movie);
                    };

                    return (
                        <div
                            key={movie.id}
                            className="relative min-w-full min-h-[500px] md:min-h-[600px] snap-center flex-shrink-0"
                        >
                            {/* Background */}
                            <div
                                className="absolute inset-0 w-full h-full bg-cover bg-center"
                                style={{ backgroundImage: backdropUrl ? `url('${backdropUrl}')` : 'none', backgroundColor: '#181830' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-bg-dark via-bg-dark/40 to-transparent" />

                            {/* Content */}
                            <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-12 lg:w-2/3">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider w-fit mb-4 backdrop-blur-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Trending #{index + 1}
                                </span>

                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-lg">
                                    {movie.title}
                                </h1>

                                <div className="flex items-center gap-4 text-sm md:text-base text-slate-300 mb-6 font-medium">
                                    <span className="text-green-400 font-bold">
                                        {movie.rating ? movie.rating.toFixed(1) : 'NR'} Rating
                                    </span>
                                    <span>{year}</span>
                                    <span className="px-2 py-0.5 border border-slate-600 rounded text-xs">PG-13</span>
                                    <span>{genre}</span>
                                </div>

                                <p className="text-slate-300 text-sm md:text-lg leading-relaxed mb-8 max-w-2xl line-clamp-3 md:line-clamp-none drop-shadow-md">
                                    {movie.overview}
                                </p>

                                <div className="flex flex-wrap items-center gap-4">
                                    <Link
                                        to={`/movie/${movie.id}`}
                                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-3.5 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-lg shadow-primary/25"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                                        Movie Info
                                    </Link>
                                    <button
                                        onClick={handleWatchlist}
                                        className={`flex items-center justify-center gap-2 backdrop-blur-sm border px-8 py-3.5 rounded-lg font-bold text-base transition-all ${inList ? 'bg-primary/20 border-primary text-primary hover:bg-red-500/20 hover:border-red-500 hover:text-red-400' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'}`}
                                    >
                                        <span className="material-symbols-outlined">{inList ? 'check' : 'add'}</span>
                                        {inList ? 'In Watchlist' : 'Add in Watchlist'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Nav arrows - Outside the scroll container but positioned absolutely over it */}
            <button
                onClick={scrollLeft}
                className="absolute left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/60 backdrop-blur text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:scale-110 shadow-xl"
                aria-label="Previous movie"
            >
                <span className="material-symbols-outlined text-2xl">chevron_left</span>
            </button>
            <button
                onClick={scrollRight}
                className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/60 backdrop-blur text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:scale-110 shadow-xl"
                aria-label="Next movie"
            >
                <span className="material-symbols-outlined text-2xl">chevron_right</span>
            </button>
        </section>
    );
}
