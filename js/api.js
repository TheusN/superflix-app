/**
 * SuperflixAPI Integration Module
 * Handles all communication with the Superflix API and TMDB
 */

const SuperflixAPI = {
    baseUrl: 'https://superflixapi.run',
    tmdbApiKey: '15d2ea6d0dc1d476efbca3eba2b9bbfb', // TMDB API key
    tmdbBaseUrl: 'https://api.themoviedb.org/3',
    tmdbImageUrl: 'https://image.tmdb.org/t/p',

    cache: new Map(),
    cacheTimeout: 10 * 60 * 1000, // 10 minutes

    /**
     * Fetch with caching
     */
    async fetchWithCache(url, options = {}) {
        const cacheKey = url;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    /**
     * Get list of IDs from Superflix API
     */
    async getList(category = 'movie', type = 'tmdb') {
        const url = `${this.baseUrl}/lista?category=${category}&type=${type}&format=json&order=desc`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching list:', error);
            return [];
        }
    },

    /**
     * Get movie details from TMDB
     */
    async getMovieDetails(tmdbId) {
        const url = `${this.tmdbBaseUrl}/movie/${tmdbId}?api_key=${this.tmdbApiKey}&language=pt-BR&append_to_response=credits,videos`;
        return this.fetchWithCache(url);
    },

    /**
     * Get series details from TMDB
     */
    async getSeriesDetails(tmdbId) {
        const url = `${this.tmdbBaseUrl}/tv/${tmdbId}?api_key=${this.tmdbApiKey}&language=pt-BR&append_to_response=credits,videos`;
        return this.fetchWithCache(url);
    },

    /**
     * Get season details
     */
    async getSeasonDetails(seriesId, seasonNumber) {
        const url = `${this.tmdbBaseUrl}/tv/${seriesId}/season/${seasonNumber}?api_key=${this.tmdbApiKey}&language=pt-BR`;
        return this.fetchWithCache(url);
    },

    /**
     * Convert TMDB ID to IMDB ID
     */
    async getImdbId(tmdbId, type = 'movie') {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const url = `${this.tmdbBaseUrl}/${endpoint}/${tmdbId}/external_ids?api_key=${this.tmdbApiKey}`;
        try {
            const data = await this.fetchWithCache(url);
            return data.imdb_id;
        } catch {
            return null;
        }
    },

    /**
     * Search movies and series
     */
    async search(query) {
        const url = `${this.tmdbBaseUrl}/search/multi?api_key=${this.tmdbApiKey}&language=pt-BR&query=${encodeURIComponent(query)}&page=1`;
        try {
            const data = await this.fetchWithCache(url);
            return data.results.filter(item =>
                item.media_type === 'movie' || item.media_type === 'tv'
            );
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    },

    /**
     * Get trending content
     */
    async getTrending(type = 'all', timeWindow = 'week') {
        const url = `${this.tmdbBaseUrl}/trending/${type}/${timeWindow}?api_key=${this.tmdbApiKey}&language=pt-BR`;
        return this.fetchWithCache(url);
    },

    /**
     * Get popular movies
     */
    async getPopularMovies(page = 1) {
        const url = `${this.tmdbBaseUrl}/movie/popular?api_key=${this.tmdbApiKey}&language=pt-BR&page=${page}`;
        return this.fetchWithCache(url);
    },

    /**
     * Get popular series
     */
    async getPopularSeries(page = 1) {
        const url = `${this.tmdbBaseUrl}/tv/popular?api_key=${this.tmdbApiKey}&language=pt-BR&page=${page}`;
        return this.fetchWithCache(url);
    },

    /**
     * Get top rated movies
     */
    async getTopRatedMovies(page = 1) {
        const url = `${this.tmdbBaseUrl}/movie/top_rated?api_key=${this.tmdbApiKey}&language=pt-BR&page=${page}`;
        return this.fetchWithCache(url);
    },

    /**
     * Get top rated series
     */
    async getTopRatedSeries(page = 1) {
        const url = `${this.tmdbBaseUrl}/tv/top_rated?api_key=${this.tmdbApiKey}&language=pt-BR&page=${page}`;
        return this.fetchWithCache(url);
    },

    /**
     * Get now playing movies
     */
    async getNowPlayingMovies(page = 1) {
        const url = `${this.tmdbBaseUrl}/movie/now_playing?api_key=${this.tmdbApiKey}&language=pt-BR&page=${page}`;
        return this.fetchWithCache(url);
    },

    /**
     * Get airing today series
     */
    async getAiringTodaySeries(page = 1) {
        const url = `${this.tmdbBaseUrl}/tv/airing_today?api_key=${this.tmdbApiKey}&language=pt-BR&page=${page}`;
        return this.fetchWithCache(url);
    },

    /**
     * Get movies by genre
     */
    async getMoviesByGenre(genreId, page = 1) {
        const url = `${this.tmdbBaseUrl}/discover/movie?api_key=${this.tmdbApiKey}&language=pt-BR&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`;
        return this.fetchWithCache(url);
    },

    /**
     * Get series by genre
     */
    async getSeriesByGenre(genreId, page = 1) {
        const url = `${this.tmdbBaseUrl}/discover/tv?api_key=${this.tmdbApiKey}&language=pt-BR&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`;
        return this.fetchWithCache(url);
    },

    /**
     * Get anime (animation genre from Japan)
     */
    async getAnime(page = 1) {
        const url = `${this.tmdbBaseUrl}/discover/tv?api_key=${this.tmdbApiKey}&language=pt-BR&with_genres=16&with_origin_country=JP&page=${page}&sort_by=popularity.desc`;
        return this.fetchWithCache(url);
    },

    /**
     * Get similar content
     */
    async getSimilar(id, type = 'movie') {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const url = `${this.tmdbBaseUrl}/${endpoint}/${id}/similar?api_key=${this.tmdbApiKey}&language=pt-BR&page=1`;
        return this.fetchWithCache(url);
    },

    /**
     * Build poster URL
     */
    getPosterUrl(path, size = 'w500') {
        if (!path) return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect fill="%23333" width="300" height="450"/><text fill="%23666" font-family="Arial" font-size="20" x="50%" y="50%" text-anchor="middle">Sem Imagem</text></svg>';
        return `${this.tmdbImageUrl}/${size}${path}`;
    },

    /**
     * Build backdrop URL
     */
    getBackdropUrl(path, size = 'original') {
        if (!path) return '';
        return `${this.tmdbImageUrl}/${size}${path}`;
    },

    /**
     * Get player URL for movie
     */
    getMoviePlayerUrl(imdbId) {
        return `${this.baseUrl}/filme/${imdbId}`;
    },

    /**
     * Get player URL for series episode
     */
    getSeriesPlayerUrl(tmdbId, season, episode) {
        return `${this.baseUrl}/serie/${tmdbId}/${season}/${episode}`;
    },

    /**
     * Get Streamtape custom player URL with all parameters
     * @param {string} videoId - Streamtape video ID
     * @param {Object} options - Player options
     * @returns {string} Custom player URL
     */
    getStreamtapePlayerUrl(videoId, options = {}) {
        const params = new URLSearchParams();

        // Add subtitle if provided
        if (options.subtitle) {
            params.append('sub', options.subtitle);
        }

        // Add subtitle language (default: pt-BR)
        if (options.lang) {
            params.append('lang', options.lang);
        }

        // Add logo (Superflix logo)
        if (options.logo) {
            params.append('logo', options.logo);
        }

        // Add logo link (back to home)
        if (options.logoLink) {
            params.append('logo_link', options.logoLink);
        }

        // Add VAST ad tag if provided
        if (options.vast) {
            params.append('vast', options.vast);
        }

        // Add poster image if provided
        if (options.image) {
            params.append('image', options.image);
        }

        const queryString = params.toString();
        return `${this.baseUrl}/stape/${videoId}${queryString ? '?' + queryString : ''}`;
    },

    /**
     * Get player URL for full series
     */
    getSeriesUrl(tmdbId) {
        return `${this.baseUrl}/serie/${tmdbId}`;
    },

    /**
     * Format runtime
     */
    formatRuntime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}min`;
        }
        return `${mins}min`;
    },

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { year: 'numeric' });
    },

    /**
     * Get year from date
     */
    getYear(dateString) {
        if (!dateString) return '';
        return new Date(dateString).getFullYear();
    },

    /**
     * Format vote average
     */
    formatRating(vote) {
        if (!vote) return 'N/A';
        return (vote * 10).toFixed(0) + '%';
    }
};

// Export for use in other modules
window.SuperflixAPI = SuperflixAPI;
