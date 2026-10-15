import { useEffect, useState } from "react";
import { useAuth } from '../context/AuthContext';
import { getMyRoutine } from '../lib/patientProtocols';
import { frequencyText, eyeLabel, dateText, doseCountText } from '../lib/medicationFormatting';
import { WeekList } from '../components/DoseHistory';
import CapSwatch, { capLabel } from '../components/CapSwatch';

export default function MyRoutine() {
    const auth = useAuth();
    const [courses, setCourses] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (auth.loading) {
            return;
        }
        getMyRoutine()
            .then((data) => setCourses(data.courses))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [auth.loading]);

    if (auth.loading || loading) {
        return (
            <div className="flex items-center justify-center py-section-gap">
                <p className="text-body-lg text-ink-muted">Loading your routine...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center px-gutter-mobile py-section-gap">
                <p className="text-body-lg text-error">{error}</p>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="flex items-center justify-center px-gutter-mobile py-section-gap">
                <p className="text-body-lg text-ink-muted text-center">
                    Your doctor hasn't assigned a routine yet.
                </p>
            </div>
        );
    }

    //running first, then what is coming, then what is done
    const order = { active: 0, upcoming: 1, completed: 2 };
    const sorted = [...courses].sort((a, b) => order[a.status] - order[b.status]);

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <header>
                    <h1 className="text-headline-lg text-ink">My Routine</h1>
                    <p className="text-body-md text-ink-muted mt-1">
                        Everything your doctor has assigned.  Log your drops on the Home screen.
                    </p>
                </header>
                {sorted.map((course) => (
                    <CourseCard key={course.patient_protocol_id} course={course} />
                ))}
            </div>
        </div>
    );
}

function statusText(course) {
    if (course.status === 'active') {
        return `In progress · week ${course.current_week} of ${course.total_weeks}`;
    }
    if (course.status === 'upcoming') {
        return `Upcoming · ${course.total_weeks} weeks`;
    }
    return 'Completed';
}

//the log only carries weeks that have happened, so the rest are listed as still to come
function allWeeks(course) {
    const weeks = [...course.weeks];

    for (let weekNumber = 1; weekNumber <= course.total_weeks; weekNumber++) {
        if (!weeks.some((week) => week.week_number === weekNumber)) {
            weeks.push({ week_number: weekNumber, expected: 0, logged: 0, days: [] });
        }
    }

    weeks.sort((a, b) => a.week_number - b.week_number);
    return weeks;
}

function CourseCard({ course }) {
    const isActive = course.status === 'active';
    const hasLog = course.weeks.length > 0;

    return (
        <details className="bg-surface-card rounded-md" open={isActive}>
            <summary className="px-card-padding py-card-padding cursor-pointer list-none">
                <p className="text-headline-md text-ink">{course.protocol_name}</p>
                <p className="text-body-md text-ink-muted mt-1">
                    {dateText(course.start_date)} to {dateText(course.end_date)}
                </p>
                {hasLog && (
                    <p className="text-body-md text-ink mt-1">
                        {doseCountText(course.logged, course.expected)} logged
                    </p>
                )}
                <p className="mt-2">
                    <span className="inline-block text-label-sm text-ink-muted border border-border-subtle rounded-full px-3 py-1">
                        {statusText(course)}
                    </span>
                </p>
            </summary>

            {course.medications.length > 0 && (
                <div className="border-t border-border-subtle px-card-padding py-card-padding">
                    <p className="text-label-sm text-ink-muted">Your drops</p>
                    <div className="mt-2">
                        {course.medications.map((medication) => (
                            <MedicationRow
                                key={`${medication.medication_id}-${medication.eye}`}
                                medication={medication}
                            />
                        ))}
                    </div>
                </div>
            )}

            {hasLog && (
                <div className="border-t border-border-subtle px-card-padding pt-card-padding">
                    <p className="text-label-sm text-ink-muted">Daily log</p>
                    <div className="-mx-card-padding mt-2">
                        <WeekList weeks={allWeeks(course)} currentWeekNumber={course.current_week} />
                    </div>
                </div>
            )}
        </details>
    );
}

//what the dose is now, and the one thing that changes next
function changeText(change) {
    if (!change) {
        return null;
    }
    if (change.type === 'changes') {
        return `Changes to ${frequencyText(change.frequency_per_day).toLowerCase()} on ${dateText(change.on)}`;
    }
    if (change.type === 'stops' || change.type === 'pauses') {
        return `Stops on ${dateText(change.on)}`;
    }
    if (change.type === 'starts') {
        return `Starts ${dateText(change.on)}`;
    }
    if (change.type === 'finished') {
        return `Finished after week ${change.after_week}`;
    }
    return null;
}

function MedicationRow({ medication }) {
    const change = changeText(medication.change);
    const cap = capLabel(medication.cap_color, medication.cap_color_accent);

    return (
        <div className="flex items-center gap-3 py-3 border-t border-border-subtle first:border-t-0">
            <CapSwatch color={medication.cap_color} accent={medication.cap_color_accent} />
            <div>
                <p className="text-body-lg text-ink">
                    {medication.brand_name
                        ? <>{medication.brand_name} <span className="text-body-md text-ink-muted">{medication.name}</span></>
                        : medication.name}
                </p>
                <p className="text-body-md text-ink-muted">
                    {[cap, medication.patient_label].filter(Boolean).join(' · ')}
                </p>
                {medication.frequency_per_day && (
                    <p className="text-body-md text-ink-muted">
                        {frequencyText(medication.frequency_per_day)} · {eyeLabel(medication.eye)}
                    </p>
                )}
                {change && <p className="text-body-md text-ink-muted">{change}</p>}
            </div>
        </div>
    );
}
