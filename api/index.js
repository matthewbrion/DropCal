import { Router } from "express";
import authRouter from './auth.js';
import patientProtocolsRouter from './patientProtocols.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/patient-protocols', patientProtocolsRouter);

export default router;