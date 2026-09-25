import { useEffect, useState } from "react";
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatient } from '../lib/patients';
import { dateText } from '../lib/medicationFormatting';

export default function PatientProfile() {
    const auth = useAuth();
    const { patientId } = useParams();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (auth.loading) {
            return;
        }
        getPatient(patientId)
            .then(setPatient)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [auth.loading, patientId]);

    if (auth.loading || loading) {
        return (
            <div className="flex items-center justify-center py-section-gap">
                <p className="text-body-lg text-ink-muted">Loading patient...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-flow-gap px-gutter-mobile py-section-gap">
                <p className="text-body-lg text-error">{error}</p>
                <Link to="/physician" className="text-body-md text-primary font-medium">
                    Back to my patients
                </Link>
            </div>
        );
    }

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <Link to="/physician" className="text-body-md text-primary font-medium">
                    Back to my patients
                </Link>

                <header>
                    <h1 className="text-headline-lg text-ink">{patient.name}</h1>
                    <p className="text-body-md text-ink-muted mt-1">{patient.email}</p>
                </header>

                <div className="bg-surface-card rounded-md p-card-padding">
                    <p className="text-headline-md text-ink">{patient.protocol_name}</p>
                    <p className="text-body-md text-ink-muted mt-1">
                        Started {dateText(patient.start_date)}
                        {patient.is_active
                            ? ` · Week ${patient.current_week} of ${patient.total_weeks}`
                            : ' · Plan ended'}
                    </p>
                </div>

                {patient.is_active && (
                    <div className="bg-surface-card rounded-md p-card-padding">
                        <p className="text-label-sm text-ink-muted">Today</p>
                        <p className="text-headline-md text-ink mt-1">
                            {patient.logged_today} of {patient.expected_today} doses logged
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
