/**
 * Superflix Calendar Page
 * Displays release calendar for series and anime
 */

class CalendarApp {
    constructor() {
        this.calendarData = [];
        this.filteredData = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadCalendar();
    }

    bindEvents() {
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Player modal close
        const playerClose = document.getElementById('playerClose');
        const playerModal = document.getElementById('playerModal');

        if (playerClose) {
            playerClose.addEventListener('click', () => this.closePlayer());
        }

        if (playerModal) {
            playerModal.addEventListener('click', (e) => {
                if (e.target === playerModal) this.closePlayer();
            });
        }

        // ESC key to close player
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePlayer();
        });

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (header) {
                header.classList.toggle('scrolled', window.scrollY > 50);
            }
        });
    }

    async loadCalendar() {
        const loading = document.getElementById('calendarLoading');
        const grid = document.getElementById('calendarGrid');
        const empty = document.getElementById('calendarEmpty');

        try {
            const response = await fetch('https://superflixapi.run/calendario.php');
            if (!response.ok) throw new Error('Failed to fetch calendar');

            this.calendarData = await response.json();
            this.filteredData = [...this.calendarData];

            loading.style.display = 'none';

            if (this.calendarData.length === 0) {
                empty.style.display = 'flex';
            } else {
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Error loading calendar:', error);
            loading.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>Erro ao carregar calendário. Tente novamente mais tarde.</p>
            `;
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        // Filter data
        if (filter === 'all') {
            this.filteredData = [...this.calendarData];
        } else {
            this.filteredData = this.calendarData.filter(item => item.status === filter);
        }

        this.renderCalendar();
    }

    renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const empty = document.getElementById('calendarEmpty');

        if (this.filteredData.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';

        // Group by date for better organization
        const grouped = this.groupByDate(this.filteredData);

        let html = '';

        for (const [date, items] of Object.entries(grouped)) {
            items.forEach(item => {
                html += this.createCardHTML(item);
            });
        }

        grid.innerHTML = html;

        // Bind play buttons
        grid.querySelectorAll('.card-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tmdbId = btn.dataset.tmdbId;
                const season = btn.dataset.season;
                const episode = btn.dataset.episode;
                this.playEpisode(tmdbId, season, episode);
            });
        });

        // Bind card clicks
        grid.querySelectorAll('.calendar-card').forEach(card => {
            card.addEventListener('click', () => {
                const btn = card.querySelector('.card-play-btn');
                if (btn) btn.click();
            });
        });
    }

    groupByDate(data) {
        const grouped = {};
        data.forEach(item => {
            const date = item.air_date || 'unknown';
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(item);
        });

        // Sort by date
        const sorted = {};
        Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).forEach(key => {
            sorted[key] = grouped[key];
        });

        return sorted;
    }

    createCardHTML(item) {
        const posterUrl = item.poster
            ? `https://image.tmdb.org/t/p/w200${item.poster}`
            : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect fill="%23333" width="200" height="300"/></svg>';

        const backdropUrl = item.backdrop
            ? `https://image.tmdb.org/t/p/w780${item.backdrop}`
            : '';

        const formattedDate = this.formatDate(item.air_date);
        const episodeTitle = item.episode || `Episódio ${item.number}`;

        return `
            <div class="calendar-card">
                <div class="card-backdrop" style="background-image: url('${backdropUrl}')">
                    <div class="card-poster-wrapper">
                        <img src="${posterUrl}" alt="${item.title}" loading="lazy">
                    </div>
                    <span class="card-status ${item.status}">${item.status}</span>
                </div>
                <div class="card-content">
                    <h3 class="card-series-title">${item.title}</h3>
                    <div class="card-episode-info">
                        <span class="card-episode-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                                <polyline points="17 2 12 7 7 2"></polyline>
                            </svg>
                            T${item.season}
                        </span>
                        <span class="card-episode-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            E${item.number}
                        </span>
                    </div>
                    <p class="card-episode-title">${episodeTitle}</p>
                    <div class="card-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${formattedDate}
                    </div>
                    <button class="card-play-btn"
                            data-tmdb-id="${item.tmdb_id}"
                            data-season="${item.season}"
                            data-episode="${item.number}">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Assistir Agora
                    </button>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        if (!dateString) return 'Data não disponível';

        const date = new Date(dateString + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.getTime() === today.getTime()) {
            return 'Hoje';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Amanhã';
        } else if (date.getTime() === yesterday.getTime()) {
            return 'Ontem';
        }

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    playEpisode(tmdbId, season, episode) {
        const playerUrl = `https://superflixapi.run/serie/${tmdbId}/${season}/${episode}`;
        const modal = document.getElementById('playerModal');
        const container = document.getElementById('playerContainer');

        container.innerHTML = `
            <iframe
                src="${playerUrl}"
                frameborder="0"
                allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
        `;

        modal.classList.add('active');
        document.body.classList.add('no-scroll');
    }

    closePlayer() {
        const modal = document.getElementById('playerModal');
        const container = document.getElementById('playerContainer');

        modal.classList.remove('active');
        document.body.classList.remove('no-scroll');
        container.innerHTML = '';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CalendarApp();
});
