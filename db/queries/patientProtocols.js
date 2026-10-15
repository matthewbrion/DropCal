import db from "#db/client";

export async function getCurrentPatientProtocolId(patientId) {
    const sql = `
    SELECT pp.id
    FROM patient_protocols pp
    JOIN users u ON u.id = pp.patient_id
    JOIN protocol_weeks pw ON pw.protocol_id = pp.protocol_id
    WHERE pp.patient_id = $1
    GROUP BY pp.id, pp.start_date, u.timezone
    ORDER BY (pp.start_date + (COUNT(DISTINCT pw.week_number) * 7)::int > (now() AT TIME ZONE u.timezone)::date) DESC, pp.start_date DESC
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
        u.timezone,
        p.id AS protocol_id,
        p.name AS protocol_name,
        p.procedure,
        pw.id AS protocol_week_id,
        pw.week_number,
        pw.eye,
        pw.frequency_per_day,
        m.id AS medication_id,
        concat_ws(' ', m.name, m.strength) AS medication_name,
        m.form AS medication_form
    FROM patient_protocols pp
    JOIN users u ON u.id = pp.patient_id
    JOIN protocols p ON pp.protocol_id = p.id
    JOIN protocol_weeks pw ON pw.protocol_id = p.id
    JOIN medications m ON pw.medication_id = m.id
    WHERE pp.id = $1
    ORDER BY pw.week_number
    `;
    const { rows } = await db.query(sql, [patientProtocolId]);
    return rows;
}


//any course that has not run out of weeks yet, including one starting in the future
export async function getActiveCourseForPatient(patientId) {
    const sql = `
    SELECT pp.id
    FROM patient_protocols pp
    JOIN users u ON u.id = pp.patient_id
    JOIN protocol_weeks pw ON pw.protocol_id = pp.protocol_id
    WHERE pp.patient_id = $1
    GROUP BY pp.id, pp.start_date, u.timezone
    HAVING pp.start_date + (COUNT(DISTINCT pw.week_number) * 7)::int > (now() AT TIME ZONE u.timezone)::date
    LIMIT 1
    `;
    const { rows } = await db.query(sql, [patientId]);
    return rows[0] ?? null;
}

export async function assignProtocol(patientId, doctorId, protocolId, startDate) {
    const sql = `
    INSERT INTO patient_protocols
        (patient_id, doctor_id, protocol_id, start_date)
    VALUES
        ($1, $2, $3, $4)
    RETURNING id, patient_id, doctor_id, protocol_id, to_char(start_date, 'YYYY-MM-DD') AS start_date
    `;
    const { rows } = await db.query(sql, [patientId, doctorId, protocolId, startDate]);
    return rows[0];
}

//every course this patient has been assigned, past, present and future.
//the history query only knows about days that have happened, so an upcoming course
//would be invisible to it.
export async function getCoursesForPatient(patientId) {
    const sql = `
    WITH courses AS (
        SELECT pp.id AS patient_protocol_id,
            pp.protocol_id,
            pp.start_date,
            p.name AS protocol_name,
            (now() AT TIME ZONE u.timezone)::date AS today,
            MAX(pw.week_number)::int AS total_weeks
        FROM patient_protocols pp
        JOIN users u ON u.id = pp.patient_id
        JOIN protocols p ON p.id = pp.protocol_id
        JOIN protocol_weeks pw ON pw.protocol_id = pp.protocol_id
        WHERE pp.patient_id = $1
        GROUP BY pp.id, pp.protocol_id, pp.start_date, p.name, u.timezone
    )
    SELECT c.patient_protocol_id,
        c.protocol_id,
        c.protocol_name,
        c.total_weeks,
        to_char(c.start_date, 'YYYY-MM-DD') AS start_date,
        to_char(c.start_date + (c.total_weeks * 7 - 1), 'YYYY-MM-DD') AS end_date,
        CASE
            WHEN c.start_date > c.today THEN 'upcoming'
            WHEN c.start_date + (c.total_weeks * 7) > c.today THEN 'active'
            ELSE 'completed'
        END AS status,
        GREATEST(floor((c.today - c.start_date) / 7) + 1, 1)::int AS current_week
    FROM courses c
    ORDER BY c.start_date DESC
    `;
    const { rows } = await db.query(sql, [patientId]);
    return rows;
}

//one row per medication per week, so the route can say what the dose is now and when it changes
export async function getCourseMedications(patientId) {
    const sql = `
    SELECT pp.id AS patient_protocol_id,
        m.id AS medication_id,
        m.name,
        m.strength,
        m.brand_name,
        m.form,
        dc.patient_label,
        dc.cap_color,
        dc.cap_color_accent,
        pw.week_number,
        pw.eye,
        pw.frequency_per_day
    FROM patient_protocols pp
    JOIN protocol_weeks pw ON pw.protocol_id = pp.protocol_id
    JOIN medications m ON m.id = pw.medication_id
    LEFT JOIN drug_classes dc ON dc.id = m.drug_class_id
    WHERE pp.patient_id = $1
    ORDER BY pp.id, m.name, pw.eye, pw.week_number
    `;
    const { rows } = await db.query(sql, [patientId]);
    return rows;
}
