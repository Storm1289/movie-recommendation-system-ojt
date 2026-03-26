
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const navItems = [
    { icon: 'home', label: 'Home', path: '/' },
    { icon: 'explore', label: 'Discover', path: '/discover' },
    { icon: 'trending_up', label: 'Popular', path: '/popular' },
    { icon: 'category', label: 'Genres', path: '/genres' },
    { icon: 'collections_bookmark', label: 'My Library', path: '/profile' },
];

const genres = [
    { name: 'Action', count: '120+' },
    { name: 'Sci-Fi', count: '85' },
    { name: 'Comedy', count: '200+' },
];

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isSidebarOpen: isOpen } = useApp();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside
            className={`hidden md:flex flex-col h-[calc(100vh-65px)] sticky left-0 top-[65px] z-30 bg-surface-dark/95 border-r border-slate-800 backdrop-blur-md overflow-hidden sidebar-transition ${isOpen ? 'w-64' : 'w-20'}`}
        >

            {/* Nav Items */}
            <nav className="flex-1 px-2 space-y-1 overflow-y-auto hide-scrollbar">
                {isOpen && (
                    <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mt-4 mb-2">Menu</p>
                )}
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-2 py-4 rounded-xl transition-colors relative group ${isOpen ? 'justify-start px-4' : 'justify-center flex-col gap-1'
                                } ${isActive ? 'text-primary bg-transparent' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {isActive && isOpen && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                            )}
                            <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                            {isOpen ? (
                                <span className="font-semibold text-sm">{item.label}</span>
                            ) : (
                                <span className="font-normal text-[10px]">{item.label}</span>
                            )}
                        </Link>
                    );
                })}

                {/* Genre subsection */}
                {isOpen && (
                    <div className="pt-6 border-t border-slate-800 mt-2">
                        <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Top Genres</p>
                        <div className="space-y-1">
                            {genres.map((g) => (
                                <Link
                                    key={g.name}
                                    to={`/discover?genre=${g.name}`}
                                    className="flex items-center justify-between px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                                >
                                    <span>{g.name}</span>
                                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{g.count}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Bottom Nav */}
            <div className="p-2 mt-auto border-t border-slate-800 space-y-1">
                <Link
                    to="/settings"
                    className={`flex items-center gap-3 px-2 py-4 rounded-xl transition-colors ${location.pathname === '/settings' ? 'text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } ${isOpen ? 'justify-start px-4' : 'justify-center flex-col gap-1'}`}
                >
                    <span className="material-symbols-outlined text-[24px]">settings</span>
                    {isOpen ? <span className="font-semibold text-sm">Settings</span> : <span className="font-normal text-[10px]">Settings</span>}
                </Link>

                {user ? (
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-2 py-4 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors w-full ${isOpen ? 'justify-start px-4' : 'justify-center flex-col gap-1'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[24px]">logout</span>
                        {isOpen ? <span className="font-semibold text-sm">Log Out</span> : <span className="font-normal text-[10px]">Log Out</span>}
                    </button>
                ) : (
                    <Link
                        to="/login"
                        className={`flex items-center gap-3 px-2 py-4 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors w-full ${isOpen ? 'justify-start px-4' : 'justify-center flex-col gap-1'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[24px]">login</span>
                        {isOpen ? <span className="font-semibold text-sm">Sign In</span> : <span className="font-normal text-[10px]">Sign In</span>}
                    </Link>
                )}
            </div>
        </aside>
    );
}
