import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchMovies, searchMovies, fetchGenres } from '../api/api';
import MovieCard from '../components/MovieCard';

export default function Discover() {
    const [searchParams] = useSearchParams();
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGenres().then(res => setGenres(res.data.genres)).catch(console.error);
    }, []);

    useEffect(() => {
        setLoading(true);
        const q = searchParams.get('q');
        const genreParam = searchParams.get('genre');

        // Use URL param if exists, otherwise use state
        let currentGenres = selectedGenres;
        if (genreParam && selectedGenres.length === 0) {
            currentGenres = [genreParam];
        }

        const genreQuery = currentGenres.length > 0 ? currentGenres.join(',') : undefined;

        if (q) {
            searchMovies(q).then(res => { setMovies(res.data.movies); setLoading(false); }).catch(() => setLoading(false));
        } else {
            fetchMovies({ genre: genreQuery, per_page: 30 })
                .then(res => { setMovies(res.data.movies); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [searchParams, selectedGenres]);

    const handleGenreClick = (genre) => {
        if (genre === 'All') {
            setSelectedGenres([]);
            return;
        }

        setSelectedGenres((prev) => {
            if (prev.includes(genre)) {
                return prev.filter(g => g !== genre);
            }
            return [...prev, genre];
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 px-6 md:px-10 py-6">
            {/* Filters sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0 space-y-6 pr-2">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleGenreClick('All')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedGenres.length === 0
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-surface-card text-slate-400 hover:bg-surface-dark hover:text-white border border-slate-700'
                                }`}
                        >
                            All
                        </button>
                        {genres.map((g) => (
                            <button
                                key={g}
                                onClick={() => handleGenreClick(g)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedGenres.includes(g)
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-surface-card text-slate-400 hover:bg-surface-dark hover:text-white border border-slate-700'
                                    }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mood</h3>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { icon: 'self_improvement', label: 'Chill' },
                            { icon: 'bolt', label: 'Intense' },
                            { icon: 'sunny', label: 'Uplifting' },
                            { icon: 'psychology', label: 'Thoughtful' },
                        ].map(m => (
                            <button key={m.label} className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-card text-slate-400 hover:bg-surface-dark hover:text-white border border-slate-700 transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">{m.icon}</span> {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                    Find My Match
                </button>
            </div>

            {/* Results */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                            {searchParams.get('q') ? `Search: "${searchParams.get('q')}"` : 'AI Recommendation Engine'}
                        </h1>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-primary">smart_toy</span>
                            {movies.length} movies found
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {movies.map((movie) => (
                            <MovieCard key={movie.id} movie={movie} showMatch />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
