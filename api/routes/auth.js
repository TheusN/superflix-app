const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Cadastro
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const emailLower = email.toLowerCase();
    const userName = name || emailLower.split('@')[0];
    const passwordHash = await bcrypt.hash(password, 10);

    // Modo offline - usar memoria
    if (db.isOffline()) {
      const existing = db.memoryStore.users.find(u => u.email === emailLower);
      if (existing) {
        return res.status(400).json({ error: 'Email ja cadastrado' });
      }

      const user = {
        id: db.memoryStore.nextUserId++,
        email: emailLower,
        name: userName,
        password_hash: passwordHash,
        created_at: new Date().toISOString()
      };
      db.memoryStore.users.push(user);

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        message: 'Usuario cadastrado com sucesso',
        user: { id: user.id, email: user.email, name: user.name },
        token
      });
    }

    // Modo online - usar PostgreSQL
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [emailLower]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email ja cadastrado' });
    }

    const result = await db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [emailLower, passwordHash, userName]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuario cadastrado com sucesso',
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    const emailLower = email.toLowerCase();

    // Modo offline - usar memoria
    if (db.isOffline()) {
      const user = db.memoryStore.users.find(u => u.email === emailLower);
      if (!user) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Login realizado com sucesso',
        user: { id: user.id, email: user.email, name: user.name },
        token
      });
    }

    // Modo online - usar PostgreSQL
    const result = await db.query('SELECT * FROM users WHERE email = $1', [emailLower]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const userName = user.name || user.email.split('@')[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: userName }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login realizado com sucesso',
      user: { id: user.id, email: user.email, name: userName },
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me - Dados do usuario logado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (db.isOffline()) {
      const user = db.memoryStore.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }
      return res.json({ user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at } });
    }

    const result = await db.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar usuario:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/auth/profile - Atualizar perfil do usuario
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const userName = name.trim();

    // Modo offline - usar memoria
    if (db.isOffline()) {
      const user = db.memoryStore.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }
      user.name = userName;
      return res.json({
        message: 'Nome atualizado com sucesso',
        user: { id: user.id, email: user.email, name: user.name }
      });
    }

    // Modo online - usar PostgreSQL
    const result = await db.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, created_at',
      [userName, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    const user = result.rows[0];

    // Gerar novo token com o nome atualizado
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Nome atualizado com sucesso',
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
