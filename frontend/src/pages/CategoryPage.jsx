import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchMovies, fetchTopMonth, fetchTrending, fetchUserRecommendations } from '../api/api';
import MovieCard from '../components/MovieCard';
import { useApp } from '../context/AppContext';

export default function CategoryPage() {
    const { id } = useParams();
    const { user, watchlist } = useApp();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recommendedTitle, setRecommendedTitle] = useState('Recommended for you');

    const categoryDetails = {
        'top-month': { title: 'Top 10 Movies of the Month', icon: 'local_fire_department' },
        recommended: { title: recommendedTitle, icon: 'visibility' },
        trending: { title: 'Trending Now', icon: 'trending_up' },
        'new-releases': { title: 'New Releases', icon: 'auto_awesome' },
    };

    const details = categoryDetails[id] || { title: 'Movies', icon: 'movie' };

    useEffect(() => {
        let isCancelled = false;

        const loadCategory = async () => {
            setLoading(true);

            try {
                if (id === 'top-month') {
                    const res = await fetchTopMonth();
                    if (!isCancelled) setMovies(res.data.movies || []);
                } else if (id === 'recommended') {
                    const res = user?.id
                        ? await fetchUserRecommendations(user.id, 20)
                        : await fetchTrending();

                    if (!isCancelled) {
                        setMovies(res.data.recommendations || res.data.movies || []);
                        setRecommendedTitle(res.data.title || 'Trending now');
                    }
                } else if (id === 'trending') {
                    const res = await fetchTrending();
                    if (!isCancelled) setMovies(res.data.movies || []);
                } else if (id === 'new-releases') {
                    const res = await fetchMovies({ sort_by: 'release_date', per_page: 20 });
                    if (!isCancelled) setMovies(res.data.movies || []);
                } else if (!isCancelled) {
                    setMovies([]);
                }
            } catch (error) {
                console.error(error);
                if (!isCancelled) setMovies([]);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        loadCategory();

        return () => {
            isCancelled = true;
        };
    }, [id, user?.id, watchlist]);

    return (
        <div className="px-4 md:px-10 py-8 min-h-screen">
            <div className="mb-8">
                <Link to="/home" className="text-slate-400 hover:text-white flex items-center gap-1 w-fit mb-4 transition-colors">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Back to Home
                </Link>
                <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-4xl">{details.icon}</span>
                    {details.title}
                </h1>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div key={index} className="aspect-[2/3] rounded-lg bg-surface-dark shimmer" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 gap-y-8">
                    {movies.filter((movie) => movie.poster_path).map((movie, index) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            rank={id === 'top-month' ? index + 1 : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
