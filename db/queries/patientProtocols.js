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
        m.name AS medication_name,
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
