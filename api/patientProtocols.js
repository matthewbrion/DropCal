import { Router } from "express";
import { getPatientProtocolByPatientId } from "#db/queries/patientProtocols";
import getUserFromToken from "#middleware/getUserFromToken";

const router = Router();

router.get('/me', getUserFromToken, async (req, res) => {
    try {
        const rows = await getPatientProtocolByPatientId(req.user.id);

        const weeksByNumber = new Map();
        for (const row of rows) {
            if(!weeksByNumber.has(row.week_number)) {
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
        console.log(e);
    }
});

export default router;