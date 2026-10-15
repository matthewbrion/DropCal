import { useEffect, useState } from "react";
import { useAuth } from '../context/AuthContext';
import { getMyProtocol, getDoseHistory } from '../lib/patientProtocols';
import DoseHistory from '../components/DoseHistory';

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
                <DoseHistory courses={courses} plan={protocol} />
            </div>
        </div>
    );
}
