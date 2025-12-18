/**
 * TV ao Vivo - Superflix
 * Sistema de TV ao vivo com suporte a M3U
 */

class SuperflixTV {
    constructor() {
        this.defaultM3uUrl = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
        this.m3uUrl = this.defaultM3uUrl;
        this.channels = [];
        this.filteredChannels = [];
        this.currentChannel = null;
        this.player = null;
        this.hls = null;
        this.countries = [];
        this.categories = [];
        this.apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3001'
            : '';

        this.elements = {
            channelsList: document.getElementById('channelsList'),
            categoryFilter: document.getElementById('categoryFilter'),
            countryFilter: document.getElementById('countryFilter'),
            channelCount: document.getElementById('channelCount'),
            channelSearch: document.getElementById('channelSearch'),
            channelSearchClear: document.getElementById('channelSearchClear'),
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
        await this.fetchM3uUrl();
        await this.loadChannels();
    }

    async fetchM3uUrl() {
        try {
            const response = await fetch(`${this.apiUrl}/api/settings/m3u`);
            if (response.ok) {
                const data = await response.json();
                if (data.m3u_url) {
                    this.m3uUrl = data.m3u_url;
                    console.log('M3U URL carregada do servidor:', this.m3uUrl);
                }
            }
        } catch (error) {
            console.warn('Usando URL M3U padrão:', error.message);
            this.m3uUrl = this.defaultM3uUrl;
        }
    }

    setupEventListeners() {
        // Category filter
        this.elements.categoryFilter?.addEventListener('change', () => {
            this.filterChannels();
        });

        // Country filter
        this.elements.countryFilter?.addEventListener('change', () => {
            this.filterChannels();
        });

        // Channel search (in TV page)
        this.elements.channelSearch?.addEventListener('input', (e) => {
            const value = e.target.value;
            this.filterChannels();

            // Show/hide clear button
            if (this.elements.channelSearchClear) {
                this.elements.channelSearchClear.style.display = value ? 'flex' : 'none';
            }
        });

        this.elements.channelSearchClear?.addEventListener('click', () => {
            this.elements.channelSearch.value = '';
            this.elements.channelSearchClear.style.display = 'none';
            this.filterChannels();
            this.elements.channelSearch.focus();
        });

        // Header search (global)
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

            this.populateFilters();
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
                const tvgCountryMatch = line.match(/tvg-country="([^"]*)"/);
                const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);

                // Channel name is after the last comma
                let nameMatch = line.split(',').pop().trim();

