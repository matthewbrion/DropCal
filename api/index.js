import { Router } from "express";
import authRouter from './auth.js';
import patientProtocolsRouter from './patientProtocols.js';
import patientsRouter from './patients.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/patient-protocols', patientProtocolsRouter);
router.use('/patients', patientsRouter);

export default router;