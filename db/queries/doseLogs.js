import db from "#db/client";

export async function getTodaysDoseSummary(patientProtocolId, weekNumber, logDate) {
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
    WHERE pp.id = $1
    GROUP BY pp.id, pw.id, m.id, m.name, m.form, pw.eye, pw.frequency_per_day
    `;
    const { rows } = await db.query(sql, [patientProtocolId, weekNumber, logDate]);
    return rows;
}

export async function logDose(patientProtocolId, protocolWeekId, weekNumber, logDate) {
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
    WHERE pp.id = $1
    GROUP BY pp.id, pw.id, pw.frequency_per_day
    HAVING COUNT(dl.id) < pw.frequency_per_day
    RETURNING *
    `;
    const { rows } = await db.query(sql, [patientProtocolId, protocolWeekId, weekNumber, logDate]);
    return rows[0] ?? null;
}

export async function undoLastDose(patientProtocolId, protocolWeekId, logDate) {
    const sql = `
    DELETE FROM dose_logs
    WHERE id = (
        SELECT dl.id
        FROM dose_logs dl
        JOIN patient_protocols pp ON pp.id = dl.patient_protocol_id
        WHERE pp.id = $1
            AND dl.protocol_week_id = $2
            AND dl.log_date = $3
        ORDER BY dl.dose_index DESC
        LIMIT 1
    )
    RETURNING *
    `;
    const { rows } = await db.query(sql, [patientProtocolId, protocolWeekId, logDate]);
    return rows[0] ?? null;
}

export async function getDoseHistory(patientId) {
    const sql = `
    WITH courses AS (
        SELECT pp.id,
            pp.protocol_id,
            pp.start_date,
            p.name AS protocol_name,
            MAX(pw.week_number) AS total_weeks
        FROM patient_protocols pp
        JOIN protocols p ON p.id = pp.protocol_id
        JOIN protocol_weeks pw ON pw.protocol_id = pp.protocol_id
        WHERE pp.patient_id = $1
        GROUP BY pp.id, pp.protocol_id, pp.start_date, p.name
    ),
    days AS (
        SELECT c.id AS patient_protocol_id,
            c.protocol_id,
            c.protocol_name,
            to_char(c.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(c.start_date + (c.total_weeks * 7 - 1)::int, 'YYYY-MM-DD') AS end_date,
            (c.start_date + (c.total_weeks * 7)::int > CURRENT_DATE) AS is_active,
            gs::date AS day,
            (gs::date = CURRENT_DATE) AS is_today,
            (floor((gs::date - c.start_date) / 7) + 1)::int AS week_number
        FROM courses c
        CROSS JOIN LATERAL generate_series(
            c.start_date,
            LEAST(c.start_date + (c.total_weeks * 7 - 1)::int, CURRENT_DATE),
            interval '1 day'
        ) AS gs
    )
    SELECT d.patient_protocol_id,
        d.protocol_name,
        d.start_date,
        d.end_date,
        d.is_active,
        to_char(d.day, 'YYYY-MM-DD') AS log_date,
        d.is_today,
        d.week_number,
        m.name AS medication_name,
        pw.eye,
        pw.frequency_per_day AS expected,
        COUNT(dl.id)::int AS logged
    FROM days d
    JOIN protocol_weeks pw
        ON pw.protocol_id = d.protocol_id
        AND pw.week_number = d.week_number
    JOIN medications m ON m.id = pw.medication_id
    LEFT JOIN dose_logs dl
        ON dl.patient_protocol_id = d.patient_protocol_id
        AND dl.protocol_week_id = pw.id
        AND dl.log_date = d.day
    GROUP BY d.patient_protocol_id, d.protocol_name, d.start_date, d.end_date,
        d.is_active, d.day, d.is_today, d.week_number, m.name, pw.eye, pw.frequency_per_day
    ORDER BY d.start_date DESC, d.week_number, d.day DESC, m.name
    `;
    const { rows } = await db.query(sql, [patientId]);
    return rows;
}
