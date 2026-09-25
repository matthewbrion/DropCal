import { Router } from "express";
import { getCurrentPatientProtocolId, getPatientProtocolById, getActiveCourseForPatient, assignProtocol } from "#db/queries/patientProtocols";
import { getTodaysDoseSummary, logDose, undoLastDose, getDoseHistory } from "#db/queries/doseLogs";
import { getUserByEmail, getUserById } from "#db/queries/users";
import getUserFromToken from "#middleware/getUserFromToken";
import requireDoctor from "#middleware/requireDoctor";

const router = Router();

router.get('/me', getUserFromToken, async (req, res) => {
    try {
        const active = await getActiveProtocol(req.user.id);
        const rows = active ? active.rows : [];

        const weeksByNumber = new Map();
        for (const row of rows) {
            if (!weeksByNumber.has(row.week_number)) {
                weeksByNumber.set(row.week_number, {
                    week_number: row.week_number,
                    medications: [],
                });
            }
            weeksByNumber.get(row.week_number).medications.push({
                medication_id: row.medication_id,
                name: row.medication_name,
                form: row.medication_form,
                eye: row.eye,
                frequency_per_day: row.frequency_per_day,
            });
        }

        res.status(200).json({
            patient_protocol_id: rows[0]?.patient_protocol_id ?? null,
            protocol_name: rows[0]?.protocol_name ?? null,
            start_date: rows[0]?.start_date ?? null,
            weeks: [...weeksByNumber.values()],
        });

    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

function getServerTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

//same shape as getServerTodayDateString, for a date that came back from the database
function toDateString(value) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentWeekNumber(startDate, totalWeeks) {
    const start = new Date(startDate);
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksElapsed = Math.floor((today - start) / msPerWeek);
    const currentWeek = weeksElapsed + 1;

    if (currentWeek > totalWeeks) {
        return null; //protocol has ended
    }
    if (currentWeek < 1) {
        return 1;
    }
    return currentWeek;
}

async function getActiveProtocol(patientId) {
    const patientProtocolId = await getCurrentPatientProtocolId(patientId);

    if (!patientProtocolId) {
        return null;
    }

    const rows = await getPatientProtocolById(patientProtocolId);
    const totalWeeks = new Set(rows.map((row) => row.week_number)).size;
    const currentWeekNumber = getCurrentWeekNumber(rows[0].start_date, totalWeeks);
    const startsOn = toDateString(rows[0].start_date);
    const notStarted = startsOn > getServerTodayDateString();

    return { patientProtocolId, rows, currentWeekNumber, startsOn, notStarted };
}

router.get('/me/today', getUserFromToken, async (req, res) => {
    try {
        const active = await getActiveProtocol(req.user.id);

        if (!active) {
            return res.status(200).json({ has_protocol: false, ended: false, medications: [] });
        }

        if (active.currentWeekNumber === null) {
            return res.status(200).json({ has_protocol: true, ended: true, medications: [] });
        }

        //before the start date the patient sees week one, but nothing can be logged yet
        const weekNumber = active.notStarted ? 1 : active.currentWeekNumber;
        const logDate = active.notStarted ? active.startsOn : getServerTodayDateString();

        const rows = await getTodaysDoseSummary(active.patientProtocolId, weekNumber, logDate);

        const medications = rows.map((row) => ({
            medication_id: row.medication_id,
            name: row.medication_name,
            form: row.medication_form,
            eye: row.eye,
            frequency_per_day: row.frequency_per_day,
            logged_count: Number(row.logged_count),
            protocol_week_id: row.protocol_week_id,
            last_taken_at: row.last_taken_at
        }));

        res.status(200).json({
            has_protocol: true,
            ended: false,
            not_started: active.notStarted,
            starts_on: active.startsOn,
            medications,
        });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

router.post('/me/doses', getUserFromToken, async (req, res) => {
    try {
        const { protocol_week_id } = req.body;

        if (!protocol_week_id) {
            return res.status(400).send('protocol_week_id is required');
        }

        const active = await getActiveProtocol(req.user.id);

        if (!active) {
            return res.status(409).send('You do not have a routine yet');
        }

        if (active.currentWeekNumber === null) {
            return res.status(409).send('Your care plan has ended');
        }

        if (active.notStarted) {
            return res.status(409).send('Your routine has not started yet');
        }

        const dose = await logDose(active.patientProtocolId, protocol_week_id, active.currentWeekNumber, getServerTodayDateString());

        if (!dose) {
            return res.status(409).send('No doses left to log today');
        }

        res.status(201).json(dose);
    } catch (e) {
        if (e.code === '23505') {
            return res.status(409).send('That dose was already logged');
        }
        res.status(500).send('Something went wrong');
    }
});

router.delete('/me/doses', getUserFromToken, async (req, res) => {
    try {
        const { protocol_week_id } = req.body;

        if (!protocol_week_id) {
            return res.status(400).send('protocol_week_id is required');
        }

        const active = await getActiveProtocol(req.user.id);

        if (!active) {
            return res.status(409).send('There is no dose to undo');
        }

        const dose = await undoLastDose(active.patientProtocolId, protocol_week_id, getServerTodayDateString());

        if (!dose) {
            return res.status(409).send('There is no dose to undo');
        }

        res.status(200).json(dose);
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

router.get('/me/history', getUserFromToken, async (req, res) => {
    try {
        const rows = await getDoseHistory(req.user.id);

        const coursesById = new Map();

        for (const row of rows) {
            if (!coursesById.has(row.patient_protocol_id)) {
                coursesById.set(row.patient_protocol_id, {
                    patient_protocol_id: row.patient_protocol_id,
                    protocol_name: row.protocol_name,
                    start_date: row.start_date,
                    end_date: row.end_date,
                    status: row.is_active ? 'active' : 'completed',
                    expected: 0,
                    logged: 0,
                    weeks: [],
                });
            }

            const course = coursesById.get(row.patient_protocol_id);

            let week = course.weeks.find((w) => w.week_number === row.week_number);
            if (!week) {
                week = { week_number: row.week_number, expected: 0, logged: 0, days: [] };
                course.weeks.push(week);
            }

            let day = week.days.find((d) => d.log_date === row.log_date);
            if (!day) {
                day = { log_date: row.log_date, is_today: row.is_today, expected: 0, logged: 0, medications: [] };
                week.days.push(day);
            }

            day.medications.push({
                name: row.medication_name,
                eye: row.eye,
                expected: row.expected,
                logged: row.logged,
            });

            day.expected += row.expected;
            day.logged += row.logged;
            week.expected += row.expected;
            week.logged += row.logged;
            course.expected += row.expected;
            course.logged += row.logged;
        }

        res.status(200).json({ courses: [...coursesById.values()] });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

//a doctor assigns a stock protocol, either to someone already on their list (patient_id)
//or to a new patient by email
router.post('/', getUserFromToken, requireDoctor, async (req, res) => {
    try {
        const { patient_email, patient_id, protocol_id, start_date } = req.body;

        if (!protocol_id) {
            return res.status(400).send('protocol_id is required');
        }

        if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
            return res.status(400).send('start_date must be YYYY-MM-DD');
        }

        let patient = null;

        if (patient_email) {
            patient = await getUserByEmail(patient_email);
        } else if (patient_id) {
            patient = await getUserById(patient_id);
        } else {
            return res.status(400).send('patient_email or patient_id is required');
        }

        if (!patient) {
            return res.status(404).send('No account with that email');
        }

        if (patient.role !== 'patient') {
            return res.status(400).send('That account is not a patient');
        }

        const active = await getActiveCourseForPatient(patient.id);

        if (active) {
            return res.status(409).send('That patient already has a routine in progress');
        }

        const assignment = await assignProtocol(patient.id, req.user.id, protocol_id, start_date);

        res.status(201).json(assignment);
    } catch (e) {
        if (e.code === '23503') {
            return res.status(400).send('That protocol does not exist');
        }
        res.status(500).send('Something went wrong');
    }
});

export default router;