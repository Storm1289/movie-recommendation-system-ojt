import axios from 'axios';

const API = axios.create({
    baseURL: '/api',
});

export const fetchMovies = (params = {}) => API.get('/movies', { params });
export const fetchTrending = () => API.get('/movies/trending');
export const fetchTopMonth = () => API.get('/movies/top-month');
export const fetchMovie = (id) => API.get(`/movies/${id}`);
export const fetchRecommendations = (id, topN = 10) => API.get(`/movies/${id}/recommend`, { params: { top_n: topN } });
export const searchMovies = (query) => API.get('/search', { params: { q: query } });
export const fetchGenres = () => API.get('/genres');

// Wikipedia details (cached in DB)
export const fetchWikiDetails = (id) => API.get(`/movies/${id}/wiki`);

// Comments
export const fetchComments = (id) => API.get(`/movies/${id}/comments`);
export const postComment = (id, data) => API.post(`/movies/${id}/comments`, data);

// Ratings
export const rateMovie = (id, data) => API.post(`/movies/${id}/rate`, data);

// Streaming platforms (region-aware)
export const fetchStreaming = (id, country) => API.get(`/movies/${id}/streaming`, { params: { country } });

export default API;
