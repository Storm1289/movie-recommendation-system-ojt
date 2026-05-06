export const movieSlug = (movie) => {
    if (typeof movie === 'object' && movie?.route_id) {
        return encodeURIComponent(movie.route_id);
    }

    if (typeof movie === 'string' && movie.startsWith('external:')) {
        return encodeURIComponent(movie);
    }

    const title = typeof movie === 'string' ? movie : movie?.slug || movie?.title;
    const slug = String(title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug || 'movie';
};

export const moviePath = (movie) => `/movie/${movieSlug(movie)}`;
