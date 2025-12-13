const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/history - Buscar historico do usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM watch_history
       WHERE user_id = $1
       ORDER BY watched_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({ history: result.rows });
  } catch (error) {
    console.error('Erro ao buscar historico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/history - Adicionar item ao historico
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tmdb_id, imdb_id, title, poster_path, media_type, season, episode, progress } = req.body;

    if (!tmdb_id || !title || !media_type) {
      return res.status(400).json({ error: 'tmdb_id, title e media_type sao obrigatorios' });
    }

    // Upsert - atualiza se ja existe, insere se nao existe
    const result = await pool.query(
      `INSERT INTO watch_history (user_id, tmdb_id, imdb_id, title, poster_path, media_type, season, episode, progress, watched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, tmdb_id, season, episode)
       DO UPDATE SET
         progress = EXCLUDED.progress,
         watched_at = CURRENT_TIMESTAMP,
         title = EXCLUDED.title,
         poster_path = EXCLUDED.poster_path,
         imdb_id = EXCLUDED.imdb_id
       RETURNING *`,
      [req.user.id, tmdb_id, imdb_id || null, title, poster_path || null, media_type, season || null, episode || null, progress || 0]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    console.error('Erro ao salvar historico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/history/:id - Remover item do historico
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM watch_history WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item nao encontrado' });
    }

    res.json({ message: 'Item removido', item: result.rows[0] });
  } catch (error) {
    console.error('Erro ao remover historico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/history/sync - Sincronizar localStorage com o banco
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items deve ser um array' });
    }

    const inserted = [];
    for (const item of items) {
      if (!item.tmdb_id || !item.title || !item.media_type) continue;

      try {
        const result = await pool.query(
          `INSERT INTO watch_history (user_id, tmdb_id, imdb_id, title, poster_path, media_type, season, episode, progress, watched_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (user_id, tmdb_id, season, episode)
           DO UPDATE SET
             progress = GREATEST(watch_history.progress, EXCLUDED.progress),
             watched_at = GREATEST(watch_history.watched_at, EXCLUDED.watched_at)
           RETURNING *`,
          [
            req.user.id,
            item.tmdb_id,
            item.imdb_id || null,
            item.title,
            item.poster_path || null,
            item.media_type,
            item.season || null,
            item.episode || null,
            item.progress || 0,
            item.watched_at ? new Date(item.watched_at) : new Date()
          ]
        );
        inserted.push(result.rows[0]);
      } catch (err) {
        console.error('Erro ao sincronizar item:', err);
      }
    }

    res.json({ message: `${inserted.length} items sincronizados`, items: inserted });
  } catch (error) {
    console.error('Erro na sincronizacao:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/history/continue - Buscar "continue assistindo" (com progresso)
router.get('/continue', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM watch_history
       WHERE user_id = $1 AND progress > 0 AND progress < 100
       ORDER BY watched_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Erro ao buscar continue:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
