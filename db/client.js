import pg from 'pg';

//a pool keeps several connections open, so requests no longer wait in line for one
const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

//if an idle connection drops (for example Render restarting the database), log it instead of crashing the server
db.on('error', (err) => {
    console.error('Database connection error:', err.message);
});

export default db;
