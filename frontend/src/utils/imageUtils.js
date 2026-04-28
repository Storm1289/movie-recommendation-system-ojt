export const getValidImageUrl = (path, size = 'w500') => {
    if (!path) return null;
    
    // Sometimes database stores string "null" or "None"
    if (path === 'null' || path === 'None') return null;

    if (path.startsWith('http')) return path;
    if (path.startsWith('//')) return `https:${path}`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const fetchWikiImageFallback = async (title, year = '') => {
    try {
        const query1 = encodeURIComponent(`${title} (${year} film)`);
        const query2 = encodeURIComponent(`${title} film`);
        const query3 = encodeURIComponent(title);
        
        const tryFetch = async (q) => {
            const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data.thumbnail && data.thumbnail.source) {
                return data.thumbnail.source;
            }
            return null;
        };

        let img = null;
        if (year) img = await tryFetch(query1);
        if (!img) img = await tryFetch(query2);
        if (!img) img = await tryFetch(query3);
        
        return img;
    } catch {
        return null;
    }
};

export const fetchWikiActorImage = async (name) => {
    try {
        const query = encodeURIComponent(name);
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${query}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.thumbnail && data.thumbnail.source) {
            return data.thumbnail.source;
        }
        return null;
    } catch {
        return null;
    }
};
