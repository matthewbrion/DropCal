import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    throw new Error('JWT_SECRET is not set in .env');
}

// Creates a token with the given payload
export function createToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

// Verifies the token signature and returns payload, or throws if invalid
export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}