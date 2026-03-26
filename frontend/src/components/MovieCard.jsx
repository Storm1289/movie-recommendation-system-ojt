import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function MovieCard({ movie, rank, showMatch }) {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useApp();

    const posterUrl = movie.poster_path?.startsWith('http')
        ? movie.poster_path
        : movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null;

    const year = movie.release_date?.split('-')[0] || '';
    const genre = movie.genre?.split(',')[0]?.trim() || '';
    const inList = isInWatchlist(movie.id);

    const handleWatchlist = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (inList) removeFromWatchlist(movie.id);
        else addToWatchlist(movie);
    };

    return (
        <Link to={`/movie/${movie.id}`} className="group/card cursor-pointer block">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-4 transition-all duration-300 group-hover/card:scale-105 group-hover/card:shadow-[0_0_30px_rgba(232,15,22,0.3)] bg-surface-container">
                {/* Rank badge */}
                {rank && (
                    <div className="absolute -left-2 -top-2 z-20 flex items-center justify-center font-black text-5xl text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] italic font-headline">
                        {rank}
                    </div>
                )}

                {/* Poster */}
                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={movie.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant">movie</span>
                    </div>
                )}

                {/* Rating badge */}
                <div className="absolute top-3 right-3 bg-secondary-container/90 text-on-secondary-fixed px-2 py-1 rounded-lg text-xs font-bold font-label flex items-center gap-1 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {movie.rating ? movie.rating.toFixed(1) : 'NR'}
                </div>

                {/* Match badge */}
                {showMatch && (
                    <div className="absolute top-3 left-3 z-10 bg-primary-dim/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg backdrop-blur-md flex items-center gap-1 font-label uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[12px]">thumb_up</span>
                        {Math.floor(70 + Math.random() * 28)}% Match
                    </div>
                )}

                {/* Hover overlay for actions */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm gap-3 z-30">
                    <span className="bg-white text-on-surface rounded-full px-5 py-2 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg font-headline tracking-wide">
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span> Info
                    </span>
                    <button
                        onClick={handleWatchlist}
                        className={`rounded-full px-5 py-2 text-xs font-bold transition-colors flex items-center gap-2 font-headline tracking-wide shadow-lg ${inList
                            ? 'bg-primary-dim text-white hover:bg-primary'
                            : 'bg-surface-container/80 border border-white/20 text-white hover:bg-white/20'
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
