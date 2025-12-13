/**
 * Modulo de autenticacao do Superflix
 */
class Auth {
  constructor() {
    this.tokenKey = 'superflix_token';
    this.userKey = 'superflix_user';
  }

  // Verificar se usuario esta logado
  isLoggedIn() {
    return !!this.getToken();
  }

  // Obter token
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  // Obter usuario
  getUser() {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  // Salvar credenciais
  saveCredentials(token, user) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Limpar credenciais
  clearCredentials() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Headers para requisicoes autenticadas
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Login
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

  // Cadastro
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

  // Logout
  logout() {
    this.clearCredentials();
    window.location.reload();
  }

  // Sincronizar historico local com o servidor
  async syncLocalHistory() {
    if (!this.isLoggedIn()) return;

    try {
      // Pegar historico do localStorage
      const localHistory = JSON.parse(localStorage.getItem('superflix_history') || '[]');
      const localContinue = JSON.parse(localStorage.getItem('superflix_continue') || '[]');

      // Converter para formato da API
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

      // Enviar para o servidor
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

  // Buscar historico do servidor
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

  // Salvar item no historico do servidor
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

// UI de Login
function showLoginModal() {
  // Remover modal existente
  const existing = document.getElementById('login-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'login-modal';
  modal.className = 'modal login-modal';
  modal.innerHTML = `
    <div class="modal-content login-modal-content">
      <button class="close-modal" onclick="closeLoginModal()">&times;</button>
      <h2 id="login-title">Entrar</h2>

      <form id="login-form" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input type="email" id="login-email" required placeholder="seu@email.com">
        </div>

        <div class="form-group">
          <label for="login-password">Senha</label>
          <input type="password" id="login-password" required minlength="6" placeholder="Minimo 6 caracteres">
        </div>

        <div id="login-error" class="error-message" style="display: none;"></div>

        <button type="submit" class="btn-primary" id="login-submit">Entrar</button>
      </form>

      <p class="toggle-form">
        <span id="toggle-text">Nao tem conta?</span>
        <a href="#" onclick="toggleLoginForm(event)"><span id="toggle-link">Cadastre-se</span></a>
      </p>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';
  document.getElementById('login-email').focus();
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.remove();
}

let isRegisterMode = false;

function toggleLoginForm(e) {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;

  document.getElementById('login-title').textContent = isRegisterMode ? 'Cadastrar' : 'Entrar';
  document.getElementById('login-submit').textContent = isRegisterMode ? 'Cadastrar' : 'Entrar';
  document.getElementById('toggle-text').textContent = isRegisterMode ? 'Ja tem conta?' : 'Nao tem conta?';
  document.getElementById('toggle-link').textContent = isRegisterMode ? 'Entrar' : 'Cadastre-se';
  document.getElementById('login-error').style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Aguarde...';
  errorEl.style.display = 'none';

  try {
    if (isRegisterMode) {
      await auth.register(email, password);
    } else {
      await auth.login(email, password);
    }
    closeLoginModal();
    updateAuthUI();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isRegisterMode ? 'Cadastrar' : 'Entrar';
  }
}

function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  if (!authBtn) return;

  if (auth.isLoggedIn()) {
    const user = auth.getUser();
    authBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      <span class="user-email">${user?.email?.split('@')[0] || 'Perfil'}</span>
    `;
    authBtn.onclick = showUserMenu;
  } else {
    authBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
      <span>Entrar</span>
    `;
    authBtn.onclick = showLoginModal;
  }
}

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
    <button onclick="clearAllCache()" class="user-menu-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      Limpar Cache
    </button>
    <button onclick="auth.logout()" class="user-menu-item logout-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      Sair
    </button>
  `;

  const authBtn = document.getElementById('auth-btn');
  authBtn.parentElement.appendChild(menu);

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== authBtn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
}

// Menu de configuracoes
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
    <button onclick="clearAllCache()" class="user-menu-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      Limpar Cache
    </button>
  `;

  const container = document.querySelector('.settings-container');
  container.appendChild(menu);

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      const settingsBtn = document.getElementById('settings-btn');
      if (!menu.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
}

// Limpar todo o cache do navegador
async function clearAllCache() {
  const userMenu = document.getElementById('user-menu');
  const settingsMenu = document.getElementById('settings-menu');
  if (userMenu) userMenu.remove();
  if (settingsMenu) settingsMenu.remove();

  if (confirm('Isso vai limpar todo o cache e recarregar a pagina. Deseja continuar?')) {
    try {
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

// Inicializar UI ao carregar
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
});
