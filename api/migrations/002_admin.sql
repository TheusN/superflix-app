-- Superflix Admin Migration
-- PostgreSQL Migration for Admin functionality

-- Adicionar coluna is_admin na tabela users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna status na tabela users (active, inactive, banned)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned'));
    END IF;
END $$;

-- Adicionar coluna last_login na tabela users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description VARCHAR(500),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Inserir configuração padrão da M3U se não existir
INSERT INTO system_settings (key, value, description)
VALUES (
    'm3u_url',
    'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    'URL da playlist M3U para TV ao vivo'
)
ON CONFLICT (key) DO NOTHING;

-- Inserir configuração de nome do site
INSERT INTO system_settings (key, value, description)
VALUES (
    'site_name',
    'Superflix',
    'Nome do site exibido no header e título'
)
ON CONFLICT (key) DO NOTHING;

-- Tabela de logs de atividade admin
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca por admin
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);

-- Índice para busca por data
CREATE INDEX IF NOT EXISTS idx_admin_logs_date ON admin_logs(created_at DESC);

-- Índice para busca por ação
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);

-- Trigger para atualizar updated_at na tabela system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Criar primeiro admin (você pode alterar o email depois)
-- UPDATE users SET is_admin = true WHERE email = 'seu_email@exemplo.com';
