//supertest found for automated API testing - https://github.com/forwardemail/supertest/blob/master/README.md

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#app';
import db from '#db/client';

beforeAll(async () => {
    await db.connect();
});

afterAll(async () => {
    await db.end();
});

describe('GET /api/auth/me', () => {
    it ('returns the logged-in user with a valid cookie', async () => {
        const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'vance@example.com', password: 'password123' });

    expect(loginRes.status).toBe(200);

    const cookie = loginRes.headers['set-cookie'];

    const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

        expect(meRes.status).toBe(200);
        expect(meRes.body).toHaveProperty('email', 'vance@example.com');
        //this checks the hash isn't leaked
        expect(meRes.body).not.toHaveProperty('password_hash');
    });

    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/auth/me');
        //checks getUserFromToken
        expect(res.status).toBe(401);
    });
});