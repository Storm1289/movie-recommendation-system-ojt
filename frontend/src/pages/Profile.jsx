import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import MovieCard from '../components/MovieCard';

export default function Profile() {
    const { user, watchlist } = useApp();

    return (
        <div className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen flex">
            {/* SideNavBar Component */}
            <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#131313] flex-col py-8 z-40 h-screen sticky top-0 shrink-0">
                <div className="px-6 mb-10">
                    <Link to="/home" className="text-xl font-black text-red-600 dark:text-red-500 font-headline uppercase tracking-tighter hover:opacity-80 transition-opacity">CineAuteur</Link>
                </div>
                
                <div className="px-6 mb-8">
                    <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Account</h2>
                    <p className="text-xs text-secondary font-medium">{user ? 'Digital Auteur' : 'Guest'}</p>
                </div>
                
                <nav className="flex-1 space-y-1">
                    <div className="bg-red-500/10 text-red-500 border-r-4 border-red-500 flex items-center gap-3 px-6 py-4 font-manrope text-sm font-semibold cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                        Profile Overview
                    </div>
                    <a href="#watchlist" className="text-gray-500 hover:text-white flex items-center gap-3 px-6 py-4 hover:bg-[#1a1a1a] transition-colors font-manrope text-sm cursor-pointer">
                        <span className="material-symbols-outlined">bookmark</span>
                        Watchlist
                    </a>
                    <Link to="/settings" className="text-gray-500 hover:text-white flex items-center gap-3 px-6 py-4 hover:bg-[#1a1a1a] transition-colors font-manrope text-sm cursor-pointer">
                        <span className="material-symbols-outlined">settings</span>
                        Settings
                    </Link>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-h-[100vh] relative flex flex-col">
                {/* Mobile Header */}
                <header className="lg:hidden flex justify-between items-center px-6 py-4 bg-[#0e0e0e]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
                    <Link to="/home" className="text-xl font-black text-red-600 font-headline uppercase tracking-tighter">CineAuteur</Link>
                    <button className="material-symbols-outlined text-white">menu</button>
                </header>

                {/* Top Actions (Desktop) */}
                <div className="hidden lg:flex justify-end items-center px-12 py-4 absolute top-0 right-0 w-full z-10 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto mt-2">
                        <Link to="/home" className="text-sm font-bold text-white hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary pb-1 uppercase tracking-widest">Home</Link>
                    </div>
                </div>

                {/* Profile Hero Section */}
                <section className="px-6 lg:px-12 py-12 lg:py-16 bg-gradient-to-b from-surface-container-low to-surface">
                    <div className="flex flex-col md:flex-row items-end gap-10">
                        <div className="relative group shrink-0">
                            <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden border-4 border-surface shadow-2xl bg-gradient-to-br from-primary-dim to-purple-600 flex items-center justify-center text-8xl font-black text-white">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.[0]?.toUpperCase() || 'A'
                                )}
                            </div>
                            <Link to="/settings" className="absolute -bottom-3 -right-3 bg-primary-dim text-on-primary p-3 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">edit</span>
                            </Link>
                        </div>
                        
                        <div className="flex-1 pb-2 w-full">
                            <h1 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter mb-4 text-white uppercase">{user?.name || 'Guest User'}</h1>
                            <p className="font-body text-on-surface-variant max-w-xl text-base lg:text-lg leading-relaxed">
                                {user?.email || 'A true cinephile traversing the landscapes of visual storytelling. Log in to save your favorite frames and build your collection.'}
                            </p>
                            
                            <div className="flex flex-wrap gap-6 mt-8">
                                <div className="flex flex-col">
                                    <span className="text-primary-dim font-headline font-black text-3xl">142</span>
                                    <span className="text-xs uppercase tracking-widest text-on-surface-variant font-label">Watched</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-primary-dim font-headline font-black text-3xl">56</span>
                                    <span className="text-xs uppercase tracking-widest text-on-surface-variant font-label">Ratings</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-primary-dim font-headline font-black text-3xl">{watchlist.length}</span>
                                    <span className="text-xs uppercase tracking-widest text-on-surface-variant font-label">Watchlist</span>
                                </div>
                            </div>
                        </div>
                        
                        <Link to="/settings" className="hidden md:flex px-8 py-3 bg-white text-black font-headline font-bold text-sm uppercase tracking-widest rounded-full hover:bg-primary-dim hover:text-white transition-all active:scale-95 mb-2 items-center justify-center">
                            Edit Profile
                        </Link>
                    </div>
                </section>

                {/* Watchlist Grid (The Bento Approach) */}
                <section id="watchlist" className="px-6 lg:px-12 py-12 flex-1">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="font-headline text-3xl font-black tracking-tight text-white uppercase">Current Watchlist</h2>
                        <span className="text-primary font-label text-xs font-bold uppercase tracking-widest flex items-center gap-2 group cursor-pointer hover:underline">
                            View All <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </span>
                    </div>
                    
                    {watchlist.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {watchlist.map(movie => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-surface-container-low rounded-2xl border border-white/5">
                            <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-6 opacity-40 block">movie</span>
                            <p className="text-white font-headline text-2xl font-black uppercase tracking-tight mb-2">Your Watchlist is Empty</p>
                            <p className="text-on-surface-variant text-base mb-8 max-w-md mx-auto">Discover new cinematic masterpieces and add them to your collection.</p>
                            <Link to="/home" className="inline-block px-10 py-4 bg-secondary text-on-secondary font-headline font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(253,192,3,0.2)]">
                                Browse Films
                            </Link>
                        </div>
                    )}
                </section>

                {/* Minimal Footer for Profile Page */}
                <footer className="w-full py-8 px-6 lg:px-12 text-center border-t border-white/5 mt-auto bg-[#0e0e0e]">
                    <p className="text-on-surface-variant font-inter text-[10px] tracking-widest uppercase mb-2">
                        © {new Date().getFullYear()} CineAuteur. The Digital Auteur Experience.
                    </p>
                </footer>
            </main>
        </div>
    );
}
