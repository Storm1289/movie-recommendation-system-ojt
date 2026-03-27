import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MovieCard from './MovieCard';

export default function MovieRow({
    title,
    subTitle,
    movies,
    linkTo,
    showRank = false,
    variant = 'default',
    autoScroll = false,
}) {
    const scrollContainerRef = useRef(null);
    const [isAutoPaused, setIsAutoPaused] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const safeMovies = movies || [];

    const updateScrollState = () => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
    };

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

    const isBox = variant === 'box';

    useEffect(() => {
        if (!autoScroll || safeMovies.length === 0) return;

        const el = scrollContainerRef.current;
        if (!el) return;

        const maxScrollLeft = () => Math.max(0, el.scrollWidth - el.clientWidth);

        const id = window.setInterval(() => {
            if (isAutoPaused) return;
            const step = Math.max(1, Math.floor(el.clientWidth / 220)); // px per tick
            const next = el.scrollLeft + step;
            if (next >= maxScrollLeft() - 2) {
                el.scrollLeft = 0; // loop back
            } else {
                el.scrollLeft = next;
            }
        }, 30);

        return () => window.clearInterval(id);
    }, [autoScroll, isAutoPaused, safeMovies.length]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        updateScrollState();

        const handleScroll = () => updateScrollState();
        const handleResize = () => updateScrollState();

        el.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);

        return () => {
            el.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, [safeMovies.length]);

    if (safeMovies.length === 0) return null;

    return (
        <section
            onMouseEnter={() => setIsAutoPaused(true)}
            onMouseLeave={() => setIsAutoPaused(false)}
            className={`relative group/row ${isBox ? 'bg-surface-container-low rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white/5' : ''}`}
        >
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
                    className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 bg-surface-container-highest/85 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
                        canScrollLeft
                            ? 'opacity-100 md:opacity-0 md:group-hover/row:opacity-100 hover:bg-primary-dim hover:scale-110 pointer-events-auto'
                            : 'opacity-0 pointer-events-none'
                    }`}
                    aria-label="Scroll left"
                    disabled={!canScrollLeft}
                >
                    <span className="material-symbols-outlined text-2xl">chevron_left</span>
                </button>

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto snap-x hide-scrollbar py-4 -mx-4 px-4"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {safeMovies.map((movie, i) => (
                        <div key={`${movie.id}-${i}`} className="min-w-[160px] md:min-w-[220px] lg:min-w-[240px] snap-start flex-shrink-0">
                            <MovieCard movie={movie} rank={showRank ? i + 1 : undefined} />
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                <button
                    onClick={scrollRight}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 md:w-12 md:h-12 bg-surface-container-highest/85 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
                        canScrollRight
                            ? 'opacity-100 md:opacity-0 md:group-hover/row:opacity-100 hover:bg-primary-dim hover:scale-110 pointer-events-auto'
                            : 'opacity-0 pointer-events-none'
                    }`}
                    aria-label="Scroll right"
                    disabled={!canScrollRight}
                >
                    <span className="material-symbols-outlined text-2xl">chevron_right</span>
                </button>
            </div>
        </section>
    );
}
