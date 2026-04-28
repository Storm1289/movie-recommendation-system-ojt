import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTopMonth, fetchMovies, fetchTrending } from '../api/api';
import MovieCard from '../components/MovieCard';

export default function CategoryPage() {
    const { id } = useParams();
    const [categoryState, setCategoryState] = useState({ id: null, movies: [] });

    const categoryDetails = {
        'top-month': { title: 'Top 10 Movies of the Month', icon: '🔥' },
        'recommended': { title: 'Based on your recent watch', icon: '👀' },
        'trending': { title: 'Trending Now', icon: '🌟' },
        'new-releases': { title: 'New Releases', icon: '✨' }
    };

    const details = categoryDetails[id] || { title: 'Movies', icon: '🎬' };

    const loading = categoryState.id !== id;
    const movies = loading ? [] : categoryState.movies;

    useEffect(() => {
        let isCancelled = false;

        const loadMovies = async () => {
            try {
                let nextMovies = [];
                if (id === 'top-month') {
                    const res = await fetchTopMonth();
                    nextMovies = res.data.movies || [];
                } else if (id === 'recommended') {
                    const res = await fetchMovies({ sort_by: 'rating', per_page: 20 });
                    nextMovies = res.data.movies || [];
                } else if (id === 'trending') {
                    const res = await fetchTrending();
                    nextMovies = res.data.movies || [];
                } else if (id === 'new-releases') {
                    const res = await fetchMovies({ sort_by: 'release_date', per_page: 20 });
                    nextMovies = res.data.movies || [];
                }

                if (!isCancelled) {
                    setCategoryState({ id, movies: nextMovies });
                }
            } catch (error) {
                console.error(error);
                if (!isCancelled) {
                    setCategoryState({ id, movies: [] });
                }
            }
        };

        loadMovies();

        return () => {
            isCancelled = true;
        };
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
                    {movies.filter(m => m.poster_path).map((movie, i) => (
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
