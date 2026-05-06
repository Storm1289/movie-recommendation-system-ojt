import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const fetchMovies = (params = {}) => API.get('/movies', { params });
export const fetchTrending = () => API.get('/movies/trending');
export const fetchTopMonth = () => API.get('/movies/top-month');
export const fetchMovie = (id) => API.get(`/movies/${id}`);
export const fetchRecommendations = (id, topN = 10) => API.get(`/movies/${id}/recommend`, { params: { top_n: topN } });
export const fetchWatchMovieUrl = (id) => API.get(`/movies/${id}/watch-url`);
export const fetchUserRecommendations = (userId, topN = 12) => API.get(`/users/${userId}/recommendations`, { params: { top_n: topN } });
export const searchMovies = (query, options = {}) => API.get('/search', { params: { q: query, deep: options.deep || false } });
export const fetchGenres = () => API.get('/genres');
export const fetchDirectors = () => API.get('/directors');

// Auth and user state
export const signupUser = (data) => API.post('/auth/signup', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const loginWithGoogle = (data) => API.post('/auth/google', data);
export const fetchUserState = (userId) => API.get(`/users/${userId}/state`);
export const fetchUserReviews = (userId) => API.get(`/users/${userId}/reviews`);
export const fetchUserRatings = (userId) => API.get(`/users/${userId}/ratings`);
export const updateUserProfile = (userId, data) => API.put(`/users/${userId}/profile`, data);
export const updateUserEmail = (userId, data) => API.put(`/users/${userId}/email`, data);
export const changeUserPassword = (userId, data) => API.put(`/users/${userId}/password`, data);
export const updateUserSettings = (userId, data) => API.put(`/users/${userId}/settings`, data);
export const deleteUserAccount = (userId) => API.delete(`/users/${userId}`);
export const addMovieToWatchlist = (userId, movieId) => API.post(`/users/${userId}/watchlist/${movieId}`);
export const removeMovieFromWatchlist = (userId, movieId) => API.delete(`/users/${userId}/watchlist/${movieId}`);

// Wikipedia details (cached in DB)
export const fetchWikiDetails = (id) => API.get(`/movies/${id}/wiki`);

// Comments
export const fetchComments = (id) => API.get(`/movies/${id}/comments`);
export const postComment = (id, data) => API.post(`/movies/${id}/comments`, data);
export const editComment = (movieId, commentId, data) => API.put(`/movies/${movieId}/comments/${commentId}`, data);
export const deleteComment = (movieId, commentId, userEmail) => API.delete(`/movies/${movieId}/comments/${commentId}`, { params: { user_email: userEmail } });

// Ratings
export const rateMovie = (id, data) => API.post(`/movies/${id}/rate`, data);

// Streaming platforms (region-aware)
export const fetchStreaming = (id, country) => API.get(`/movies/${id}/streaming`, { params: { country } });

export default API;
