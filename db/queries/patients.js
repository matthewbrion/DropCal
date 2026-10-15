import db from "#db/client";

//one row per patient this doctor has assigned, describing their current course
//and how many of today's doses they have logged.  patientFilter narrows it to one patient.
function patientSummarySql(patientFilter) {
    return `
    WITH assignments AS (
        SELECT pp.id,
            pp.patient_id,
            pp.protocol_id,
            pp.start_date,
            u.name,
            u.email,
            p.name AS protocol_name,
            MAX(pw.week_number) AS total_weeks
        FROM patient_protocols pp
        JOIN users u ON u.id = pp.patient_id
        JOIN protocols p ON p.id = pp.protocol_id
        JOIN protocol_weeks pw ON pw.protocol_id = pp.protocol_id
        WHERE pp.doctor_id = $1
        ${patientFilter}
        GROUP BY pp.id, pp.patient_id, pp.protocol_id, pp.start_date, u.name, u.email, p.name
    ),
    active AS (
        SELECT DISTINCT ON (patient_id) *,
            (floor((CURRENT_DATE - start_date) / 7) + 1)::int AS current_week,
            (start_date + (total_weeks * 7)::int > CURRENT_DATE) AS is_active
        FROM assignments
        ORDER BY patient_id, (start_date + (total_weeks * 7)::int > CURRENT_DATE) DESC, start_date DESC
    )
    SELECT a.patient_id,
        a.name,
        a.email,
        a.protocol_name,
        a.current_week,
        a.total_weeks,
        a.is_active,
        to_char(a.start_date, 'YYYY-MM-DD') AS start_date,
        COALESCE(SUM(pw.frequency_per_day), 0)::int AS expected_today,
        COUNT(dl.id)::int AS logged_today
    FROM active a
    LEFT JOIN protocol_weeks pw
        ON a.is_active
        AND a.start_date <= CURRENT_DATE
        AND pw.protocol_id = a.protocol_id
        AND pw.week_number = a.current_week
    LEFT JOIN dose_logs dl
        ON dl.patient_protocol_id = a.id
        AND dl.protocol_week_id = pw.id
        AND dl.log_date = CURRENT_DATE
    GROUP BY a.patient_id, a.name, a.email, a.protocol_name, a.current_week,
        a.total_weeks, a.is_active, a.start_date
    ORDER BY a.name
    `;
}

export async function getPatientsForDoctor(doctorId) {
    const { rows } = await db.query(patientSummarySql(''), [doctorId]);
    return rows;
}

export async function getPatientForDoctor(doctorId, patientId) {
    const { rows } = await db.query(patientSummarySql('AND pp.patient_id = $2'), [doctorId, patientId]);
    return rows[0] ?? null;
}
