/**
 * Superflix Storage Module
 * Manages theme preferences and watch history using LocalStorage
 */

const SuperflixStorage = {
    // Storage keys
    KEYS: {
        THEME: 'superflix_theme',
        HISTORY: 'superflix_history',
        CONTINUE: 'superflix_continue',
        FAVORITES: 'superflix_favorites'
    },

    // Maximum items to store
    MAX_HISTORY: 50,
    MAX_CONTINUE: 20,

    /**
     * Initialize storage module
     */
    init() {
        this.loadTheme();
        this.bindThemeToggle();
    },

    // ==========================================
    // THEME MANAGEMENT
    // ==========================================

    /**
     * Load theme from storage
     */
    loadTheme() {
        const savedTheme = localStorage.getItem(this.KEYS.THEME);
        const theme = savedTheme || 'dark';
        this.setTheme(theme, false);
    },

    /**
     * Set theme
     */
    setTheme(theme, save = true) {
        document.documentElement.setAttribute('data-theme', theme);
        if (save) {
            localStorage.setItem(this.KEYS.THEME, theme);
        }
    },

    /**
     * Toggle theme
     */
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = current === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    },

    /**
     * Get current theme
     */
    getTheme() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    },

    /**
     * Bind theme toggle button
     */
    bindThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    // ==========================================
    // WATCH HISTORY
    // ==========================================

    /**
     * Add item to watch history
     */
    addToHistory(item) {
        const history = this.getHistory();

        // Remove if already exists
        const existingIndex = history.findIndex(h => h.id === item.id && h.type === item.type);
        if (existingIndex > -1) {
            history.splice(existingIndex, 1);
        }

        // Add to beginning
        const historyItem = {
            id: item.id,
            type: item.type,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            watchedAt: Date.now()
        };
        history.unshift(historyItem);

        // Trim to max
        if (history.length > this.MAX_HISTORY) {
            history.length = this.MAX_HISTORY;
        }

        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));

        // Sync to server if logged in
        if (typeof auth !== 'undefined' && auth.isLoggedIn()) {
            auth.saveToHistory({
                tmdb_id: item.id,
                title: item.title || item.name,
                poster_path: item.poster_path,
                media_type: item.type === 'movie' ? 'movie' : 'tv'
            });
        }

        return history;
    },

    /**
     * Get watch history
     */
    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.HISTORY)) || [];
        } catch {
            return [];
        }
    },

    /**
     * Clear watch history
     */
    clearHistory() {
        localStorage.removeItem(this.KEYS.HISTORY);
    },

    /**
     * Remove item from history
     */
    removeFromHistory(id, type) {
        const history = this.getHistory();
        const filtered = history.filter(h => !(h.id === id && h.type === type));
        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(filtered));
        return filtered;
    },

    // ==========================================
    // CONTINUE WATCHING
    // ==========================================

    /**
     * Save watch progress
     */
    saveProgress(item, progress) {
        const continueList = this.getContinueWatching();

        // Remove if already exists
        const existingIndex = continueList.findIndex(c => c.id === item.id && c.type === item.type);
        if (existingIndex > -1) {
            continueList.splice(existingIndex, 1);
        }

        // Add to beginning with progress
        const continueItem = {
            id: item.id,
            type: item.type,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            season: progress.season || null,
            episode: progress.episode || null,
            episodeTitle: progress.episodeTitle || null,
            progress: progress.percent || 0,
            updatedAt: Date.now()
        };
        continueList.unshift(continueItem);

        // Trim to max
        if (continueList.length > this.MAX_CONTINUE) {
            continueList.length = this.MAX_CONTINUE;
        }

        localStorage.setItem(this.KEYS.CONTINUE, JSON.stringify(continueList));

        // Sync to server if logged in
        if (typeof auth !== 'undefined' && auth.isLoggedIn()) {
            auth.saveToHistory({
                tmdb_id: item.id,
                title: item.title || item.name,
                poster_path: item.poster_path,
                media_type: item.type === 'movie' ? 'movie' : 'tv',
                season: progress.season,
                episode: progress.episode,
                progress: progress.percent || 0
            });
        }

        return continueList;
    },

    /**
     * Get continue watching list
     */
    getContinueWatching() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.CONTINUE)) || [];
        } catch {
            return [];
        }
    },

    /**
     * Remove from continue watching
     */
    removeFromContinue(id, type) {
        const continueList = this.getContinueWatching();
        const filtered = continueList.filter(c => !(c.id === id && c.type === type));
        localStorage.setItem(this.KEYS.CONTINUE, JSON.stringify(filtered));
        return filtered;
    },

    /**
     * Mark as finished (remove from continue)
     */
    markAsFinished(id, type) {
        this.removeFromContinue(id, type);
    },

    /**
     * Get progress for specific item
     */
    getProgress(id, type) {
        const continueList = this.getContinueWatching();
        return continueList.find(c => c.id === id && c.type === type) || null;
    },

    // ==========================================
    // FAVORITES
    // ==========================================

    /**
     * Toggle favorite
     */
    toggleFavorite(item) {
        const favorites = this.getFavorites();
        const existingIndex = favorites.findIndex(f => f.id === item.id && f.type === item.type);

        if (existingIndex > -1) {
            favorites.splice(existingIndex, 1);
            localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
            return false; // Removed
        } else {
            favorites.unshift({
                id: item.id,
                type: item.type,
                title: item.title || item.name,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                vote_average: item.vote_average,
                addedAt: Date.now()
            });
            localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
            return true; // Added
        }
    },

    /**
     * Get favorites
     */
    getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.FAVORITES)) || [];
        } catch {
            return [];
        }
    },

    /**
     * Check if item is favorite
     */
    isFavorite(id, type) {
        const favorites = this.getFavorites();
        return favorites.some(f => f.id === id && f.type === type);
    },

    // ==========================================
    // UTILITIES
    // ==========================================

    /**
     * Get storage usage info
     */
    getStorageInfo() {
        const history = this.getHistory();
        const continueList = this.getContinueWatching();
        const favorites = this.getFavorites();

        return {
            historyCount: history.length,
            continueCount: continueList.length,
            favoritesCount: favorites.length,
            theme: this.getTheme()
        };
    },

    /**
     * Clear all storage
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    },

    /**
     * Export data
     */
    exportData() {
        return {
            theme: this.getTheme(),
            history: this.getHistory(),
            continue: this.getContinueWatching(),
            favorites: this.getFavorites(),
            exportedAt: new Date().toISOString()
        };
    },

    /**
     * Import data
     */
    importData(data) {
        if (data.theme) this.setTheme(data.theme);
        if (data.history) localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(data.history));
        if (data.continue) localStorage.setItem(this.KEYS.CONTINUE, JSON.stringify(data.continue));
        if (data.favorites) localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(data.favorites));
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    SuperflixStorage.init();
});

// Export for use in other modules
window.SuperflixStorage = SuperflixStorage;
