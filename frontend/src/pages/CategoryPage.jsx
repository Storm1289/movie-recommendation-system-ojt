import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTopMonth, fetchMovies } from '../api/api';
import MovieCard from '../components/MovieCard';

export default function CategoryPage() {
    const { id } = useParams();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    const categoryDetails = {
        'top-month': { title: 'Top 10 Movies of the Month', icon: '🔥' },
        'recommended': { title: 'Based on your recent watch', icon: '👀' },
        'trending': { title: 'Trending Now', icon: '🌟' },
        'new-releases': { title: 'New Releases', icon: '✨' }
    };

    const details = categoryDetails[id] || { title: 'Movies', icon: '🎬' };

    useEffect(() => {
        setLoading(true);
        if (id === 'top-month') {
            fetchTopMonth()
                .then(res => setMovies(res.data.movies))
                .catch(console.error)
                .finally(() => setLoading(false));
        } else if (id === 'recommended') {
            fetchMovies({ sort_by: 'rating', per_page: 20 })
                .then(res => setMovies(res.data.movies))
                .catch(console.error)
                .finally(() => setLoading(false));
        } else if (id === 'trending') {
            import('../api/api').then(({ fetchTrending }) => {
                fetchTrending()
                    .then(res => setMovies(res.data.movies))
                    .catch(console.error)
                    .finally(() => setLoading(false));
            });
        } else if (id === 'new-releases') {
            fetchMovies({ sort_by: 'release_date', per_page: 20 })
                .then(res => setMovies(res.data.movies))
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [id]);

    return (
        <div className="px-4 md:px-10 py-8 min-h-screen">
            <div className="mb-8">
                <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-1 w-fit mb-4 transition-colors">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Back to Home
                </Link>
                <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                    {details.icon} {details.title}
                </h1>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] rounded-lg bg-surface-dark shimmer" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 gap-y-8">
                    {movies.map((movie, i) => (
                        <MovieCard 
                            key={movie.id} 
                            movie={movie} 
                            rank={id === 'top-month' ? i + 1 : undefined} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
