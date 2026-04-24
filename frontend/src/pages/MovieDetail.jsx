import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMovie, fetchRecommendations, fetchWikiDetails, fetchComments, postComment, fetchStreaming, fetchMovies } from '../api/api';
import { useApp } from '../context/AppContext';
import MovieCard from '../components/MovieCard';
import { getValidImageUrl, fetchWikiImageFallback, fetchWikiActorImage } from '../utils/imageUtils';

export default function MovieDetail() {
    const { id } = useParams();
    const [movie, setMovie] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [wiki, setWiki] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentCount, setCommentCount] = useState(0);
    const [streaming, setStreaming] = useState([]);
    const [streamingCountry, setStreamingCountry] = useState('');
    const [loading, setLoading] = useState(true);
    const [showTrailer, setShowTrailer] = useState(false);
    
    const [backdropUrl, setBackdropUrl] = useState(null);
    const [posterUrl, setPosterUrl] = useState(null);
    const [moreMovies, setMoreMovies] = useState(null); // { title: string, movies: [] }
    const [castImages, setCastImages] = useState({});

    // Comment form
    const [commentText, setCommentText] = useState('');
    const [commentRating, setCommentRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const { addToWatchlist, removeFromWatchlist, isInWatchlist, user, incrementCommentCount } = useApp();

    useEffect(() => {
        setLoading(true);
        setShowTrailer(false);
        setCommentText('');
        setCommentRating(0);
        window.scrollTo(0, 0);

        // Reset state on ID change to avoid layout glitch
        setMovie(null);
        setWiki(null);
        setMoreMovies(null);
        setCastImages({});
        setRecommendations([]);

        Promise.allSettled([
            fetchMovie(id).then(res => setMovie(res.data)),
            fetchRecommendations(id).then(res => setRecommendations(res.data.recommendations || [])),
            fetchWikiDetails(id).then(res => { 
                setWiki(res.data); 
                let foundDirectorMovies = false;

                if (res.data?.wiki_director) {
                    fetchMovies({ director: res.data.wiki_director, per_page: 6 }).then(resp => {
                        const filtered = resp.data.movies.filter(m => String(m.id) !== String(id) && m.poster_path);
                        if (filtered.length > 0) {
                            setMoreMovies({ title: `More From ${res.data.wiki_director}`, movies: filtered.slice(0, 5) });
                            foundDirectorMovies = true;
                        }
                    }).catch(console.error);
                }
                
                // Fetch cast images
                if (res.data?.wiki_cast && Array.isArray(res.data.wiki_cast)) {
                    res.data.wiki_cast.slice(0, 8).forEach(person => {
                        const actorName = person.split(' as ')[0].split(',')[0].trim();
                        fetchWikiActorImage(actorName).then(url => {
                            if (url) {
                                setCastImages(prev => ({ ...prev, [actorName]: url }));
                            }
                        });
                    });
                }
            }),
            fetchComments(id).then(res => { setComments(res.data.comments || []); setCommentCount(res.data.count || 0); }),
            detectCountry().then(country => {
                setStreamingCountry(country);
                return fetchStreaming(id, country).then(res => setStreaming(res.data.platforms || []));
            })
        ]).then(() => {
            setLoading(false);
        });
    }, [id]);

    const detectCountry = async () => {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            return data.country_code || 'IN';
        } catch {
            return 'IN';
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setSubmitting(true);
        try {
            const res = await postComment(id, {
                user_id: user?.id || null,
                user_name: user?.name || 'Anonymous',
                user_email: user?.email || null,
                content: commentText.trim(),
                rating: commentRating > 0 ? commentRating : null,
            });
            setComments(prev => [res.data.comment, ...prev]);
            setCommentCount(prev => prev + 1);
            incrementCommentCount();
            if (res.data.movie_rating) {
                setMovie(prev => ({
                    ...prev,
                    rating: res.data.movie_rating,
                    user_rating_count: res.data.user_rating_count,
                }));
            }
            setCommentText('');
            setCommentRating(0);
        } catch (err) {
            console.error(err);
        }
        setSubmitting(false);
    };

    useEffect(() => {
        // Fallback for the "More From..." section if director has no other movies
        if (movie && wiki !== undefined && !moreMovies) {
            // Give the director fetch a moment to complete if it was triggered
            const timer = setTimeout(() => {
                if (!moreMovies && movie.genre) {
                    const firstGenre = movie.genre.split(',')[0].trim();
                    fetchMovies({ genre: firstGenre, per_page: 6 }).then(resp => {
                        const filtered = resp.data.movies.filter(m => String(m.id) !== String(id) && m.poster_path);
                        if (filtered.length > 0) {
                            setMoreMovies({ title: `More in ${firstGenre}`, movies: filtered.slice(0, 5) });
                        }
                    }).catch(console.error);
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [movie, wiki, moreMovies, id]);

    useEffect(() => {
        if (!movie) return;
        const initialBackdrop = getValidImageUrl(movie.backdrop_path || movie.poster_path, 'original');
        const initialPoster = getValidImageUrl(movie.poster_path, 'w500');
        
        setBackdropUrl(initialBackdrop);
        setPosterUrl(initialPoster);

        // Preload background to check for 404
        if (initialBackdrop) {
            const img = new Image();
            img.src = initialBackdrop;
            img.onerror = async () => {
                const year = movie.release_date?.split('-')[0] || '';
                const fallback = await fetchWikiImageFallback(movie.title, year);
                if (fallback) setBackdropUrl(fallback);
                else setBackdropUrl(null);
            };
        }
    }, [movie]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen flex items-center justify-center text-on-surface-variant font-headline text-2xl">
                <p>Movie not found</p>
            </div>
        );
    }

    const year = movie.release_date?.split('-')[0] || '';
    const inList = isInWatchlist(movie.id);

    const handleWatchTrailer = () => {
        const trailerSearchQuery = encodeURIComponent(`${movie.title} ${year} official trailer`);
        window.open(`https://www.youtube.com/results?search_query=${trailerSearchQuery}`, '_blank');
    };

    const handleWatchlist = async () => {
        try {
            if (inList) await removeFromWatchlist(movie.id);
            else await addToWatchlist(movie);
        } catch (err) {
            console.error(err);
        }
    };

    // Parse wiki cast
    let castList = [];
    try {
        if (wiki?.wiki_cast && Array.isArray(wiki.wiki_cast)) {
            castList = wiki.wiki_cast;
        }
    } catch { /* ignore */ }

    const countryNames = { IN: '🇮🇳 India', US: '🇺🇸 United States', GB: '🇬🇧 United Kingdom' };
    const genresList = movie.genre ? movie.genre.split(',').map(g => g.trim()) : [];

    return (
        <div className="bg-surface text-on-surface font-body selection:bg-primary selection:text-white min-h-screen">

            {/* Hero Section */}
            <section className="relative w-full h-[600px] md:h-[870px] overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20000ms] ease-linear hover:scale-110"
                    style={{ backgroundImage: backdropUrl ? `url('${backdropUrl}')` : 'none', backgroundColor: '#0e0e0e' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>

                <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 pb-16 flex flex-col items-start gap-6 max-w-screen-2xl mx-auto">
                    <div className="flex flex-wrap gap-4 animate-fade-in">
                        {genresList.map((genre, idx) => (
                            <span key={idx} className={`${idx === 0 ? 'bg-amber-500/20 text-amber-300' : idx === 1 ? 'bg-white/10 backdrop-blur-md text-white' : 'bg-white/5 text-white/70'} px-4 py-1.5 rounded-full text-xs font-label font-bold tracking-widest uppercase`}>
                                {genre}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black font-headline tracking-tighter text-white leading-[0.85] uppercase drop-shadow-2xl">
                        {movie.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 mt-4 text-on-surface-variant font-label text-sm uppercase tracking-widest font-semibold backdrop-blur-sm bg-black/20 p-2 px-4 rounded-xl border border-white/5 w-fit">
                        {wiki?.wiki_runtime && (
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-400 text-lg">schedule</span>
                                <span>{wiki.wiki_runtime}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400 text-lg">calendar_today</span>
                            <span>{movie.release_date}</span>
                        </div>
                        {wiki?.wiki_director && (
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-400 text-lg">chair</span>
                                <span>{wiki.wiki_director}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 mt-8">
                        <button onClick={handleWatchTrailer} className="bg-white text-black px-10 py-4 rounded-full font-headline font-black text-lg flex items-center gap-3 hover:scale-105 transition-transform active:scale-95 shadow-lg">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            WATCH TRAILER
                        </button>
                        <button onClick={handleWatchlist} className={`px-10 py-4 rounded-full font-headline font-black text-lg flex items-center gap-3 border transition-all ${inList ? 'bg-primary/20 border-primary text-primary' : 'bg-black/40 backdrop-blur-md text-white border-white/10 hover:bg-white/10'}`}>
                            <span className="material-symbols-outlined">{inList ? 'bookmark_added' : 'bookmark_add'}</span>
                            {inList ? 'IN WATCHLIST' : 'WATCHLIST'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Content Grid */}
            <div className="max-w-screen-2xl mx-auto px-6 md:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-16">

                {/* ─── LEFT COLUMN ──────────────────────── */}
                <div className="lg:col-span-8 space-y-20">

                    {/* Description Section */}
                    <section>
                        <h2 className="text-3xl font-black font-headline text-white mb-8 tracking-tight uppercase">Description</h2>
                        {wiki?.wiki_summary && !wiki.wiki_summary.includes('may refer to:') && wiki.wiki_summary.length > 50 ? (
                            <p className="text-lg text-on-surface-variant leading-relaxed font-body font-light border-l-2 border-secondary pl-6">
                                {wiki.wiki_summary}
                            </p>
                        ) : (
                            <p className="text-xl text-on-surface-variant leading-relaxed font-body font-light">
                                {movie.overview}
                            </p>
                        )}
                    </section>

                    {/* Cast Bento Grid */}
                    {castList.length > 0 && (
                        <section>
                            <h2 className="text-3xl font-black font-headline text-white mb-8 tracking-tight uppercase">Cast</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {castList.slice(0, 8).map((person, i) => {
                                    const actorName = person.split(' as ')[0].split(',')[0].trim();
                                    const names = actorName.split(' ');
                                    const lastName = names.length > 1 ? names[names.length - 1] : actorName;
                                    return (
                                        <div key={i} className="bg-surface-container-low p-4 rounded-xl group hover:bg-surface-container transition-all">
                                            <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-surface-container-high flex flex-col items-center justify-center text-on-surface-variant relative">
                                                {castImages[actorName] ? (
                                                    <img 
                                                        src={castImages[actorName]} 
                                                        alt={actorName} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                    />
                                                ) : (
                                                    <div className="text-4xl font-headline font-black opacity-20 group-hover:scale-110 transition-transform duration-500">
                                                        {actorName[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="text-white font-bold font-headline truncate" title={actorName}>{lastName}</h4>
                                            <p className="text-on-surface-variant text-xs uppercase tracking-widest mt-1 truncate" title={actorName}>{names[0]}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Reviews Section */}
                    <section className="space-y-8">
                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <h2 className="text-3xl font-black font-headline text-white tracking-tight uppercase">Audience Voices</h2>
                            <span className="text-primary font-headline font-bold text-sm tracking-widest uppercase">{commentCount} Reviews</span>
                        </div>

                        <div className="space-y-6">
                            {/* Add Comment */}
                            <form onSubmit={handleSubmitComment} className="bg-surface-container-low p-8 rounded-2xl border-2 border-dashed border-white/5">
                                <h4 className="text-white font-bold mb-4 font-headline uppercase tracking-widest text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-400">edit</span>
                                    Share your experience
                                </h4>
                                <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    className="w-full bg-surface border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant h-32 resize-none"
                                    placeholder="What did you feel after the credits rolled?"
                                ></textarea>
                                <div className="flex justify-between items-center mt-4">
                                    <div className="flex gap-1 text-on-surface-variant">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                            <span
                                                key={star}
                                                onClick={() => setCommentRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className={`material-symbols-outlined cursor-pointer hover:scale-125 transition-transform ${star <= (hoverRating || commentRating) ? 'text-amber-400' : ''}`}
                                                style={{ fontVariationSettings: star <= (hoverRating || commentRating) ? "'FILL' 1" : "'FILL' 0" }}
                                            >star</span>
                                        ))}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting || !commentText.trim()}
                                        className="bg-white text-black px-8 py-3 rounded-full font-headline font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-colors disabled:opacity-50"
                                    >
                                        {submitting ? 'Posting...' : 'Post Review'}
                                    </button>
                                </div>
                            </form>

                            {/* Reviews List */}
                            {comments.length > 0 ? comments.map(c => (
                                <div key={c.id} className="bg-surface-container p-8 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.02)] border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-sm text-black font-headline shadow-lg">
                                                {c.user_name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm font-headline uppercase">{c.user_name}</p>
                                                <p className="text-on-surface-variant text-[10px] uppercase tracking-widest">
                                                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recently'}
                                                </p>
                                            </div>
                                        </div>
                                        {c.rating && (
                                            <div className="flex gap-0.5 text-amber-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {i < Math.round(c.rating / 2) ? 'star' : 'star_outline'}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-on-surface text-sm leading-relaxed whitespace-pre-line">{c.content}</p>
                                </div>
                            )) : (
                                <div className="text-center py-12 bg-surface-container-low rounded-2xl border border-white/5">
                                    <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 opacity-50 block">forum</span>
                                    <p className="text-on-surface-variant font-headline uppercase tracking-widest text-sm">No Voices Yet. Be the first.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ─── RIGHT COLUMN ─────────────────────── */}
                <div className="lg:col-span-4 space-y-12">

                    {/* Rating Card */}
                    <div className="bg-surface-container p-8 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 blur-3xl rounded-full -mr-16 -mt-16"></div>
                        <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-[0.3em] mb-4">Global Resonance</p>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-6xl font-black font-headline text-white">{movie.rating ? movie.rating.toFixed(1) : 'NR'}</span>
                            <span className="text-on-surface-variant text-lg">/10</span>
                        </div>
                        <div className="flex gap-2 mb-8">
                            {movie.user_rating_count > 0 && (
                                <span className="bg-amber-500/10 text-amber-300 px-3 py-1 rounded-md text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                                    {movie.user_rating_count} Votes
                                </span>
                            )}
                            <span className="bg-primary/15 text-primary px-3 py-1 rounded-md text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">verified</span> Author Certified
                            </span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                <span>Popularity</span>
                                <span className="text-amber-400">{movie.popularity ? Math.round(movie.popularity) : 'N/A'}</span>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div className="bg-amber-400 h-full" style={{ width: `${Math.min(100, (movie.popularity || 0) / 20)}%` }}></div>
                            </div>
                            {wiki?.wiki_box_office && (
                                <div className="flex justify-between items-end border-b border-white/5 pb-2 gap-4">
                                    <span className="text-on-surface-variant text-xs font-bold font-headline uppercase tracking-widest whitespace-nowrap">Box Office</span>
                                    <span className="text-primary font-bold truncate text-right" title={wiki.wiki_box_office}>{wiki.wiki_box_office}</span>
                                </div>
                            )}
                            {wiki?.wiki_budget && (
                                <div className="flex justify-between items-end border-b border-white/5 pb-2 gap-4">
                                    <span className="text-on-surface-variant text-xs font-bold font-headline uppercase tracking-widest whitespace-nowrap">Budget</span>
                                    <span className="text-white font-bold truncate text-right" title={wiki.wiki_budget}>{wiki.wiki_budget}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Availability Section */}
                    {streaming.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-black font-headline text-white tracking-[0.2em] uppercase px-2">
                                Where to Watch <span className="text-on-surface-variant text-[10px] ml-2">({countryNames[streamingCountry] || streamingCountry})</span>
                            </h3>
                            <div className="space-y-3">
                                {streaming.map(platform => (
                                    <a
                                        key={platform.name}
                                        href={platform.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-surface-container-high p-4 flex items-center justify-between group hover:bg-surface-bright transition-all border border-white/5 rounded-xl hover:border-white/20"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center border border-white/10 shadow-inner group-hover:bg-black transition-colors">
                                                <span className="text-[10px] font-black text-white px-1 text-center truncate w-full">{platform.name.substring(0, 6)}</span>
                                            </div>
                                            <span className="text-sm font-bold text-white uppercase tracking-widest truncate">{platform.name}</span>
                                        </div>
                                        <span className="bg-white/5 group-hover:bg-primary group-hover:text-black text-on-surface-variant px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                            Watch <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Poster Info Card */}
                    {posterUrl && (
                        <div className="bg-gradient-to-br from-[#1a1408] to-black p-8 rounded-2xl border-l-4 border-primary shadow-2xl">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-primary text-[10px] font-black tracking-[0.2em] uppercase">Official Poster</span>
                                    <h4 className="text-2xl font-black font-headline text-white mt-1">Artwork</h4>
                                </div>
                                <span className="material-symbols-outlined text-primary text-3xl">palette</span>
                            </div>
                            <img 
                                src={posterUrl} 
                                alt={movie.title} 
                                className="w-full rounded-xl shadow-2xl"
                                onError={async (e) => {
                                    const year = movie.release_date?.split('-')[0] || '';
                                    const fallback = await fetchWikiImageFallback(movie.title, year);
                                    if (fallback) setPosterUrl(fallback);
                                    else e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
                <section className="bg-surface-container-low py-24 px-6 md:px-12 border-t border-white/5">
                    <div className="max-w-screen-2xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-6 mb-12">
                            <h2 className="text-4xl md:text-5xl font-black font-headline text-white tracking-tighter uppercase">Recommends For You</h2>
                            <p className="text-on-surface-variant text-sm font-label uppercase tracking-widest mb-2 md:border-l border-primary md:pl-6">Similar Masterpieces</p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {recommendations.slice(0, 10).map((rec) => (
                                <MovieCard key={rec.id} movie={rec} showMatch />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* More By Director Section */}
            {moreMovies && moreMovies.movies.length > 0 && (
                <section className="bg-surface py-24 px-6 md:px-12">
                    <div className="max-w-screen-2xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-6 mb-12">
                            <h2 className="text-4xl md:text-5xl font-black font-headline text-white tracking-tighter uppercase">{moreMovies.title}</h2>
                            <p className="text-on-surface-variant text-sm font-label uppercase tracking-widest mb-2 md:border-l border-primary md:pl-6">{moreMovies.title.includes('Director') ? 'Visionary Director' : 'Similar Movies'}</p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {moreMovies.movies.map((rec) => (
                                <MovieCard key={rec.id} movie={rec} showMatch={false} />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
