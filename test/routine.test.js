import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import request from 'supertest';
import app from '#app';
import db from '#db/client';
import { buildCourseMedications } from '#utils/routine';

//test below does the following:
//wipes and rebuilds db from seed
//checks the now and next working out for a taper, including drops that finish early
//checks the routine endpoint describes upcoming, active and completed courses

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

//one medication across the weeks given, as the query returns it
function rowsFor(weeks) {
    return weeks.map(([week_number, frequency_per_day]) => ({
        patient_protocol_id: 1,
        medication_id: 7,
        name: 'Prednisolone Acetate',
        strength: '1%',
        brand_name: 'Pred Forte',
        form: 'drop',
        patient_label: 'Steroid',
        cap_color: 'pink',
        cap_color_accent: 'white',
        week_number,
        eye: 'both',
        frequency_per_day,
    }));
}

const course = {
    status: 'active',
    current_week: 3,
    total_weeks: 4,
    start_date: '2026-09-07',
};

describe('working out the dose now and what changes next', () => {
    it('reads the current week and the next change in a taper', () => {
        const [medication] = buildCourseMedications(rowsFor([[1, 4], [2, 3], [3, 2], [4, 1]]), course);

        expect(medication.name).toBe('Prednisolone Acetate 1%');
        expect(medication.brand_name).toBe('Pred Forte');
        expect(medication.frequency_per_day).toBe(2);
        //week 4 starts 21 days after the course did
        expect(medication.change).toEqual({ type: 'changes', frequency_per_day: 1, on: '2026-09-28' });
    });

    it('says nothing changes when the dose holds to the end', () => {
        const [medication] = buildCourseMedications(rowsFor([[1, 2], [2, 2], [3, 2], [4, 2]]), course);

        expect(medication.frequency_per_day).toBe(2);
        expect(medication.change).toBeNull();
    });

    it('reports a drop that already finished', () => {
        const [medication] = buildCourseMedications(rowsFor([[1, 4]]), course);

        expect(medication.frequency_per_day).toBeNull();
        expect(medication.change).toEqual({ type: 'finished', after_week: 1 });
    });

    it('reports a drop that stops after this week', () => {
        const [medication] = buildCourseMedications(rowsFor([[1, 4], [2, 3], [3, 2]]), course);

        expect(medication.frequency_per_day).toBe(2);
        expect(medication.change).toEqual({ type: 'stops', on: '2026-09-28' });
    });

    it('reports a drop that has not started yet', () => {
        const [medication] = buildCourseMedications(rowsFor([[4, 1]]), course);

        expect(medication.frequency_per_day).toBeNull();
        expect(medication.change).toEqual({ type: 'starts', on: '2026-09-28' });
    });

    it('uses week one for a course that has not begun', () => {
        const upcoming = { ...course, status: 'upcoming', current_week: null };
        const [medication] = buildCourseMedications(rowsFor([[1, 4], [2, 3]]), upcoming);

        expect(medication.frequency_per_day).toBe(4);
        expect(medication.change).toEqual({ type: 'changes', frequency_per_day: 3, on: '2026-09-14' });
    });

    it('keeps the two eyes of one medication apart', () => {
        const rows = [
            ...rowsFor([[3, 4]]).map((row) => ({ ...row, eye: 'left' })),
            ...rowsFor([[3, 2]]).map((row) => ({ ...row, eye: 'right' })),
        ];

        const medications = buildCourseMedications(rows, course);

        expect(medications).toHaveLength(2);
        expect(medications.map((m) => m.frequency_per_day).sort()).toEqual([2, 4]);
    });
});

describe('GET /api/patient-protocols/me/routine', () => {
    it('rejects a request with no cookie', async () => {
        const res = await request(app).get('/api/patient-protocols/me/routine');

        expect(res.status).toBe(401);
    });

    it('describes the active and completed courses', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .get('/api/patient-protocols/me/routine')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.courses).toHaveLength(2);

        const active = res.body.courses.find((c) => c.status === 'active');
        expect(active.protocol_name).toBe('Post-Cataract Taper');
        expect(active.current_week).toBeGreaterThan(0);
        expect(active.medications.length).toBeGreaterThan(0);
        expect(active.weeks.length).toBeGreaterThan(0);

        const completed = res.body.courses.find((c) => c.status === 'completed');
        expect(completed.logged).toBe(102);
        expect(completed.expected).toBe(112);
        //a finished course is about the log, not about what to take now
        expect(completed.medications).toEqual([]);
        expect(completed.current_week).toBeNull();
    });

    it('includes a course that has not started yet', async () => {
        const doctorCookie = await loginAs('hayes@example.com', 'password123');
        const email = await registerPatient('Future Fiona');

        const assigned = await request(app)
            .post('/api/patient-protocols')
            .set('Cookie', doctorCookie)
            .send({ patient_email: email, protocol_id: 1, start_date: dateStringFromToday(5) });
        expect(assigned.status).toBe(201);

        const cookie = await loginAs(email, 'password123');
        const res = await request(app)
            .get('/api/patient-protocols/me/routine')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.courses).toHaveLength(1);

        const course = res.body.courses[0];
        //the history query cannot see this course at all, since no day of it has happened
        expect(course.status).toBe('upcoming');
        expect(course.current_week).toBeNull();
        expect(course.weeks).toEqual([]);
        expect(course.logged).toBe(0);
        expect(course.medications.length).toBeGreaterThan(0);
        expect(course.medications[0].frequency_per_day).toBeGreaterThan(0);
    });

    it('carries the cap colour and class through to the page', async () => {
        const cookie = await loginAs('vance@example.com', 'password123');

        const res = await request(app)
            .get('/api/patient-protocols/me/routine')
            .set('Cookie', cookie);

        const active = res.body.courses.find((c) => c.status === 'active');
        const pred = active.medications.find((m) => m.brand_name === 'Pred Forte');

        expect(pred.cap_color).toBe('pink');
        expect(pred.cap_color_accent).toBe('white');
        expect(pred.patient_label).toBe('Steroid');
    });
});
