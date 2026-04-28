import { useEffect, useState } from 'react';
import { fetchTrending, fetchTopMonth, fetchMovies, fetchUserRecommendations } from '../api/api';
import HeroSlider from '../components/HeroSlider';
import MovieRow from '../components/MovieRow';
import { useApp } from '../context/AppContext';

export default function Home() {
    const { user, watchlist } = useApp();
    const isGuest = Boolean(user?.isGuest);
    const [trending, setTrending] = useState([]);
    const [topMonth, setTopMonth] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [recommendationMeta, setRecommendationMeta] = useState({
        title: 'Trending now',
        message: null,
        source: 'trending',
    });
    const [newReleases, setNewReleases] = useState([]);
    const [isRecLoading, setIsRecLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        const loadData = async () => {
            setIsRecLoading(true);

            const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

            // Fetch general page data only once
            const fetchGeneral = async () => {
                try {
                    const [trendRes, topRes, newRes] = await Promise.all([
                        fetchTrending(),
                        fetchTopMonth(),
                        fetchMovies({ sort_by: 'release_date', per_page: 30 })
                    ]);

                    if (!isCancelled) {
                        setTrending(trendRes.data?.movies || []);
                        setTopMonth(topRes.data?.movies || []);
                        setNewReleases(shuffle(newRes.data?.movies || []).slice(0, 12));
                    }
                } catch (e) {
                    console.error("Error fetching general data", e);
                }
            };

            const fetchRecs = async () => {
                try {
                    if (user?.id) {
                        const res = await fetchUserRecommendations(user.id, 12);
                        if (!isCancelled) {
                            setRecommended(res.data?.recommendations || []);
                            setRecommendationMeta({
                                title: res.data?.title || 'Recommended for you',
                                message: res.data?.message || null,
                                source: res.data?.source || 'watchlist',
                            });
                        }
                    } else {
                        const res = await fetchTrending();
                        if (!isCancelled) {
                            setRecommended(res.data?.movies || []);
                            setRecommendationMeta({
                                title: 'Trending now',
                                message: null,
                                source: 'trending',
                            });
                        }
                    }
                } catch (e) {
                    console.error("Error fetching recommendations", e);
                } finally {
                    if (!isCancelled) {
                        setIsRecLoading(false);
                    }
                }
            };

            // Run both fetches in parallel
            await Promise.all([
                fetchGeneral(),
                fetchRecs()
            ]);
        };

        loadData();

        return () => {
            isCancelled = true;
        };
    }, [user?.id, watchlist]);

    return (
        <div className="pb-20 bg-surface min-h-screen font-body text-on-surface">
            {/* Hero Slider */}
            <HeroSlider movies={trending} />

            <div className="relative z-10 -mt-10 w-full px-4 md:px-6 xl:px-8 pb-20 space-y-16">
                {/* Welcome Header */}
                <header>
                    <h2 className="text-4xl font-black font-headline tracking-tight">
                        {isGuest ? 'Browse as ' : 'Welcome back, '}<span className="text-primary">{user?.name || 'Auteur'}</span>
                    </h2>
                </header>

                <MovieRow
                    title={recommendationMeta.title}
                    subTitle={recommendationMeta.message}
                    movies={recommended}
                    linkTo="/category/recommended"
                    isLoading={isRecLoading}
                />

                <MovieRow
                    title="Trending Now"
                    subTitle="What everyone is watching this week"
                    movies={trending}
                    linkTo="/category/trending"
                    variant="box"
                    autoScroll={true}
                />

                <MovieRow
                    title="Top-rated Classics"
                    subTitle="This month's highest-rated films"
                    movies={topMonth}
                    showRank={true}
                    linkTo="/category/top-month"
                />

                <MovieRow
                    title="Recently Released"
                    subTitle="Fresh off the cutting room floor"
                    movies={newReleases}
                    linkTo="/category/new-releases"
                    variant="box"
                />
            </div>

            {/* Footer */}
            <footer className="bg-surface-container-lowest border-t border-white/5 pt-20 pb-12 px-12 mt-20">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 w-full">
                    <div className="col-span-1 md:col-span-1">
                        <div className="text-lg font-bold text-white mb-4 font-headline uppercase tracking-tighter">CineStream</div>
                        <p className="text-gray-600 font-inter text-xs leading-relaxed max-w-xs">Curating the finest digital auteur experiences from around the globe. Quality over quantity, always.</p>
                    </div>
                    <div>
                        <h6 className="text-on-surface font-headline font-bold text-xs uppercase tracking-widest mb-6">Explore</h6>
                        <ul className="space-y-4 font-inter text-xs uppercase tracking-widest">
                            <li><a className="text-gray-600 hover:text-primary transition-colors duration-300" href="#">Browse</a></li>
                            <li><a className="text-gray-600 hover:text-primary transition-colors duration-300" href="#">Trending</a></li>
                        </ul>
                    </div>
                    <div>
                        <h6 className="text-on-surface font-headline font-bold text-xs uppercase tracking-widest mb-6">Support</h6>
                        <ul className="space-y-4 font-inter text-xs uppercase tracking-widest">
                            <li><a className="text-gray-600 hover:text-primary transition-colors duration-300" href="#">Help Center</a></li>
                            <li><a className="text-gray-600 hover:text-primary transition-colors duration-300" href="#">Contact Us</a></li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
}
