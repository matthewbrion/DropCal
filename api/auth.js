import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createUser } from '#db/queries/users'

const router = Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await createUser(name, email, passwordHash, 'patient');
        res.status(201).json(user);
    } catch (e) {
        if (e.code === '23505') {
            return res.status(409).send('Email already in use');
        }
        res.status(500).send('Something went wrong');
    }
})