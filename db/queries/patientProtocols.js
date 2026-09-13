import db from "#db/client";

export async function getPatientProtocolByPatientId(patientId) {
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
    WHERE pp.patient_id = $1
    ORDER BY pw.week_number
    `;
    const { rows } = await db.query(sql, [patientId]);
    return rows;
}