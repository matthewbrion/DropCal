// Blocks anyone who is not a doctor.  Run it after getUserFromToken so req.user is set.
export default function requireDoctor(req, res, next) {
    if (req.user.role !== 'doctor') {
        return res.status(403).send('Doctors only');
    }
    next();
}
