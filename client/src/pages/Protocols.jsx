import { useEffect, useState } from "react";
import { useAuth } from '../context/AuthContext';
import { getMyProtocol, getDoseHistory } from '../lib/patientProtocols';
import { frequencyText, eyeLabel, dateText, doseCountText } from '../lib/medicationFormatting';

export default function Protocols() {
    const auth = useAuth();
    const [protocol, setProtocol] = useState(null);
    const [history, setHistory] = useState(null);
    const [protocolLoading, setProtocolLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (auth.loading) {
            return;
        }
        getMyProtocol()
            .then(setProtocol)
            .catch((e) => setError(e.message))
            .finally(() => setProtocolLoading(false));
    }, [auth.loading]);

    useEffect(() => {
        if (auth.loading) {
            return;
        }
        getDoseHistory()
            .then(setHistory)
            .catch((e) => setError(e.message))
            .finally(() => setHistoryLoading(false));
    }, [auth.loading]);

    if (auth.loading || protocolLoading || historyLoading) {
        return (
            <div className="flex items-center justify-center py-section-gap">
                <p className="text-body-lg text-ink-muted">Loading your schedule...</p>
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

    const courses = history.courses;

    if (courses.length === 0) {
        return (
            <div className="flex items-center justify-center px-gutter-mobile py-section-gap">
                <p className="text-body-lg text-ink-muted text-center">
                    Your doctor hasn't assigned a routine yet.
                </p>
            </div>
        );
    }

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <header>
                    <h1 className="text-headline-lg text-ink">My Protocols</h1>
                    <p className="text-body-md text-ink-muted mt-1">
                        Your current and past routines, with what you logged each day.
                    </p>
                </header>
                {courses.map((course) => (
                    <CourseCard
                        key={course.patient_protocol_id}
                        course={course}
                        plan={protocol}
                    />
                ))}
            </div>
        </div>
    );
}

//the plan from /me covers the active course, so future weeks can be listed
//alongside the weeks that already have history
function weeksForCourse(course, plan) {
    const weeks = course.weeks.map((week) => ({ ...week, planned: null }));

    if (course.status !== 'active' || !plan) {
        return weeks;
    }

    for (const plannedWeek of plan.weeks) {
        const week = weeks.find((w) => w.week_number === plannedWeek.week_number);
        if (week) {
            week.planned = plannedWeek;
        } else {
            weeks.push({
                week_number: plannedWeek.week_number,
                expected: 0,
                logged: 0,
                days: [],
                planned: plannedWeek,
            });
        }
    }

    weeks.sort((a, b) => a.week_number - b.week_number);
    return weeks;
}

function CourseCard({ course, plan }) {
    const weeks = weeksForCourse(course, plan);
    const currentWeek = weeks.filter((week) => week.days.length > 0).pop();
    const isActive = course.status === 'active';

    return (
        <details className="bg-surface-card rounded-md" open={isActive}>
            <summary className="px-card-padding py-card-padding cursor-pointer list-none">
                <p className="text-headline-md text-ink">{course.protocol_name}</p>
                <p className="text-body-md text-ink-muted mt-1">
                    {dateText(course.start_date)} to {dateText(course.end_date)} · {isActive ? 'Active' : 'Completed'}
                </p>
                <p className="text-body-md text-ink mt-1">
                    {doseCountText(course.logged, course.expected)} logged
                </p>
            </summary>
            <div className="border-t border-border-subtle">
                {weeks.map((week) => (
                    <WeekSection
                        key={week.week_number}
                        week={week}
                        isCurrent={isActive && currentWeek && week.week_number === currentWeek.week_number}
                    />
                ))}
            </div>
        </details>
    );
}

function WeekSection({ week, isCurrent }) {
    const medications = week.planned ? week.planned.medications : medicationsFromDays(week.days);
    const hasHistory = week.days.length > 0;

    return (
        <details className="border-b border-border-subtle last:border-b-0" open={isCurrent}>
            <summary className="px-card-padding py-4 cursor-pointer list-none flex items-baseline justify-between gap-3">
                <span className="text-body-lg text-ink">Week {week.week_number}</span>
                <span className="text-body-md text-ink-muted">
                    {hasHistory ? doseCountText(week.logged, week.expected) : 'Not started'}
                </span>
            </summary>

            <div className="px-card-padding pb-card-padding">
                <ul className="mb-flow-gap">
                    {medications.map((medication) => (
                        <li key={`${medication.name}-${medication.eye}`} className="text-body-md text-ink-muted">
                            {medication.name} · {frequencyText(medication.frequency_per_day ?? medication.expected)} · {eyeLabel(medication.eye)}
                        </li>
                    ))}
                </ul>

                {week.days.map((day) => (
                    <DayRow key={day.log_date} day={day} />
                ))}
            </div>
        </details>
    );
}

//a completed course has no plan to read from, so take the medications from any of its days
function medicationsFromDays(days) {
    if (days.length === 0) {
        return [];
    }
    return days[0].medications;
}

function DayRow({ day }) {
    const short = day.logged < day.expected && !day.is_today;

    return (
        <div className="py-2 border-t border-border-subtle">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-body-md text-ink whitespace-nowrap">
                    {day.is_today ? 'Today' : dateText(day.log_date)}
                </span>
                <span className="text-body-md text-ink-muted whitespace-nowrap">
                    {day.logged} of {day.expected}
                </span>
            </div>
            {short && day.medications.length > 1 && (
                <p className="text-label-sm text-ink-muted mt-1">
                    {day.medications
                        .filter((medication) => medication.logged < medication.expected)
                        .map((medication) => `${medication.name} · ${eyeLabel(medication.eye)} ${medication.logged} of ${medication.expected}`)
                        .join(', ')}
                </p>
            )}
        </div>
    );
}
