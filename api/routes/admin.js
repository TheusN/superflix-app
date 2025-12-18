const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, logAdminAction } = require('../middleware/admin');

const router = express.Router();

// Todas as rotas de admin requerem autenticação + permissão de admin
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================
// DASHBOARD - Estatísticas
// ============================================

// GET /api/admin/dashboard - Estatísticas gerais
router.get('/dashboard', async (req, res) => {
  try {
    if (db.isOffline()) {
      return res.json({
        stats: {
          totalUsers: db.memoryStore.users.length,
          activeUsers: db.memoryStore.users.filter(u => u.status !== 'banned').length,
          totalWatchHistory: db.memoryStore.watchHistory?.length || 0,
          totalFavorites: db.memoryStore.favorites?.length || 0,
          newUsersToday: 0,
          newUsersWeek: 0
        }
      });
    }

    // Total de usuários
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Usuários ativos
    const activeUsersResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'active' OR status IS NULL"
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    // Usuários banidos
    const bannedUsersResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'banned'"
    );
    const bannedUsers = parseInt(bannedUsersResult.rows[0].count);

    // Total de histórico de visualização
    const historyResult = await db.query('SELECT COUNT(*) as count FROM watch_history');
    const totalWatchHistory = parseInt(historyResult.rows[0].count);

    // Total de favoritos
    const favoritesResult = await db.query('SELECT COUNT(*) as count FROM favorites');
    const totalFavorites = parseInt(favoritesResult.rows[0].count);

    // Novos usuários hoje
    const newTodayResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE"
    );
    const newUsersToday = parseInt(newTodayResult.rows[0].count);

    // Novos usuários esta semana
    const newWeekResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"
    );
    const newUsersWeek = parseInt(newWeekResult.rows[0].count);

    // Novos usuários este mês
    const newMonthResult = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'"
    );
    const newUsersMonth = parseInt(newMonthResult.rows[0].count);

    // Usuários mais ativos (por histórico)
    const topUsersResult = await db.query(`
      SELECT u.id, u.email, u.name, COUNT(wh.id) as watch_count
      FROM users u
      LEFT JOIN watch_history wh ON u.id = wh.user_id
      GROUP BY u.id, u.email, u.name
      ORDER BY watch_count DESC
      LIMIT 5
    `);

    // Conteúdo mais assistido
    const topContentResult = await db.query(`
      SELECT tmdb_id, title, media_type, COUNT(*) as view_count
      FROM watch_history
      GROUP BY tmdb_id, title, media_type
      ORDER BY view_count DESC
      LIMIT 10
    `);

    // Registros por dia (últimos 7 dias)
    const dailyRegistrationsResult = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalWatchHistory,
        totalFavorites,
        newUsersToday,
        newUsersWeek,
        newUsersMonth
      },
      topUsers: topUsersResult.rows,
      topContent: topContentResult.rows,
      dailyRegistrations: dailyRegistrationsResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// USUÁRIOS - CRUD
// ============================================

