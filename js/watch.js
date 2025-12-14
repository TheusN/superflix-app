/**
 * Watch Page Controller
 * Manages the content details page with trailer, favorites, and episodes
 */

class WatchPage {
    constructor() {
        this.content = null;
        this.contentType = null;
        this.contentId = null;
        this.trailerKey = null;
        this.currentSeason = 1;

        this.init();
    }

    async init() {
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        this.contentType = params.get('type'); // 'movie' or 'tv'
        this.contentId = params.get('id');

        if (!this.contentType || !this.contentId) {
            this.showError('Conteúdo não encontrado');
            return;
        }

        // Initialize storage (theme)
        SuperflixStorage.init();

        // Bind events
        this.bindEvents();

        // Load content
        await this.loadContent();
    }

    bindEvents() {
        // Watch button
        document.getElementById('btnWatch').addEventListener('click', () => this.playContent());

        // Trailer button
        document.getElementById('btnTrailer').addEventListener('click', () => this.playTrailer());

        // Favorite button
        document.getElementById('btnFavorite').addEventListener('click', () => this.toggleFavorite());

        // Close trailer modal
        document.getElementById('trailerClose').addEventListener('click', () => this.closeTrailer());
        document.getElementById('trailerModal').addEventListener('click', (e) => {
            if (e.target.id === 'trailerModal') this.closeTrailer();
        });

        // Close player modal
        document.getElementById('playerClose').addEventListener('click', () => this.closePlayer());
        document.getElementById('playerModal').addEventListener('click', (e) => {
            if (e.target.id === 'playerModal') this.closePlayer();
        });

        // Season selector
        document.getElementById('seasonSelect').addEventListener('change', (e) => {
            this.currentSeason = parseInt(e.target.value);
            this.loadEpisodes();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTrailer();
                this.closePlayer();
            }
        });

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    async loadContent() {
        try {
            if (this.contentType === 'movie') {
                this.content = await SuperflixAPI.getMovieDetails(this.contentId);
            } else {
                this.content = await SuperflixAPI.getSeriesDetails(this.contentId);
            }

            this.renderContent();
            this.loadRecommendations();
            this.hideLoading();

        } catch (error) {
            console.error('Error loading content:', error);
            this.showError('Erro ao carregar conteúdo');
        }
    }

    renderContent() {
        const content = this.content;
        const isMovie = this.contentType === 'movie';

        // Update page title
        const title = isMovie ? content.title : content.name;
        document.title = `${title} - Superflix`;

        // Backdrop
        if (content.backdrop_path) {
            const backdropUrl = SuperflixAPI.getBackdropUrl(content.backdrop_path);
            document.getElementById('backdropImage').style.backgroundImage = `url(${backdropUrl})`;
        }

        // Poster
        const posterUrl = SuperflixAPI.getPosterUrl(content.poster_path);
        const posterImg = document.getElementById('posterImage');
        posterImg.src = posterUrl;
        posterImg.alt = title;

        // Title
        document.getElementById('watchTitle').textContent = title;

        // Meta info
        const metaHtml = this.buildMetaHtml(content, isMovie);
        document.getElementById('watchMeta').innerHTML = metaHtml;

        // Genres
        if (content.genres && content.genres.length > 0) {
            const genresHtml = content.genres
                .map(g => `<span class="genre-tag">${g.name}</span>`)
                .join('');
            document.getElementById('watchGenres').innerHTML = genresHtml;
        }

        // Description
        document.getElementById('watchDescription').textContent = content.overview || 'Sem descrição disponível.';

        // Credits (cast & director)
        this.renderCredits(content);

        // Trailer button
        this.setupTrailer(content);

        // Favorite button state
        this.updateFavoriteButton();

        // Episodes (for series)
        if (!isMovie && content.seasons) {
            this.setupSeasons(content);
        }
    }

