import db from "#db/client";

export async function getProtocols() {
    const sql = `
    SELECT p.id,
        p.name,
        p.procedure,
        MAX(pw.week_number)::int AS total_weeks,
        COUNT(DISTINCT pw.medication_id)::int AS medication_count
    FROM protocols p
    JOIN protocol_weeks pw ON pw.protocol_id = p.id
    GROUP BY p.id, p.name, p.procedure
    ORDER BY p.name
    `;
    const { rows } = await db.query(sql);
    return rows;
}

export async function getProtocolById(protocolId) {
    const sql = `
    SELECT p.id,
        p.name,
        p.procedure,
        pw.week_number,
        pw.eye,
        pw.frequency_per_day,
        m.id AS medication_id,
        m.name AS medication_name,
        m.form AS medication_form
    FROM protocols p
    JOIN protocol_weeks pw ON pw.protocol_id = p.id
    JOIN medications m ON m.id = pw.medication_id
    WHERE p.id = $1
    ORDER BY pw.week_number, m.name
    `;
    const { rows } = await db.query(sql, [protocolId]);
    return rows;
}
