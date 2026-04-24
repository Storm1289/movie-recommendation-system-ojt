import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import testimonialAvatar from '../assets/1762071442617.jpg';


const MOVIE_POSTERS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCs5yGWc_i2QxVTYL4ycAZ8x-033SP55b5MVSYal9wkwZvq74qj16raxiHNp2jd3UxTF25kVIHr_Iqds0JnhMe1GyX3NUiBEi_9DjtAPfkKZGwLYYiCQU10tjjG8wqosyIyL542bw6-A80EpeZUSpu0zFc6KDuQOIV5gN1tpLI8r5EdGncdYfyGW303I6VPcPXJCBNRFt6ADwZiqqF_W_HJFnZlL4QJ_jnpvF5c6cnAfZGZIlK2amw1bpDc-w7ucpxuBF9r3X9mXAQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDAMaO97SfAiBZY-bkJcey_RpGh9uNxEF6QxR50x_E-lJCY3ji0kJGZsiyhx1gZni9YCdmkhK5sBhMnL7Qwg6628NkMm9rloJ_SUu7JRfDYTgSeF2l0LRNKAQV0cG1R36_orGev4TFm3PJXcdg335Hj1SaclTGYpEdfmst10nM_v5h7h1GgxQRV2RswyWvvAikXmbYrRLTNWCxzZAVLeRp3bGf0wWAzvG_0TR_cUI6jXLuY2Qnrt8SvTNsx_abR7USDv6xQjSxZ6Vo",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDCJVLkg7Hf2b8Og1ci10tAwswGTF-b2mX7j41umtGwo-FYxCSRe5iTOlLqf9uyHo2r9GjQB4w9lxC4wb_TCUsVciJnX_PwpdYU07WsczTKbE3lFyksCET6Lg9Fno7wth5CMQoC2_Af-D8k-6K_WVqnW7218Ndrv7fr5h_5hY7E3H5C-M0vl0gw9TC3-8egX_FDHE58YZgTawnGi8HaOIrSHsJ79RXUqmCcxUnQ8bRkbd0mlCgVF_fsVo4qZ2YTfnYp4P8Ra6C_2sQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBjj_Xs1cRaWuna1e3g9Ri3wI5qBY4oLeOplgcq5EoCQv2gT_G43pyxO_sYrrgz3WHoSL7ImaJCcHE5jZ6TWGavPdh4dn28YGb8HqsXOmgBeS5JGwJqxJRrSVAa8eEqMofdUo7zwBUia06mXEhAFFdtYwfQR2yawFDAApQPE545iInfCCpshktTyB7JaPvjJKfydQaz7Ki34dN6WG5i46zawQIivVpdmhByfbhCdtTDznKMujW-TLtyNR4GsbkjNaAlI6fKaArXuVg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBc-zjm8jfOjtPLJ6hUB6VbCE22oycDlEcOrB2JrkWVfEqGlWSa88fzm0lXcbWf7tyOyIh6DHMKCfjqiOwtmCTAhtJE4amVKxWLEr2NWKAh9tv1dg8PPc85B5QXuu_XZeHg6rnzNRKgtDKuE5KWtA4QjoILCXeJ-QyjpBMsOCsqKkKMhK1xwSMKqw1xy4qBAmZZx1r6NmhjVB-956WleQIhB4nDQ4D8BbkpzR4sFk9JFycX6gH68iXzyJWi1RUlqrv4jYE7BizotBI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDQEjtaldAC8bgi4W7tWbGbn09Kf5a8OkUyP8Uv6i6L6pfGJzZ0iadhMxcFx9T450rW_bNRLTJH55tQzdsepsQzrzRV28xUyve30rdtRmSE4PMWEGYioMi6UBoSQQ6fc1Mr-5Pxo5w2o9isRWzX9dZBS6IDN57mcC-h46QEd29umktKqfR5wOBN-aymdfO4161418p2MkN-F47caRHP0DpslSlM33qv02eOJTpE1dNBlczqRnX8oVe7EEW9kJoVsCmvjFnvo-YKgIc"
];

