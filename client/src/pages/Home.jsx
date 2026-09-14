import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyProtocol } from "../lib/patiientProtocols";

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

function frequencyText(count) {
    if (count === 1) {
        return '1 time a day';
    }
    return `${count} times a day`;
}

function eyeLabel(eye) {
    if (eye === 'both') {
        return 'Both eyes';
    }
    if (eye === 'left') {
        return 'Left eye';
    }
    if (eye === 'right') {
        return 'Right eye';
    }
    return eye;
}

export default function Home() {
    const auth = useAuth();
    const [protocol, setProtocol] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (auth.loading) {
            return;
        }
        getMyProtocol()
            .then(setProtocol)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [auth.loading]);

    if (auth.loading || loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <p className="text-body-lg text-ink-muted">Loading your routine...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center px-gutter-mobile">
                <p className="text-body-lg text-error">{error}</p>
            </div>
        );
    }

    const hasProtocol = protocol && protocol.weeks.length > 0;

    if (!hasProtocol) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center px-gutter-mobile">
                <p className="text-body-lg text-ink-muted text-center">
                    Your doctor hasn't assigned a routine yet.
                </p>
            </div>
        );
    }

    const currentWeekNumber = getCurrentWeekNumber(protocol.start_date, protocol.weeks.length);
    const ended = currentWeekNumber === null;
    const currentWeek = !ended
        ? protocol.weeks.find((w) => w.week_number === currentWeekNumber)
        : null;

    return (
        <div className="min-h-screen bg-surface px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <header className="mb-flow-gap">
                    <h1 className="text-headline-lg text-ink">{protocol.protocol_name}</h1>
                    {!ended && (
                        <p className="text-body-md text-ink-muted mt-1">
                            Week {currentWeekNumber} of {protocol.weeks.length}
                        </p>
                    )}
                </header>

                {ended ? (
                    <p className="text-body-lg text-ink-muted">
                        Your care plan has ended.  Reach out to your doctor with any questions.
                    </p>
                ) : (
                    <div className="bg-surface-card rounded-md">
                        {currentWeek.medications.map((med, i) => (
                            <RoutineLogItem
                                key={med.medication_id}
                                medication={med}
                                isLast={i === currentWeek.medications.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}