/**
 * Script para promover um usuário a administrador
 *
 * Uso: node scripts/make-admin.js <email>
 * Exemplo: node scripts/make-admin.js admin@superflix.com
 */

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL não configurada no .env');
    process.exit(1);
}

const email = process.argv[2];

if (!email) {
    console.log('Uso: node scripts/make-admin.js <email>');
    console.log('Exemplo: node scripts/make-admin.js admin@superflix.com');
    process.exit(1);
}

async function makeAdmin() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
    });

    try {
        // Verificar se usuário existe
        const userResult = await pool.query(
            'SELECT id, email, name, is_admin FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            console.error(`Usuário com email "${email}" não encontrado.`);
            console.log('\nUsuários cadastrados:');

            const allUsers = await pool.query('SELECT id, email, name, is_admin FROM users ORDER BY id');
            allUsers.rows.forEach(u => {
                console.log(`  - ${u.email} ${u.is_admin ? '(admin)' : ''}`);
            });

            process.exit(1);
        }

        const user = userResult.rows[0];

        if (user.is_admin) {
            console.log(`O usuário "${email}" já é administrador.`);
            process.exit(0);
        }

        // Promover a admin
        await pool.query(
            'UPDATE users SET is_admin = true WHERE id = $1',
            [user.id]
        );

        console.log(`\n✅ Usuário promovido a administrador com sucesso!`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nome: ${user.name || 'Não definido'}`);
        console.log(`   ID: ${user.id}`);
        console.log(`\nAgora você pode acessar o painel admin em: /admin/`);

    } catch (error) {
        console.error('Erro ao promover usuário:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

makeAdmin();
