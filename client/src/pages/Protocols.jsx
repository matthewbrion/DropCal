import { useEffect, useState } from "react";
import { useAuth } from '../context/AuthContext';
import { getMyProtocol } from '../lib/patientProtocols';
import { frequencyText, eyeLabel } from '../lib/medicationFormatting';

export default function Protocols() {
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

    const hasProtocol = protocol && protocol.weeks.length > 0;

    if (!hasProtocol) {
        return (
            <div className="flex item-center justify-center px-gutter-mobile py-section-gap">
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
                    <h1 className="text-headline-lg text-ink">{protocol.protocol_name}</h1>
                    <p className="text-body-md text-ink-muted mt-1">
                        {protocol.weeks.length} week schedule
                    </p>
                </header>
                {protocol.weeks.map((week) => (
                    <WeekCard key={week.week_number} week={week} />
                ))}
            </div>
        </div>
    );
}

function WeekCard({ week }) {
    return (
        <div className="bg-surface-card rounded-md">
            <p className="text-headline-md text-ink px-card-oadding pt-card-padding">
                Week {week.week_number}
            </p>
            <div>
                {week.medications.map((medication, i) => (
                    <MedicationRow
                        key={medication.medication_id}
                        medication={medication}
                        isLast={i === week.medications.length - 1}
                    />
                ))}
            </div>
        </div>
    );
}

function MedicationRow({ medication, isLast }) {
    let borderClass = 'border-b border-border-subtle';
    if (isLast) {
        borderClass = '';
    }

    return (
        <div className={`px-card-padding py-card-padding ${borderClass}`}>
            <p className="text-body-lg text-ink">{medication.name}</p>
            <p className="text-body-md text-ink-muted">
                {frequencyText(medication.frequency_per_day)} · {eyeLabel(medication.eye)}
            </p>
        </div>
    );
}