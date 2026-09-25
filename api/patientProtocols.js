import { Router } from "express";
import { getCurrentPatientProtocolId, getPatientProtocolById } from "#db/queries/patientProtocols";
import { getTodaysDoseSummary, logDose, undoLastDose } from "#db/queries/doseLogs";
import getUserFromToken from "#middleware/getUserFromToken";

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

    return { patientProtocolId, rows, currentWeekNumber };
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

        const rows = await getTodaysDoseSummary(active.patientProtocolId, active.currentWeekNumber, getServerTodayDateString());

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

        res.status(200).json({ has_protocol: true, ended: false, medications });
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

export default router;