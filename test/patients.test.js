import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';

//test below does the following:
//wipes and rebuilds db from seed
//checks a doctor sees the patients they assigned, with today's progress
//checks a patient is blocked, and that a doctor cannot read someone else's patient

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

describe('GET /api/patients', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/patients');

        expect(res.status).toBe(401);
    });

    it('rejects a patient', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .get('/api/patients')
            .set('Cookie', cookie);

        expect(res.status).toBe(403);
    });

    it('returns the doctor\'s patients in name order', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/patients')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.patients).toHaveLength(2);

        const names = res.body.patients.map((patient) => patient.name);
        expect(names).toEqual(['David Chen', 'Eleanor Vance']);
    });

    it('describes the active course and today for each patient', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/patients')
            .set('Cookie', cookie);

        const vance = res.body.patients.find((patient) => patient.email === 'vance@example.com');

        //the seed gives her a finished ulcer taper as well, so this proves the active one wins
        expect(vance.protocol_name).toBe('Post-Cataract Taper');
        expect(vance.is_active).toBe(true);
        expect(vance.total_weeks).toBe(4);
        expect(vance.logged_today).toBe(0);
        expect(vance.expected_today).toBeGreaterThan(0);
    });
});

describe('GET /api/patients/:patientId', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/patients/2');

        expect(res.status).toBe(401);
    });

    it('returns one patient the doctor assigned', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const list = await request(app)
            .get('/api/patients')
            .set('Cookie', cookie);
        const expected = list.body.patients.find((patient) => patient.email === 'chen@example.com');

        const res = await request(app)
            .get(`/api/patients/${expected.patient_id}`)
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('David Chen');
        expect(res.body.protocol_name).toBe('Corneal Ulcer Taper');
    });

    it('returns 404 for someone the doctor did not assign', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        //the doctor's own user id, which is nobody's patient
        const res = await request(app)
            .get('/api/patients/1')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
    });

    it('returns 404 rather than an error for a patient id that is not a number', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/patients/not-a-number')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
    });
});

describe('GET /api/patients/:patientId/history', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/patients/2/history');

        expect(res.status).toBe(401);
    });

    it('rejects a patient', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .get('/api/patients/2/history')
            .set('Cookie', cookie);

        expect(res.status).toBe(403);
    });

    it('returns 404 for someone the doctor did not assign', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/patients/1/history')
            .set('Cookie', cookie);

        expect(res.status).toBe(404);
    });

    it('gives the doctor the same history the patient sees', async () => {
        const doctorCookie = await loginAs('hayes@example.com', 'password123');
        const patientCookie = await loginAs('vance@example.com', 'password123');

        const list = await request(app)
            .get('/api/patients')
            .set('Cookie', doctorCookie);
        const vance = list.body.patients.find((patient) => patient.email === 'vance@example.com');

        const doctorView = await request(app)
            .get(`/api/patients/${vance.patient_id}/history`)
            .set('Cookie', doctorCookie);
        const patientView = await request(app)
            .get('/api/patient-protocols/me/history')
            .set('Cookie', patientCookie);

        expect(doctorView.status).toBe(200);
        expect(doctorView.body).toEqual(patientView.body);

        //the completed ulcer taper never moves, so its numbers are safe to assert
        const completed = doctorView.body.courses.find((course) => course.status === 'completed');
        expect(completed.expected).toBe(112);
        expect(completed.logged).toBe(102);
    });
});
