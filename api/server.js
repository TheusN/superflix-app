require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const pool = require('./db');
const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'disconnected' });
  }
});

// Public endpoint para obter M3U URL (usado pelo frontend da TV)
app.get('/api/settings/m3u', async (req, res) => {
  try {
    if (pool.isOffline()) {
      return res.json({
        m3u_url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8'
      });
    }

    const result = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'm3u_url'"
    );

    const m3uUrl = result.rows[0]?.value || 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';

    res.json({ m3u_url: m3uUrl });
  } catch (error) {
    console.error('Erro ao buscar M3U:', error);
    // Retornar URL padrão em caso de erro
    res.json({
      m3u_url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8'
    });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../index.html'));
  }
});

// Inicializar banco e iniciar servidor
async function startServer() {
  console.log('Iniciando Superflix Server...');

  // Inicializar banco de dados
  const dbInitialized = await pool.initializeDatabase();

  if (!dbInitialized) {
    console.warn('AVISO: Banco de dados nao inicializado. Algumas funcionalidades podem nao funcionar.');
  }

  app.listen(PORT, () => {
    console.log(`Superflix server rodando na porta ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer();
