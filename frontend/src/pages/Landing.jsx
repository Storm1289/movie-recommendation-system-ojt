import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const MOVIE_POSTERS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCs5yGWc_i2QxVTYL4ycAZ8x-033SP55b5MVSYal9wkwZvq74qj16raxiHNp2jd3UxTF25kVIHr_Iqds0JnhMe1GyX3NUiBEi_9DjtAPfkKZGwLYYiCQU10tjjG8wqosyIyL542bw6-A80EpeZUSpu0zFc6KDuQOIV5gN1tpLI8r5EdGncdYfyGW303I6VPcPXJCBNRFt6ADwZiqqF_W_HJFnZlL4QJ_jnpvF5c6cnAfZGZIlK2amw1bpDc-w7ucpxuBF9r3X9mXAQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDAMaO97SfAiBZY-bkJcey_RpGh9uNxEF6QxR50x_E-lJCY3ji0kJGZsiyhx1gZni9YCdmkhK5sBhMnL7Qwg6628NkMm9rloJ_SUu7JRfDYTgSeF2l0LRNKAQV0cG1R36_orGev4TFm3PJXcdg335Hj1SaclTGYpEdfmst10nM_v5h7h1GgxQRV2RswyWvvAikXmbYrRLTNWCxzZAVLeRp3bGf0wWAzvG_0TR_cUI6jXLuY2Qnrt8SvTNsx_abR7USDv6xQjSxZ6Vo",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDCJVLkg7Hf2b8Og1ci10tAwswGTF-b2mX7j41umtGwo-FYxCSRe5iTOlLqf9uyHo2r9GjQB4w9lxC4wb_TCUsVciJnX_PwpdYU07WsczTKbE3lFyksCET6Lg9Fno7wth5CMQoC2_Af-D8k-6K_WVqnW7218Ndrv7fr5h_5hY7E3H5C-M0vl0gw9TC3-8egX_FDHE58YZgTawnGi8HaOIrSHsJ79RXUqmCcxUnQ8bRkbd0mlCgVF_fsVo4qZ2YTfnYp4P8Ra6C_2sQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBjj_Xs1cRaWuna1e3g9Ri3wI5qBY4oLeOplgcq5EoCQv2gT_G43pyxO_sYrrgz3WHoSL7ImaJCcHE5jZ6TWGavPdh4dn28YGb8HqsXOmgBeS5JGwJqxJRrSVAa8eEqMofdUo7zwBUia06mXEhAFFdtYwfQR2yawFDAApQPE545iInfCCpshktTyB7JaPvjJKfydQaz7Ki34dN6WG5i46zawQIivVpdmhByfbhCdtTDznKMujW-TLtyNR4GsbkjNaAlI6fKaArXuVg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBc-zjm8jfOjtPLJ6hUB6VbCE22oycDlEcOrB2JrkWVfEqGlWSa88fzm0lXcbWf7tyOyIh6DHMKCfjqiOwtmCTAhtJE4amVKxWLEr2NWKAh9tv1dg8PPc85B5QXuu_XZeHg6rnzNRKgtDKuE5KWtA4QjoILCXeJ-QyjpBMsOCsqKkKMhK1xwSMKqw1xy4qBAmZZx1r6NmhjVB-956WleQIhB4nDQ4D8BbkpzR4sFk9JFycX6gH68iXzyJWi1RUlqrv4jYE7BizotBI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDQEjtaldAC8bgi4W7tWbGbn09Kf5a8OkUyP8Uv6i6L6pfGJzZ0iadhMxcFx9T450rW_bNRLTJH55tQzdsepsQzrzRV28xUyve30rdtRmSE4PMWEGYioMi6UBoSQQ6fc1Mr-5Pxo5w2o9isRWzX9dZBS6IDN57mcC-h46QEd29umktKqfR5wOBN-aymdfO4161418p2MkN-F47caRHP0DpslSlM33qv02eOJTpE1dNBlczqRnX8oVe7EEW9kJoVsCmvjFnvo-YKgIc"
];

