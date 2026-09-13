import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';

//test below does the following:
//wipes and rebuilds db from seed
//logs in as test patients to check med/daily assignment
//checks what happens with no drops assigned
//confirms if someone without creds blocked

beforeAll(async () => {
    execSync('node db/seed.js', { stdio: 'inherit' });
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

describe('GET /api/patient-protocols/me', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/patient-protocols/me');
        // checks getUserFromToken
        expect(res.status).toBe(401);
    });

    it('returns a grouped week with multiple medications for a patient with a protocol', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .get('/api/patient-protocols/me')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.protocol_name).toBe('Post-Cataract Taper');
        expect(res.body.weeks).toHaveLength(4);

        const week1 = res.body.weeks.find(w => w.week_number === 1);
        expect(week1.medications).toHaveLength(2);

        const medNames = week1.medications.map(m => m.name).sort();
        expect(medNames).toEqual(['Moxifloxacin 0.5%', 'Prednisolone Acetate 1%']);
    });

    it('returns split-eye weeks correctly for a different patient/protocol', async () => {
        const cookie = await loginAs('chen@example.com', 'password123');

        const res = await request(app)
            .get('/api/patient-protocols/me')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.protocol_name).toBe('Corneal Ulcer Taper');
        expect(res.body.weeks).toHaveLength(2);

        const week1 = res.body.weeks.find(w => w.week_number === 1);
        const eyes = week1.medications.map(m => m.eye).sort();
        expect(eyes).toEqual(['left', 'right']);
    });

    it('returns a 200 placeholder shape for a patient with no assigned protocol', async () => {
        const email = `test-patient-${Date.now()}@example.com`;

        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({ name: 'No Protocol Patient', email, password: 'password123' });
        expect(registerRes.status).toBe(201);

        const cookie = await loginAs(email, 'password123');

        const res = await request(app)
            .get('/api/patient-protocols/me')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.weeks).toEqual([]);
        expect(res.body.patient_protocol_id).toBeNull();
        expect(res.body.protocol_name).toBeNull();
    });
});