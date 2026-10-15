import { Router } from "express";
import authRouter from './auth.js';
import patientProtocolsRouter from './patientProtocols.js';
import patientsRouter from './patients.js';
import protocolsRouter from './protocols.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/patient-protocols', patientProtocolsRouter);
router.use('/patients', patientsRouter);
router.use('/protocols', protocolsRouter);

export default router;