    buildMetaHtml(content, isMovie) {
        const parts = [];

        // Rating
        if (content.vote_average) {
            const rating = (content.vote_average * 10).toFixed(0);
            parts.push(`
                <span class="meta-item meta-rating">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    ${rating}%
                </span>
            `);
        }

        // Year
        const releaseDate = isMovie ? content.release_date : content.first_air_date;
        if (releaseDate) {
            parts.push(`<span class="meta-item meta-year">${SuperflixAPI.getYear(releaseDate)}</span>`);
        }

        // Duration or Seasons
        if (isMovie && content.runtime) {
            parts.push(`<span class="meta-item meta-duration">${SuperflixAPI.formatRuntime(content.runtime)}</span>`);
        } else if (!isMovie && content.number_of_seasons) {
            const seasons = content.number_of_seasons;
            parts.push(`<span class="meta-item meta-duration">${seasons} Temporada${seasons > 1 ? 's' : ''}</span>`);
        }

        return parts.join('<span class="meta-separator"></span>');
    }

    renderCredits(content) {
        const credits = content.credits;
        if (!credits) return;

        // Cast (top 5)
        if (credits.cast && credits.cast.length > 0) {
            const topCast = credits.cast.slice(0, 5).map(c => c.name).join(', ');
            document.getElementById('castList').textContent = topCast;
            document.getElementById('castSection').style.display = 'flex';
        } else {
            document.getElementById('castSection').style.display = 'none';
        }

        // Director(s)
        if (credits.crew) {
            const directors = credits.crew
                .filter(c => c.job === 'Director')
                .map(d => d.name)
                .slice(0, 2)
                .join(', ');

            if (directors) {
                document.getElementById('directorList').textContent = directors;
                document.getElementById('directorSection').style.display = 'flex';
            } else {
                document.getElementById('directorSection').style.display = 'none';
            }
        }
    }

    setupTrailer(content) {
        const videos = content.videos?.results || [];

        // Find trailer (prefer official trailers in Portuguese, then English)
        const trailer = videos.find(v =>
            v.type === 'Trailer' && v.site === 'YouTube' && v.iso_639_1 === 'pt'
        ) || videos.find(v =>
            v.type === 'Trailer' && v.site === 'YouTube'
        ) || videos.find(v =>
            v.site === 'YouTube'
        );

        const trailerBtn = document.getElementById('btnTrailer');

        if (trailer) {
            this.trailerKey = trailer.key;
            trailerBtn.classList.remove('hidden');
        } else {
            trailerBtn.classList.add('hidden');
        }
    }

    setupSeasons(content) {
        const episodesSection = document.getElementById('episodesSection');
        const seasonSelect = document.getElementById('seasonSelect');

        // Filter out specials (season 0) and seasons without episodes
        const validSeasons = content.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);

        if (validSeasons.length === 0) {
            episodesSection.style.display = 'none';
            return;
        }

        // Populate season selector
        seasonSelect.innerHTML = validSeasons
            .map(s => `<option value="${s.season_number}">Temporada ${s.season_number} (${s.episode_count} eps)</option>`)
            .join('');

        // Set initial season
        this.currentSeason = validSeasons[0].season_number;
        seasonSelect.value = this.currentSeason;

