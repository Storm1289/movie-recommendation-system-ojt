import { useEffect, useState } from 'react';
import { fetchTrending, fetchTopMonth, fetchMovies } from '../api/api';
import HeroSlider from '../components/HeroSlider';
import MovieRow from '../components/MovieRow';
import MovieCard from '../components/MovieCard';

export default function Home() {
    const [trending, setTrending] = useState([]);
    const [topMonth, setTopMonth] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [newReleases, setNewReleases] = useState([]);

    useEffect(() => {
        fetchTrending().then(res => setTrending(res.data.movies)).catch(console.error);
        fetchTopMonth().then(res => setTopMonth(res.data.movies)).catch(console.error);
        fetchMovies({ sort_by: 'rating', per_page: 12 }).then(res => setRecommended(res.data.movies)).catch(console.error);
        fetchMovies({ sort_by: 'release_date', per_page: 12 }).then(res => setNewReleases(res.data.movies)).catch(console.error);
    }, []);

    return (
        <div className="pb-20">
            {/* Hero Slider */}
            <HeroSlider movies={trending} />

            <div className="px-4 md:px-10 mt-8 space-y-12 mb-20">
                <MovieRow 
                    title="🔥 Top 10 Movies of the Month" 
                    subTitle="March 2026"
                    movies={topMonth} 
                    showRank={true}
                    linkTo="/category/top-month" 
                />

                <MovieRow 
                    title="Based on your recent watch" 
                    subTitle="Because you watched Inception"
                    movies={recommended} 
                    linkTo="/category/recommended" 
                />

                <MovieRow 
                    title="Trending Now" 
                    movies={trending} 
                    linkTo="/category/trending" 
                />

                <MovieRow 
                    title="New Releases" 
                    movies={newReleases} 
                    linkTo="/category/new-releases" 
                />
            </div>

            {/* Footer */}
            <footer className="bg-bg-dark border-t border-white/5 py-12 px-10">
                <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col gap-2 text-center md:text-left">
                        <h4 className="text-lg font-bold text-white">CineStream</h4>
                        <p className="text-slate-500 text-sm">© 2026 CineStream. All rights reserved.</p>
                    </div>
                    <div className="flex gap-6">
                        <a className="text-slate-400 hover:text-white text-sm transition-colors" href="#">Privacy Policy</a>
                        <a className="text-slate-400 hover:text-white text-sm transition-colors" href="#">Terms of Service</a>
                        <a className="text-slate-400 hover:text-white text-sm transition-colors" href="#">Help Center</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
