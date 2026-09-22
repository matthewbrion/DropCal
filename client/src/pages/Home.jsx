import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyProtocol, getTodaysDoseSummary } from "../lib/patientProtocols";
import { frequencyText, eyeLabel } from "../lib/medicationFormatting";

function getCurrentWeekNumber(startDate, totalWeeks) {
    const start = new Date(startDate);
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const msElapsed = today - start;
    const weeksElapsed = Math.floor(msElapsed / msPerWeek);
    const currentWeek = weeksElapsed + 1;

    if (currentWeek > totalWeeks) {
        return null; //protocol has ended
    }
    if (currentWeek < 1) {
        return 1;
    }
    return currentWeek;
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Good morning';
    }
    if (hour < 17) {
        return 'Good afternoon';
    }
    return 'Good evening';
}

function firstName(fullName) {
    return fullName.split(' ')[0];
}

function doseSummary(medications) {
    let loggedCount = 0;
    let totalCount = 0;
    for (const medication of medications) {
        loggedCount += medication.logged_count;
        totalCount += medication.frequency_per_day;
    }
    return { loggedCount, totalCount };
}

export default function Home() {
    const auth = useAuth();
    const [protocol, setProtocol] = useState(null);
    const [today, setToday] = useState(null);
    const [protocolLoading, setProtocolLoading] = useState(true);
    const [todayLoading, setTodayLoading] = useState(true);
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
        getTodaysDoseSummary()
            .then(setToday)
            .catch((e) => setError(e.message))
            .finally(() => setTodayLoading(false));
    }, [auth.loading]);

    if (auth.loading || protocolLoading || todayLoading) {
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

    const hasProtocol = protocol && protocol.weeks.length > 0;

    if (!hasProtocol) {
        return (
            <div className="flex items-center justify-center px-gutter-mobile py-section-gap">
                <p className="text-body-lg text-ink-muted text-center">
                    Your doctor hasn't assigned a routine yet.
                </p>
            </div>
        );
    }

    const currentWeekNumber = getCurrentWeekNumber(protocol.start_date, protocol.weeks.length);
    const ended = currentWeekNumber === null;
    const summary = ended ? null : doseSummary(today.medications);

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <header className="mb-flow-gap rounded-xl bg-primary p-card-padding text-on-primary">
                    <h1 className="text-headline-lg">{getGreeting()}, {firstName(auth.user.name)}</h1>
                    <p className="text-body-md mt-1">{protocol.protocol_name}</p>
                    {!ended && (
                        <>
                            <p className="text-body-md">
                                Week {currentWeekNumber} of {protocol.weeks.length}
                            </p>
                            <div className="mt-flow-gap flex flex-col gap-3">
                                <DoseDrops loggedCount={summary.loggedCount} totalCount={summary.totalCount} />
                                <p className="text-body-lg">
                                    {summary.loggedCount} of {summary.totalCount} doses logged today
                                </p>
                            </div>
                        </>
                    )}
                </header>

                {ended ? (
                    <p className="text-body-lg text-ink-muted">
                        Your care plan has ended.  Reach out to your doctor with any questions.
                    </p>
                ) : (
                    <>
                        <div className="bg-surface-card rounded-md">
                            {today.medications.map((med, i) => (
                                <RoutineLogItem
                                    key={`${med.medication_id}-${med.eye}`}
                                    medication={med}
                                    isLast={i === today.medications.length - 1}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// one drop per dose due today: solid once logged, outline while still to take
function DoseDrops({ loggedCount, totalCount }) {
    const drops = [];
    for (let i = 0; i < totalCount; i++) {
        drops.push(i < loggedCount);
    }
    return (
        <div className="flex flex-wrap gap-2" aria-hidden="true">
            {drops.map((logged, i) => (
                <svg key={i} viewBox="0 0 24 39.1" className="h-8 w-5 overflow-visible">
                    <path
                        d="M12 0C17.04 11.38 24 16.26 24 27.1A12 12 0 0 1 0 27.1C0 16.26 6.96 11.38 12 0Z"
                        strokeWidth="2"
                        className={logged ? 'fill-on-primary stroke-on-primary' : 'fill-none stroke-on-primary'}
                    />
                </svg>
            ))}
        </div>
    );
}

function RoutineLogItem({ medication, isLast }) {
    const done = medication.logged_count >= medication.frequency_per_day;

    let borderClass = 'border-b border-border-subtle';
    if (isLast) {
        borderClass = '';
    }

    let statusBackground = 'bg-surface';
    if (done) {
        statusBackground = 'bg-success-surface';
    }

    return (
        <div className={`flex items-center justify-between py-card-padding px-card-padding ${borderClass}`}>
            <div>
                <p className="text-headline-md text-ink">{medication.name}</p>
                <p className="text-body-md text-ink-muted">
                    {frequencyText(medication.frequency_per_day)} · {eyeLabel(medication.eye)}
                </p>
            </div>
            {/* 'log a dose' to come once a route is built */}
            <div className={`h-touch-target w-touch-target rounded-full flex items-center justify-center transition-colors ${statusBackground}`}
                aria-label={`${medication.logged_count} of ${medication.frequency_per_day} logged today`}
            >
                <span className="text-label-md text-ink">
                    {medication.logged_count}/{medication.frequency_per_day}
                </span>
            </div>
        </div>
    );
}