import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';
import { isValidTimeZone, resolveTimeZone, todayInZone } from '#utils/timezone';

//test below does the following:
//wipes and rebuilds db from seed
//checks the timezone helpers
//checks that "today" follows the zone stored on the patient, not the server clock,
//which is the bug where a dose logged at 9pm Eastern landed on tomorrow

//far enough apart that their calendar dates are never the same
const AHEAD = 'Pacific/Kiritimati';
const BEHIND = 'Etc/GMT+12';

beforeAll(async () => {
    execSync('node db/seed.js', { stdio: 'inherit' });
});

afterAll(async () => {
    await setTimezone('vance@example.com', 'America/Detroit');
    await db.end();
});

async function loginAs(email, password) {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    expect(res.status).toBe(200);
    return res.headers['set-cookie'];
}

async function setTimezone(email, timezone) {
    await db.query('UPDATE users SET timezone = $1 WHERE email = $2', [timezone, email]);
}

async function getToday(cookie) {
    const res = await request(app)
        .get('/api/patient-protocols/me/today')
        .set('Cookie', cookie);
    expect(res.status).toBe(200);
    return res.body;
}

async function getHistoryToday(cookie) {
    const res = await request(app)
        .get('/api/patient-protocols/me/history')
        .set('Cookie', cookie);
    expect(res.status).toBe(200);

    const days = res.body.courses[0].weeks.flatMap((week) => week.days);
    const today = days.filter((day) => day.is_today);
    expect(today).toHaveLength(1);
    return today[0].log_date;
}

describe('the timezone helpers', () => {
    it('accepts real zones and rejects anything else', () => {
        expect(isValidTimeZone('America/Detroit')).toBe(true);
        expect(isValidTimeZone('UTC')).toBe(true);
        expect(isValidTimeZone('Mars/Olympus')).toBe(false);
        expect(isValidTimeZone('')).toBe(false);
        expect(isValidTimeZone(undefined)).toBe(false);
        expect(isValidTimeZone(42)).toBe(false);
    });

    it('falls back rather than returning something Postgres would choke on', () => {
        expect(resolveTimeZone('America/Detroit')).toBe('America/Detroit');
        expect(isValidTimeZone(resolveTimeZone('Mars/Olympus'))).toBe(true);
        expect(isValidTimeZone(resolveTimeZone(null))).toBe(true);
    });

    it('gives a different calendar date either side of the world', () => {
        expect(todayInZone(AHEAD)).not.toBe(todayInZone(BEHIND));
        expect(todayInZone(AHEAD) > todayInZone(BEHIND)).toBe(true);
    });
});

describe('a patient whose zone is not the server zone', () => {
    it('is told the date it is where they are', async () => {
        await setTimezone('vance@example.com', AHEAD);
        const cookie = await loginAs('vance@example.com', 'password123');

        expect(await getHistoryToday(cookie)).toBe(todayInZone(AHEAD));

        await setTimezone('vance@example.com', BEHIND);
        expect(await getHistoryToday(cookie)).toBe(todayInZone(BEHIND));
    });

    it('moves which day counts as today when the zone changes', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        await setTimezone('vance@example.com', AHEAD);
        const ahead = await getHistoryToday(cookie);

        await setTimezone('vance@example.com', BEHIND);
        const behind = await getHistoryToday(cookie);

        expect(ahead).not.toBe(behind);
    });

    it('logs a dose against their date, not the server\'s', async () => {
        await setTimezone('vance@example.com', AHEAD);
        const cookie = await loginAs('vance@example.com', 'password123');

        const today = await getToday(cookie);
        const medication = today.medications[0];

        const res = await request(app)
            .post('/api/patient-protocols/me/doses')
            .set('Cookie', cookie)
            .send({ protocol_week_id: medication.protocol_week_id });
        expect(res.status).toBe(201);

        const { rows } = await db.query(
            'SELECT to_char(log_date, $1) AS log_date FROM dose_logs WHERE id = $2',
            ['YYYY-MM-DD', res.body.id]
        );

        expect(rows[0].log_date).toBe(todayInZone(AHEAD));
    });

    it('counts that dose as today on the doctor\'s list', async () => {
        //the doctor's query works out today per patient, so it has to agree with the dose
        const doctorCookie = await loginAs('hayes@example.com', 'password123');

        const res = await request(app)
            .get('/api/patients')
            .set('Cookie', doctorCookie);
        const vance = res.body.patients.find((patient) => patient.email === 'vance@example.com');

        expect(vance.logged_today).toBeGreaterThan(0);
    });
});
