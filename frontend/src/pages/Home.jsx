import { useEffect, useState } from 'react';
import { fetchTrending, fetchTopMonth, fetchMovies } from '../api/api';
import HeroSlider from '../components/HeroSlider';
import MovieRow from '../components/MovieRow';
import { useApp } from '../context/AppContext';

export default function Home() {
    const { user } = useApp();
    const isGuest = Boolean(user?.isGuest);
    const [trending, setTrending] = useState([]);
    const [topMonth, setTopMonth] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [newReleases, setNewReleases] = useState([]);

    useEffect(() => {
        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());
        
        fetchTrending().then(res => setTrending(res.data?.movies || [])).catch(console.error);
        fetchTopMonth().then(res => setTopMonth(res.data?.movies || [])).catch(console.error);
        
        // Fetch random popular movies for Recommended
        fetchMovies({ sort_by: 'random', per_page: 12 }).then(res => setRecommended(res.data?.movies || [])).catch(console.error);
        
        // Fetch 30 recent movies, then shuffle and pick 12
        fetchMovies({ sort_by: 'release_date', per_page: 30 }).then(res => {
            const movies = res.data?.movies || [];
            setNewReleases(shuffle(movies).slice(0, 12));
        }).catch(console.error);
    }, []);

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
                    title="Recommended for You"
                    subTitle="Because you watched Inception"
                    movies={recommended}
                    linkTo="/category/recommended"
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
