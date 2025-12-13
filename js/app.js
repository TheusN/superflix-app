/**
 * Superflix App - Main Application Logic
 */

class SuperflixApp {
    constructor() {
        this.currentCategory = 'all';
        this.currentItem = null;
        this.isSearching = false;
        this.searchTimeout = null;

        this.init();
    }

    /**
     * Initialize the app
     */
    async init() {
        this.bindElements();
        this.bindEvents();
        this.setupScrollHeader();
        this.checkUrlCategory();
        await this.loadContent();
        this.hideLoading();
    }

    /**
     * Check URL for category parameter
     */
    checkUrlCategory() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        if (category && ['movie', 'serie', 'anime'].includes(category)) {
            this.currentCategory = category;
            this.updateActiveNav(category);
        }
    }

    /**
     * Update active navigation state
     */
    updateActiveNav(category) {
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.category === category);
        });
        this.mobileNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.category === category);
        });
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        // Header
        this.header = document.querySelector('.header');
        this.searchToggle = document.getElementById('searchToggle');
        this.searchBox = document.getElementById('searchBox');
        this.searchInput = document.getElementById('searchInput');
        this.searchClear = document.getElementById('searchClear');

        // Navigation
        this.navLinks = document.querySelectorAll('.nav-link');
        this.mobileNavItems = document.querySelectorAll('.mobile-nav-item');

        // Hero
        this.heroSection = document.getElementById('heroSection');
        this.heroBackdrop = document.getElementById('heroBackdrop');
        this.heroTitle = document.getElementById('heroTitle');
        this.heroDescription = document.getElementById('heroDescription');
        this.heroPlay = document.getElementById('heroPlay');
        this.heroInfo = document.getElementById('heroInfo');

        // Content
        this.contentContainer = document.getElementById('contentContainer');
        this.searchResults = document.getElementById('searchResults');
        this.searchGrid = document.getElementById('searchGrid');

        // Detail Modal
        this.detailModal = document.getElementById('detailModal');
        this.modalClose = document.getElementById('modalClose');
        this.modalBackdrop = document.getElementById('modalBackdrop');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMeta = document.getElementById('modalMeta');
        this.modalDescription = document.getElementById('modalDescription');
        this.modalPlay = document.getElementById('modalPlay');
        this.episodesContainer = document.getElementById('episodesContainer');
        this.seasonSelect = document.getElementById('seasonSelect');
        this.episodesList = document.getElementById('episodesList');

        // Player Modal
        this.playerModal = document.getElementById('playerModal');
        this.playerClose = document.getElementById('playerClose');
        this.playerContainer = document.getElementById('playerContainer');

        // Loading
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toastContainer = document.getElementById('toastContainer');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search
        this.searchToggle.addEventListener('click', () => this.toggleSearch());
        this.searchClear.addEventListener('click', () => this.clearSearch());
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.toggleSearch(false);
        });

        // Navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Permitir navegação normal para links sem data-category (ex: Lançamentos)
                if (!link.dataset.category) return;
                e.preventDefault();
                this.setCategory(link.dataset.category);
            });
        });

        this.mobileNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.setCategory(item.dataset.category);
            });
        });

        // Hero buttons
        this.heroPlay.addEventListener('click', () => this.playHeroContent());
        this.heroInfo.addEventListener('click', () => this.showHeroDetails());

        // Modals
        this.modalClose.addEventListener('click', () => this.closeDetailModal());
        this.detailModal.addEventListener('click', (e) => {
            if (e.target === this.detailModal) this.closeDetailModal();
        });

        this.playerClose.addEventListener('click', () => this.closePlayer());
        this.playerModal.addEventListener('click', (e) => {
            if (e.target === this.playerModal) this.closePlayer();
        });

        this.modalPlay.addEventListener('click', () => this.playCurrentItem());

        // Season select
        this.seasonSelect.addEventListener('change', () => this.loadEpisodes());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.playerModal.classList.contains('active')) {
                    this.closePlayer();
                } else if (this.detailModal.classList.contains('active')) {
                    this.closeDetailModal();
                }
            }
        });
    }

    /**
     * Setup scroll header effect
     */
    setupScrollHeader() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
        });
    }

    /**
     * Load main content
     */
    async loadContent() {
        this.showLoading();

        try {
            if (this.currentCategory === 'all') {
                await this.loadAllContent();
            } else if (this.currentCategory === 'movie') {
                await this.loadMoviesContent();
            } else if (this.currentCategory === 'serie') {
                await this.loadSeriesContent();
            } else if (this.currentCategory === 'anime') {
                await this.loadAnimeContent();
            }
        } catch (error) {
            console.error('Error loading content:', error);
            this.showToast('Erro ao carregar conteúdo', 'error');
        }
    }

    /**
     * Load all content (home)
     */
    async loadAllContent() {
        const [trending, popularMovies, popularSeries, topMovies, topSeries] = await Promise.all([
            SuperflixAPI.getTrending('all', 'week'),
            SuperflixAPI.getPopularMovies(),
            SuperflixAPI.getPopularSeries(),
            SuperflixAPI.getTopRatedMovies(),
            SuperflixAPI.getTopRatedSeries()
        ]);

        // Set hero with trending item
        if (trending.results && trending.results.length > 0) {
            const heroItem = trending.results[Math.floor(Math.random() * Math.min(5, trending.results.length))];
            await this.setHero(heroItem);
        }

        // Build content rows
        this.contentContainer.innerHTML = '';

        // Add Continue Watching section if available
        this.addContinueWatchingRow();

        // Add History section if available
        this.addHistoryRow();

        this.addContentRow('Em Alta', trending.results);
        this.addContentRow('Filmes Populares', popularMovies.results, 'movie');
        this.addContentRow('Séries Populares', popularSeries.results, 'tv');
        this.addContentRow('Filmes Mais Votados', topMovies.results, 'movie');
        this.addContentRow('Séries Mais Votadas', topSeries.results, 'tv');
    }

    /**
     * Load movies content
     */
    async loadMoviesContent() {
        const [nowPlaying, popular, topRated, action, comedy, horror] = await Promise.all([
            SuperflixAPI.getNowPlayingMovies(),
            SuperflixAPI.getPopularMovies(),
            SuperflixAPI.getTopRatedMovies(),
            SuperflixAPI.getMoviesByGenre(28), // Action
            SuperflixAPI.getMoviesByGenre(35), // Comedy
            SuperflixAPI.getMoviesByGenre(27)  // Horror
        ]);

        if (popular.results && popular.results.length > 0) {
            const heroItem = popular.results[Math.floor(Math.random() * Math.min(5, popular.results.length))];
            heroItem.media_type = 'movie';
            await this.setHero(heroItem);
        }

        this.contentContainer.innerHTML = '';

        this.addContentRow('Em Cartaz', nowPlaying.results, 'movie');
        this.addContentRow('Populares', popular.results, 'movie');
        this.addContentRow('Mais Votados', topRated.results, 'movie');
        this.addContentRow('Ação', action.results, 'movie');
        this.addContentRow('Comédia', comedy.results, 'movie');
        this.addContentRow('Terror', horror.results, 'movie');
    }

    /**
     * Load series content
     */
    async loadSeriesContent() {
        const [airingToday, popular, topRated, drama, scifi, crime] = await Promise.all([
            SuperflixAPI.getAiringTodaySeries(),
            SuperflixAPI.getPopularSeries(),
            SuperflixAPI.getTopRatedSeries(),
            SuperflixAPI.getSeriesByGenre(18),   // Drama
            SuperflixAPI.getSeriesByGenre(10765), // Sci-Fi
            SuperflixAPI.getSeriesByGenre(80)    // Crime
        ]);

        if (popular.results && popular.results.length > 0) {
            const heroItem = popular.results[Math.floor(Math.random() * Math.min(5, popular.results.length))];
            heroItem.media_type = 'tv';
            await this.setHero(heroItem);
        }

        this.contentContainer.innerHTML = '';

        this.addContentRow('No Ar Hoje', airingToday.results, 'tv');
        this.addContentRow('Populares', popular.results, 'tv');
        this.addContentRow('Mais Votadas', topRated.results, 'tv');
        this.addContentRow('Drama', drama.results, 'tv');
        this.addContentRow('Ficção Científica', scifi.results, 'tv');
        this.addContentRow('Crime', crime.results, 'tv');
    }

    /**
     * Load anime content
     */
    async loadAnimeContent() {
        const [anime, topAnime] = await Promise.all([
            SuperflixAPI.getAnime(),
            SuperflixAPI.getAnime(2)
        ]);

        if (anime.results && anime.results.length > 0) {
            const heroItem = anime.results[Math.floor(Math.random() * Math.min(5, anime.results.length))];
            heroItem.media_type = 'tv';
            await this.setHero(heroItem);
        }

        this.contentContainer.innerHTML = '';

        this.addContentRow('Animes Populares', anime.results, 'tv');
        this.addContentRow('Mais Animes', topAnime.results, 'tv');
    }

    /**
     * Set hero section
     */
    async setHero(item) {
        this.heroItem = item;
        const backdropUrl = SuperflixAPI.getBackdropUrl(item.backdrop_path);
        const title = item.title || item.name;
        const description = item.overview || '';

        this.heroBackdrop.style.backgroundImage = `url(${backdropUrl})`;
        this.heroTitle.textContent = title;
        this.heroDescription.textContent = description;
    }

    /**
     * Add content row
     */
    addContentRow(title, items, defaultType = null) {
        if (!items || items.length === 0) return;

        const row = document.createElement('section');
        row.className = 'content-row';

        row.innerHTML = `
            <h2 class="section-title">${title}</h2>
            <div class="content-slider"></div>
        `;

        const slider = row.querySelector('.content-slider');

        items.forEach(item => {
            const type = item.media_type || defaultType || (item.title ? 'movie' : 'tv');
            const card = this.createContentCard(item, type);
            slider.appendChild(card);
        });

        this.contentContainer.appendChild(row);
    }

    /**
     * Add continue watching row from storage
     */
    addContinueWatchingRow() {
        if (typeof SuperflixStorage === 'undefined') return;

        const continueList = SuperflixStorage.getContinueWatching();
        if (continueList.length === 0) return;

        const row = document.createElement('section');
        row.className = 'content-row';
        row.innerHTML = `
            <h2 class="section-title">Continuar Assistindo</h2>
            <div class="content-slider"></div>
        `;

        const slider = row.querySelector('.content-slider');

        continueList.forEach(item => {
            const card = this.createContinueCard(item);
            slider.appendChild(card);
        });

        this.contentContainer.appendChild(row);
    }

    /**
     * Add history row from storage
     */
    addHistoryRow() {
        if (typeof SuperflixStorage === 'undefined') return;

        const history = SuperflixStorage.getHistory();
        if (history.length === 0) return;

        const row = document.createElement('section');
        row.className = 'content-row';
        row.innerHTML = `
            <h2 class="section-title">Assistidos Recentemente</h2>
            <div class="content-slider"></div>
        `;

        const slider = row.querySelector('.content-slider');

        history.slice(0, 20).forEach(item => {
            const card = this.createContentCard(item, item.type);
            slider.appendChild(card);
        });

        this.contentContainer.appendChild(row);
    }

    /**
     * Create continue watching card with progress
     */
    createContinueCard(item) {
        const card = document.createElement('div');
        card.className = 'content-card';

        const title = item.title || item.name;
        const posterUrl = SuperflixAPI.getPosterUrl(item.poster_path);
        const progress = item.progress || 0;
        const episodeInfo = item.season && item.episode ? `T${item.season}:E${item.episode}` : '';

        card.innerHTML = `
            <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy">
            <div class="card-play">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">${episodeInfo || (item.type === 'movie' ? 'Filme' : 'Série')}</div>
            </div>
            <div class="card-progress" style="position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2);">
                <div style="width: ${progress}%; height: 100%; background: var(--accent-primary);"></div>
            </div>
        `;

        card.addEventListener('click', () => {
            if (item.season && item.episode) {
                this.currentItem = { ...item };
                this.playEpisode(item.season, item.episode);
            } else {
                this.showDetails(item, item.type);
            }
        });

        return card;
    }

    /**
     * Create content card
     */
    createContentCard(item, type) {
        const card = document.createElement('div');
        card.className = 'content-card';

        const title = item.title || item.name;
        const year = SuperflixAPI.getYear(item.release_date || item.first_air_date);
        const posterUrl = SuperflixAPI.getPosterUrl(item.poster_path);

        card.innerHTML = `
            <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy">
            <div class="card-play">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">${year} • ${type === 'movie' ? 'Filme' : 'Série'}</div>
            </div>
        `;

        card.addEventListener('click', () => this.showDetails(item, type));

        return card;
    }

    /**
     * Set category
     */
    async setCategory(category) {
        if (this.currentCategory === category) return;

        this.currentCategory = category;

        // Update nav
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.category === category);
        });

        this.mobileNavItems.forEach(item => {
            item.classList.toggle('active', item.dataset.category === category);
        });

        // Hide search results
        this.searchResults.style.display = 'none';
        this.contentContainer.style.display = 'block';
        this.heroSection.style.display = 'flex';

        // Load content
        await this.loadContent();
        this.hideLoading();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Toggle search
     */
    toggleSearch(show = null) {
        const isActive = show !== null ? show : !this.searchBox.classList.contains('active');

        if (isActive) {
            this.searchBox.classList.add('active');
            this.searchInput.focus();
        } else {
            this.searchBox.classList.remove('active');
            this.searchInput.value = '';
            this.searchBox.classList.remove('has-value');

            // Restore content
            this.searchResults.style.display = 'none';
            this.contentContainer.style.display = 'block';
            this.heroSection.style.display = 'flex';
        }
    }

    /**
     * Clear search
     */
    clearSearch() {
        this.searchInput.value = '';
        this.searchBox.classList.remove('has-value');
        this.searchInput.focus();

        // Restore content
        this.searchResults.style.display = 'none';
        this.contentContainer.style.display = 'block';
        this.heroSection.style.display = 'flex';
    }

    /**
     * Handle search input
     */
    handleSearch(query) {
        this.searchBox.classList.toggle('has-value', query.length > 0);

        clearTimeout(this.searchTimeout);

        if (query.length < 2) {
            this.searchResults.style.display = 'none';
            this.contentContainer.style.display = 'block';
            this.heroSection.style.display = 'flex';
            return;
        }

        this.searchTimeout = setTimeout(() => this.performSearch(query), 300);
    }

    /**
     * Perform search
     */
    async performSearch(query) {
        try {
            const results = await SuperflixAPI.search(query);

            this.heroSection.style.display = 'none';
            this.contentContainer.style.display = 'none';
            this.searchResults.style.display = 'block';

            this.searchGrid.innerHTML = '';

            if (results.length === 0) {
                this.searchGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center; padding: 40px;">Nenhum resultado encontrado</p>';
                return;
            }

            results.forEach(item => {
                const type = item.media_type;
                const card = this.createContentCard(item, type);
                this.searchGrid.appendChild(card);
            });

        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Erro ao buscar', 'error');
        }
    }

    /**
     * Show item details
     */
    async showDetails(item, type) {
        this.currentItem = { ...item, type };

        try {
            let details;
            if (type === 'movie') {
                details = await SuperflixAPI.getMovieDetails(item.id);
            } else {
                details = await SuperflixAPI.getSeriesDetails(item.id);
            }

            this.currentItem = { ...this.currentItem, ...details };

            // Update modal
            const backdropUrl = SuperflixAPI.getBackdropUrl(details.backdrop_path);
            this.modalBackdrop.style.backgroundImage = `url(${backdropUrl})`;

            const title = details.title || details.name;
            const year = SuperflixAPI.getYear(details.release_date || details.first_air_date);
            const rating = SuperflixAPI.formatRating(details.vote_average);
            const runtime = type === 'movie'
                ? SuperflixAPI.formatRuntime(details.runtime)
                : `${details.number_of_seasons} temporada${details.number_of_seasons > 1 ? 's' : ''}`;

            this.modalTitle.textContent = title;
            this.modalMeta.innerHTML = `
                <span class="rating">${rating} relevante</span>
                <span>${year}</span>
                <span>${runtime}</span>
            `;
            this.modalDescription.textContent = details.overview || 'Sem descrição disponível.';

            // Handle episodes for series
            if (type === 'tv' && details.seasons) {
                this.episodesContainer.style.display = 'block';
                this.seasonSelect.innerHTML = '';

                details.seasons
                    .filter(s => s.season_number > 0)
                    .forEach(season => {
                        const option = document.createElement('option');
                        option.value = season.season_number;
                        option.textContent = `Temporada ${season.season_number}`;
                        this.seasonSelect.appendChild(option);
                    });

                await this.loadEpisodes();
            } else {
                this.episodesContainer.style.display = 'none';
            }

            // Show modal
            this.detailModal.classList.add('active');
            document.body.classList.add('no-scroll');

        } catch (error) {
            console.error('Error loading details:', error);
            this.showToast('Erro ao carregar detalhes', 'error');
        }
    }

    /**
     * Load episodes for current season
     */
    async loadEpisodes() {
        const seasonNumber = this.seasonSelect.value;

        try {
            const season = await SuperflixAPI.getSeasonDetails(this.currentItem.id, seasonNumber);

            this.episodesList.innerHTML = '';

            season.episodes.forEach(episode => {
                const episodeItem = document.createElement('div');
                episodeItem.className = 'episode-item';
                episodeItem.innerHTML = `
                    <div class="episode-number">${episode.episode_number}</div>
                    <div class="episode-info">
                        <div class="episode-title">${episode.name || `Episódio ${episode.episode_number}`}</div>
                        <div class="episode-duration">${SuperflixAPI.formatRuntime(episode.runtime) || ''}</div>
                    </div>
                `;

                episodeItem.addEventListener('click', () => {
                    this.playEpisode(seasonNumber, episode.episode_number);
                });

                this.episodesList.appendChild(episodeItem);
            });

        } catch (error) {
            console.error('Error loading episodes:', error);
            this.episodesList.innerHTML = '<p style="color: var(--text-secondary); padding: 20px; text-align: center;">Erro ao carregar episódios</p>';
        }
    }

    /**
     * Close detail modal
     */
    closeDetailModal() {
        this.detailModal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    /**
     * Play hero content
     */
    async playHeroContent() {
        if (!this.heroItem) return;

        const type = this.heroItem.media_type || (this.heroItem.title ? 'movie' : 'tv');
        this.currentItem = { ...this.heroItem, type };

        await this.playCurrentItem();
    }

    /**
     * Show hero details
     */
    showHeroDetails() {
        if (!this.heroItem) return;

        const type = this.heroItem.media_type || (this.heroItem.title ? 'movie' : 'tv');
        this.showDetails(this.heroItem, type);
    }

    /**
     * Play current item
     */
    async playCurrentItem() {
        if (!this.currentItem) return;

        try {
            let playerUrl;

            if (this.currentItem.type === 'movie') {
                // Get IMDB ID for movies
                let imdbId = this.currentItem.imdb_id;
                if (!imdbId) {
                    imdbId = await SuperflixAPI.getImdbId(this.currentItem.id, 'movie');
                }

                if (!imdbId) {
                    this.showToast('Filme não disponível', 'error');
                    return;
                }

                playerUrl = SuperflixAPI.getMoviePlayerUrl(imdbId);
            } else {
                // For series, play first episode or use series URL
                playerUrl = SuperflixAPI.getSeriesPlayerUrl(this.currentItem.id, 1, 1);
            }

            this.openPlayer(playerUrl);

        } catch (error) {
            console.error('Error playing:', error);
            this.showToast('Erro ao reproduzir', 'error');
        }
    }

    /**
     * Play specific episode
     */
    playEpisode(season, episode) {
        const playerUrl = SuperflixAPI.getSeriesPlayerUrl(this.currentItem.id, season, episode);
        this.openPlayer(playerUrl, { season, episode });
    }

    /**
     * Open player
     */
    openPlayer(url, episodeInfo = null) {
        // Save to history
        if (typeof SuperflixStorage !== 'undefined' && this.currentItem) {
            SuperflixStorage.addToHistory(this.currentItem);

            // Save to continue watching with progress info
            const progressInfo = {
                season: episodeInfo?.season || null,
                episode: episodeInfo?.episode || null,
                percent: 10 // Start at 10%
            };
            SuperflixStorage.saveProgress(this.currentItem, progressInfo);
        }

        this.playerContainer.innerHTML = `
            <iframe
                src="${url}#transparent"
                allowfullscreen
                allow="autoplay; encrypted-media; picture-in-picture"
                frameborder="0"
            ></iframe>
        `;

        this.playerModal.classList.add('active');
        document.body.classList.add('no-scroll');
    }

    /**
     * Close player
     */
    closePlayer() {
        this.playerModal.classList.remove('active');
        document.body.classList.remove('no-scroll');
        this.playerContainer.innerHTML = '';
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        this.loadingOverlay.classList.add('active');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SuperflixApp();
});
