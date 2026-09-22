import db from "#db/client";

export async function getTodaysDoseSummary(patientId, weekNumber, logDate) {
    const sql = `
    SELECT
        pp.id AS patient_protocol_id,
        pw.id AS protocol_week_id,
        m.id AS medication_id,
        m.name AS medication_name,
        m.form AS medication_form,
        pw.eye,
        pw.frequency_per_day,
        COUNT(dl.id) AS logged_count
    FROM patient_protocols pp
    JOIN protocol_weeks pw
        ON pw.protocol_id = pp.protocol_id
        AND pw.week_number = $2
    JOIN medications m ON pw.medication_id = m.id
    LEFT JOIN dose_logs dl
        ON dl.protocol_week_id = pw.id
        AND dl.patient_protocol_id = pp.id
        AND dl.log_date = $3
    WHERE pp.patient_id = $1
    GROUP BY pp.id, pw.id, m.id, m.name, m.form, pw.eye, pw.frequency_per_day
    `;
    const { rows } = await db.query(sql, [patientId, weekNumber, logDate]);
    return rows;
}