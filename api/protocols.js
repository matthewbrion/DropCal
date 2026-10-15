import { Router } from "express";
import { getProtocols, getProtocolById } from "#db/queries/protocols";
import getUserFromToken from "#middleware/getUserFromToken";
import requireDoctor from "#middleware/requireDoctor";

const router = Router();

router.get('/', getUserFromToken, requireDoctor, async (req, res) => {
    try {
        const protocols = await getProtocols();

        res.status(200).json({ protocols });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

router.get('/:protocolId', getUserFromToken, requireDoctor, async (req, res) => {
    try {
        const protocolId = Number(req.params.protocolId);

        if (!protocolId) {
            return res.status(404).send('Protocol not found');
        }

        const rows = await getProtocolById(protocolId);

        if (rows.length === 0) {
            return res.status(404).send('Protocol not found');
        }

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
            id: rows[0].id,
            name: rows[0].name,
            procedure: rows[0].procedure,
            weeks: [...weeksByNumber.values()],
        });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

export default router;
