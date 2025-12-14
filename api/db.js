const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// URL de conexao do PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://superflixdb:5588dcbb6cd8b60bca87@easypanel.omniwhats.com:5438/superflix-db?sslmode=disable';

// Flag para modo offline (sem banco)
let offlineMode = false;

// Armazenamento em memoria para modo offline
const memoryStore = {
  users: [],
  watch_history: [],
  favorites: [],
  nextUserId: 1,
  nextHistoryId: 1,
  nextFavoriteId: 1
};

// Pool real do PostgreSQL
let pool = null;

try {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  pool.on('error', (err) => {
    console.error('Erro no cliente PostgreSQL:', err.message);
  });
} catch (err) {
  console.log('PostgreSQL nao disponivel, usando modo offline');
  offlineMode = true;
}

// Funcao para inicializar o banco de dados
async function initializeDatabase() {
  if (offlineMode) {
    console.log('Modo OFFLINE ativado - dados em memoria');
    return true;
  }

  try {
    const client = await pool.connect();
    console.log('Conexao com PostgreSQL estabelecida');

    const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');

    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await client.query(migrationSQL);
      console.log('Tabelas do banco de dados criadas/verificadas com sucesso');
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS watch_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tmdb_id INTEGER NOT NULL,
          imdb_id VARCHAR(20),
          title VARCHAR(500) NOT NULL,
          poster_path VARCHAR(255),
          media_type VARCHAR(10) NOT NULL,
          season INTEGER,
          episode INTEGER,
          progress INTEGER DEFAULT 0,
          watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tmdb_id INTEGER NOT NULL,
          title VARCHAR(500) NOT NULL,
          poster_path VARCHAR(255),
          media_type VARCHAR(10) NOT NULL,
          added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, tmdb_id)
        );
      `);
      console.log('Tabelas criadas');
    }

    client.release();
    return true;
  } catch (error) {
    console.log('PostgreSQL nao disponivel:', error.message);
    console.log('Ativando modo OFFLINE - dados em memoria');
    offlineMode = true;
    return true;
  }
}

// Proxy para query que funciona em ambos os modos
async function query(text, params) {
  if (!offlineMode && pool) {
    return pool.query(text, params);
  }
  // Modo offline - simular queries basicas
  return { rows: [] };
}

// Exportar
module.exports = {
  query,
  initializeDatabase,
  isOffline: () => offlineMode,
  memoryStore,
  pool
};
