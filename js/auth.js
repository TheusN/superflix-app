/**
 * Modulo de autenticacao do Superflix
 */

// Classe de autenticacao
class Auth {
  constructor() {
    this.tokenKey = 'superflix_token';
    this.userKey = 'superflix_user';
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getUser() {
    try {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      // Clear corrupted data
      localStorage.removeItem(this.userKey);
      return null;
    }
  }

  saveCredentials(token, user) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  clearCredentials() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao fazer login');
    }

    this.saveCredentials(data.token, data.user);
    await this.syncLocalHistory();
    return data;
  }

  async register(email, password) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao cadastrar');
    }

    this.saveCredentials(data.token, data.user);
    await this.syncLocalHistory();
    return data;
  }

  logout() {
    this.clearCredentials();
    window.location.reload();
  }

  async syncLocalHistory() {
    if (!this.isLoggedIn()) return;

    try {
      let localHistory = [];
      let localContinue = [];

      try {
        localHistory = JSON.parse(localStorage.getItem('superflix_history') || '[]');
      } catch (e) {
        console.error('Error parsing history:', e);
        localStorage.removeItem('superflix_history');
      }

      try {
        localContinue = JSON.parse(localStorage.getItem('superflix_continue') || '[]');
      } catch (e) {
        console.error('Error parsing continue watching:', e);
        localStorage.removeItem('superflix_continue');
      }

      const items = [...localHistory, ...localContinue].map(item => ({
        tmdb_id: item.id || item.tmdbId,
        imdb_id: item.imdbId,
        title: item.title || item.name,
        poster_path: item.poster_path || item.posterPath,
        media_type: item.media_type || item.mediaType || 'movie',
        season: item.season,
        episode: item.episode,
        progress: item.progress || 0,
        watched_at: item.watchedAt || item.timestamp || new Date().toISOString()
      }));

      if (items.length === 0) return;

      const response = await fetch('/api/history/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({ items })
      });

      if (response.ok) {
        console.log('Historico sincronizado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao sincronizar historico:', error);
    }
  }

  async getServerHistory() {
    if (!this.isLoggedIn()) return [];

    try {
      const response = await fetch('/api/history', {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
      return [];
    }
  }

  async saveToHistory(item) {
    if (!this.isLoggedIn()) return;

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({
          tmdb_id: item.id || item.tmdbId,
          imdb_id: item.imdbId,
          title: item.title || item.name,
          poster_path: item.poster_path || item.posterPath,
          media_type: item.media_type || item.mediaType || 'movie',
          season: item.season,
          episode: item.episode,
          progress: item.progress || 0
        })
      });
    } catch (error) {
      console.error('Erro ao salvar no historico:', error);
    }
  }
}

// Instancia global
const auth = new Auth();

// ===== FUNCOES DE LOGIN =====

function showLoginModal() {
  // Redirecionar para pagina de login dedicada
  window.location.href = '/login.html';
}

function goToRegister() {
  window.location.href = '/login.html?tab=register';
}

// ===== MENU DO USUARIO =====

function showUserMenu() {
  const existing = document.getElementById('user-menu');
  if (existing) {
    existing.remove();
    return;
  }

  const user = auth.getUser();
  const menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.className = 'user-menu';
  menu.innerHTML = `
    <div class="user-menu-header">
      <strong>${user?.email || 'Usuario'}</strong>
    </div>
    <a href="/profile/" class="user-menu-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      Minha Conta
    </a>
    <button class="user-menu-item" id="menu-clear-cache">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      Limpar Cache
    </button>
    <button class="user-menu-item logout-btn" id="menu-logout">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      Sair
    </button>
  `;

  const authBtn = document.getElementById('auth-btn');
  authBtn.parentElement.appendChild(menu);

  // Adicionar event listeners
  document.getElementById('menu-clear-cache').addEventListener('click', clearAllCache);
  document.getElementById('menu-logout').addEventListener('click', function() {
    auth.logout();
  });

  // Fechar ao clicar fora
  setTimeout(() => {
    function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== authBtn && !authBtn.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    }
    document.addEventListener('click', closeMenu);
  }, 10);
}

// ===== MENU DE CONFIGURACOES =====

function toggleSettingsMenu() {
  const existing = document.getElementById('settings-menu');
  if (existing) {
    existing.remove();
    return;
  }

  const menu = document.createElement('div');
  menu.id = 'settings-menu';
  menu.className = 'user-menu';
  menu.innerHTML = `
    <div class="user-menu-header">
      <strong>Configuracoes</strong>
    </div>
    <button class="user-menu-item" id="settings-clear-cache">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      Limpar Cache
    </button>
  `;

  const container = document.querySelector('.settings-container');
  container.appendChild(menu);

  // Adicionar event listener
  document.getElementById('settings-clear-cache').addEventListener('click', clearAllCache);

  // Fechar ao clicar fora
  setTimeout(() => {
    function closeMenu(e) {
      const settingsBtn = document.getElementById('settings-btn');
      if (!menu.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    }
    document.addEventListener('click', closeMenu);
  }, 10);
}

// ===== LIMPAR CACHE =====

async function clearAllCache() {
  const userMenu = document.getElementById('user-menu');
  const settingsMenu = document.getElementById('settings-menu');
  if (userMenu) userMenu.remove();
  if (settingsMenu) settingsMenu.remove();

  if (confirm('Isso vai limpar todo o cache e recarregar a pagina. Deseja continuar?')) {
    try {
      // Limpar cache em memoria da API
      if (typeof SuperflixAPI !== 'undefined' && SuperflixAPI.cache) {
        SuperflixAPI.cache.clear();
      }

      // Limpar localStorage (exceto credenciais)
      const token = localStorage.getItem('superflix_token');
      const user = localStorage.getItem('superflix_user');
      localStorage.clear();
      if (token) localStorage.setItem('superflix_token', token);
      if (user) localStorage.setItem('superflix_user', user);

      // Limpar sessionStorage
      sessionStorage.clear();

      // Limpar Service Worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Desregistrar Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      alert('Cache limpo com sucesso! A pagina sera recarregada.');
      window.location.reload(true);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      alert('Erro ao limpar cache. Tente novamente.');
    }
  }
}

// ===== ATUALIZAR UI DE AUTENTICACAO =====

function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  if (!authBtn) return;

  // Remover listeners antigos clonando o botao
  const newAuthBtn = authBtn.cloneNode(true);
  authBtn.parentNode.replaceChild(newAuthBtn, authBtn);

  if (auth.isLoggedIn()) {
    const user = auth.getUser();
    const userName = user?.name || user?.email?.split('@')[0] || 'Perfil';
    newAuthBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      <span class="user-greeting">Ola, ${userName}</span>
    `;
    newAuthBtn.addEventListener('click', showUserMenu);
  } else {
    newAuthBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
      <span>Entrar</span>
    `;
    newAuthBtn.addEventListener('click', showLoginModal);
  }
}

// ===== INICIALIZACAO =====

function initAuth() {
  console.log('Inicializando sistema de autenticacao...');

  // Configurar botao de auth
  updateAuthUI();

  // Configurar botao de configuracoes
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    // Remover onclick inline
    settingsBtn.removeAttribute('onclick');
    settingsBtn.addEventListener('click', toggleSettingsMenu);
  }

  console.log('Sistema de autenticacao inicializado');
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

// Expor para uso global (compatibilidade)
window.auth = auth;
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.toggleSettingsMenu = toggleSettingsMenu;
window.clearAllCache = clearAllCache;
