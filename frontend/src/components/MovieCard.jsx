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
        if (inList) {
            removeFromWatchlist(movie.id);
        } else {
            addToWatchlist(movie);
        }
    };

    return (
        <Link to={`/movie/${movie.id}`} className="group cursor-pointer block">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 bg-surface-dark shadow-lg ring-1 ring-white/10 group-hover:ring-primary/50 transition-all">
                {/* Rank badge */}
                {rank && (
                    <div className="absolute -left-1 -top-1 z-20 flex items-center justify-center font-black text-4xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] italic">
                        {rank}
                    </div>
                )}

                {/* Poster */}
                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={movie.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 bg-surface-card flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-slate-600">movie</span>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black to-transparent opacity-90" />

                {/* Rating badge */}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-xs font-bold text-gold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    {movie.rating?.toFixed(1)}
                </div>

                {/* Match badge */}
                {showMatch && (
                    <div className="absolute top-2 left-2 z-10">
                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg backdrop-blur-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">thumb_up</span>
                            {Math.floor(70 + Math.random() * 28)}% Match
                        </span>
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm gap-2">
                    <span className="bg-white text-black rounded-full px-4 py-1.5 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span> Movie Info
                    </span>
                    <button
                        onClick={handleWatchlist}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 ${inList
                            ? 'bg-primary text-white hover:bg-red-600'
                            : 'bg-transparent border border-white text-white hover:bg-white/10'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[14px]">{inList ? 'check' : 'add'}</span>
                        {inList ? 'In Watchlist' : 'Add in Watchlist'}
                    </button>
                </div>
            </div>

            <h3 className="text-white font-bold text-sm truncate group-hover:text-primary transition-colors">{movie.title}</h3>
            <p className="text-slate-400 text-xs mt-1">{year}{genre ? ` • ${genre}` : ''}</p>
        </Link>
    );
}
