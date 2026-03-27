import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Discover from './pages/Discover';
import MovieDetail from './pages/MovieDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Settings from './pages/Settings';
import CategoryPage from './pages/CategoryPage';
import Landing from './pages/Landing';

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
          <Route path="*" element={
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
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
