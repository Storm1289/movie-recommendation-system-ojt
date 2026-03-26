import { useRef } from 'react';
import { Link } from 'react-router-dom';
import MovieCard from './MovieCard';

export default function MovieRow({ title, subTitle, movies, linkTo, showRank = false }) {
    const scrollContainerRef = useRef(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -scrollContainerRef.current.clientWidth * 0.75, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: scrollContainerRef.current.clientWidth * 0.75, behavior: 'smooth' });
        }
    };

    if (!movies || movies.length === 0) return null;

    return (
        <section className="relative group">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    {title}
                    {subTitle && <span className="text-primary text-sm font-normal opacity-80 ml-2">{subTitle}</span>}
                </h2>
                {linkTo && (
                    <Link to={linkTo} className="text-sm font-semibold text-primary hover:text-white transition-colors flex items-center gap-1 group/link">
                        View all
                        <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">chevron_right</span>
                    </Link>
                )}
            </div>

            <div className="relative">
                {/* Left Arrow */}
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-bg-dark via-bg-dark/80 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary text-white"
                    aria-label="Scroll left"
                >
                    <span className="material-symbols-outlined text-3xl drop-shadow-lg scale-y-150 transform -translate-x-2 group-hover:scale-125 transition-transform">chevron_left</span>
                </button>

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto snap-x hide-scrollbar py-2"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {movies.map((movie, i) => (
                        <div key={`${movie.id}-${i}`} className="min-w-[160px] md:min-w-[200px] snap-start flex-shrink-0">
                            <MovieCard movie={movie} rank={showRank ? i + 1 : undefined} />
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-bg-dark via-bg-dark/80 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary text-white"
                    aria-label="Scroll right"
                >
                    <span className="material-symbols-outlined text-3xl drop-shadow-lg scale-y-150 transform translate-x-2 group-hover:scale-125 transition-transform">chevron_right</span>
                </button>
            </div>
        </section>
    );
}
