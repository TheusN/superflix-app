/**
 * Superflix Admin Panel
 * Painel de administração completo
 */

class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.usersPage = 1;
        this.logsPage = 1;
        this.usersPerPage = 20;
        this.logsPerPage = 50;
        this.searchTimeout = null;
        this.confirmCallback = null;

        this.init();
    }

    async init() {
        // Verificar autenticação e permissão de admin
        const isAuthorized = await this.checkAdminAccess();

        if (!isAuthorized) {
            document.getElementById('adminLoading').style.display = 'none';
            document.getElementById('accessDenied').style.display = 'flex';
            return;
        }

        // Ocultar loading e mostrar painel
        document.getElementById('adminLoading').style.display = 'none';
        document.querySelector('.admin-header').style.display = 'block';
        document.querySelector('.admin-main').style.display = 'block';

        // Configurar eventos
        this.setupEventListeners();

        // Carregar dados iniciais
        await this.loadDashboard();

        // Mostrar nome do admin
        const user = auth.getUser();
        if (user) {
            document.getElementById('adminUserName').textContent = user.name || user.email.split('@')[0];
        }
    }

    async checkAdminAccess() {
        if (!auth.isLoggedIn()) {
            return false;
        }

        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/dashboard`, {
                headers: auth.getAuthHeaders()
            });

            return response.ok;
        } catch (error) {
            console.error('Erro ao verificar acesso admin:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Navegação do sidebar
        document.querySelectorAll('.admin-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.switchSection(section);
            });
        });

        // Logout
        document.getElementById('adminLogout').addEventListener('click', () => {
            auth.clearCredentials();
            window.location.href = '/';
        });

        // Dashboard
        document.getElementById('refreshDashboard').addEventListener('click', () => {
            this.loadDashboard();
        });

        // Usuários
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.openUserModal();
        });

        document.getElementById('userSearch').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.usersPage = 1;
                this.loadUsers();
            }, 300);
        });

        document.getElementById('userStatusFilter').addEventListener('change', () => {
            this.usersPage = 1;
            this.loadUsers();
        });

        // Modal de usuário
        document.getElementById('closeUserModal').addEventListener('click', () => {
            this.closeUserModal();
        });

        document.getElementById('cancelUserBtn').addEventListener('click', () => {
            this.closeUserModal();
        });

        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // M3U
        document.getElementById('saveM3uBtn').addEventListener('click', () => {
            this.saveM3uUrl();
        });

        document.getElementById('testM3uBtn').addEventListener('click', () => {
            this.testM3uUrl();
        });

        // Configurações
        document.getElementById('saveSiteNameBtn').addEventListener('click', () => {
            this.saveSiteName();
        });

        // Logs
        document.getElementById('refreshLogs').addEventListener('click', () => {
            this.loadLogs();
        });

        // Modal de confirmação
        document.getElementById('confirmCancel').addEventListener('click', () => {
            this.closeConfirmModal();
        });

        document.getElementById('confirmOk').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.closeConfirmModal();
        });

        // Fechar modais ao clicar fora
        document.getElementById('userModal').addEventListener('click', (e) => {
            if (e.target.id === 'userModal') {
                this.closeUserModal();
            }
        });

        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                this.closeConfirmModal();
            }
        });
    }

    switchSection(section) {
        // Atualizar navegação
        document.querySelectorAll('.admin-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Mostrar seção
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`section-${section}`).classList.add('active');

        this.currentSection = section;

        // Carregar dados da seção
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'tv':
                this.loadM3uSettings();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }

    // ========================================
    // DASHBOARD
    // ========================================

    async loadDashboard() {
        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/dashboard`, {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar dashboard');
            }

            const data = await response.json();
            const { stats, topUsers, topContent, dailyRegistrations } = data;

            // Atualizar estatísticas
            document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('statActiveUsers').textContent = stats.activeUsers || 0;
            document.getElementById('statWatchHistory').textContent = stats.totalWatchHistory || 0;
            document.getElementById('statFavorites').textContent = stats.totalFavorites || 0;
            document.getElementById('statNewToday').textContent = stats.newUsersToday || 0;
            document.getElementById('statNewWeek').textContent = stats.newUsersWeek || 0;
            document.getElementById('statNewMonth').textContent = stats.newUsersMonth || 0;

            // Renderizar gráfico de registros
            this.renderRegistrationsChart(dailyRegistrations || []);

            // Renderizar top usuários
            this.renderTopUsers(topUsers || []);

            // Renderizar top conteúdo
            this.renderTopContent(topContent || []);

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.showToast('Erro ao carregar dashboard', 'error');
        }
    }

    renderRegistrationsChart(data) {
        const container = document.getElementById('registrationsChart');

        if (data.length === 0) {
            container.innerHTML = '<div class="empty-list">Sem dados de registro</div>';
            return;
        }

        const maxCount = Math.max(...data.map(d => d.count), 1);

        container.innerHTML = data.map(d => {
            const height = (d.count / maxCount) * 100;
            const date = new Date(d.date);
            const label = `${date.getDate()}/${date.getMonth() + 1}`;
            return `<div class="chart-bar" style="height: ${Math.max(height, 4)}%" data-label="${label}" title="${d.count} registros"></div>`;
        }).join('');
    }

    renderTopUsers(users) {
        const container = document.getElementById('topUsersList');

        if (users.length === 0) {
            container.innerHTML = '<div class="empty-list">Nenhum usuário encontrado</div>';
            return;
        }

        container.innerHTML = users.map((user, index) => `
            <div class="top-list-item">
                <span class="top-list-rank">${index + 1}</span>
                <div class="top-list-info">
                    <div class="top-list-name">${user.name || user.email.split('@')[0]}</div>
                    <div class="top-list-meta">${user.email}</div>
                </div>
                <span class="top-list-value">${user.watch_count} views</span>
            </div>
        `).join('');
    }

    renderTopContent(content) {
        const container = document.getElementById('topContentList');

        if (content.length === 0) {
            container.innerHTML = '<div class="empty-list">Nenhum conteúdo assistido</div>';
            return;
        }

        container.innerHTML = content.map((item, index) => `
            <div class="top-content-item">
                <span class="top-content-rank">${index + 1}</span>
                <div class="top-content-info">
                    <div class="top-content-title">${item.title}</div>
                    <div class="top-content-meta">${item.media_type === 'movie' ? 'Filme' : 'Série'} • ${item.view_count} views</div>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // USUÁRIOS
    // ========================================

    async loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Carregando...</td></tr>';

        try {
            const search = document.getElementById('userSearch').value;
            const status = document.getElementById('userStatusFilter').value;

            const params = new URLSearchParams({
                page: this.usersPage,
                limit: this.usersPerPage
            });

            if (search) params.append('search', search);
            if (status) params.append('status', status);

            const response = await fetch(`${auth.apiUrl}/api/admin/users?${params}`, {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar usuários');
            }

            const data = await response.json();
            const { users, total, page, totalPages } = data;

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Nenhum usuário encontrado</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(user => this.renderUserRow(user)).join('');

            // Renderizar paginação
            this.renderPagination('usersPagination', page, totalPages, total, (p) => {
                this.usersPage = p;
                this.loadUsers();
            });

            // Adicionar eventos de ação
            tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.editUser(parseInt(btn.dataset.id));
                });
            });

            tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.confirmDeleteUser(parseInt(btn.dataset.id), btn.dataset.email);
                });
            });

        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Erro ao carregar usuários</td></tr>';
            this.showToast('Erro ao carregar usuários', 'error');
        }
    }

    renderUserRow(user) {
        const statusClass = user.status || 'active';
        const statusText = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'banned': 'Banido'
        };

        const createdAt = new Date(user.created_at).toLocaleDateString('pt-BR');

        return `
            <tr>
                <td>${user.id}</td>
                <td>${user.name || '-'}</td>
                <td>${user.email}</td>
                <td><span class="status-badge ${statusClass}">${statusText[statusClass] || statusClass}</span></td>
                <td>${user.is_admin ? '<span class="admin-badge-small">Admin</span>' : '-'}</td>
                <td>${createdAt}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon edit-user-btn" data-id="${user.id}" title="Editar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon danger delete-user-btn" data-id="${user.id}" data-email="${user.email}" title="Excluir">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    openUserModal(user = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');
        const passwordGroup = document.getElementById('passwordGroup');
        const passwordInput = document.getElementById('userPassword');

        form.reset();

        if (user) {
            title.textContent = 'Editar Usuário';
            document.getElementById('userId').value = user.id;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userStatus').value = user.status || 'active';
            document.getElementById('userIsAdmin').checked = user.is_admin || false;

            // Senha opcional na edição
            passwordInput.required = false;
            passwordGroup.querySelector('label').textContent = 'Nova Senha (deixe em branco para manter)';
        } else {
            title.textContent = 'Novo Usuário';
            document.getElementById('userId').value = '';
            passwordInput.required = true;
            passwordGroup.querySelector('label').textContent = 'Senha *';
        }

        modal.classList.add('active');
    }

    closeUserModal() {
        document.getElementById('userModal').classList.remove('active');
    }

    async editUser(userId) {
        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/users/${userId}`, {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar usuário');
            }

            const data = await response.json();
            this.openUserModal(data.user);

        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            this.showToast('Erro ao carregar usuário', 'error');
        }
    }

    async saveUser() {
        const userId = document.getElementById('userId').value;
        const email = document.getElementById('userEmail').value;
        const name = document.getElementById('userName').value;
        const password = document.getElementById('userPassword').value;
        const status = document.getElementById('userStatus').value;
        const isAdmin = document.getElementById('userIsAdmin').checked;

        const body = { email, name, status, is_admin: isAdmin };

        if (password) {
            body.password = password;
        }

        try {
            const url = userId
                ? `${auth.apiUrl}/api/admin/users/${userId}`
                : `${auth.apiUrl}/api/admin/users`;

            const method = userId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    ...auth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao salvar usuário');
            }

            this.closeUserModal();
            this.loadUsers();
            this.showToast(data.message || 'Usuário salvo com sucesso', 'success');

        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            this.showToast(error.message, 'error');
        }
    }

    confirmDeleteUser(userId, email) {
        this.showConfirmModal(
            'Excluir Usuário',
            `Tem certeza que deseja excluir o usuário "${email}"? Esta ação não pode ser desfeita.`,
            () => this.deleteUser(userId)
        );
    }

    async deleteUser(userId) {
        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: auth.getAuthHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao excluir usuário');
            }

            this.loadUsers();
            this.showToast('Usuário excluído com sucesso', 'success');

        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.showToast(error.message, 'error');
        }
    }

    // ========================================
    // M3U / TV
    // ========================================

    async loadM3uSettings() {
        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/m3u`, {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar configuração M3U');
            }

            const data = await response.json();
            document.getElementById('m3uUrl').value = data.m3u_url || '';

        } catch (error) {
            console.error('Erro ao carregar M3U:', error);
        }
    }

    async saveM3uUrl() {
        const url = document.getElementById('m3uUrl').value.trim();

        if (!url) {
            this.showToast('URL é obrigatória', 'error');
            return;
        }

        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/m3u`, {
                method: 'PUT',
                headers: {
                    ...auth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao salvar URL');
            }

            this.showToast('URL da M3U salva com sucesso', 'success');

        } catch (error) {
            console.error('Erro ao salvar M3U:', error);
            this.showToast(error.message, 'error');
        }
    }

    async testM3uUrl() {
        const url = document.getElementById('m3uUrl').value.trim();

        if (!url) {
            this.showToast('Digite uma URL para testar', 'error');
            return;
        }

        const previewCard = document.getElementById('m3uPreview');
        const channelCountEl = document.getElementById('m3uChannelCount');
        const channelListEl = document.getElementById('m3uChannelList');

        previewCard.style.display = 'block';
        channelCountEl.textContent = '...';
        channelListEl.innerHTML = '<div class="empty-list">Carregando playlist...</div>';

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Não foi possível acessar a URL');
            }

            const content = await response.text();
            const channels = this.parseM3U(content);

            channelCountEl.textContent = channels.length;

            if (channels.length === 0) {
                channelListEl.innerHTML = '<div class="empty-list">Nenhum canal encontrado</div>';
                return;
            }

            // Mostrar primeiros 20 canais
            channelListEl.innerHTML = channels.slice(0, 20).map(ch => `
                <div class="preview-item">
                    ${ch.logo ? `<img src="${ch.logo}" alt="${ch.name}" onerror="this.style.display='none'">` : ''}
                    <span class="preview-item-name">${ch.name}</span>
                </div>
            `).join('');

            this.showToast(`Playlist válida com ${channels.length} canais`, 'success');

        } catch (error) {
            console.error('Erro ao testar M3U:', error);
            channelListEl.innerHTML = `<div class="empty-list">Erro: ${error.message}</div>`;
            this.showToast('Erro ao testar playlist: ' + error.message, 'error');
        }
    }

    parseM3U(content) {
        const lines = content.split('\n');
        const channels = [];
        let currentChannel = null;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('#EXTINF:')) {
                currentChannel = { name: '', logo: '', url: '' };

                // Extrair nome
                const nameMatch = trimmedLine.match(/,(.+)$/);
                if (nameMatch) {
                    currentChannel.name = nameMatch[1].trim();
                }

                // Extrair logo
                const logoMatch = trimmedLine.match(/tvg-logo="([^"]+)"/);
                if (logoMatch) {
                    currentChannel.logo = logoMatch[1];
                }

            } else if (currentChannel && trimmedLine && !trimmedLine.startsWith('#')) {
                currentChannel.url = trimmedLine;
                if (currentChannel.name) {
                    channels.push(currentChannel);
                }
                currentChannel = null;
            }
        }

        return channels;
    }

    // ========================================
    // CONFIGURAÇÕES
    // ========================================

    async loadSettings() {
        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/settings`, {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar configurações');
            }

            const data = await response.json();

            // Preencher campos
            for (const setting of data.settings) {
                if (setting.key === 'site_name') {
                    document.getElementById('siteName').value = setting.value || 'Superflix';
                }
            }

            // Verificar status do banco
            await this.checkDatabaseStatus();

        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    async checkDatabaseStatus() {
        try {
            const response = await fetch(`${auth.apiUrl}/health`);
            const data = await response.json();

            document.getElementById('dbStatus').textContent = data.database === 'connected' ? 'Conectado' : 'Desconectado';
            document.getElementById('dbStatus').style.color = data.database === 'connected' ? '#22c55e' : '#ef4444';
            document.getElementById('appMode').textContent = data.database === 'connected' ? 'Online' : 'Offline';

        } catch (error) {
            document.getElementById('dbStatus').textContent = 'Erro';
            document.getElementById('dbStatus').style.color = '#ef4444';
        }
    }

    async saveSiteName() {
        const siteName = document.getElementById('siteName').value.trim();

        if (!siteName) {
            this.showToast('Nome do site é obrigatório', 'error');
            return;
        }

        try {
            const response = await fetch(`${auth.apiUrl}/api/admin/settings/site_name`, {
                method: 'PUT',
                headers: {
                    ...auth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value: siteName })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao salvar configuração');
            }

            this.showToast('Nome do site salvo com sucesso', 'success');

        } catch (error) {
            console.error('Erro ao salvar nome do site:', error);
            this.showToast(error.message, 'error');
        }
    }

    // ========================================
    // LOGS
    // ========================================

    async loadLogs() {
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Carregando...</td></tr>';

        try {
            const params = new URLSearchParams({
                page: this.logsPage,
                limit: this.logsPerPage
            });

            const response = await fetch(`${auth.apiUrl}/api/admin/logs?${params}`, {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar logs');
            }

            const data = await response.json();
            const { logs, total, page, totalPages } = data;

            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Nenhum log encontrado</td></tr>';
                return;
            }

            tbody.innerHTML = logs.map(log => this.renderLogRow(log)).join('');

            // Renderizar paginação
            this.renderPagination('logsPagination', page, totalPages, total, (p) => {
                this.logsPage = p;
                this.loadLogs();
            });

        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Erro ao carregar logs</td></tr>';
        }
    }

    renderLogRow(log) {
        const createdAt = new Date(log.created_at).toLocaleString('pt-BR');
        const details = log.details ? JSON.stringify(log.details) : '-';

        const actionLabels = {
            'CREATE_USER': 'Criar Usuário',
            'UPDATE_USER': 'Editar Usuário',
            'DELETE_USER': 'Excluir Usuário',
            'UPDATE_SETTING': 'Alterar Config',
            'UPDATE_M3U': 'Alterar M3U'
        };

        return `
            <tr>
                <td>${createdAt}</td>
                <td>${log.admin_name || log.admin_email || '-'}</td>
                <td>${actionLabels[log.action] || log.action}</td>
                <td>${log.target_type || '-'} ${log.target_id || ''}</td>
                <td><small>${details.substring(0, 50)}${details.length > 50 ? '...' : ''}</small></td>
                <td>${log.ip_address || '-'}</td>
            </tr>
        `;
    }

    // ========================================
    // UTILIDADES
    // ========================================

    renderPagination(containerId, currentPage, totalPages, total, onPageChange) {
        const container = document.getElementById(containerId);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Botão anterior
        html += `<button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>`;

        // Páginas
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            html += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-info">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-info">...</span>`;
            }
            html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Botão próximo
        html += `<button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>`;

        container.innerHTML = html;

        // Adicionar eventos
        container.querySelectorAll('.pagination-btn:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                onPageChange(parseInt(btn.dataset.page));
            });
        });
    }

    showConfirmModal(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('active');
        this.confirmCallback = callback;
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
        this.confirmCallback = null;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-message">${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
