import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';

//test below does the following:
//wipes and rebuilds db from seed
//checks a doctor can list the stock protocols and read one in full
//checks a patient cannot

beforeAll(async () => {
    execSync('node --env-file=.env db/seed.js', { stdio: 'inherit' });
    await db.connect();
});

afterAll(async () => {
    await db.end();
});

async function loginAs(email, password) {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    expect(res.status).toBe(200);
    return res.headers['set-cookie'];
}

describe('GET /api/protocols', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/protocols');

        expect(res.status).toBe(401);
    });

    it('rejects a patient', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .get('/api/protocols')
            .set('Cookie', cookie);

        expect(res.status).toBe(403);
    });

    it('lists the seeded protocols with their length', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/protocols')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.protocols).toHaveLength(2);

        const cataract = res.body.protocols.find((protocol) => protocol.name === 'Post-Cataract Taper');
        expect(cataract.total_weeks).toBe(4);
        expect(cataract.medication_count).toBe(2);
    });
});

describe('GET /api/protocols/:protocolId', () => {
    it('returns the weeks and medications', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const list = await request(app)
            .get('/api/protocols')
            .set('Cookie', cookie);
        const ulcer = list.body.protocols.find((protocol) => protocol.name === 'Corneal Ulcer Taper');

        const res = await request(app)
            .get(`/api/protocols/${ulcer.id}`)
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Corneal Ulcer Taper');
        expect(res.body.weeks).toHaveLength(2);

        //this protocol is the one with a different frequency per eye
        const eyes = res.body.weeks[0].medications.map((medication) => medication.eye).sort();
        expect(eyes).toEqual(['left', 'right']);
    });

    it('returns 404 for a protocol that does not exist', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/protocols/9999')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
    });

    it('returns 404 rather than an error for an id that is not a number', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/protocols/not-a-number')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
    });
});
