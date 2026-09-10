import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createUser, getUserByEmail } from '#db/queries/users';
import { createToken } from '#utils/jwt';

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

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send('Email and password are required');
        }
        const user = await getUserByEmail(email);
        if (!user) return res.status(401).send('Invalid credentials');
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).send('Invalid credentials');
        const token = createToken({ id: user.id, role: user.role });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 day expiration
        }).status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (e) {
        res.status(500).send('Something went wrong');
    }
})

export default router;