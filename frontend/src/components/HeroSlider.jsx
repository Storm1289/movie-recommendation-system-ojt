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
                    const rawPath = movie.backdrop_path || movie.poster_path;
                    const backdropUrl = rawPath?.startsWith('http')
                        ? rawPath
                        : rawPath
                            ? `https://image.tmdb.org/t/p/original${rawPath}`
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

                    const hasBackdrop = !!movie.backdrop_path;
                    const posterUrl = movie.poster_path?.startsWith('http')
                        ? movie.poster_path
                        : movie.poster_path
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                            : null;

                    return (
                        <div
                            key={movie.id}
                            className="relative min-w-full min-h-[500px] md:min-h-[600px] snap-center flex-shrink-0"
                        >
                            {/* Background */}
                            <div
                                className={`absolute inset-0 w-full h-full bg-cover bg-center ${!hasBackdrop ? 'md:blur-3xl md:opacity-40 blur-xl opacity-50 transform scale-110' : ''}`}
                                style={{ backgroundImage: backdropUrl ? `url('${backdropUrl}')` : 'none', backgroundColor: '#181830' }}
                            />
                            <div className={`absolute inset-0 bg-gradient-to-t ${!hasBackdrop ? 'from-bg-dark via-bg-dark/80 to-bg-dark/40' : 'from-bg-dark via-bg-dark/60 to-transparent'}`} />
                            <div className="absolute inset-0 bg-gradient-to-r from-bg-dark via-bg-dark/40 to-transparent" />

                            {/* Content Grid */}
                            <div className="relative z-10 flex flex-col md:flex-row h-full w-full">
                                {/* Left Content */}
                                <div className={`flex flex-col justify-end md:justify-center h-full p-6 md:p-12 w-full ${!hasBackdrop ? 'md:w-3/5 lg:w-1/2' : 'lg:w-2/3'}`}>
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider w-fit mb-4 backdrop-blur-sm shadow-lg">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]" />
                                        Trending #{index + 1}
                                    </span>

                                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-2xl">
                                        {movie.title}
                                    </h1>

                                    <div className="flex items-center gap-4 text-sm md:text-base text-slate-300 mb-6 font-medium backdrop-blur-sm bg-black/10 w-fit px-4 py-2 rounded-lg border border-white/5">
                                        <span className="text-green-400 font-bold drop-shadow">
                                            {movie.rating ? movie.rating.toFixed(1) : 'NR'} Rating
                                        </span>
                                        <span>•</span>
                                        <span>{year}</span>
                                        <span>•</span>
                                        <span className="px-2 py-0.5 border border-slate-500 rounded text-xs text-slate-400">PG-13</span>
                                        {genre && (
                                            <>
                                                <span>•</span>
                                                <span className="text-slate-200">{genre}</span>
                                            </>
                                        )}
                                    </div>

                                    <p className="text-slate-200 text-sm md:text-lg leading-relaxed mb-8 max-w-2xl line-clamp-3 md:line-clamp-4 drop-shadow-xl font-medium">
                                        {movie.overview}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <Link
                                            to={`/movie/${movie.id}`}
                                            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-3.5 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(var(--color-primary),0.4)]"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                                            Movie Info
                                        </Link>
                                        <button
                                            onClick={handleWatchlist}
                                            className={`flex items-center justify-center gap-2 backdrop-blur-md border px-8 py-3.5 rounded-lg font-bold text-base transition-all ${inList ? 'bg-primary/20 border-primary text-primary hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' : 'bg-black/40 hover:bg-white/10 border-white/20 text-white hover:border-white/40 shadow-xl'}`}
                                        >
                                            <span className="material-symbols-outlined">{inList ? 'check' : 'add'}</span>
                                            {inList ? 'In Watchlist' : 'Add in Watchlist'}
                                        </button>
                                    </div>
                                </div>

                                {/* Right Poster (Only visible on desktop if no backdrop exists) */}
                                {!hasBackdrop && posterUrl && (
                                    <div className="hidden md:flex flex-1 flex-col justify-center items-center py-12 pr-12 lg:pr-24">
                                        <div className="relative group perspective-1000">
                                            <img 
                                                src={posterUrl} 
                                                alt={movie.title} 
                                                className="w-full max-w-[320px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/10 transform transition-transform duration-700 hover:rotate-y-12 hover:scale-105"
                                            />
                                            {/* Glow effect behind poster */}
                                            <div className="absolute inset-0 bg-primary/20 blur-3xl -z-10 rounded-full transform scale-90 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                        </div>
                                    </div>
                                )}
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
