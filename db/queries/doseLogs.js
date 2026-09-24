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
        COUNT(dl.id) AS logged_count,
        MAX(dl.checked_at) AS last_taken_at
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

export async function logDose(patientId, protocolWeekId, weekNumber, logDate) {
    const sql = `
    INSERT INTO dose_logs (patient_protocol_id, protocol_week_id, log_date, dose_index)
    SELECT pp.id, pw.id, $4, COUNT(dl.id) + 1
    FROM patient_protocols pp
    JOIN protocol_weeks pw
        ON pw.protocol_id = pp.protocol_id
        AND pw.id = $2
        AND pw.week_number = $3
    LEFT JOIN dose_logs dl
        ON dl.protocol_week_id = pw.id
        AND dl.patient_protocol_id = pp.id
        AND dl.log_date = $4
    WHERE pp.patient_id = $1
    GROUP BY pp.id, pw.id, pw.frequency_per_day
    HAVING COUNT(dl.id) < pw.frequency_per_day
    RETURNING *
    `;
    const { rows } = await db.query(sql, [patientId, protocolWeekId, weekNumber, logDate]);
    return rows[0] ?? null;
}

export async function undoLastDose(patientId, protocolWeekId, logDate) {
    const sql = `
    DELETE FROM dose_logs
    WHERE id = (
        SELECT dl.id
        FROM dose_logs dl
        JOIN patient_protocols pp ON pp.id = dl.patient_protocol_id
        WHERE pp.patient_id = $1
            AND dl.protocol_week_id = $2
            AND dl.log_date = $3
        ORDER BY dl.dose_index DESC
        LIMIT 1
    )
    RETURNING *
    `;
    const { rows } = await db.query(sql, [patientId, protocolWeekId, logDate]);
    return rows[0] ?? null;
}