        // Show episodes section and load first season
        episodesSection.style.display = 'block';
        this.loadEpisodes();
    }

    async loadEpisodes() {
        const episodesList = document.getElementById('episodesList');
        episodesList.innerHTML = '<div class="loading-episodes">Carregando episódios...</div>';

        try {
            const seasonData = await SuperflixAPI.getSeasonDetails(this.contentId, this.currentSeason);

            if (!seasonData.episodes || seasonData.episodes.length === 0) {
                episodesList.innerHTML = '<p style="color: var(--text-muted);">Nenhum episódio disponível.</p>';
                return;
            }

            episodesList.innerHTML = seasonData.episodes.map(ep => this.createEpisodeCard(ep)).join('');

            // Bind episode click events
            episodesList.querySelectorAll('.episode-card').forEach(card => {
                card.addEventListener('click', () => {
                    const epNumber = parseInt(card.dataset.episode);
                    this.playEpisode(this.currentSeason, epNumber);
                });
            });

        } catch (error) {
            console.error('Error loading episodes:', error);
            episodesList.innerHTML = '<p style="color: var(--text-muted);">Erro ao carregar episódios.</p>';
        }
    }

    createEpisodeCard(episode) {
        const stillUrl = episode.still_path
            ? SuperflixAPI.getPosterUrl(episode.still_path, 'w300')
            : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 169"><rect fill="%23333" width="300" height="169"/></svg>';

        const duration = episode.runtime ? `${episode.runtime}min` : '';
        const title = episode.name || `Episódio ${episode.episode_number}`;
        const overview = episode.overview || 'Sem descrição disponível.';

        return `
            <div class="episode-card" data-episode="${episode.episode_number}">
                <div class="episode-thumbnail">
                    <img src="${stillUrl}" alt="${title}" loading="lazy">
                    <div class="play-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </div>
                </div>
                <div class="episode-content">
                    <div class="episode-header">
                        <span class="episode-number">${episode.episode_number}. ${title}</span>
                        <span class="episode-duration">${duration}</span>
                    </div>
                    <p class="episode-overview">${overview}</p>
                </div>
            </div>
        `;
    }

    async loadRecommendations() {
        try {
            const data = await SuperflixAPI.getSimilar(this.contentId, this.contentType);
            const items = data.results || [];

            if (items.length === 0) {
                document.getElementById('recommendationsSection').style.display = 'none';
                return;
            }

            const recommendationsList = document.getElementById('recommendationsList');
            recommendationsList.innerHTML = items.slice(0, 12).map(item => this.createRecommendationCard(item)).join('');

            // Bind click events
            recommendationsList.querySelectorAll('.content-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.id;
                    const type = card.dataset.type;
                    window.location.href = `/watch/?type=${type}&id=${id}`;
                });
            });

        } catch (error) {
            console.error('Error loading recommendations:', error);
            document.getElementById('recommendationsSection').style.display = 'none';
        }
    }

    createRecommendationCard(item) {
        const posterUrl = SuperflixAPI.getPosterUrl(item.poster_path);
        const title = item.title || item.name;
        const type = item.media_type || this.contentType;
        const year = SuperflixAPI.getYear(item.release_date || item.first_air_date);

        return `
            <div class="content-card" data-id="${item.id}" data-type="${type}">
                <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy">
                <div class="card-play">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </div>
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-meta">${year}</div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // PLAYBACK
    // ==========================================

    async playContent() {
        if (this.contentType === 'movie') {
            await this.playMovie();
        } else {
            // For series, play first episode or continue from last watched
            const progress = SuperflixStorage.getProgress(parseInt(this.contentId), 'tv');
            if (progress && progress.season && progress.episode) {
                this.playEpisode(progress.season, progress.episode);
            } else {
                this.playEpisode(1, 1);
            }
        }
    }

    async playMovie() {
        const playerContainer = document.getElementById('playerContainer');
        const playerModal = document.getElementById('playerModal');

        try {
            // Get IMDB ID for movies
            const imdbId = await SuperflixAPI.getImdbId(this.contentId, 'movie');
            if (!imdbId) {
                this.showToast('Erro: ID do filme não encontrado', 'error');
                return;
            }

            const playerUrl = SuperflixAPI.getMoviePlayerUrl(imdbId);
            playerContainer.innerHTML = `<iframe src="${playerUrl}" allowfullscreen></iframe>`;
            playerModal.classList.add('active');
            document.body.classList.add('no-scroll');

            // Add to history
            SuperflixStorage.addToHistory({
                id: parseInt(this.contentId),
                type: 'movie',
                title: this.content.title,
                poster_path: this.content.poster_path,
                backdrop_path: this.content.backdrop_path,
                vote_average: this.content.vote_average
            });

        } catch (error) {
            console.error('Error playing movie:', error);
            this.showToast('Erro ao reproduzir filme', 'error');
        }
    }

    playEpisode(season, episode) {
        const playerContainer = document.getElementById('playerContainer');
        const playerModal = document.getElementById('playerModal');

        const playerUrl = SuperflixAPI.getSeriesPlayerUrl(this.contentId, season, episode);
        playerContainer.innerHTML = `<iframe src="${playerUrl}" allowfullscreen></iframe>`;
        playerModal.classList.add('active');
        document.body.classList.add('no-scroll');

        // Add to history
        SuperflixStorage.addToHistory({
            id: parseInt(this.contentId),
            type: 'tv',
            title: this.content.name,
            poster_path: this.content.poster_path,
            backdrop_path: this.content.backdrop_path,
            vote_average: this.content.vote_average
        });

        // Save progress
        SuperflixStorage.saveProgress({
            id: parseInt(this.contentId),
            type: 'tv',
            title: this.content.name,
            poster_path: this.content.poster_path,
            backdrop_path: this.content.backdrop_path
        }, {
            season: season,
            episode: episode,
            percent: 0
        });
    }

    closePlayer() {
        const playerModal = document.getElementById('playerModal');
        const playerContainer = document.getElementById('playerContainer');

        playerModal.classList.remove('active');
        document.body.classList.remove('no-scroll');

        // Clear iframe to stop playback
        setTimeout(() => {
            playerContainer.innerHTML = '';
        }, 300);
    }

    // ==========================================
    // TRAILER
    // ==========================================

    playTrailer() {
        if (!this.trailerKey) {
            this.showToast('Trailer não disponível', 'error');
            return;
        }

        const trailerModal = document.getElementById('trailerModal');
        const trailerContainer = document.getElementById('trailerContainer');

        trailerContainer.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${this.trailerKey}?autoplay=1&rel=0"
                allowfullscreen
                allow="autoplay; encrypted-media">
            </iframe>
        `;

        trailerModal.classList.add('active');
        document.body.classList.add('no-scroll');
    }

    closeTrailer() {
        const trailerModal = document.getElementById('trailerModal');
        const trailerContainer = document.getElementById('trailerContainer');

        trailerModal.classList.remove('active');
        document.body.classList.remove('no-scroll');

        // Clear iframe to stop video
        setTimeout(() => {
            trailerContainer.innerHTML = '';
        }, 300);
    }

    // ==========================================
    // FAVORITES
    // ==========================================

    toggleFavorite() {
        const item = {
            id: parseInt(this.contentId),
            type: this.contentType,
            title: this.contentType === 'movie' ? this.content.title : this.content.name,
            poster_path: this.content.poster_path,
            backdrop_path: this.content.backdrop_path,
            vote_average: this.content.vote_average
        };

        const added = SuperflixStorage.toggleFavorite(item);
        this.updateFavoriteButton();

        if (added) {
            this.showToast('Adicionado aos favoritos', 'success');
        } else {
            this.showToast('Removido dos favoritos', 'success');
        }
    }

    updateFavoriteButton() {
        const btn = document.getElementById('btnFavorite');
        const text = document.getElementById('favoriteText');
        const isFav = SuperflixStorage.isFavorite(parseInt(this.contentId), this.contentType);

        if (isFav) {
            btn.classList.add('favorited');
            text.textContent = 'Favoritado';
        } else {
            btn.classList.remove('favorited');
            text.textContent = 'Favoritar';
        }
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('active');
    }

    showError(message) {
        this.hideLoading();
        document.querySelector('.watch-content').innerHTML = `
            <div style="text-align: center; padding: 100px 20px;">
                <h2 style="color: var(--text-primary); margin-bottom: 16px;">${message}</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">
                    O conteúdo que você está procurando não foi encontrado.
                </p>
                <a href="/" class="btn btn-primary">Voltar ao Início</a>
            </div>
        `;
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success'
                    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                    : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
                }
            </svg>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.watchPage = new WatchPage();
});
