//Turns the flat week-by-week rows into one entry per medication, and works out what the
//dose is now and when it next changes.  A patient on a taper mostly wants to know two
//things: how many drops today, and when that number moves.

function startOfWeek(courseStartDate, weekNumber) {
    const parts = courseStartDate.split('-');
    const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    date.setUTCDate(date.getUTCDate() + (weekNumber - 1) * 7);

    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}-${day}`;
}

//the weeks a medication appears in are not always every week: a drop can stop partway
//through a course, which is worth telling the patient about
function describeChange(weeks, currentWeek, totalWeeks, courseStartDate) {
    const laterWeeks = weeks.filter((week) => week.week_number > currentWeek);
    const current = weeks.find((week) => week.week_number === currentWeek);

    //a drop can finish before the course does, or start partway through it
    if (!current) {
        if (laterWeeks.length > 0) {
            return { type: 'starts', on: startOfWeek(courseStartDate, laterWeeks[0].week_number) };
        }

        const lastWeek = weeks[weeks.length - 1];
        return { type: 'finished', after_week: lastWeek.week_number };
    }

    if (laterWeeks.length === 0) {
        if (currentWeek < totalWeeks) {
            return { type: 'stops', on: startOfWeek(courseStartDate, currentWeek + 1) };
        }
        return null;
    }

    const next = laterWeeks[0];

    if (next.week_number > currentWeek + 1) {
        return { type: 'pauses', on: startOfWeek(courseStartDate, currentWeek + 1) };
    }

    if (next.frequency_per_day !== current.frequency_per_day) {
        return {
            type: 'changes',
            frequency_per_day: next.frequency_per_day,
            on: startOfWeek(courseStartDate, next.week_number),
        };
    }

    return null;
}

export function buildCourseMedications(rows, course) {
    const byMedication = new Map();

    for (const row of rows) {
        const key = `${row.medication_id}-${row.eye}`;

        if (!byMedication.has(key)) {
            byMedication.set(key, {
                medication_id: row.medication_id,
                name: [row.name, row.strength].filter(Boolean).join(' '),
                brand_name: row.brand_name,
                form: row.form,
                eye: row.eye,
                patient_label: row.patient_label,
                cap_color: row.cap_color,
                cap_color_accent: row.cap_color_accent,
                weeks: [],
            });
        }

        byMedication.get(key).weeks.push({
            week_number: row.week_number,
            frequency_per_day: row.frequency_per_day,
        });
    }

    const medications = [...byMedication.values()];

    for (const medication of medications) {
        medication.weeks.sort((a, b) => a.week_number - b.week_number);

        //an upcoming course has not reached week one yet, so "now" is what week one holds
        const week = course.status === 'upcoming' ? 1 : course.current_week;
        const current = medication.weeks.find((entry) => entry.week_number === week);

        medication.frequency_per_day = current ? current.frequency_per_day : null;
        medication.change = course.status === 'completed'
            ? null
            : describeChange(medication.weeks, week, course.total_weeks, course.start_date);
    }

    return medications;
}
