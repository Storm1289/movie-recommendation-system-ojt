export const movieSlug = (movie) => {
    const title = typeof movie === 'string' ? movie : movie?.slug || movie?.title;
    const slug = String(title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug || 'movie';
};

export const moviePath = (movie) => `/movie/${movieSlug(movie)}`;
