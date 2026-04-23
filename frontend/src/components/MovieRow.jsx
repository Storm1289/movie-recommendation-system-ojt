import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MovieCard from './MovieCard';
import { useApp } from '../context/AppContext';

export default function MovieRow({
    title,
    subTitle,
    movies,
    linkTo,
    showRank = false,
    variant = 'default',
    autoScroll = false,
}) {
    const { isGuestUser, openAuthModal } = useApp();
    const scrollContainerRef = useRef(null);
    const [isAutoPaused, setIsAutoPaused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    // Filter out movies that don't have a poster to keep the UI clean
    const safeMovies = (movies || []).filter(m => m.poster_path);
    const dragStateRef = useRef({
        isActive: false,
        startX: 0,
        startScrollLeft: 0,
    });

    const isBox = variant === 'box';

    const updateScrollState = () => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
    };

    const stopDragging = () => {
        dragStateRef.current.isActive = false;
        setIsDragging(false);
    };

    const handleMouseDown = (e) => {
        const el = scrollContainerRef.current;
        if (!el || e.button !== 0) return;

        dragStateRef.current = {
            isActive: true,
            startX: e.clientX,
            startScrollLeft: el.scrollLeft,
        };
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        const el = scrollContainerRef.current;
        if (!el || !dragStateRef.current.isActive) return;

        const deltaX = e.clientX - dragStateRef.current.startX;
        el.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
    };

    const handleWheel = (e) => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const hasHorizontalOverflow = el.scrollWidth > el.clientWidth;
        if (!hasHorizontalOverflow) return;

        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        }
    };

    const scrollLeft = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' });
    };

    const scrollRight = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
    };

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
        const handleWindowMouseUp = () => stopDragging();
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => window.removeEventListener('mouseup', handleWindowMouseUp);
    }, []);

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

    const handleExploreAllClick = (e) => {
        if (!isGuestUser) {
            return;
        }

        e.preventDefault();
        openAuthModal();
    };

    return (
        <section
            onMouseEnter={() => setIsAutoPaused(true)}
            onMouseLeave={() => setIsAutoPaused(false)}
            className={`relative group/row ${isBox ? 'bg-surface-container-low rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white/5 overflow-hidden' : ''}`}
        >
            <div className="flex justify-between items-end mb-8 px-1">
                <div>
                    <h3 className={`font-black font-headline tracking-tight ${isBox ? 'text-3xl uppercase' : 'text-2xl'}`}>
                        {title}
                    </h3>
                    {subTitle && <p className="text-on-surface-variant font-label text-sm mt-1">{subTitle}</p>}
                </div>
                {linkTo && (
                    <Link
                        to={linkTo}
                        onClick={handleExploreAllClick}
                        className="text-primary text-sm font-label font-semibold hover:underline flex items-center gap-1 group/link"
                    >
                        Explore All
                        <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                )}
            </div>

            <div className="relative -mx-4 md:-mx-6 xl:-mx-8">
                <button
                    onClick={scrollLeft}
                    className={`absolute ${isBox ? '-left-4 md:-left-6 xl:-left-8' : 'left-[calc((100vw-100%)/-2)]'} top-0 bottom-0 z-20 hidden w-16 items-center justify-start bg-gradient-to-r from-black/90 via-black/70 to-transparent pl-2 text-white transition-all duration-300 md:flex ${
                        canScrollLeft
                            ? 'opacity-100 hover:from-black hover:via-black/80'
                            : 'pointer-events-none opacity-0'
                    }`}
                    aria-label="Scroll left"
                    disabled={!canScrollLeft}
                >
                    <span className="material-symbols-outlined text-6xl font-light drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]">
                        chevron_left
                    </span>
                </button>

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={stopDragging}
                    onMouseUp={stopDragging}
                    onWheel={handleWheel}
                    className={`flex gap-6 overflow-x-auto snap-x hide-scrollbar py-4 -mx-4 md:-mx-6 xl:-mx-8 px-4 md:px-6 xl:px-8 select-none ${
                        isDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {safeMovies.map((movie, i) => (
                        <div key={`${movie.id}-${i}`} className="w-[160px] md:w-[220px] lg:w-[240px] snap-start flex-shrink-0">
                            <MovieCard movie={movie} rank={showRank ? i + 1 : undefined} />
                        </div>
                    ))}
                </div>

                <button
                    onClick={scrollRight}
                    className={`absolute ${isBox ? '-right-4 md:-right-6 xl:-right-8' : 'right-[calc((100vw-100%)/-2)]'} top-0 bottom-0 z-20 hidden w-16 items-center justify-end bg-gradient-to-l from-black/90 via-black/70 to-transparent pr-2 text-white transition-all duration-300 md:flex ${
                        canScrollRight
                            ? 'opacity-100 hover:from-black hover:via-black/80'
                            : 'pointer-events-none opacity-0'
                    }`}
                    aria-label="Scroll right"
                    disabled={!canScrollRight}
                >
                    <span className="material-symbols-outlined text-6xl font-light drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]">
                        chevron_right
                    </span>
                </button>
            </div>
        </section>
    );
}
