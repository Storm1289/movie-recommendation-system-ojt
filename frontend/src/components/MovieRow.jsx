import { useRef } from 'react';
import { Link } from 'react-router-dom';
import MovieCard from './MovieCard';

export default function MovieRow({ title, subTitle, movies, linkTo, showRank = false, variant = 'default' }) {
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

    const isBox = variant === 'box';

    return (
        <section className={`relative group/row ${isBox ? 'bg-surface-container-low rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white/5' : ''}`}>
            <div className="flex justify-between items-end mb-8 px-1">
                <div>
                    <h3 className={`font-black font-headline tracking-tight ${isBox ? 'text-3xl uppercase' : 'text-2xl'}`}>
                        {title}
                    </h3>
                    {subTitle && <p className="text-on-surface-variant font-label text-sm mt-1">{subTitle}</p>}
                </div>
                {linkTo && (
                    <Link to={linkTo} className="text-primary text-sm font-label font-semibold hover:underline flex items-center gap-1 group/link">
                        Explore All
                        <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                )}
            </div>

            <div className="relative">
                {/* Left Arrow */}
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-surface-container-highest/80 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-primary-dim hover:scale-110 text-white shadow-xl pointer-events-auto"
                    aria-label="Scroll left"
                >
                    <span className="material-symbols-outlined text-2xl">chevron_left</span>
                </button>

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto snap-x hide-scrollbar py-4 -mx-4 px-4"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {movies.map((movie, i) => (
                        <div key={`${movie.id}-${i}`} className="min-w-[160px] md:min-w-[220px] lg:min-w-[240px] snap-start flex-shrink-0">
                            <MovieCard movie={movie} rank={showRank ? i + 1 : undefined} />
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                <button
                    onClick={scrollRight}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-surface-container-highest/80 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-primary-dim hover:scale-110 text-white shadow-xl pointer-events-auto"
                    aria-label="Scroll right"
                >
                    <span className="material-symbols-outlined text-2xl">chevron_right</span>
                </button>
            </div>
        </section>
    );
}