// GET /api/admin/users - Listar todos os usuários
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    if (db.isOffline()) {
      let users = [...db.memoryStore.users];

      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(u =>
          u.email.toLowerCase().includes(searchLower) ||
          (u.name && u.name.toLowerCase().includes(searchLower))
        );
      }

      if (status) {
        users = users.filter(u => u.status === status);
      }

      return res.json({
        users: users.slice(offset, offset + parseInt(limit)).map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          status: u.status || 'active',
          is_admin: u.is_admin || false,
          created_at: u.created_at,
          last_login: u.last_login
        })),
        total: users.length,
        page: parseInt(page),
        totalPages: Math.ceil(users.length / limit)
      });
    }

    let whereClause = '';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += `WHERE (email ILIKE $${paramCount} OR name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      whereClause += whereClause ? ` AND status = $${paramCount}` : `WHERE status = $${paramCount}`;
      params.push(status);
    }

    // Total count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch users
    params.push(parseInt(limit));
    params.push(offset);

    const result = await db.query(
      `SELECT id, email, name, status, is_admin, created_at, last_login, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      users: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/users/:id - Detalhes de um usuário
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (db.isOffline()) {
      const user = db.memoryStore.users.find(u => u.id === parseInt(id));
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      return res.json({ user: { ...user, password_hash: undefined } });
    }

    const userResult = await db.query(
      'SELECT id, email, name, status, is_admin, created_at, last_login, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar estatísticas do usuário
    const historyCount = await db.query(
      'SELECT COUNT(*) as count FROM watch_history WHERE user_id = $1',
      [id]
    );

    const favoritesCount = await db.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = $1',
      [id]
    );

    res.json({
      user: userResult.rows[0],
      stats: {
        watchHistory: parseInt(historyCount.rows[0].count),
        favorites: parseInt(favoritesCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/users - Criar novo usuário
router.post('/users', async (req, res) => {
  try {
    const { email, password, name, is_admin = false, status = 'active' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const emailLower = email.toLowerCase();
    const userName = name || emailLower.split('@')[0];
    const passwordHash = await bcrypt.hash(password, 10);

    if (db.isOffline()) {
      const existing = db.memoryStore.users.find(u => u.email === emailLower);
      if (existing) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      const user = {
        id: db.memoryStore.nextUserId++,
        email: emailLower,
        name: userName,
        password_hash: passwordHash,
        is_admin,
        status,
        created_at: new Date().toISOString()
      };
      db.memoryStore.users.push(user);

      await logAdminAction(req.user.id, 'CREATE_USER', 'user', user.id, { email: emailLower }, req.ip);

      return res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: { id: user.id, email: user.email, name: user.name, is_admin, status }
      });
    }

    // Verificar se email já existe
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, is_admin, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, is_admin, status, created_at`,
      [emailLower, passwordHash, userName, is_admin, status]
    );

    const user = result.rows[0];
    await logAdminAction(req.user.id, 'CREATE_USER', 'user', user.id, { email: emailLower }, req.ip);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/users/:id - Atualizar usuário
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, is_admin, status } = req.body;

    // Não permitir que admin remova seu próprio status de admin
    if (parseInt(id) === req.user.id && is_admin === false) {
      return res.status(400).json({ error: 'Você não pode remover seu próprio status de administrador' });
    }

    if (db.isOffline()) {
      const user = db.memoryStore.users.find(u => u.id === parseInt(id));
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (name) user.name = name;
      if (email) user.email = email.toLowerCase();
      if (password) user.password_hash = await bcrypt.hash(password, 10);
      if (typeof is_admin === 'boolean') user.is_admin = is_admin;
      if (status) user.status = status;

      await logAdminAction(req.user.id, 'UPDATE_USER', 'user', user.id, { name, email, is_admin, status }, req.ip);

      return res.json({
        message: 'Usuário atualizado com sucesso',
        user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin, status: user.status }
      });
    }

    // Construir query dinâmica
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (email) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      params.push(email.toLowerCase());
    }

    if (password) {
      paramCount++;
      updates.push(`password_hash = $${paramCount}`);
      params.push(await bcrypt.hash(password, 10));
    }

    if (typeof is_admin === 'boolean') {
      paramCount++;
      updates.push(`is_admin = $${paramCount}`);
      params.push(is_admin);
    }

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    paramCount++;
    params.push(id);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, name, is_admin, status, created_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await logAdminAction(req.user.id, 'UPDATE_USER', 'user', parseInt(id), { name, email, is_admin, status }, req.ip);

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/admin/users/:id - Excluir usuário
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir que admin exclua a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    if (db.isOffline()) {
      const index = db.memoryStore.users.findIndex(u => u.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const user = db.memoryStore.users[index];
      db.memoryStore.users.splice(index, 1);

      await logAdminAction(req.user.id, 'DELETE_USER', 'user', parseInt(id), { email: user.email }, req.ip);

      return res.json({ message: 'Usuário excluído com sucesso' });
    }

    // Buscar dados do usuário antes de excluir
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userEmail = userResult.rows[0].email;

    // Excluir usuário (cascade deletes history e favorites)
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    await logAdminAction(req.user.id, 'DELETE_USER', 'user', parseInt(id), { email: userEmail }, req.ip);

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================

// GET /api/admin/settings - Listar todas as configurações
router.get('/settings', async (req, res) => {
  try {
    if (db.isOffline()) {
      return res.json({
        settings: [
          { key: 'm3u_url', value: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', description: 'URL da playlist M3U' },
          { key: 'site_name', value: 'Superflix', description: 'Nome do site' }
        ]
      });
    }

    const result = await db.query(
      'SELECT key, value, description, updated_at FROM system_settings ORDER BY key'
    );

    res.json({ settings: result.rows });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/settings/:key - Buscar configuração específica
router.get('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;

    if (db.isOffline()) {
      const defaults = {
        'm3u_url': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
        'site_name': 'Superflix'
      };
      return res.json({ setting: { key, value: defaults[key] || '' } });
    }

    const result = await db.query(
      'SELECT key, value, description, updated_at FROM system_settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    res.json({ setting: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/settings/:key - Atualizar configuração
router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }

    if (db.isOffline()) {
      await logAdminAction(req.user.id, 'UPDATE_SETTING', 'setting', null, { key, value }, req.ip);
      return res.json({ message: 'Configuração atualizada', setting: { key, value } });
    }

    const result = await db.query(
      `INSERT INTO system_settings (key, value, description, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         description = COALESCE(EXCLUDED.description, system_settings.description),
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING key, value, description, updated_at`,
      [key, value, description, req.user.id]
    );

    await logAdminAction(req.user.id, 'UPDATE_SETTING', 'setting', null, { key, value }, req.ip);

    res.json({
      message: 'Configuração atualizada com sucesso',
      setting: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// M3U / TV
// ============================================

// GET /api/admin/m3u - Obter URL atual da M3U
router.get('/m3u', async (req, res) => {
  try {
    if (db.isOffline()) {
      return res.json({
        m3u_url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8'
      });
    }

    const result = await db.query(
      "SELECT value FROM system_settings WHERE key = 'm3u_url'"
    );

    const m3uUrl = result.rows[0]?.value || 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';

    res.json({ m3u_url: m3uUrl });
  } catch (error) {
    console.error('Erro ao buscar M3U:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/m3u - Atualizar URL da M3U
router.put('/m3u', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }

    if (db.isOffline()) {
      await logAdminAction(req.user.id, 'UPDATE_M3U', 'setting', null, { url }, req.ip);
      return res.json({ message: 'URL da M3U atualizada', m3u_url: url });
    }

    await db.query(
      `UPDATE system_settings SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE key = 'm3u_url'`,
      [url, req.user.id]
    );

    await logAdminAction(req.user.id, 'UPDATE_M3U', 'setting', null, { url }, req.ip);

    res.json({
      message: 'URL da M3U atualizada com sucesso',
      m3u_url: url
    });
  } catch (error) {
    console.error('Erro ao atualizar M3U:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// LOGS DE ATIVIDADE
// ============================================

// GET /api/admin/logs - Listar logs de atividade
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action = '', admin_id = '' } = req.query;
    const offset = (page - 1) * limit;

    if (db.isOffline()) {
      return res.json({ logs: [], total: 0, page: 1, totalPages: 0 });
    }

    let whereClause = '';
    const params = [];
    let paramCount = 0;

    if (action) {
      paramCount++;
      whereClause += `WHERE al.action = $${paramCount}`;
      params.push(action);
    }

    if (admin_id) {
      paramCount++;
      whereClause += whereClause ? ` AND al.admin_id = $${paramCount}` : `WHERE al.admin_id = $${paramCount}`;
      params.push(admin_id);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM admin_logs al ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const result = await db.query(
      `SELECT al.*, u.email as admin_email, u.name as admin_name
       FROM admin_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      logs: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
