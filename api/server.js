require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const pool = require('./db');
const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'disconnected' });
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
