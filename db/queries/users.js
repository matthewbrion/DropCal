import db from "#db/client";

export async function createUser(name, email, passwordHash, role) {
    const sql = `
    INSERT INTO users
        (name, email, password_hash, role)
    VALUES
        ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at
    `;
    const { rows: [user] } = await db.query(sql, [name, email, passwordHash, role]);
    return user;
}

export async function getUserByEmail(email) {
    const sql = `
    SELECT *
    FROM users
    WHERE email = $1
    `;
    const { rows: [user] } = await db.query(sql, [email]);
    return user;
}