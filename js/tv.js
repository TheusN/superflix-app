/**
 * TV ao Vivo - Superflix
 * Sistema de TV ao vivo com suporte a M3U
 */

class SuperflixTV {
    constructor() {
        this.m3uUrl = 'https://tv.meuted.io/iptvlegal.m3u';
        this.channels = [];
        this.filteredChannels = [];
        this.currentChannel = null;
        this.player = null;
        this.hls = null;

        this.elements = {
            channelsList: document.getElementById('channelsList'),
            categoryFilter: document.getElementById('categoryFilter'),
            channelCount: document.getElementById('channelCount'),
            searchInput: document.getElementById('searchInput'),
            searchClear: document.getElementById('searchClear'),
            searchToggle: document.getElementById('searchToggle'),
            searchBox: document.getElementById('searchBox'),
            playerContainer: document.getElementById('playerContainer'),
            playerPlaceholder: document.getElementById('playerPlaceholder'),
            playerWrapper: document.getElementById('playerWrapper'),
            tvPlayer: document.getElementById('tvPlayer'),
            currentInfo: document.getElementById('currentInfo'),
            currentLogo: document.getElementById('currentLogo'),
            currentTitle: document.getElementById('currentTitle'),
            currentCategory: document.getElementById('currentCategory'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            themeToggle: document.getElementById('themeToggle')
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupTheme();
        this.setupAuth();
        await this.loadChannels();
    }

    setupEventListeners() {
        // Category filter
        this.elements.categoryFilter?.addEventListener('change', () => {
            this.filterChannels();
        });

        // Search
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.searchChannels(e.target.value);
        });

        this.elements.searchClear?.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.searchChannels('');
        });

        this.elements.searchToggle?.addEventListener('click', () => {
            this.elements.searchBox.classList.toggle('active');
            if (this.elements.searchBox.classList.contains('active')) {
                this.elements.searchInput.focus();
            }
        });

        // Fullscreen
        this.elements.fullscreenBtn?.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Theme toggle
        this.elements.themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    setupTheme() {
        const theme = localStorage.getItem('superflix_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('superflix_theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const sunIcon = this.elements.themeToggle?.querySelector('.icon-sun');
        const moonIcon = this.elements.themeToggle?.querySelector('.icon-moon');
        if (theme === 'dark') {
            sunIcon?.style.setProperty('display', 'none');
            moonIcon?.style.setProperty('display', 'block');
        } else {
            sunIcon?.style.setProperty('display', 'block');
            moonIcon?.style.setProperty('display', 'none');
        }
    }

    setupAuth() {
        if (typeof auth !== 'undefined') {
            const authBtn = document.getElementById('auth-btn');
            if (auth.isLoggedIn()) {
                const user = auth.getUser();
                if (authBtn && user) {
                    authBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>Olá, ${user.name || user.email.split('@')[0]}</span>
                    `;
                    authBtn.onclick = () => window.location.href = '/profile/';
                }
            } else {
                if (authBtn) {
                    authBtn.onclick = () => window.location.href = '/login.html';
                }
            }
        }
    }

    async loadChannels() {
        try {
            this.showLoading();

            const response = await fetch(this.m3uUrl);
            if (!response.ok) throw new Error('Erro ao carregar lista de canais');

            const m3uContent = await response.text();
            this.channels = this.parseM3U(m3uContent);

            if (this.channels.length === 0) {
                throw new Error('Nenhum canal encontrado na lista');
            }

            this.populateCategories();
            this.filteredChannels = [...this.channels];
            this.renderChannels();

        } catch (error) {
            console.error('Erro ao carregar canais:', error);
            this.showError('Erro ao carregar lista de canais. Tente novamente mais tarde.');
        }
    }

    parseM3U(content) {
        const lines = content.split('\n');
        const channels = [];
        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                // Parse channel info
                const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
                const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
                const groupTitleMatch = line.match(/group-title="([^"]*)"/);

                // Channel name is after the last comma
                const nameMatch = line.split(',').pop().trim();

                currentChannel = {
                    id: tvgIdMatch ? tvgIdMatch[1] : `channel_${channels.length}`,
                    name: nameMatch || 'Canal sem nome',
                    logo: tvgLogoMatch ? tvgLogoMatch[1] : '',
                    category: groupTitleMatch ? groupTitleMatch[1] : 'Outros',
                    url: ''
                };
            } else if (line && !line.startsWith('#') && currentChannel) {
                // This is the stream URL
                currentChannel.url = line;
                if (currentChannel.url) {
                    channels.push(currentChannel);
                }
                currentChannel = null;
            }
        }

        return channels;
    }

    populateCategories() {
        const categories = [...new Set(this.channels.map(ch => ch.category))].sort();

        this.elements.categoryFilter.innerHTML = '<option value="">Todas as Categorias</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            this.elements.categoryFilter.appendChild(option);
        });
    }

    filterChannels() {
        const selectedCategory = this.elements.categoryFilter.value;
        const searchTerm = this.elements.searchInput.value.toLowerCase();

        this.filteredChannels = this.channels.filter(channel => {
            const matchesCategory = !selectedCategory || channel.category === selectedCategory;
            const matchesSearch = !searchTerm || channel.name.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        this.renderChannels();
    }

    searchChannels(term) {
        const searchTerm = term.toLowerCase();
        const selectedCategory = this.elements.categoryFilter.value;

        this.filteredChannels = this.channels.filter(channel => {
            const matchesCategory = !selectedCategory || channel.category === selectedCategory;
            const matchesSearch = !searchTerm || channel.name.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        this.renderChannels();
    }

    renderChannels() {
        this.elements.channelCount.textContent = `${this.filteredChannels.length} ${this.filteredChannels.length === 1 ? 'canal' : 'canais'}`;

        if (this.filteredChannels.length === 0) {
            this.elements.channelsList.innerHTML = `
                <div class="tv-empty-state">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                        <polyline points="17 2 12 7 7 2"></polyline>
                    </svg>
                    <h3>Nenhum canal encontrado</h3>
                    <p>Tente ajustar os filtros ou busca</p>
                </div>
            `;
            return;
        }

        this.elements.channelsList.innerHTML = this.filteredChannels.map(channel =>
            this.createChannelCard(channel)
        ).join('');

        // Bind click events
        this.elements.channelsList.querySelectorAll('.tv-channel-card').forEach(card => {
            card.addEventListener('click', () => {
                const channelId = card.dataset.channelId;
                const channel = this.channels.find(ch => ch.id === channelId);
                if (channel) {
                    this.playChannel(channel);
                }
            });
        });
    }

    createChannelCard(channel) {
        const isActive = this.currentChannel && this.currentChannel.id === channel.id;
        return `
            <div class="tv-channel-card ${isActive ? 'active' : ''}" data-channel-id="${channel.id}">
                <img class="tv-channel-logo" src="${channel.logo || '../icons/icon-192.png'}"
                     alt="${channel.name}"
                     onerror="this.src='../icons/icon-192.png'">
                <div class="tv-channel-info">
                    <div class="tv-channel-name">${channel.name}</div>
                    <div class="tv-channel-category">${channel.category}</div>
                </div>
                ${isActive ? '<div class="tv-channel-status"></div>' : ''}
            </div>
        `;
    }

    async playChannel(channel) {
        try {
            this.currentChannel = channel;

            // Update UI
            this.elements.playerPlaceholder.style.display = 'none';
            this.elements.playerContainer.style.display = 'block';
            this.elements.currentInfo.style.display = 'flex';

            this.elements.currentLogo.src = channel.logo || '../icons/icon-192.png';
            this.elements.currentTitle.textContent = channel.name;
            this.elements.currentCategory.textContent = channel.category;

            // Update active state in channel list
            this.renderChannels();

            // Setup HLS player
            this.setupPlayer(channel.url);

            // Show toast
            this.showToast(`Reproduzindo: ${channel.name}`, 'success');

        } catch (error) {
            console.error('Erro ao reproduzir canal:', error);
            this.showToast('Erro ao reproduzir canal', 'error');
        }
    }

    setupPlayer(url) {
        const video = this.elements.tvPlayer;

        // Destroy previous player
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Check if HLS is supported
        if (Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(video);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(err => {
                    console.error('Erro ao reproduzir:', err);
                    this.showToast('Clique no player para iniciar a reprodução', 'info');
                });
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('HLS Fatal Error:', data);

                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            // Canal pode estar bloqueado, offline ou com restrição geográfica
                            if (data.details === 'manifestLoadError') {
                                this.showToast('Canal indisponível. Pode estar offline ou bloqueado.', 'error');
                                console.warn('Canal bloqueado ou offline:', this.currentChannel?.name || 'Desconhecido');
                            } else {
                                this.showToast('Erro de conexão. Verifique sua internet.', 'error');
                            }
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('Tentando recuperar erro de mídia...');
                            this.hls.recoverMediaError();
                            break;
                        default:
                            this.showToast('Canal não pode ser reproduzido', 'error');
                            break;
                    }
                } else {
                    // Erros não-fatais apenas logados
                    console.warn('HLS Warning:', data.details);
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = url;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(err => {
                    console.error('Erro ao reproduzir:', err);
                    this.showToast('Clique no player para iniciar a reprodução', 'info');
                });
            });
        } else {
            this.showToast('Seu navegador não suporta reprodução de vídeo', 'error');
        }
    }

    toggleFullscreen() {
        const wrapper = this.elements.playerWrapper;

        if (!document.fullscreenElement) {
            if (wrapper.requestFullscreen) {
                wrapper.requestFullscreen();
            } else if (wrapper.webkitRequestFullscreen) {
                wrapper.webkitRequestFullscreen();
            } else if (wrapper.msRequestFullscreen) {
                wrapper.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    showLoading() {
        this.elements.channelsList.innerHTML = `
            <div class="tv-loading">
                <div class="loading-spinner"></div>
                <p>Carregando canais...</p>
            </div>
        `;
    }

    showError(message) {
        this.elements.channelsList.innerHTML = `
            <div class="tv-empty-state">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Erro ao carregar</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tvApp = new SuperflixTV();
});
