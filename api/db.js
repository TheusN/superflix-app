const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://superflixdb:5588dcbb6cd8b60bca87@home_superflix-db:5432/superflix-db?sslmode=disable'
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
