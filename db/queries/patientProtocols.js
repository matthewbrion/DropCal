import db from "#db/client";

export async function getCurrentPatientProtocolId(patientId) {
    const sql = `
    SELECT pp.id
    FROM patient_protocols pp
    JOIN protocol_weeks pw ON pw.protocol_id = pp.protocol_id
    WHERE pp.patient_id = $1
    GROUP BY pp.id, pp.start_date
    ORDER BY (pp.start_date + (COUNT(DISTINCT pw.week_number) * 7)::int > CURRENT_DATE) DESC, pp.start_date DESC
    LIMIT 1
    `;
    const { rows } = await db.query(sql, [patientId]);
    return rows[0]?.id ?? null;
}

export async function getPatientProtocolById(patientProtocolId) {
    const sql = `
    SELECT
        pp.id AS patient_protocol_id,
        pp.start_date,
        p.id AS protocol_id,
        p.name AS protocol_name,
        p.procedure,
        pw.id AS protocol_week_id,
        pw.week_number,
        pw.eye,
        pw.frequency_per_day,
        m.id AS medication_id,
        m.name AS medication_name,
        m.form AS medication_form
    FROM patient_protocols pp
    JOIN protocols p ON pp.protocol_id = p.id
    JOIN protocol_weeks pw ON pw.protocol_id = p.id
    JOIN medications m ON pw.medication_id = m.id
    WHERE pp.id = $1
    ORDER BY pw.week_number
    `;
    const { rows } = await db.query(sql, [patientProtocolId]);
    return rows;
}