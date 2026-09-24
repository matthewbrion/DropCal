import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';

//test below does the following:
//wipes and rebuilds db from seed
//logs doses for a patient and checks the count goes up
//checks the daily limit, the undo, and that one patient cannot log for another

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

async function getToday(cookie) {
    const res = await request(app)
        .get('/api/patient-protocols/me/today')
        .set('Cookie', cookie);
    expect(res.status).toBe(200);
    return res.body;
}

describe('POST /api/patient-protocols/me/doses', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app)
            .post('/api/patient-protocols/me/doses')
            .send({ protocol_week_id: 1 });

        expect(res.status).toBe(401);
    });

    it('rejects a request with no protocol_week_id', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({});

        expect(res.status).toBe(400);
    });

    it('logs a dose, raises logged_count, and records the time', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const before = await getToday(cookie);
        const medication = before.medications[0];

        expect(medication.logged_count).toBe(0);
        expect(medication.last_taken_at).toBeNull();

        const res = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({ protocol_week_id: medication.protocol_week_id });

        expect(res.status).toBe(201);
        expect(res.body.dose_index).toBe(1);

        const after = await getToday(cookie);
        expect(after.medications[0].logged_count).toBe(1);
        expect(after.medications[0].last_taken_at).not.toBeNull();
    });

    it('refuses to log more doses than the day allows', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const today = await getToday(cookie);
        const medication = today.medications[0];

        //week 3 allows 2 doses a day and the test above already logged one
        expect(medication.frequency_per_day).toBe(2);
        expect(medication.logged_count).toBe(1);

        const second = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({ protocol_week_id: medication.protocol_week_id });

        expect(second.status).toBe(201);
        expect(second.body.dose_index).toBe(2);

        const third = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({ protocol_week_id: medication.protocol_week_id });

        expect(third.status).toBe(409);

        const after = await getToday(cookie);
        expect(after.medications[0].logged_count).toBe(2);
    });

    it("refuses to log against another patient's medication", async () => {
        const chenCookie = await loginAs('chen@example.com', 'password123');
        const chenToday = await getToday(chenCookie);
        const chenMedication = chenToday.medications[0];

        const vanceCookie = await loginAs('vance@example.com', 'password123');
        const vanceToday = await getToday(vanceCookie);

        //proves the id really belongs to someone else's protocol
        const vanceWeekIds = vanceToday.medications.map((m) => m.protocol_week_id);
        expect(vanceWeekIds).not.toContain(chenMedication.protocol_week_id);

        const res = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', vanceCookie)
            .send({ protocol_week_id: chenMedication.protocol_week_id });

        expect(res.status).toBe(409);

        const chenAfter = await getToday(chenCookie);
        expect(chenAfter.medications[0].logged_count).toBe(chenMedication.logged_count);
    });
});

describe('DELETE /api/patient-protocols/me/doses', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app)
            .delete('/api/patient-protocols/me/doses')
            .send({ protocol_week_id: 1 });

        expect(res.status).toBe(401);
    });

    it('removes the most recent dose', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const before = await getToday(cookie);
        const medication = before.medications[0];

        expect(medication.logged_count).toBe(2);

        const res = await request(app)
            .delete('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({ protocol_week_id: medication.protocol_week_id });

        expect(res.status).toBe(200);
        expect(res.body.dose_index).toBe(2);

        const after = await getToday(cookie);
        expect(after.medications[0].logged_count).toBe(1);
    });

    it('lets the patient log again after an undo', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const today = await getToday(cookie);
        const medication = today.medications[0];

        const res = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({ protocol_week_id: medication.protocol_week_id });

        expect(res.status).toBe(201);
        expect(res.body.dose_index).toBe(2);
    });

    it('returns 409 when there is nothing left to undo', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const today = await getToday(cookie);
        const medication = today.medications[0];

        //clear out both of today's doses
        for (let i = 0; i < medication.logged_count; i++) {
            const res = await request(app)
                .delete('/api/patient-protocols/me/doses')
                .set('Cookie', cookie)
                .send({ protocol_week_id: medication.protocol_week_id });
            expect(res.status).toBe(200);
        }

        const res = await request(app)
            .delete('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({ protocol_week_id: medication.protocol_week_id });

        expect(res.status).toBe(409);

        const after = await getToday(cookie);
        expect(after.medications[0].logged_count).toBe(0);
    });
});
