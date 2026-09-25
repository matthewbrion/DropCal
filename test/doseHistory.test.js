import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';

//test below does the following:
//wipes and rebuilds db from seed
//checks the history endpoint groups courses, weeks and days
//checks totals add up and that a short day names the medication that was missed

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

async function getHistory(cookie) {
    const res = await request(app)
        .get('/api/patient-protocols/me/history')
        .set('Cookie', cookie);
    expect(res.status).toBe(200);
    return res.body;
}

describe('GET /api/patient-protocols/me/history', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/patient-protocols/me/history');

        expect(res.status).toBe(401);
    });

    it('returns both courses with the active one first', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const history = await getHistory(cookie);

        expect(history.courses).toHaveLength(2);
        expect(history.courses[0].protocol_name).toBe('Post-Cataract Taper');
        expect(history.courses[0].status).toBe('active');
        expect(history.courses[1].protocol_name).toBe('Corneal Ulcer Taper');
        expect(history.courses[1].status).toBe('completed');
    });

    it('reports the completed course totals', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const history = await getHistory(cookie);
        const completed = history.courses[1];

        //the ulcer taper is entirely in the past, so its numbers never move
        expect(completed.expected).toBe(112);
        expect(completed.logged).toBe(102);
        expect(completed.weeks.map((week) => week.week_number)).toEqual([1, 2]);
    });

    it('adds up the same totals at every level', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const history = await getHistory(cookie);

        for (const course of history.courses) {
            let weekExpected = 0;
            let weekLogged = 0;

            for (const week of course.weeks) {
                let dayExpected = 0;
                let dayLogged = 0;

                for (const day of week.days) {
                    dayExpected += day.expected;
                    dayLogged += day.logged;
                }

                expect(week.expected).toBe(dayExpected);
                expect(week.logged).toBe(dayLogged);

                weekExpected += week.expected;
                weekLogged += week.logged;
            }

            expect(course.expected).toBe(weekExpected);
            expect(course.logged).toBe(weekLogged);
        }
    });

    it('marks today on the active course and leaves it unlogged', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const history = await getHistory(cookie);
        const active = history.courses[0];

        const days = active.weeks.flatMap((week) => week.days);
        const todays = days.filter((day) => day.is_today);

        expect(todays).toHaveLength(1);
        expect(todays[0].logged).toBe(0);
        expect(todays[0].expected).toBeGreaterThan(0);
    });

    it('names both medications on a missed day of the split-eye course', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');
        const history = await getHistory(cookie);
        const completed = history.courses[1];

        const days = completed.weeks.flatMap((week) => week.days);
        const missed = days.filter((day) => day.logged === 0);

        //the seed skips one whole day in each course
        expect(missed).toHaveLength(1);
        expect(missed[0].medications).toHaveLength(2);

        const eyes = missed[0].medications.map((medication) => medication.eye).sort();
        expect(eyes).toEqual(['left', 'right']);

        for (const medication of missed[0].medications) {
            expect(medication.logged).toBe(0);
            expect(medication.expected).toBeGreaterThan(0);
        }
    });

    it('returns a course with zeroes for a patient who has logged nothing', async () => {
        const cookie = await loginAs('chen@example.com', 'password123');
        const history = await getHistory(cookie);

        expect(history.courses).toHaveLength(1);
        expect(history.courses[0].logged).toBe(0);
        expect(history.courses[0].expected).toBeGreaterThan(0);
        expect(history.courses[0].weeks.length).toBeGreaterThan(0);
    });
});
