import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function HeroSlider({ movies }) {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist, isGuestUser, openAuthModal } = useApp();
    const scrollContainerRef = useRef(null);

    if (!movies.length) {
        return (
            <div className="relative w-full h-[870px] overflow-hidden">
                <div className="w-full h-full bg-surface-container shimmer" />
            </div>
        );
    }

    const displayMovies = movies.filter(m => m.backdrop_path || m.poster_path).slice(0, 5);

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
        <section className="relative h-[600px] md:h-[870px] w-full overflow-hidden group">
            <div
                ref={scrollContainerRef}
                className="flex h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
            >
                {displayMovies.map((movie, index) => {
                    const rawPath = movie.backdrop_path || movie.poster_path;
                    const backdropUrl = rawPath?.startsWith('http')
                        ? rawPath
                        : rawPath
                            ? `https://image.tmdb.org/t/p/original${rawPath}`
                            : null;
                    const inList = isInWatchlist(movie.id);

                    const handleWatchlist = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            if (inList) await removeFromWatchlist(movie.id);
                            else await addToWatchlist(movie);
                        } catch (error) {
                            console.error(error);
                        }
                    };

                    const handleInfoClick = (e) => {
                        if (!isGuestUser) {
                            return;
                        }

                        e.preventDefault();
                        openAuthModal();
                    };

                    return (
                        <div key={movie.id} className="relative min-w-full h-full snap-center flex-shrink-0 flex flex-col justify-end">
                            {/* Background Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear hover:scale-110"
                                style={{ backgroundImage: backdropUrl ? `url('${backdropUrl}')` : 'none', backgroundColor: '#0e0e0e' }}
                            />
                            
                            {/* Cinematic Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/40 to-transparent"></div>

                            {/* Content */}
                            <div className="relative z-10 p-8 md:p-20 w-full max-w-5xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="bg-secondary text-on-secondary px-3 py-1 rounded-lg font-label text-[10px] font-bold tracking-widest uppercase shadow-lg">
                                        Spotlight #{index + 1}
                                    </span>
                                    <div className="flex items-center gap-1 bg-surface-container/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                        <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                        <span className="text-xs font-bold font-label text-white">
                                            {movie.rating ? movie.rating.toFixed(1) : 'NR'}
                                        </span>
                                    </div>
                                </div>
                                
                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-headline tracking-tighter mb-6 uppercase leading-tight text-white drop-shadow-2xl">
                                    {/* Make title split beautifully if long */}
                                    {movie.title.split(' ').map((word, i) => (
                                        i === movie.title.split(' ').length - 1 ? 
                                        <span key={i} className="text-primary-dim">{word}</span> : 
                                        <span key={i}>{word} </span>
                                    ))}
                                </h1>
                                
                                <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-10 font-body leading-relaxed drop-shadow-md line-clamp-3">
                                    {movie.overview}
                                </p>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <Link
                                        to={`/movie/${movie.id}`}
                                        onClick={handleInfoClick}
                                        className="w-full sm:w-auto bg-primary-dim text-on-primary-fixed px-10 py-4 rounded-full font-headline font-bold flex justify-center items-center gap-3 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(139,125,255,0.35)]"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                                        Movie Info
                                    </Link>
                                    <button onClick={handleWatchlist} className="w-full sm:w-auto bg-surface-container/40 backdrop-blur-md border border-white/10 text-white px-10 py-4 rounded-full font-headline font-bold hover:bg-white/10 transition-colors flex justify-center items-center gap-2">
                                        <span className="material-symbols-outlined">{inList ? 'check' : 'add'}</span>
                                        {inList ? 'In Watchlist' : 'Add to List'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Nav arrows */}
            <button
                onClick={scrollLeft}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-surface-container-highest/60 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary-dim hover:scale-110 hover:shadow-[0_0_20px_rgba(139,125,255,0.35)]"
                aria-label="Previous Spotlight"
            >
                <span className="material-symbols-outlined text-3xl">chevron_left</span>
            </button>
            <button
                onClick={scrollRight}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-surface-container-highest/60 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary-dim hover:scale-110 hover:shadow-[0_0_20px_rgba(139,125,255,0.35)]"
                aria-label="Next Spotlight"
            >
                <span className="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
        </section>
    );
}
