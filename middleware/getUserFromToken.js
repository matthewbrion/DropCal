import { verifyToken } from "#utils/jwt";

// Attaches the user to the request if a valid token is provided
export default async function getUserFromToken(req, res, next) {
    try {
        const payload = verifyToken(req.cookies.token);
        req.user = payload;
        next();
    } catch (e) {
        res.status(401).send(`Invalid Token`);
    }
}