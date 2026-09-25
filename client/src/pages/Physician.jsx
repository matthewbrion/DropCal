import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyPatients } from '../lib/patients';

export default function Physician() {
    const auth = useAuth();
    const [patients, setPatients] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (auth.loading) {
            return;
        }
        getMyPatients()
            .then((data) => setPatients(data.patients))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [auth.loading]);

    if (auth.loading || loading) {
        return (
            <div className="flex items-center justify-center py-section-gap">
                <p className="text-body-lg text-ink-muted">Loading your patients...</p>
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

    if (patients.length === 0) {
        return (
            <div className="flex items-center justify-center px-gutter-mobile py-section-gap">
                <p className="text-body-lg text-ink-muted text-center">
                    You haven't assigned a routine to anyone yet.
                </p>
            </div>
        );
    }

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <header>
                    <h1 className="text-headline-lg text-ink">My Patients</h1>
                    <p className="text-body-md text-ink-muted mt-1">
                        {patients.length === 1 ? '1 patient' : `${patients.length} patients`} with a routine you assigned.
                    </p>
                </header>
                <div className="bg-surface-card rounded-md">
                    {patients.map((patient, i) => (
                        <PatientRow
                            key={patient.patient_id}
                            patient={patient}
                            isLast={i === patients.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function PatientRow({ patient, isLast }) {
    let borderClass = 'border-b border-border-subtle';
    if (isLast) {
        borderClass = '';
    }

    return (
        <Link
            to={`/physician/${patient.patient_id}`}
            className={`flex items-center justify-between gap-3 px-card-padding py-card-padding ${borderClass}`}
        >
            <div>
                <p className="text-headline-md text-ink">{patient.name}</p>
                <p className="text-body-md text-ink-muted">
                    {patient.protocol_name}
                    {patient.is_active && ` · Week ${patient.current_week} of ${patient.total_weeks}`}
                </p>
            </div>
            <p className="text-body-md text-ink-muted text-right whitespace-nowrap">
                {patient.is_active
                    ? `${patient.logged_today} of ${patient.expected_today} today`
                    : 'Plan ended'}
            </p>
        </Link>
    );
}
