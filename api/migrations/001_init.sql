-- Superflix Database Schema
-- PostgreSQL Migration

-- Tabela de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar coluna name se nao existir (para migracao)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
        ALTER TABLE users ADD COLUMN name VARCHAR(255);
    END IF;
END $$;

-- Indice para busca por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tabela de historico de visualizacao
CREATE TABLE IF NOT EXISTS watch_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    imdb_id VARCHAR(20),
    title VARCHAR(500) NOT NULL,
    poster_path VARCHAR(255),
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
    season INTEGER,
    episode INTEGER,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indice unico para evitar duplicatas (mesmo conteudo, mesmo episodio)
CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_history_unique
ON watch_history(user_id, tmdb_id, COALESCE(season, 0), COALESCE(episode, 0));

-- Indice para busca por usuario
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);

-- Indice para busca por data
CREATE INDEX IF NOT EXISTS idx_watch_history_date ON watch_history(watched_at DESC);

-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    poster_path VARCHAR(255),
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tmdb_id)
);

-- Indice para busca por usuario
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