export default function Landing() {
  const [scrollPos, setScrollPos] = useState(0);
  const { user } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  // Parallax / subtle moving background effect
  useEffect(() => {
    let animationFrameId;
    let pos = 0;
    const animate = () => {
      pos += 0.3; // Speed of moving movies
      setScrollPos(pos);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen">
      
      {/* TopNavBar (Web Landing) */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-4 w-full max-w-screen-2xl mx-auto glass-nav bg-transparent transition-all">
        <div className="text-2xl font-black text-primary-dim uppercase tracking-tighter font-headline">
          CineStream
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/home" className="text-primary-dim font-bold border-b-2 border-primary-dim pb-1 font-headline tracking-tight">
            Browse
          </Link>
          <a className="text-white/70 hover:text-white transition-colors font-headline tracking-tight" href="#features">Features</a>
          <a className="text-white/70 hover:text-white transition-colors font-headline tracking-tight" href="#pricing">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden sm:block px-6 py-2 text-white/70 hover:text-white transition-all font-label text-xs tracking-widest uppercase">
            Login
          </Link>
          <Link to="/login" className="bg-primary-dim text-on-primary-fixed px-8 py-2 rounded-full font-label text-xs font-bold tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_20px_rgba(232,15,22,0.3)]">
            Sign Up
          </Link>
        </div>
      </nav>

      <main>
        {/* High-Impact Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Collage - Moving Movies */}
          <div className="absolute inset-0 z-0 flex gap-4 rotate-12 scale-150 opacity-20 pointer-events-none justify-center">
            {/* Column 1 - Downward scroll */}
            <div 
              className="flex flex-col gap-4 w-64"
              style={{ transform: `translateY(${(scrollPos % 800)}px)`, marginTop: '-800px' }}
            >
              {[...MOVIE_POSTERS, ...MOVIE_POSTERS].map((src, i) => (
                <img key={i} className="w-full h-96 object-cover rounded-xl grayscale" src={src} alt="" />
              ))}
            </div>
            
            {/* Column 2 - Upward scroll */}
            <div 
              className="flex flex-col gap-4 w-64"
              style={{ transform: `translateY(-${(scrollPos % 800)}px)` }}
            >
              {[...MOVIE_POSTERS].reverse().concat([...MOVIE_POSTERS].reverse()).map((src, i) => (
                <img key={i} className="w-full h-96 object-cover rounded-xl grayscale" src={src} alt="" />
              ))}
            </div>
            
            {/* Column 3 - Downward scroll */}
            <div 
              className="flex flex-col gap-4 w-64"
              style={{ transform: `translateY(${(scrollPos * 1.5 % 800)}px)`, marginTop: '-400px' }}
            >
              {[...MOVIE_POSTERS, ...MOVIE_POSTERS].map((src, i) => (
                <img key={i} className="w-full h-96 object-cover rounded-xl grayscale" src={src} alt="" />
              ))}
            </div>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 hero-gradient z-10 glass-nav"></div>

          {/* Hero Content */}
          <div className="relative z-20 text-center px-6 max-w-5xl">
            <h1 className="font-headline font-black text-6xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tighter text-on-surface mb-8">
              Your Movie <br />
              <span className="text-primary-dim text-shadow-glow">Adventure</span> <br />
              Starts Here
            </h1>
            <p className="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12">
              Experience cinema through an editorial lens. Curated collections, deep metadata, and a community of auteurs awaiting your discovery.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/login" className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-primary-dim to-primary rounded-full font-headline font-bold text-on-primary-fixed text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(232,15,22,0.4)] block text-center">
                Sign Up
              </Link>
              <Link to="/home" className="w-full sm:w-auto px-12 py-5 bg-surface-container/50 backdrop-blur-md rounded-full font-headline font-bold text-on-surface text-lg border border-outline-variant/20 hover:bg-surface-bright transition-all block text-center">
                Browse as Guest
              </Link>
            </div>
          </div>
        </section>

        {/* Key Features Bento Grid */}
        <section id="features" className="py-32 px-8 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center md:text-left">
              <h2 className="font-headline font-black text-4xl md:text-5xl text-on-surface mb-4">Craft Your Experience</h2>
              <p className="font-body text-on-surface-variant text-lg">Beyond the stream. Tools for the dedicated cinephile.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
              {/* Feature 1: Recommendations */}
              <div className="glass-nav md:col-span-8 bg-surface-container-low/60 border border-white/5 rounded-xl p-10 flex flex-col justify-between overflow-hidden relative group hover:bg-surface-container-low transition-colors">
                <div className="relative z-10">
                  <span className="material-symbols-outlined text-primary-dim text-4xl mb-6">psychology</span>
                  <h3 className="font-headline font-bold text-3xl mb-4">Auteur Algorithms</h3>
                  <p className="text-on-surface-variant max-w-md">Our recommendation engine studies film theory, color palettes, and directorial style to find your next obsession.</p>
                </div>
                <div className="absolute right-[-10%] bottom-[-10%] w-2/3 opacity-30 group-hover:opacity-50 transition-opacity">
                  <img className="rounded-xl shadow-2xl" alt="AI feature preview" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpqznXrEeoiLZaKtiNwvm20Rf8EGVysw6pjzzi8MIELBXsu4rzEXTLAsTSG6UNGDNss3-ij_DXJ63ASNRXXoCNv8BSxHHcDARoIETweVLr8gbTRxxQGLbCvxya72SSqOq5XTyMVXS7TGgiI10v4calfR0yQQfd-ZFlvF1_ruNF_3KCU45mfwDtN52FxSMJygunAs_CSYkmkZVMY6-zf67tnjPFd_7FkxDiQZEmFhI_3YNVf2ZfIbO74XWMRujAUrUYlVdemC-UFDU" />
                </div>
              </div>

              {/* Feature 2: Watchlist */}
              <div className="glass-nav md:col-span-4 bg-surface-container-high/60 border border-white/5 rounded-xl p-10 flex flex-col items-center text-center justify-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-secondary text-5xl mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                <h3 className="font-headline font-bold text-2xl mb-4">Curated Watchlist</h3>
                <p className="text-on-surface-variant text-sm">Organize your journey through film history with elegant, visual list-making tools.</p>
              </div>

              {/* Feature 3: Ratings */}
              <div className="glass-nav md:col-span-4 bg-surface-container/60 border border-white/5 rounded-xl p-10 flex flex-col justify-end hover:bg-surface-container transition-colors">
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4].map(i => <span key={i} className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>star</span>
                </div>
                <h3 className="font-headline font-bold text-2xl mb-2">Deep Ratings</h3>
                <p className="text-on-surface-variant text-sm">Rate more than just stars. Grade cinematography, score, and narrative depth.</p>
              </div>

              {/* Feature 4: Community */}
              <div className="glass-nav md:col-span-8 bg-surface-container-highest/60 border border-white/5 rounded-xl p-10 flex flex-col sm:flex-row items-center gap-8 group hover:bg-surface-container-highest transition-colors">
                <div className="w-full sm:w-1/3 overflow-hidden rounded-xl">
                  <img className="object-cover h-full group-hover:scale-110 transition-transform duration-700" alt="Community feature" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7CPHcoF7pxHlE1ByAReZTadEwAXIlDYe5yQZdmh548Y6cUW4cexIbbjz6NDXxW-3AwPMQXyaHw_CV4Ps7DyUcsrhHPUG-rhDYa1j1RUm1DQ-415Gs0XLaU6PPfsxc16qEssax6nR2lZLoWUAQgVT0UcJTVroH5ozuAOMbbwF1-xDV10o59skZkf7W1oW0RZd7I7A-jeml95X0MajnHrHIFkrwcLyJVht3eiSQsUadrU9Sq6jfYGHFFe3aWzjrdewRcWA0diBrcf0" />
                </div>
                <div className="w-full sm:w-2/3">
                  <h3 className="font-headline font-bold text-2xl mb-4">The Digital Auteur</h3>
                  <p className="text-on-surface-variant text-sm italic">"A community that treats film criticism as an art form itself."</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-32 bg-surface-container-low/50 relative">
          <div className="absolute inset-0 hero-gradient opacity-20 pointer-events-none"></div>
          <div className="relative max-w-4xl mx-auto px-8 text-center glass-nav p-12 rounded-3xl border border-white/5">
            <span className="text-primary-dim font-label text-xs tracking-[0.3em] uppercase mb-8 block">Member Highlight</span>
            <blockquote className="font-headline font-bold text-3xl md:text-5xl text-on-surface leading-tight mb-12">
              "CineStream isn't a streaming service; it's a digital archive for those who live and breathe the silver screen. The interface finally matches the beauty of the films it catalogs."
            </blockquote>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 ring-2 ring-primary-dim ring-offset-4 ring-offset-surface">
                <img className="w-full h-full object-cover" alt="Member" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1LVikKti3A-ODh1aMaCltpVmOuWvubmh3e8cZgtJ1cNPW6QZNnowUt0ZvTOBEA_Oq01ywCh_yjng1z8KoMFz0mZ74qtnKcsBxj88YHEohPSnimU60Qq5_xvfZpC_PQZLt_iKOartaqHXgoECCvX-ucdb9JJhvd6ldVMWnaOGKxDjZp4k5YGeI6CyfMm3vuhjnL-mm2M7EL1smSejPaRJyOVslG9AVkxmORh4SjAgXJ9IGmAa83bb2mYjdzNkcKA5tOebuHESvxts" />
              </div>
              <cite className="not-italic">
                <div className="font-headline font-bold text-on-surface">Julian Thorne</div>
                <div className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Independent Director & Member</div>
              </cite>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="pricing" className="py-32 bg-surface relative">
          <div className="max-w-7xl mx-auto px-8">
            <div className="bg-primary-dim rounded-3xl p-12 md:p-24 flex flex-col md:flex-row items-center justify-between relative overflow-hidden shadow-[0_0_80px_rgba(232,15,22,0.2)] hover:shadow-[0_0_120px_rgba(232,15,22,0.4)] transition-shadow duration-700">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,142,128,0.4),transparent)]"></div>
              <div className="relative z-10 mb-12 md:mb-0 text-center md:text-left">
                <h2 className="font-headline font-black text-4xl md:text-6xl text-on-primary-fixed mb-6 leading-none">Ready for your <br />first screening?</h2>
                <p className="font-body text-on-primary-container text-lg max-w-md">Join 50,000+ auteurs and start building your ultimate cinema library today.</p>
              </div>
              <div className="relative z-10 flex flex-col gap-4 w-full md:w-auto">
                <Link to="/login" className="px-12 py-5 bg-on-primary-fixed text-primary-dim rounded-full font-headline font-black text-xl hover:bg-white transition-all shadow-2xl block text-center min-w-[280px]">
                  GET STARTED
                </Link>
                <p className="text-center font-label text-xs text-on-primary-container tracking-tighter">FREE ACCESS FOR 30 DAYS</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
