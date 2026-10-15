//getDoseHistory returns one flat row per medication per day.  this nests them into
//courses, then weeks, then days, adding the totals up as it goes.  used by the patient's
//own history route and by the doctor reading one of their patients.
export function groupDoseHistory(rows) {
    const coursesById = new Map();

    for (const row of rows) {
        if (!coursesById.has(row.patient_protocol_id)) {
            coursesById.set(row.patient_protocol_id, {
                patient_protocol_id: row.patient_protocol_id,
                protocol_name: row.protocol_name,
                start_date: row.start_date,
                end_date: row.end_date,
                status: row.is_active ? 'active' : 'completed',
                expected: 0,
                logged: 0,
                weeks: [],
            });
        }

        const course = coursesById.get(row.patient_protocol_id);

        let week = course.weeks.find((w) => w.week_number === row.week_number);
        if (!week) {
            week = { week_number: row.week_number, expected: 0, logged: 0, days: [] };
            course.weeks.push(week);
        }

        let day = week.days.find((d) => d.log_date === row.log_date);
        if (!day) {
            day = { log_date: row.log_date, is_today: row.is_today, expected: 0, logged: 0, medications: [] };
            week.days.push(day);
        }

        day.medications.push({
            name: row.medication_name,
            eye: row.eye,
            expected: row.expected,
            logged: row.logged,
        });

        day.expected += row.expected;
        day.logged += row.logged;
        week.expected += row.expected;
        week.logged += row.logged;
        course.expected += row.expected;
        course.logged += row.logged;
    }

    return [...coursesById.values()];
}
