import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';

//test below does the following:
//wipes and rebuilds db from seed
//checks a doctor can assign a stock protocol by email and by patient id
//checks every reason an assignment is refused
//checks a patient sees, but cannot log, a routine that starts in the future

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

async function registerPatient(name) {
    const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}-${Date.now()}@example.com`;

    const res = await request(app)
        .post('/api/auth/register')
        .send({ name, email, password: 'password123' });
    expect(res.status).toBe(201);

    return email;
}

function dateStringFromToday(dayOffset) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

describe('POST /api/patient-protocols', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app)
            .post('/api/patient-protocols')
            .send({ patient_email: 'vance@example.com', protocol_id: 1, start_date: dateStringFromToday(0) });

        expect(res.status).toBe(401);
    });

    it('rejects a patient', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: 'chen@example.com', protocol_id: 1, start_date: dateStringFromToday(0) });

        expect(res.status).toBe(403);
    });

    it('rejects a missing protocol or a bad date', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');
        const email = await registerPatient('Nina Patel');

        const noProtocol = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: email, start_date: dateStringFromToday(0) });
        expect(noProtocol.status).toBe(400);

        const badDate = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: email, protocol_id: 1, start_date: 'tomorrow' });
        expect(badDate.status).toBe(400);
    });

    it('rejects an unknown email, a doctor, and a protocol that does not exist', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const unknown = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: 'nobody@example.com', protocol_id: 1, start_date: dateStringFromToday(0) });
        expect(unknown.status).toBe(404);

        const doctor = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: 'hayes@example.com', protocol_id: 1, start_date: dateStringFromToday(0) });
        expect(doctor.status).toBe(400);

        const email = await registerPatient('Omar Reed');
        const noProtocol = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: email, protocol_id: 9999, start_date: dateStringFromToday(0) });
        expect(noProtocol.status).toBe(400);
    });

    it('refuses a patient who already has a routine in progress', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: 'vance@example.com', protocol_id: 1, start_date: dateStringFromToday(0) });

        expect(res.status).toBe(409);
    });

    it('assigns by email and the patient appears on the doctor\'s list', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');
        const email = await registerPatient('Sara Blum');

        const res = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: email, protocol_id: 1, start_date: dateStringFromToday(0) });

        expect(res.status).toBe(201);
        expect(res.body.start_date).toBe(dateStringFromToday(0));

        const list = await request(app)
            .get('/api/patients')
            .set('Cookie', cookie);
        const added = list.body.patients.find((patient) => patient.email === email);

        expect(added.protocol_name).toBe('Post-Cataract Taper');
        expect(added.current_week).toBe(1);
        expect(added.logged_today).toBe(0);
        expect(added.expected_today).toBeGreaterThan(0);
    });

    it('assigns by patient id once their course has ended', async () => {
        const cookie = await loginAs('hayes@example.com', 'password123');
        const email = await registerPatient('Tom Ito');

        //a two week course that finished a month ago
        const first = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_email: email, protocol_id: 2, start_date: dateStringFromToday(-30) });
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', cookie)
            .send({ patient_id: first.body.patient_id, protocol_id: 1, start_date: dateStringFromToday(0) });

        expect(second.status).toBe(201);
        expect(second.body.patient_id).toBe(first.body.patient_id);
    });
});

describe('a routine that has not started yet', () => {
    it('shows the first week but refuses to log a dose', async () => {
        const doctorCookie = await loginAs('hayes@example.com', 'password123');
        const email = await registerPatient('Ada Lin');
        const startsOn = dateStringFromToday(3);

        const assigned = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', doctorCookie)
            .send({ patient_email: email, protocol_id: 1, start_date: startsOn });
        expect(assigned.status).toBe(201);

        const patientCookie = await loginAs(email, 'password123');

        const today = await request(app)
            .get('/api/patient-protocols/me/today')
            .set('Cookie', patientCookie);

        expect(today.status).toBe(200);
        expect(today.body.not_started).toBe(true);
        expect(today.body.starts_on).toBe(startsOn);
        expect(today.body.medications.length).toBeGreaterThan(0);
        expect(today.body.medications[0].logged_count).toBe(0);

        const logged = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', patientCookie)
            .send({ protocol_week_id: today.body.medications[0].protocol_week_id });

        expect(logged.status).toBe(409);
    });

    it('counts nothing for today on the doctor\'s list', async () => {
        const doctorCookie = await loginAs('hayes@example.com', 'password123');
        const email = await registerPatient('Ben Cruz');

        await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', doctorCookie)
            .send({ patient_email: email, protocol_id: 1, start_date: dateStringFromToday(2) });

        const list = await request(app)
            .get('/api/patients')
            .set('Cookie', doctorCookie);
        const waiting = list.body.patients.find((patient) => patient.email === email);

        expect(waiting.is_active).toBe(true);
        expect(waiting.expected_today).toBe(0);
        expect(waiting.logged_today).toBe(0);
    });
});
