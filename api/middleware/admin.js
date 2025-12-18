const db = require('../db');

// Middleware para verificar se o usuário é admin
const requireAdmin = async (req, res, next) => {
  try {
    // req.user já foi definido pelo authenticateToken middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Autenticação requerida' });
    }

    // Modo offline - verificar na memória
    if (db.isOffline()) {
      const user = db.memoryStore.users.find(u => u.id === req.user.id);
      if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Acesso negado. Permissão de administrador requerida.' });
      }
      return next();
    }

    // Modo online - verificar no PostgreSQL
    const result = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (!result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Acesso negado. Permissão de administrador requerida.' });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar permissão de admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Função para registrar log de atividade admin
const logAdminAction = async (adminId, action, targetType, targetId, details, ipAddress) => {
  try {
    if (db.isOffline()) {
      // Em modo offline, apenas logar no console
      console.log(`[ADMIN LOG] Admin ${adminId}: ${action} on ${targetType} ${targetId}`);
      return;
    }

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, targetType, targetId, JSON.stringify(details), ipAddress]
    );
  } catch (error) {
    console.error('Erro ao registrar log de admin:', error);
  }
};

module.exports = { requireAdmin, logAdminAction };
