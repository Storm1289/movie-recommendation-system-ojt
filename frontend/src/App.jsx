import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import AuthRequiredModal from './components/AuthRequiredModal';
import Home from './pages/Home';
import Discover from './pages/Discover';
import MovieDetail from './pages/MovieDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Settings from './pages/Settings';
import CategoryPage from './pages/CategoryPage';
import Landing from './pages/Landing';

function MainAppLayout() {
  const { user, isGuestUser, openAuthModal } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isGuestUser) {
      return;
    }

    if (location.pathname === '/home') {
      return;
    }

    openAuthModal();
    navigate('/home', { replace: true });
  }, [isGuestUser, location.pathname, navigate, openAuthModal, user]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/popular" element={<Discover />} />
          <Route path="/genres" element={<Discover />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <AuthRequiredModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page — no sidebar/navbar */}
          <Route path="/" element={<Landing />} />
          
          {/* Login page — no sidebar/navbar */}
          <Route path="/login" element={<Login />} />

          {/* Main app layout */}
          <Route path="*" element={<MainAppLayout />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
