import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyProtocol, getTodaysDoseSummary, logDose, undoLastDose } from "../lib/patientProtocols";
import { frequencyText, eyeLabel, timeText, dateText } from "../lib/medicationFormatting";

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

    function refreshToday() {
        return getTodaysDoseSummary().then(setToday);
    }

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
    const notStarted = today.not_started === true;

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <header className="mb-flow-gap rounded-xl bg-primary p-card-padding text-on-primary">
                    <h1 className="text-headline-lg">{getGreeting()}, {firstName(auth.user.name)}</h1>
                    <p className="text-body-md mt-1">{protocol.protocol_name}</p>
                    {!ended && (
                        <>
                            <p className="text-body-md">
                                {notStarted ? 'Starting soon' : `Week ${currentWeekNumber} of ${protocol.weeks.length}`}
                            </p>
                            <div className="mt-flow-gap flex flex-col gap-3">
                                <DoseDrops loggedCount={summary.loggedCount} totalCount={summary.totalCount} />
                                <p className="text-body-lg">
                                    {notStarted
                                        ? `Your routine starts ${dateText(today.starts_on)}`
                                        : `${summary.loggedCount} of ${summary.totalCount} doses logged today`}
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
                    <div className="bg-surface-card rounded-md">
                        {today.medications.map((med, i) => (
                            <RoutineLogItem
                                key={med.protocol_week_id}
                                medication={med}
                                isLast={i === today.medications.length - 1}
                                notStarted={notStarted}
                                startsOn={today.starts_on}
                                onChange={refreshToday}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// one drop per dose due today: solid after log, outlined until then
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

function RoutineLogItem({ medication, isLast, notStarted, startsOn, onChange }) {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const done = medication.logged_count >= medication.frequency_per_day;

    let borderClass = 'border-b border-border-subtle';
    if (isLast) {
        borderClass = '';
    }

    let statusBackground = 'bg-surface';
    let statusText = 'text-ink';
    if (done) {
        statusBackground = 'bg-success';
        statusText = 'text-on-success';
    }

    let buttonClass = 'bg-primary text-on-primary';
    if (done || notStarted) {
        buttonClass = 'bg-success-surface text-success';
    }

    let buttonLabel = 'Took my drops';
    if (notStarted) {
        buttonLabel = `Starts ${dateText(startsOn)}`;
    } else if (done) {
        buttonLabel = 'Done for today!';
    }

    async function handleLog() {
        setSaving(true);
        setMessage(null);
        try {
            await logDose(medication.protocol_week_id);
            await onChange();
        } catch (e) {
            setMessage(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleUndo() {
        setSaving(true);
        setMessage(null);
        try {
            await undoLastDose(medication.protocol_week_id);
            await onChange();
        } catch (e) {
            setMessage(e.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={`py-card-padding px-card-padding ${borderClass}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-headline-md text-ink">{medication.name}</p>
                    <p className="text-body-md text-ink-muted">
                        {frequencyText(medication.frequency_per_day)} · {eyeLabel(medication.eye)}
                    </p>
                </div>
                <div className={`h-touch-target w-touch-target rounded-full flex items-center justify-center transition-colors ${statusBackground}`}
                    aria-label={`${medication.logged_count} of ${medication.frequency_per_day} logged today`}
                >
                    <span className={`text-label-md ${statusText}`}>
                        {medication.logged_count}/{medication.frequency_per_day}
                    </span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleLog}
                disabled={done || saving || notStarted}
                className={`mt-flow-gap w-full h-touch-target rounded-md text-label-lg font-semibold transition-colors ${buttonClass}`}
            >
                {buttonLabel}
            </button>

            {message && (
                <p role="alert" aria-live='polite' className="mt-2 text-body-md text-error">{message}</p>
            )}

            {!message && medication.last_taken_at && (
                <p aria-live='polite' className="mt-2 text-body-md text-ink-muted">
                    Last taken {timeText(medication.last_taken_at)} ·{' '}
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={saving}
                        className="text-primary font-medium underline px-1 py-2"
                    >
                        Undo
                    </button>
                </p>
            )}
        </div>
    );
}