                // Limpar tags [COLOR ...] do nome
                nameMatch = nameMatch.replace(/\[COLOR[^\]]*\]/gi, '').replace(/\[\/COLOR\]/gi, '').trim();

                // Ignorar linhas que são apenas cabeçalhos/separadores
                if (this.isHeaderLine(nameMatch)) {
                    currentChannel = null;
                    continue;
                }

                // Ignorar canais marcados como OFF
                if (nameMatch.toLowerCase().includes('(off)')) {
                    currentChannel = null;
                    continue;
                }

                // Limpar (ON) do nome se existir
                nameMatch = nameMatch.replace(/\s*\(ON\)\s*/gi, '').trim();

                const channelName = tvgNameMatch ? tvgNameMatch[1] : (nameMatch || 'Canal sem nome');

                // Extrair grupo/categoria do M3U
                let groupTitle = groupTitleMatch ? groupTitleMatch[1].trim() : '';

                // Normalizar categoria baseado no group-title ou nome do canal
                let category = this.detectCategory(groupTitle, channelName);

                // Para este M3U brasileiro, group-title é categoria, não país
                // Detectar país baseado no nome do canal ou usar Brasil como padrão
                let country = this.detectCountry(channelName, tvgCountryMatch ? tvgCountryMatch[1] : '');

                currentChannel = {
                    id: tvgIdMatch ? tvgIdMatch[1] : `channel_${channels.length}`,
                    name: channelName,
                    logo: tvgLogoMatch ? tvgLogoMatch[1] : '',
                    country: country,
                    category: category,
                    url: ''
                };
            } else if (line && !line.startsWith('#') && currentChannel) {
                // This is the stream URL - validar URL
                const url = line.trim();

                // Ignorar URLs inválidas
                if (this.isValidStreamUrl(url)) {
                    currentChannel.url = url;
                    channels.push(currentChannel);
                }
                currentChannel = null;
            }
        }

        return channels;
    }

    isHeaderLine(name) {
        // Detectar linhas que são apenas cabeçalhos/separadores
        const headerPatterns = [
            /^\(.*\)$/,  // (CANAIS DE FILMES)
            /^CANAIS\s+(DE\s+)?/i,  // CANAIS DE FILMES
            /^TV\s+ABERTA$/i,
            /^NOTICIAS$/i,
            /^ESPORTES$/i,
            /^FILMES$/i,
            /^SERIES$/i,
            /^INFANTIL$/i,
            /^ADULTO$/i,
            /^RADIOS?\s*(AM|FM)?/i,
            /^WEB\s*TV$/i,
            /^TOP\s+MUSICAS$/i,
            /^\s*$/  // Linha vazia
        ];

        for (const pattern of headerPatterns) {
            if (pattern.test(name)) {
                return true;
            }
        }

        return false;
    }

    isValidStreamUrl(url) {
        // Verificar se é uma URL válida de stream
        if (!url || url.length < 10) return false;

        // Deve começar com http:// ou https://
        if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

        // Verificar se tem um host válido (não apenas http://)
        try {
            const urlObj = new URL(url);
            if (!urlObj.hostname || urlObj.hostname.length < 3) return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    detectCategory(groupTitle, channelName) {
        const group = (groupTitle || '').toLowerCase();
        const name = (channelName || '').toLowerCase();

        // Mapeamento de categorias baseado no group-title
        const categoryMap = {
            'tv aberta': 'TV Aberta',
            'canal aberto': 'TV Aberta',
            'canais abertos': 'TV Aberta',
            'abertos': 'TV Aberta',
            'abertas': 'TV Aberta',
            'noticias': 'Notícias',
            'notícias': 'Notícias',
            'jornalismo': 'Notícias',
            'abertas-noticias': 'Notícias',
            'news': 'Notícias',
            'esportes': 'Esportes',
            'esporte': 'Esportes',
            'sports': 'Esportes',
            'sport': 'Esportes',
            'filmes': 'Filmes',
            'filme': 'Filmes',
            'movies': 'Filmes',
            'cinema': 'Filmes',
            'cine': 'Filmes',
            'series': 'Séries',
            'série': 'Séries',
            'infantil': 'Infantil',
            'kids': 'Infantil',
            'desenhos': 'Infantil',
            'documentarios': 'Documentários',
            'documentário': 'Documentários',
            'documentary': 'Documentários',
            'religioso': 'Religioso',
            'religiosos': 'Religioso',
            'gospel': 'Religioso',
            'musica': 'Música',
            'música': 'Música',
            'music': 'Música',
            'variedades': 'Variedades',
            'entretenimento': 'Entretenimento',
            'adulto': 'Adulto',
            'adult': 'Adulto',
            '+18': 'Adulto',
            'radio': 'Rádio',
            'rádio': 'Rádio',
            'web tv': 'Web TV',
            'webtv': 'Web TV'
        };

        // Primeiro tentar pelo group-title
        for (const [key, value] of Object.entries(categoryMap)) {
            if (group.includes(key)) {
                return value;
            }
        }

        // Se group-title vazio ou não reconhecido, tentar pelo nome do canal
        if (name.includes('news') || name.includes('noticias') || name.includes('cnn') || name.includes('jornal')) {
            return 'Notícias';
        } else if (name.includes('sport') || name.includes('espn') || name.includes('futebol') || name.includes('combate')) {
            return 'Esportes';
        } else if (name.includes('music') || name.includes('mtv') || name.includes('musica')) {
            return 'Música';
        } else if (name.includes('kids') || name.includes('cartoon') || name.includes('nick') || name.includes('disney') || name.includes('infantil')) {
            return 'Infantil';
        } else if (name.includes('movie') || name.includes('cine') || name.includes('film') || name.includes('hbo') || name.includes('telecine')) {
            return 'Filmes';
        } else if (name.includes('document') || name.includes('discovery') || name.includes('nat geo') || name.includes('history')) {
            return 'Documentários';
        } else if (name.includes('canção nova') || name.includes('aparecida') || name.includes('rede vida') || name.includes('gospel')) {
            return 'Religioso';
        } else if (name.includes('globo') || name.includes('sbt') || name.includes('record') || name.includes('band') || name.includes('redetv')) {
            return 'TV Aberta';
        }

        return 'Outros';
    }

    detectCountry(channelName, tvgCountry) {
        if (tvgCountry && tvgCountry.trim()) {
            return tvgCountry.trim();
        }

        const name = (channelName || '').toLowerCase();

        // Detectar estados/regiões brasileiras no nome
        const brazilianStates = ['sp', 'rj', 'mg', 'ba', 'rs', 'pr', 'sc', 'pe', 'ce', 'pa', 'ma', 'go', 'pb', 'am', 'es', 'rn', 'al', 'pi', 'mt', 'ms', 'se', 'ro', 'to', 'ac', 'ap', 'rr', 'df'];

        for (const state of brazilianStates) {
            if (name.includes(` ${state}`) || name.endsWith(` ${state}`) || name.includes(`${state} `)) {
                return 'Brasil';
            }
        }

        // Detectar por nomes de emissoras brasileiras conhecidas
        const brazilianChannels = ['globo', 'sbt', 'record', 'band', 'redetv', 'cultura', 'tv brasil', 'canção nova', 'aparecida', 'rede vida', 'jovem pan', 'cbn'];
        for (const channel of brazilianChannels) {
            if (name.includes(channel)) {
                return 'Brasil';
            }
        }

        // Detectar outros países
        if (name.includes('portugal') || name.includes('tvi') || name.includes('rtp') || name.includes('sic')) {
            return 'Portugal';
        } else if (name.includes('usa') || name.includes('american') || name.includes('cnn') || name.includes('fox news')) {
            return 'EUA';
        } else if (name.includes('france') || name.includes('tf1') || name.includes('france 2')) {
            return 'França';
        } else if (name.includes('espanha') || name.includes('spain') || name.includes('antena 3')) {
            return 'Espanha';
        }

        // Padrão para M3U brasileiro
        return 'Brasil';
    }

    populateFilters() {
        // Popular países
        const countries = [...new Set(this.channels.map(ch => ch.country))].sort();
        this.countries = countries;

        if (this.elements.countryFilter) {
            this.elements.countryFilter.innerHTML = '<option value="">Todos os Países</option>';
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                this.elements.countryFilter.appendChild(option);
            });
        }

        // Popular categorias
        const categories = [...new Set(this.channels.map(ch => ch.category))].sort();
        this.categories = categories;

        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.innerHTML = '<option value="">Todas as Categorias</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                this.elements.categoryFilter.appendChild(option);
            });
        }
    }

    filterChannels() {
        const selectedCategory = this.elements.categoryFilter?.value || '';
        const selectedCountry = this.elements.countryFilter?.value || '';

        // Get search term from channel search field (TV page specific)
        const channelSearchTerm = this.elements.channelSearch?.value.toLowerCase() || '';

        this.filteredChannels = this.channels.filter(channel => {
            const matchesCategory = !selectedCategory || channel.category === selectedCategory;
            const matchesCountry = !selectedCountry || channel.country === selectedCountry;
            const matchesSearch = !channelSearchTerm || channel.name.toLowerCase().includes(channelSearchTerm);
            return matchesCategory && matchesCountry && matchesSearch;
        });

        this.renderChannels();
    }

    searchChannels(term) {
        const searchTerm = term.toLowerCase();
        const selectedCategory = this.elements.categoryFilter?.value || '';
        const selectedCountry = this.elements.countryFilter?.value || '';

        this.filteredChannels = this.channels.filter(channel => {
            const matchesCategory = !selectedCategory || channel.category === selectedCategory;
            const matchesCountry = !selectedCountry || channel.country === selectedCountry;
            const matchesSearch = !searchTerm || channel.name.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesCountry && matchesSearch;
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
                <div class="tv-channel-logo-wrapper">
                    <img class="tv-channel-logo" src="${channel.logo || '../icons/icon-192.png'}"
                         alt="${channel.name}"
                         onerror="this.src='../icons/icon-192.png'">
                    ${isActive ? '<div class="tv-channel-status"></div>' : ''}
                </div>
                <div class="tv-channel-info">
                    <div class="tv-channel-name">${channel.name}</div>
                    <div class="tv-channel-meta">
                        <span class="tv-channel-country">${channel.country}</span>
                        <span class="tv-channel-category">${channel.category}</span>
                    </div>
                </div>
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
            this.elements.currentCategory.textContent = `${channel.country} • ${channel.category}`;

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

        // Clean and prepare URL
        let streamUrl = url.trim();

        // Add required parameters for Pluto TV streams
        if (streamUrl.includes('pluto.tv')) {
            // Replace placeholders and add required params
            streamUrl = streamUrl
                .replace('{PSID}', '')
                .replace('advertisingId=&', 'advertisingId=&')
                .replace('appVersion=unknown', 'appVersion=web');

            // Add essential parameters if missing
            if (!streamUrl.includes('deviceType')) {
                streamUrl += (streamUrl.includes('?') ? '&' : '?') + 'deviceType=web';
            }
            if (!streamUrl.includes('deviceMake')) {
                streamUrl += '&deviceMake=Chrome';
            }
        }

        // Log stream URL for debugging
        console.log('Carregando stream:', streamUrl);

        // Check if HLS is supported
        if (Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                xhrSetup: function(xhr, url) {
                    // Add headers to bypass some CORS issues
                    xhr.withCredentials = false;
                }
            });

            this.hls.loadSource(streamUrl);
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
