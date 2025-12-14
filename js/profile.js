/**
 * Profile Page Controller
 * Manages user profile, favorites, history, and settings
 */

class ProfilePage {
    constructor() {
        this.currentSection = 'favorites';
        this.confirmCallback = null;

        this.init();
    }

    init() {
        // Initialize storage (theme)
        SuperflixStorage.init();

        // Bind events
        this.bindEvents();

        // Load user info
        this.loadUserInfo();

        // Load initial section
        this.loadSection('favorites');

        // Update theme buttons
        this.updateThemeButtons();

        // Update storage info
        this.updateStorageInfo();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.profile-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });

        // Theme toggle in header
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            SuperflixStorage.toggleTheme();
            this.updateThemeButtons();
        });

        // Theme options in settings
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                SuperflixStorage.setTheme(theme);
                this.updateThemeButtons();
            });
        });

        // Clear history
        document.getElementById('clearHistory')?.addEventListener('click', () => {
            this.showConfirm(
                'Limpar Histórico',
                'Tem certeza que deseja limpar todo o histórico de visualização?',
                () => {
                    SuperflixStorage.clearHistory();
                    this.loadSection('history');
                    this.updateStorageInfo();
                    this.showToast('Histórico limpo com sucesso', 'success');
                }
            );
        });

        // Export data
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportData();
        });

        // Import data
        document.getElementById('importData')?.addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // Clear cache
        document.getElementById('clearCache')?.addEventListener('click', () => {
            this.clearCache();
        });

        // Clear all data
        document.getElementById('clearAllData')?.addEventListener('click', () => {
            this.showConfirm(
                'Limpar Todos os Dados',
                'Esta ação removerá permanentemente todos os seus favoritos, histórico e configurações. Deseja continuar?',
                () => {
                    SuperflixStorage.clearAll();
                    this.loadSection(this.currentSection);
                    this.updateStorageInfo();
                    this.showToast('Todos os dados foram removidos', 'success');
                }
            );
        });

        // Login button
        document.getElementById('loginPromptBtn')?.addEventListener('click', () => {
            if (typeof auth !== 'undefined') {
                auth.showLoginModal();
            }
        });

        // Register button
        document.getElementById('registerPromptBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.showLoginModal();
                // Switch to register tab if available
                setTimeout(() => {
                    const registerTab = document.querySelector('[data-tab="register"]');
                    if (registerTab) registerTab.click();
                }, 100);
            }
        });

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.showConfirm(
                'Sair da Conta',
                'Tem certeza que deseja sair da sua conta?',
                () => {
                    if (typeof auth !== 'undefined') {
                        auth.logout();
                        this.loadUserInfo();
                        this.showToast('Você saiu da sua conta', 'success');
                    }
                }
            );
        });

        // Save name
        document.getElementById('saveNameBtn')?.addEventListener('click', () => {
            const newName = document.getElementById('updateName').value.trim();
            if (newName) {
                // Update user data in localStorage
                if (typeof auth !== 'undefined') {
                    const user = auth.getUser();
                    if (user) {
                        user.name = newName;
                        localStorage.setItem('superflix_user', JSON.stringify(user));

                        // Update UI
                        document.getElementById('accountName').textContent = newName;
                        document.getElementById('profileName').textContent = newName;

                        // Update auth button if visible
                        const authBtnSpan = document.querySelector('#auth-btn span');
                        if (authBtnSpan && authBtnSpan.textContent.startsWith('Olá,')) {
                            authBtnSpan.textContent = `Olá, ${newName}`;
                        }

                        this.showToast('Nome atualizado com sucesso', 'success');
                    }
                } else {
                    this.showToast('Erro: sistema de autenticação não disponível', 'error');
                }
            } else {
                this.showToast('Por favor, digite um nome', 'error');
            }
        });

        // Sync data
        document.getElementById('syncDataBtn')?.addEventListener('click', () => {
            this.syncData();
        });

        // Confirm modal
        document.getElementById('confirmCancel')?.addEventListener('click', () => {
            this.hideConfirm();
        });

        document.getElementById('confirmOk')?.addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.hideConfirm();
        });

        document.getElementById('confirmModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                this.hideConfirm();
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

    switchSection(section) {
        this.currentSection = section;

        // Update nav
        document.querySelectorAll('.profile-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        // Update sections
        document.querySelectorAll('.profile-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`section-${section}`)?.classList.add('active');

        // Load section content
        this.loadSection(section);
    }

    loadSection(section) {
        switch (section) {
            case 'favorites':
                this.loadFavorites();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'continue':
                this.loadContinueWatching();
                break;
            case 'settings':
                this.updateStorageInfo();
                break;
            case 'account':
                this.loadUserInfo();
                break;
        }
    }

    loadUserInfo() {
        const isLoggedIn = typeof auth !== 'undefined' && auth.isLoggedIn();
        const user = isLoggedIn ? auth.getUser() : null;

        // Update sidebar
        if (user) {
            document.getElementById('profileName').textContent = user.name || 'Usuário';
            document.getElementById('profileEmail').textContent = user.email;
        } else {
            document.getElementById('profileName').textContent = 'Visitante';
            document.getElementById('profileEmail').textContent = 'Não conectado';
        }

        // Update account section
        const loggedOut = document.getElementById('accountLoggedOut');
        const loggedIn = document.getElementById('accountLoggedIn');

        if (isLoggedIn && user) {
            loggedOut.style.display = 'none';
            loggedIn.style.display = 'block';
            document.getElementById('accountName').textContent = user.name || 'Usuário';
            document.getElementById('accountEmail').textContent = user.email;
            document.getElementById('updateName').value = user.name || '';

            // Member since
            const createdAt = user.created_at ? new Date(user.created_at) : new Date();
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            document.getElementById('accountSince').textContent =
                `${months[createdAt.getMonth()]} ${createdAt.getFullYear()}`;
        } else {
            loggedOut.style.display = 'block';
            loggedIn.style.display = 'none';
        }
    }

    loadFavorites() {
        const favorites = SuperflixStorage.getFavorites();
        const grid = document.getElementById('favoritesGrid');
        const empty = document.getElementById('favoritesEmpty');
        const count = document.getElementById('favoritesCount');

        count.textContent = `${favorites.length} título${favorites.length !== 1 ? 's' : ''}`;

        if (favorites.length === 0) {
            grid.innerHTML = '';
            grid.appendChild(empty);
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = favorites.map(item => this.createContentCard(item, 'favorite')).join('');

        // Bind events
        this.bindCardEvents(grid, 'favorite');
    }

    loadHistory() {
        const history = SuperflixStorage.getHistory();
        const grid = document.getElementById('historyGrid');
        const empty = document.getElementById('historyEmpty');
        const count = document.getElementById('historyCount');

        count.textContent = `${history.length} título${history.length !== 1 ? 's' : ''}`;

        if (history.length === 0) {
            grid.innerHTML = '';
            grid.appendChild(empty);
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = history.map(item => this.createContentCard(item, 'history')).join('');

        // Bind events
        this.bindCardEvents(grid, 'history');
    }

    loadContinueWatching() {
        const continueList = SuperflixStorage.getContinueWatching();
        const grid = document.getElementById('continueGrid');
        const empty = document.getElementById('continueEmpty');
        const count = document.getElementById('continueCount');

        count.textContent = `${continueList.length} título${continueList.length !== 1 ? 's' : ''}`;

        if (continueList.length === 0) {
            grid.innerHTML = '';
            grid.appendChild(empty);
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = continueList.map(item => this.createContinueCard(item)).join('');

        // Bind events
        grid.querySelectorAll('.continue-card').forEach(card => {
            const id = parseInt(card.dataset.id);
            const type = card.dataset.type;

            card.querySelector('.btn-play')?.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `/watch/?type=${type}&id=${id}`;
            });

            card.querySelector('.btn-remove')?.addEventListener('click', (e) => {
                e.stopPropagation();
                SuperflixStorage.removeFromContinue(id, type);
                this.loadContinueWatching();
                this.updateStorageInfo();
                this.showToast('Removido da lista', 'success');
            });

            card.addEventListener('click', () => {
                window.location.href = `/watch/?type=${type}&id=${id}`;
            });
        });
    }

    createContentCard(item, source) {
        const posterUrl = SuperflixAPI.getPosterUrl(item.poster_path);
        const title = item.title || item.name;
        const type = item.type === 'movie' ? 'movie' : 'tv';
        const typeLabel = item.type === 'movie' ? 'Filme' : 'Série';

        return `
            <div class="content-card" data-id="${item.id}" data-type="${type}" data-source="${source}">
                <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy">
                <div class="card-overlay">
                    <div class="card-title">${title}</div>
                    <div class="card-meta">${typeLabel}</div>
                </div>
                <button class="card-remove" title="Remover">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
    }

    createContinueCard(item) {
        const posterUrl = SuperflixAPI.getPosterUrl(item.poster_path);
        const title = item.title || item.name;
        const type = item.type === 'movie' ? 'movie' : 'tv';
        const progress = item.progress || 0;
        const episodeInfo = item.season && item.episode
            ? `Temporada ${item.season}, Episódio ${item.episode}`
            : (item.type === 'movie' ? 'Filme' : 'Série');

        return `
            <div class="continue-card" data-id="${item.id}" data-type="${type}">
                <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy">
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-episode">${episodeInfo}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-play" title="Continuar assistindo">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </button>
                    <button class="btn-remove" title="Remover da lista">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    bindCardEvents(container, source) {
        container.querySelectorAll('.content-card').forEach(card => {
            const id = parseInt(card.dataset.id);
            const type = card.dataset.type;

            // Navigate to watch page
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-remove')) return;
                window.location.href = `/watch/?type=${type}&id=${id}`;
            });

            // Remove button
            card.querySelector('.card-remove')?.addEventListener('click', (e) => {
                e.stopPropagation();

                if (source === 'favorite') {
                    SuperflixStorage.toggleFavorite({ id, type });
                    this.loadFavorites();
                } else if (source === 'history') {
                    SuperflixStorage.removeFromHistory(id, type);
                    this.loadHistory();
                }

                this.updateStorageInfo();
                this.showToast('Removido com sucesso', 'success');
            });
        });
    }

    updateThemeButtons() {
        const currentTheme = SuperflixStorage.getTheme();
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === currentTheme);
        });
    }

    updateStorageInfo() {
        const info = SuperflixStorage.getStorageInfo();
        document.getElementById('storageFavorites').textContent = info.favoritesCount;
        document.getElementById('storageHistory').textContent = info.historyCount;
        document.getElementById('storageContinue').textContent = info.continueCount;
    }

    exportData() {
        const data = SuperflixStorage.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `superflix-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Dados exportados com sucesso', 'success');
    }

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                SuperflixStorage.importData(data);
                this.loadSection(this.currentSection);
                this.updateStorageInfo();
                this.updateThemeButtons();
                this.showToast('Dados importados com sucesso', 'success');
            } catch (error) {
                this.showToast('Erro ao importar dados', 'error');
            }
        };
        reader.readAsText(file);
    }

    clearCache() {
        // Clear API cache
        if (typeof SuperflixAPI !== 'undefined') {
            SuperflixAPI.cache.clear();
        }

        // Clear service worker cache
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }

        this.showToast('Cache limpo com sucesso', 'success');
    }

    syncData() {
        if (typeof auth === 'undefined' || !auth.isLoggedIn()) {
            this.showToast('Você precisa estar logado para sincronizar', 'error');
            return;
        }

        // Sync logic would go here
        this.showToast('Dados sincronizados com sucesso', 'success');
    }

    showConfirm(title, message, callback) {
        this.confirmCallback = callback;
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('active');
    }

    hideConfirm() {
        document.getElementById('confirmModal').classList.remove('active');
        this.confirmCallback = null;
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
    window.profilePage = new ProfilePage();
});
