import pg from 'pg';

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
});

export default db;