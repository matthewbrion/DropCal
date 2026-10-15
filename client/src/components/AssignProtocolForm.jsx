import { useEffect, useState } from "react";
import { getProtocols } from '../lib/protocols';
import { assignProtocol } from '../lib/patients';

//used two ways: with a patientId for someone already on the doctor's list,
//and without one for a patient they are adding by email
export default function AssignProtocolForm({ patientId, onAssigned }) {
    const [protocols, setProtocols] = useState([]);
    const [email, setEmail] = useState('');
    const [protocolId, setProtocolId] = useState('');
    const [startDate, setStartDate] = useState(todayDateString());
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        getProtocols()
            .then((data) => setProtocols(data.protocols))
            .catch((e) => setMessage(e.message));
    }, []);

    async function handleSubmit(n) {
        n.preventDefault();
        setSaving(true);
        setMessage(null);

        const assignment = {
            protocol_id: Number(protocolId),
            start_date: startDate,
        };

        if (patientId) {
            assignment.patient_id = patientId;
        } else {
            assignment.patient_email = email;
        }

        try {
            await assignProtocol(assignment);
            await onAssigned();
        } catch (e) {
            setMessage(e.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-surface-card rounded-md p-card-padding flex flex-col gap-flow-gap">
            <p className="text-headline-md text-ink">Assign a routine</p>

            {!patientId && (
                <label className="text-label-md text-ink">
                    Patient email
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(n) => setEmail(n.target.value)}
                        placeholder="patient@example.com"
                        className="mt-1 h-touch-min w-full px-3.5 text-body-md text-ink placeholder:text-ink-muted rounded-md bg-surface outline outline-1 -outline-offset-1 outline-border-control focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                    />
                </label>
            )}

            <label className="text-label-md text-ink">
                Routine
                <select
                    required
                    value={protocolId}
                    onChange={(n) => setProtocolId(n.target.value)}
                    className="mt-1 h-touch-min w-full px-3 text-body-md text-ink rounded-md bg-surface outline outline-1 -outline-offset-1 outline-border-control focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                >
                    <option value="">Choose a routine</option>
                    {protocols.map((protocol) => (
                        <option key={protocol.id} value={protocol.id}>
                            {protocol.name} ({protocol.total_weeks} weeks)
                        </option>
                    ))}
                </select>
            </label>

            <label className="text-label-md text-ink">
                Start date
                <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(n) => setStartDate(n.target.value)}
                    className="mt-1 h-touch-min w-full px-3.5 text-body-md text-ink rounded-md bg-surface outline outline-1 -outline-offset-1 outline-border-control focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                />
            </label>

            {message && (
                <p role="alert" className="text-body-md text-error">{message}</p>
            )}

            <button
                type="submit"
                disabled={saving}
                className="h-touch-target w-full rounded-md text-label-lg font-semibold bg-primary text-on-primary transition-colors"
            >
                {saving ? 'Assigning...' : 'Assign routine'}
            </button>
        </form>
    );
}

//the date input wants YYYY-MM-DD in the doctor's own timezone, so build it from the parts
function todayDateString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}
