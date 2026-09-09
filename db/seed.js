import db from '#db/client';
import bcrypt from 'bcrypt';
import { createUser } from './queries/users';

async function seed() {
    const hash = await bcrypt.hash('password123', 10);
    const doctor = await createUser('Dr. Marcus Hayes', 'hayes@example.com', hash, 'doctor');
    const patient = await createUser('Eleanor Vance', 'vance@example.com', hash, 'patient');
}

await db.connect();
await seed();
await db.end();
console.log("🌱 Database seeded.");