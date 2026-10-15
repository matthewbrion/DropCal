import db from "#db/client";

export async function createUser(name, email, passwordHash, role, timezone) {
    const sql = `
    INSERT INTO users
        (name, email, password_hash, role, timezone)
    VALUES
        ($1, $2, $3, $4, $5)
    RETURNING id, name, email, role, timezone, created_at
    `;
    const { rows: [user] } = await db.query(sql, [name, email, passwordHash, role, timezone]);
    return user;
}

export async function getUserByEmail(email) {
    const sql = `
    SELECT id, name, email, password_hash, role, timezone, created_at
    FROM users
    WHERE email = $1
    `;
    const { rows: [user] } = await db.query(sql, [email]);
    return user;
}

export async function getUserById(id) {
  const sql = `
  SELECT id, name, email, role, timezone
  FROM users
  WHERE id = $1
  `;
  const {
    rows: [user],
  } = await db.query(sql, [id]);
  return user;
}