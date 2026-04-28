import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useState } from 'react';
import { getValidImageUrl, fetchWikiImageFallback } from '../utils/imageUtils';

export default function MovieCard({ movie, rank, showMatch }) {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist, isGuestUser, openAuthModal } = useApp();
    const primaryPosterUrl = getValidImageUrl(movie.poster_path, 'w500');
    const [imageState, setImageState] = useState({
        source: null,
        fallback: null,
        failed: false,
    });
    const imageStateMatches = imageState.source === primaryPosterUrl;
    const posterUrl = imageStateMatches && imageState.fallback ? imageState.fallback : primaryPosterUrl;
    const imgError = imageStateMatches && imageState.failed;

    const handleError = async () => {
        if (imageStateMatches && imageState.fallback) {
            setImageState({ source: primaryPosterUrl, fallback: null, failed: true });
            return;
        }

        if (imageStateMatches && imageState.failed) {
            return;
        }

        const year = movie.release_date?.split('-')[0] || '';
        const fallback = await fetchWikiImageFallback(movie.title, year);
        if (fallback) {
            setImageState({ source: primaryPosterUrl, fallback, failed: false });
        } else {
            setImageState({ source: primaryPosterUrl, fallback: null, failed: true });
        }
    };

    const year = movie.release_date?.split('-')[0] || '';
    const genre = movie.genre?.split(',')[0]?.trim() || '';
    const inList = isInWatchlist(movie.id);
    const matchScore = movie.match_score ?? 70 + ((Number(movie.id) || 0) * 13 % 28);

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

    const handleCardClick = (e) => {
        if (!isGuestUser) {
            return;
        }

        e.preventDefault();
        openAuthModal();
    };

    return (
        <Link to={`/movie/${movie.id}`} onClick={handleCardClick} className="group/card cursor-pointer block">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-4 transition-all duration-300 group-hover/card:scale-110 group-hover/card:shadow-2xl group-hover/card:shadow-black/60 bg-surface-container z-10 group-hover/card:z-50 border border-outline-variant/30">
                {/* Rank badge */}
                {rank && (
                    <div className="absolute -left-2 -top-2 z-20 flex items-center justify-center font-black text-5xl text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] italic font-headline">
                        {rank}
                    </div>
                )}

                {/* Poster */}
                {(posterUrl && !imgError) ? (
                    <img
                        src={posterUrl}
                        alt={movie.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                        loading="lazy"
                        onError={handleError}
                    />
                ) : (
                    <div className="absolute inset-0 bg-surface-container flex flex-col items-center justify-center p-4 text-center">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">movie</span>
                        <span className="text-on-surface-variant text-sm font-bold font-headline line-clamp-3">{movie.title}</span>
                    </div>
                )}

                {/* Rating badge */}
                <div className="absolute top-3 right-3 bg-amber-500 text-black px-2 py-1 rounded-lg text-xs font-black font-label flex items-center gap-1 shadow-lg z-10">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {movie.rating ? movie.rating.toFixed(1) : 'NR'}
                </div>

                {/* Match badge */}
                {showMatch && (
                    <div className="absolute top-3 left-3 z-10 bg-primary/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg backdrop-blur-md flex items-center gap-1 font-label uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[12px]">thumb_up</span>
                        {matchScore}% Match
                    </div>
                )}

                {/* Hover overlay for actions */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/40 gap-3 z-30">
                    <span className="bg-white text-black rounded-full px-5 py-2 text-xs font-black hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg font-headline tracking-wide">
                        <span
                            className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            info
                        </span>
                        Info
                    </span>
                    <button
                        onClick={handleWatchlist}
                        className={`rounded-full px-5 py-2 text-xs font-bold transition-colors flex items-center gap-2 font-headline tracking-wide shadow-lg ${inList
                            ? 'bg-primary text-black hover:bg-primary-fixed'
                            : 'bg-black/60 border border-white/20 text-white hover:bg-white/20'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">{inList ? 'check' : 'add'}</span>
                        {inList ? 'In List' : 'Watchlist'}
                    </button>
                </div>
            </div>

            <h4 className="font-headline font-bold text-lg leading-tight group-hover/card:text-primary transition-colors truncate">
                {movie.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-on-surface-variant text-sm font-label truncate">
                <span>{year || 'Unknown'}</span>
                {genre && (
                    <>
                        <span className="w-1 h-1 bg-outline-variant rounded-full flex-shrink-0"></span>
                        <span className="truncate">{genre}</span>
                    </>
                )}
            </div>
        </Link>
    );
}
