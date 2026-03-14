import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMovie, fetchRecommendations, fetchWikiDetails, fetchComments, postComment, rateMovie, fetchStreaming } from '../api/api';
import { useApp } from '../context/AppContext';
import MovieCard from '../components/MovieCard';

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
    const [wikiLoading, setWikiLoading] = useState(true);
    const [showTrailer, setShowTrailer] = useState(false);

    // Comment form
    const [commentText, setCommentText] = useState('');
    const [commentRating, setCommentRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // User star rating (standalone)
    const [userRating, setUserRating] = useState(0);
    const [userRatingHover, setUserRatingHover] = useState(0);

    const { addToWatchlist, removeFromWatchlist, isInWatchlist, user } = useApp();

    useEffect(() => {
        setLoading(true);
        setWikiLoading(true);
        setShowTrailer(false);
        setCommentText('');
        setCommentRating(0);
        setUserRating(0);

        fetchMovie(id)
            .then(res => { setMovie(res.data); setLoading(false); })
            .catch(() => setLoading(false));

        fetchRecommendations(id)
            .then(res => setRecommendations(res.data.recommendations || []))
            .catch(console.error);

        fetchWikiDetails(id)
            .then(res => { setWiki(res.data); setWikiLoading(false); })
            .catch(() => setWikiLoading(false));

        fetchComments(id)
            .then(res => { setComments(res.data.comments || []); setCommentCount(res.data.count || 0); })
            .catch(console.error);

        // Detect user's country and fetch streaming links
        detectCountry().then(country => {
            setStreamingCountry(country);
            fetchStreaming(id, country)
                .then(res => setStreaming(res.data.platforms || []))
                .catch(console.error);
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
                user_name: user?.name || 'Anonymous',
                user_email: user?.email || null,
                content: commentText.trim(),
                rating: commentRating > 0 ? commentRating : null,
            });
            setComments(prev => [res.data.comment, ...prev]);
            setCommentCount(prev => prev + 1);
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

    const handleRateMovie = async (rating) => {
        setUserRating(rating);
        try {
            const res = await rateMovie(id, {
                user_id: user?.email || 'anonymous',
                rating,
            });
            setMovie(prev => ({
                ...prev,
                rating: res.data.rating,
                user_rating_count: res.data.user_rating_count,
            }));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-400">
                <p>Movie not found</p>
            </div>
        );
    }

    const backdropUrl = movie.backdrop_path;
    const posterUrl = movie.poster_path;
    const year = movie.release_date?.split('-')[0] || '';
    const inList = isInWatchlist(movie.id);
    const trailerSearchQuery = encodeURIComponent(`${movie.title} ${year} official trailer`);
    const youtubeEmbedUrl = `https://www.youtube.com/embed?listType=search&list=${trailerSearchQuery}&autoplay=1`;

    const handleWatchlist = () => {
        if (inList) removeFromWatchlist(movie.id);
        else addToWatchlist(movie);
    };

    // Parse wiki cast
    let castList = [];
    try {
        if (wiki?.wiki_cast && Array.isArray(wiki.wiki_cast)) {
            castList = wiki.wiki_cast;
        }
    } catch { /* ignore */ }

    const countryNames = { IN: '🇮🇳 India', US: '🇺🇸 United States', GB: '🇬🇧 United Kingdom' };

    return (
        <div className="relative">
            {/* Trailer Modal */}
            {showTrailer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setShowTrailer(false)}>
                    <div className="relative w-full max-w-4xl mx-4 aspect-video" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowTrailer(false)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-bold">
                            <span className="material-symbols-outlined">close</span> Close
                        </button>
                        <iframe src={youtubeEmbedUrl} className="w-full h-full rounded-2xl shadow-2xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={`${movie.title} Trailer`} />
                    </div>
                </div>
            )}

            {/* Background */}
            <div className="fixed inset-0 top-[65px] z-0 pointer-events-none">
                {backdropUrl && <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${backdropUrl}')` }} />}
                <div className="absolute inset-0 bg-gradient-to-r from-bg-dark via-bg-dark/90 to-bg-dark/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/50 to-transparent" />
            </div>

            <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-10 py-10">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
                    <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <Link to="/discover" className="hover:text-primary transition-colors">Movies</Link>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="text-white">{movie.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* ─── MAIN CONTENT ─────────────────── */}
                    <div className="lg:col-span-8 space-y-10">
                        {/* Title + Badges */}
                        <div>
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <span className="bg-gold text-black text-xs font-black px-2 py-0.5 rounded uppercase tracking-widest">Top Rated</span>
                                {inList && (
                                    <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">check</span> In Watchlist
                                    </span>
                                )}
                                {movie.user_rating_count > 0 && (
                                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">group</span> {movie.user_rating_count} user ratings
                                    </span>
                                )}
                            </div>

                            <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-4 drop-shadow-lg">{movie.title}</h1>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-300 font-medium bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/5 w-fit">
                                <div className="flex items-center gap-1.5 text-gold font-bold">
                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    {movie.rating?.toFixed(1)}
                                </div>
                                <div className="w-px h-4 bg-white/20" />
                                <span>{year}</span>
                                {wiki?.wiki_runtime && <><div className="w-px h-4 bg-white/20" /><span>{wiki.wiki_runtime}</span></>}
                                <div className="w-px h-4 bg-white/20" />
                                <span>{movie.genre}</span>
                                {wiki?.wiki_director && <><div className="w-px h-4 bg-white/20" /><span>Dir: {wiki.wiki_director}</span></>}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-4">
                            <button onClick={() => setShowTrailer(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-primary/30">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span> Watch Trailer
                            </button>
                            <button onClick={handleWatchlist} className={`flex items-center gap-2 backdrop-blur-md border px-6 py-4 rounded-xl font-semibold transition-all ${inList ? 'bg-primary/20 border-primary text-primary hover:bg-red-500/20 hover:border-red-500 hover:text-red-400' : 'bg-surface-dark/60 border-white/10 text-white hover:bg-surface-card'}`}>
                                <span className="material-symbols-outlined">{inList ? 'check' : 'add'}</span> {inList ? 'In My List' : 'Add to My List'}
                            </button>
                            <button className="flex items-center gap-2 bg-surface-dark/60 hover:bg-surface-card backdrop-blur-md border border-white/10 text-white px-4 py-4 rounded-xl transition-all">
                                <span className="material-symbols-outlined">share</span>
                            </button>
                        </div>

                        {/* ─── Rate This Movie ─────── */}
                        <div className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 border border-white/5">
                            <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-gold">star</span> Rate This Movie
                            </h3>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => handleRateMovie(star)}
                                        onMouseEnter={() => setUserRatingHover(star)}
                                        onMouseLeave={() => setUserRatingHover(0)}
                                        className="transition-transform hover:scale-125"
                                    >
                                        <span
                                            className={`material-symbols-outlined text-2xl ${star <= (userRatingHover || userRating) ? 'text-gold' : 'text-slate-600'
                                                }`}
                                            style={{ fontVariationSettings: star <= (userRatingHover || userRating) ? "'FILL' 1" : "'FILL' 0" }}
                                        >star</span>
                                    </button>
                                ))}
                                {userRating > 0 && <span className="text-gold font-bold ml-3">{userRating}/10</span>}
                            </div>
                        </div>

                        {/* ─── Synopsis ─────── */}
                        <div className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border-l-2 border-l-primary border border-white/5">
                            <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Description</h3>
                            <p className="text-slate-300 text-lg leading-relaxed font-light">{movie.overview}</p>
                        </div>

                        {/* ─── Wikipedia Details ─────── */}
                        {wikiLoading ? (
                            <div className="space-y-4">
                                <div className="h-8 w-48 shimmer rounded-lg" />
                                <div className="h-32 shimmer rounded-xl" />
                            </div>
                        ) : wiki && (
                            <div className="space-y-8">
                                {/* Wikipedia Summary */}
                                {wiki.wiki_summary && (
                                    <div className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/5">
                                        <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-400">public</span> From Wikipedia
                                        </h3>
                                        <p className="text-slate-300 text-sm leading-relaxed">{wiki.wiki_summary}</p>
                                    </div>
                                )}

                                {/* Plot */}
                                {wiki.wiki_plot && (
                                    <div className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/5">
                                        <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-purple-400">menu_book</span> Full Plot
                                        </h3>
                                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{wiki.wiki_plot}</p>
                                    </div>
                                )}

                                {/* Cast */}
                                {castList.length > 0 && (
                                    <div className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/5">
                                        <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-electric-blue">groups</span> Cast
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {castList.map((person, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-bg-dark/50 rounded-lg px-3 py-2.5 border border-white/5">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-purple-600/50 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                        {person[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-300 truncate">{person}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Budget & Box Office */}
                                {(wiki.wiki_budget || wiki.wiki_box_office) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {wiki.wiki_budget && (
                                            <div className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 text-center">
                                                <span className="material-symbols-outlined text-green-400 text-3xl mb-2 block">payments</span>
                                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Budget</p>
                                                <p className="text-xl font-bold text-white">{wiki.wiki_budget}</p>
                                            </div>
                                        )}
                                        {wiki.wiki_box_office && (
                                            <div className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 text-center">
                                                <span className="material-symbols-outlined text-gold text-3xl mb-2 block">monitoring</span>
                                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Box Office</p>
                                                <p className="text-xl font-bold text-white">{wiki.wiki_box_office}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── COMMENTS SECTION ─────── */}
                        <section className="bg-surface-dark/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">chat</span>
                                Reviews & Comments
                                <span className="text-sm font-normal text-slate-400 ml-2">({commentCount})</span>
                            </h3>

                            {/* Post Comment Form */}
                            <form onSubmit={handleSubmitComment} className="mb-8">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {user?.name?.[0]?.toUpperCase() || 'A'}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder="Share your thoughts about this movie..."
                                            className="w-full bg-bg-dark border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm resize-none min-h-[80px]"
                                            rows={3}
                                        />
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 font-bold uppercase">Your Rating:</span>
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setCommentRating(star)}
                                                            onMouseEnter={() => setHoverRating(star)}
                                                            onMouseLeave={() => setHoverRating(0)}
                                                        >
                                                            <span
                                                                className={`material-symbols-outlined text-lg ${star <= (hoverRating || commentRating) ? 'text-gold' : 'text-slate-600'}`}
                                                                style={{ fontVariationSettings: star <= (hoverRating || commentRating) ? "'FILL' 1" : "'FILL' 0" }}
                                                            >star</span>
                                                        </button>
                                                    ))}
                                                    {commentRating > 0 && <span className="text-gold font-bold text-sm ml-1">{commentRating}/10</span>}
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={submitting || !commentText.trim()}
                                                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {submitting ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                                )}
                                                Post
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Comments List */}
                            {comments.length > 0 ? (
                                <div className="space-y-4">
                                    {comments.map((c) => (
                                        <div key={c.id} className="flex gap-3 bg-bg-dark/30 rounded-xl p-4 border border-white/5">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                {c.user_name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                                    <span className="font-bold text-white text-sm">{c.user_name}</span>
                                                    {c.rating && (
                                                        <span className="flex items-center gap-0.5 text-gold text-xs font-bold">
                                                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                            {c.rating}/10
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500">
                                                        {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">{c.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-4xl text-slate-600 mb-2 block">forum</span>
                                    <p className="text-slate-400 text-sm">No reviews yet. Be the first to share your thoughts!</p>
                                </div>
                            )}
                        </section>

                        {/* ─── AI Recommendations ─────── */}
                        {recommendations.length > 0 && (
                            <section className="mt-4">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                    AI Recommended Similar Movies
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {recommendations.slice(0, 8).map((rec) => (
                                        <MovieCard key={rec.id} movie={rec} showMatch />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* ─── RIGHT SIDEBAR ─────────────── */}
                    <div className="lg:col-span-4 space-y-8 pt-10">
                        {/* Poster */}
                        {posterUrl && (
                            <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                                <img src={posterUrl} alt={movie.title} className="w-full" />
                            </div>
                        )}

                        {/* Movie Info */}
                        <div className="bg-surface-dark/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-electric-blue text-lg">info</span>
                                Movie Info
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Release Date</span><span className="text-white font-medium">{movie.release_date}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Rating</span><span className="text-gold font-bold">{movie.rating?.toFixed(1)} / 10</span></div>
                                {movie.user_rating_count > 0 && (
                                    <div className="flex justify-between"><span className="text-slate-400">User Ratings</span><span className="text-primary font-bold">{movie.user_rating_count} votes</span></div>
                                )}
                                <div className="flex justify-between"><span className="text-slate-400">Genres</span><span className="text-white font-medium text-right">{movie.genre}</span></div>
                                {wiki?.wiki_director && <div className="flex justify-between"><span className="text-slate-400">Director</span><span className="text-white font-medium">{wiki.wiki_director}</span></div>}
                                {wiki?.wiki_runtime && <div className="flex justify-between"><span className="text-slate-400">Runtime</span><span className="text-white font-medium">{wiki.wiki_runtime}</span></div>}
                                {wiki?.wiki_budget && <div className="flex justify-between"><span className="text-slate-400">Budget</span><span className="text-green-400 font-medium">{wiki.wiki_budget}</span></div>}
                                {wiki?.wiki_box_office && <div className="flex justify-between"><span className="text-slate-400">Box Office</span><span className="text-gold font-bold">{wiki.wiki_box_office}</span></div>}
                                <div className="flex justify-between"><span className="text-slate-400">Popularity</span><span className="text-primary font-bold">{movie.popularity?.toFixed(0)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Reviews</span><span className="text-white font-bold">{commentCount}</span></div>
                            </div>
                        </div>

                        {/* Where to Watch (Region-Aware) */}
                        <div className="bg-surface-dark/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">live_tv</span>
                                Where to Watch
                            </h3>
                            <p className="text-xs text-slate-400 mb-4">
                                {countryNames[streamingCountry] || streamingCountry || 'Detecting location...'}
                            </p>
                            <div className="space-y-2">
                                {streaming.map(platform => (
                                    <a
                                        key={platform.name}
                                        href={platform.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between py-2.5 px-3 bg-bg-dark rounded-lg hover:bg-surface-card transition-colors group border border-white/5"
                                    >
                                        <span className="text-slate-300 text-sm group-hover:text-white transition-colors font-medium">{platform.name}</span>
                                        <span className="material-symbols-outlined text-sm text-slate-500 group-hover:text-primary transition-colors">open_in_new</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
