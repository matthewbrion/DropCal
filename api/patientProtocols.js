import { Router } from "express";
import { getCurrentPatientProtocolId, getPatientProtocolById, getActiveCourseForPatient, assignProtocol, getCoursesForPatient, getCourseMedications } from "#db/queries/patientProtocols";
import { getTodaysDoseSummary, logDose, undoLastDose, getDoseHistory } from "#db/queries/doseLogs";
import { getUserByEmail, getUserById } from "#db/queries/users";
import getUserFromToken from "#middleware/getUserFromToken";
import requireDoctor from "#middleware/requireDoctor";
import { todayInZone } from "#utils/timezone";
import { groupDoseHistory } from "#utils/doseHistory";
import { buildCourseMedications } from "#utils/routine";

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

//for a date that came back from the database
function toDateString(value) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function daysBetween(fromDateString, toDateString) {
    const from = fromDateString.split('-');
    const to = toDateString.split('-');
    const fromUtc = Date.UTC(Number(from[0]), Number(from[1]) - 1, Number(from[2]));
    const toUtc = Date.UTC(Number(to[0]), Number(to[1]) - 1, Number(to[2]));
    return Math.floor((toUtc - fromUtc) / (24 * 60 * 60 * 1000));
}

function getCurrentWeekNumber(startDateString, totalWeeks, todayDateString) {
    const weeksElapsed = Math.floor(daysBetween(startDateString, todayDateString) / 7);
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
    //every date below is the patient's, worked out in the zone stored on their account
    const today = todayInZone(rows[0].timezone);
    const startsOn = toDateString(rows[0].start_date);
    const currentWeekNumber = getCurrentWeekNumber(startsOn, totalWeeks, today);
    const notStarted = startsOn > today;

    return { patientProtocolId, rows, currentWeekNumber, startsOn, notStarted, today };
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
        const logDate = active.notStarted ? active.startsOn : active.today;

        const rows = await getTodaysDoseSummary(active.patientProtocolId, weekNumber, logDate);

        const medications = rows.map((row) => ({
            medication_id: row.medication_id,
            name: row.medication_name,
            brand_name: row.brand_name,
            form: row.medication_form,
            patient_label: row.patient_label,
            cap_color: row.cap_color,
            cap_color_accent: row.cap_color_accent,
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

        const dose = await logDose(active.patientProtocolId, protocol_week_id, active.currentWeekNumber, active.today);

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

        const dose = await undoLastDose(active.patientProtocolId, protocol_week_id, active.today);

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

        res.status(200).json({ courses: groupDoseHistory(rows) });
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

//everything the My Routine page needs in one call: the courses a patient has been
//assigned, the drops in each, and the daily log for the ones that have started
router.get('/me/routine', getUserFromToken, async (req, res) => {
    try {
        //the pool gives each query its own connection, so all three run at once
        const [courses, medicationRows, historyRows] = await Promise.all([
            getCoursesForPatient(req.user.id),
            getCourseMedications(req.user.id),
            getDoseHistory(req.user.id),
        ]);

        const history = groupDoseHistory(historyRows);

        const withDetail = courses.map((course) => {
            const logged = history.find((entry) => entry.patient_protocol_id === course.patient_protocol_id);
            const rows = medicationRows.filter((row) => row.patient_protocol_id === course.patient_protocol_id);

            return {
                patient_protocol_id: course.patient_protocol_id,
                protocol_name: course.protocol_name,
                start_date: course.start_date,
                end_date: course.end_date,
                total_weeks: course.total_weeks,
                //only a running course has a current week
                current_week: course.status === 'active' ? course.current_week : null,
                status: course.status,
                expected: logged ? logged.expected : 0,
                logged: logged ? logged.logged : 0,
                //a finished course is about the log, not about what to take now
                medications: course.status === 'completed' ? [] : buildCourseMedications(rows, course),
                weeks: logged ? logged.weeks : [],
            };
        });

        res.status(200).json({ courses: withDetail });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

export default router;