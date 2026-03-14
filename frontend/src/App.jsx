import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Discover from './pages/Discover';
import MovieDetail from './pages/MovieDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Login page — no sidebar/navbar */}
          <Route path="/login" element={<Login />} />

          {/* Main app layout */}
          <Route path="*" element={
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 md:ml-20 content-transition min-w-0">
                <Navbar />
                <main className="min-h-[calc(100vh-65px)]">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/popular" element={<Discover />} />
                    <Route path="/genres" element={<Discover />} />
                    <Route path="/movie/:id" element={<MovieDetail />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </main>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
