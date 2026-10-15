import { Router } from "express";
import { getPatientsForDoctor, getPatientForDoctor } from "#db/queries/patients";
import getUserFromToken from "#middleware/getUserFromToken";
import requireDoctor from "#middleware/requireDoctor";
import { getDoseHistory } from "#db/queries/doseLogs";
import { groupDoseHistory } from "#utils/doseHistory";

const router = Router();

router.get('/', getUserFromToken, requireDoctor, async (req, res) => {
    try {
        const patients = await getPatientsForDoctor(req.user.id);

        res.status(200).json({ patients });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

router.get('/:patientId', getUserFromToken, requireDoctor, async (req, res) => {
    try {
        const patientId = Number(req.params.patientId);

        if (!patientId) {
            return res.status(404).send('Patient not found');
        }

        const patient = await getPatientForDoctor(req.user.id, patientId);

        if (!patient) {
            return res.status(404).send('Patient not found');
        }

        res.status(200).json(patient);
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

router.get('/:patientId/history', getUserFromToken, requireDoctor, async (req, res) => {
    try {
        const patientId = Number(req.params.patientId);

        if (!patientId) {
            return res.status(404).send('Patient not found');
        }

        //the doctor can only read a patient they assigned
        const patient = await getPatientForDoctor(req.user.id, patientId);

        if (!patient) {
            return res.status(404).send('Patient not found');
        }

        const rows = await getDoseHistory(patientId);

        res.status(200).json({ courses: groupDoseHistory(rows) });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
});

export default router;
