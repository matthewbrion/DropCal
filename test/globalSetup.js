import fs from 'fs';
import pg from 'pg';
import { isLocalDatabase } from '#utils/localDatabase';

//runs once before any test file
//refuses a remote database, then rebuilds every table from schema.sql
export default async function setup() {
    if (!isLocalDatabase(process.env.DATABASE_URL)) {
        throw new Error('Tests only run against a local database. Check DATABASE_URL in .env.test.');
    }

    const schema = fs.readFileSync('db/schema.sql', 'utf8');
    const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    await db.query(schema);
    await db.end();
}