/* ── Mini Recommendation Card Component ─────────────── */
// Show a compact example of the recommendation experience in the hero.
function RecommendationCard() {
  return (
    <div className="relative w-full max-w-md mx-auto mt-16 animate-float">
      <div className="bg-surface-container/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl shadow-primary/10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">auto_awesome</span>
          <span className="text-xs font-bold text-primary uppercase tracking-widest font-label">AI Recommendation</span>
        </div>

        {/* Source Movie */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-high">
            <img
              src={MOVIE_POSTERS[0]}
              alt="Blade Runner 2049"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] text-on-surface-variant font-label uppercase tracking-widest">Because you loved</p>
            <p className="text-white font-headline font-bold text-sm">Blade Runner 2049</p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-2 my-2 pl-4">
          <div className="w-px h-5 bg-primary/40"></div>
          <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">arrow_downward</span>
        </div>

        {/* Recommended Movie */}
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3">
          <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-high">
            <img
              src={MOVIE_POSTERS[2]}
              alt="Ghost in the Shell"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-white font-headline font-bold text-sm">Ghost in the Shell</p>
            <p className="text-on-surface-variant text-xs mt-0.5">Sci-Fi • Cyberpunk • Philosophical</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-primary font-black text-lg font-headline">98%</span>
            <span className="text-[10px] text-on-surface-variant font-label uppercase tracking-wider">Match</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render the marketing landing page and redirect signed-in users home.
export default function Landing() {
  const [scrollPos, setScrollPos] = useState(0);
  const { user, continueAsGuest } = useApp();
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
      pos += 0.3;
      setScrollPos(pos);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Let visitors preview the app without creating an account.
  const handleGuestBrowse = () => {
    continueAsGuest();
    navigate('/home');
  };

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen">

      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-4 w-full max-w-screen-2xl mx-auto glass-nav bg-transparent transition-all" role="navigation" aria-label="Main navigation">
        <div className="flex items-center gap-2">
          <img src="/vite.svg" alt="CineStream Logo" className="w-8 h-8" />
          <div className="text-2xl font-black text-primary uppercase tracking-tighter font-headline">
            CineStream
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a
            className="text-white/70 hover:text-white transition-colors font-headline tracking-tight focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-sm"
            href="#how-it-works"
          >
            How It Works
          </a>
          <a
            className="text-white/70 hover:text-white transition-colors font-headline tracking-tight focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-sm"
            href="#features"
          >
            Features
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="hidden sm:block px-6 py-2 text-white/70 hover:text-white border border-transparent hover:border-white/20 rounded-full transition-all font-label text-xs tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
          >
            Sign In
          </Link>
          <Link
            to="/login?mode=signup"
            className="bg-primary text-black px-8 py-2.5 rounded-full font-label text-xs font-bold tracking-widest uppercase hover:bg-primary-fixed transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        {/* High-Impact Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
          {/* Background Collage - Moving Movies */}
          <div className="absolute inset-0 z-0 flex gap-4 rotate-12 scale-150 opacity-20 pointer-events-none justify-center" aria-hidden="true">
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
          <div className="absolute inset-0 hero-gradient z-10"></div>

          {/* Hero Content */}
          <div className="relative z-20 text-center px-6 max-w-5xl">
            <h2 className="font-label font-bold text-primary tracking-[0.3em] uppercase mb-4 text-sm md:text-base">
              AI-Powered Movie Recommendations
            </h2>
            <h1 className="font-headline font-black text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tighter text-on-surface mb-8 text-shadow-glow">
              FIND YOUR NEXT<br />OBSESSION
            </h1>
            <p className="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-12">
              We pair films by mood, pacing, and visual style to deliver highly accurate matches. Built for cinephiles who want smarter recommendations than any streaming service.
            </p>

            {/* Single Primary CTA */}
            <div className="flex flex-col items-center gap-4 mt-12">
              <Link
                to="/login?mode=signup"
                className="w-full sm:w-auto px-14 py-5 bg-white text-black rounded-full font-headline font-bold text-lg hover:bg-slate-100 active:scale-95 transition-all shadow-lg block text-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
              >
                Start Discovering — It's Free
              </Link>
              <button
                onClick={handleGuestBrowse}
                className="text-on-surface-variant hover:text-white text-sm transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-sm"
              >
                Or browse as a guest
                <span className="text-white/40 ml-1">(preview only · saving disabled)</span>
              </button>
            </div>

            {/* Mini Recommendation Card */}
            <RecommendationCard />
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-28 px-8 bg-surface border-t border-white/5">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="font-headline font-black text-3xl md:text-4xl text-on-surface mb-4">How It Works</h2>
            <p className="font-body text-on-surface-variant text-lg mb-16 max-w-2xl mx-auto">
              Three steps to smarter movie nights.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/25 transition-colors">
                  <span className="material-symbols-outlined text-primary text-3xl" aria-hidden="true">person_add</span>
                </div>
                <h3 className="font-headline font-bold text-lg mb-2 text-white">Create Your Profile</h3>
                <p className="text-on-surface-variant text-sm">Sign up for free. Rate a few movies you've seen so we learn your taste.</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/25 transition-colors">
                  <span className="material-symbols-outlined text-primary text-3xl" aria-hidden="true">psychology</span>
                </div>
                <h3 className="font-headline font-bold text-lg mb-2 text-white">Our AI Analyzes</h3>
                <p className="text-on-surface-variant text-sm">We study genre DNA, directorial style, color palettes, and pacing patterns to build your profile.</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/25 transition-colors">
                  <span className="material-symbols-outlined text-primary text-3xl" aria-hidden="true">movie_filter</span>
                </div>
                <h3 className="font-headline font-bold text-lg mb-2 text-white">Get Perfect Matches</h3>
                <p className="text-on-surface-variant text-sm">Receive personalized recommendations with match percentages you can trust.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Bento Grid */}
        <section id="features" className="py-32 px-8 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center md:text-left">
              <h2 className="font-headline font-black text-4xl md:text-5xl text-on-surface mb-4">Built for Cinephiles</h2>
              <p className="font-body text-on-surface-variant text-lg">Beyond the stream. Tools for people who take movies seriously.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
              {/* Feature 1: Recommendations */}
              <div className="glass-nav md:col-span-8 bg-surface-container-low/60 border border-white/5 rounded-xl p-10 flex flex-col justify-between overflow-hidden relative group hover:bg-surface-container-low transition-colors">
                <div className="relative z-10">
                  <span className="material-symbols-outlined text-primary text-4xl mb-6" aria-hidden="true">psychology</span>
                  <h3 className="font-headline font-bold text-3xl mb-4">Smart Recommendations</h3>
                  <p className="text-on-surface-variant max-w-md">Our engine analyzes mood, pacing, visual style, and narrative structure to find films that feel like the one you just loved — not just the same genre.</p>
                </div>
                <div className="absolute right-[-10%] bottom-[-10%] w-2/3 opacity-30 group-hover:opacity-50 transition-opacity" aria-hidden="true">
                  <img className="rounded-xl shadow-2xl" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpqznXrEeoiLZaKtiNwvm20Rf8EGVysw6pjzzi8MIELBXsu4rzEXTLAsTSG6UNGDNss3-ij_DXJ63ASNRXXoCNv8BSxHHcDARoIETweVLr8gbTRxxQGLbCvxya72SSqOq5XTyMVXS7TGgiI10v4calfR0yQQfd-ZFlvF1_ruNF_3KCU45mfwDtN52FxSMJygunAs_CSYkmkZVMY6-zf67tnjPFd_7FkxDiQZEmFhI_3YNVf2ZfIbO74XWMRujAUrUYlVdemC-UFDU" />
                </div>
              </div>

              {/* Feature 2: Watchlist */}
              <div className="glass-nav md:col-span-4 bg-surface-container-high/60 border border-white/5 rounded-xl p-10 flex flex-col items-center text-center justify-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-amber-400 text-5xl mb-6" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">bookmark</span>
                <h3 className="font-headline font-bold text-2xl mb-4">Curated Watchlist</h3>
                <p className="text-on-surface-variant text-sm">Organize your journey through film history with elegant, visual list-making tools.</p>
              </div>

              {/* Feature 3: Ratings */}
              <div className="glass-nav md:col-span-4 bg-surface-container/60 border border-white/5 rounded-xl p-10 flex flex-col justify-end hover:bg-surface-container transition-colors group">
                <div className="flex gap-1 mb-6" role="img" aria-label="4 out of 5 star rating">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className="material-symbols-outlined text-yellow-500 text-3xl group-hover:scale-110 transition-transform origin-bottom" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">star</span>
                  ))}
                  <span className="material-symbols-outlined text-yellow-500/30 text-3xl group-hover:scale-110 transition-transform origin-bottom" style={{ fontVariationSettings: "'FILL' 0" }} aria-hidden="true">star</span>
                </div>
                <h3 className="font-headline font-bold text-2xl mb-2">Deep Ratings</h3>
                <p className="text-on-surface-variant text-sm">Rate more than just stars. Grade cinematography, score, and narrative depth.</p>
              </div>

              {/* Feature 4: Community */}
              <div className="glass-nav md:col-span-8 bg-surface-container-highest/60 border border-white/5 rounded-xl p-10 flex flex-col sm:flex-row items-center gap-10 group hover:bg-surface-container-highest transition-colors">
                <div className="w-full sm:w-1/3 overflow-hidden rounded-xl h-full shadow-lg" aria-hidden="true">
                  <img className="object-cover h-full w-full group-hover:scale-110 transition-transform duration-700" alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7CPHcoF7pxHlE1ByAReZTadEwAXIlDYe5yQZdmh548Y6cUW4cexIbbjz6NDXxW-3AwPMQXyaHw_CV4Ps7DyUcsrhHPUG-rhDYa1j1RUm1DQ-415Gs0XLaU6PPfsxc16qEssax6nR2lZLoWUAQgVT0UcJTVroH5ozuAOMbbwF1-xDV10o59skZkf7W1oW0RZd7I7A-jeml95X0MajnHrHIFkrwcLyJVht3eiSQsUadrU9Sq6jfYGHFFe3aWzjrdewRcWA0diBrcf0" />
                </div>
                <div className="w-full sm:w-2/3 flex flex-col justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl mb-4 opacity-50" aria-hidden="true">format_quote</span>
                  <blockquote className="font-headline font-bold text-2xl md:text-3xl text-white mb-6 leading-tight">
                    "A community that treats film criticism as an art form itself."
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/30">
                      <img src={testimonialAvatar} alt="Bhavesh Parmar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Bhavesh Parmar</div>
                      <div className="text-primary text-xs uppercase tracking-widest font-label mt-0.5">Film Critic &amp; Community Member</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="join" className="py-32 bg-surface relative">
          <div className="max-w-7xl mx-auto px-8">
            <div className="bg-primary rounded-3xl p-12 md:p-24 flex flex-col md:flex-row items-center justify-between relative overflow-hidden shadow-[0_0_80px_rgba(212,168,67,0.12)] hover:shadow-[0_0_120px_rgba(212,168,67,0.18)] transition-shadow duration-700">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.3),transparent)]"></div>
              <div className="relative z-10 mb-12 md:mb-0 text-center md:text-left">
                <h2 className="font-headline font-black text-4xl md:text-6xl text-on-primary-fixed mb-6 leading-none">Ready for your <br />first screening?</h2>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex -space-x-3" aria-hidden="true">
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-surface flex items-center justify-center text-xs font-bold text-white uppercase">JD</div>
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-amber-700 flex items-center justify-center text-xs font-bold text-white uppercase">AL</div>
                    <div className="w-10 h-10 rounded-full border-2 border-primary pl-1 bg-surface-container flex items-center justify-center text-xs font-bold text-primary shadow-inner">+50k</div>
                  </div>
                  <p className="font-body text-on-primary-container text-sm font-bold">Film lovers joined this month.</p>
                </div>
              </div>
              <div className="relative z-10 flex flex-col gap-4 w-full md:w-auto">
                <Link
                  to="/login?mode=signup"
                  className="px-12 py-5 bg-black text-primary rounded-full font-headline font-black text-xl hover:bg-surface-container transition-all shadow-2xl block text-center min-w-[280px] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                >
                  JOIN CINESTREAM
                </Link>
                <p className="text-center font-label text-xs text-on-primary-container tracking-widest uppercase">100% Free forever</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
