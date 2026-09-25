const BASE_URL = '/api/patient-protocols';

export async function getMyProtocol() {
    const res = await fetch(`${BASE_URL}/me`, {
        credentials: 'include',
    });
    if (!res.ok) {
        throw new Error('Failed to fetch your protocol.');
    }
    return res.json();
}

export async function getTodaysDoseSummary() {
    const res = await fetch(`${BASE_URL}/me/today`, {
        credentials: 'include',
    });
    if (!res.ok) {
        throw new Error("Failed to fetch today's doses.");
    }
    return res.json();
}

export async function logDose(protocolWeekId) {
    const res = await fetch(`${BASE_URL}/me/doses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ protocol_week_id: protocolWeekId }),
    });
    if (!res.ok) {
        throw new Error("Couldn't save.  Please try again.");
    }
    return res.json();
}

export async function undoLastDose(protocolWeekId) {
    const res = await fetch(`${BASE_URL}/me/doses`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ protocol_week_id: protocolWeekId }),
    });
    if (!res.ok) {
        throw new Error("Couldn't undo.  Please try again.");
    }
    return res.json();
}

export async function getDoseHistory() {
    const res = await fetch(`${BASE_URL}/me/history`, {
        credentials: 'include',
    });
    if (!res.ok) {
        throw new Error('Failed to fetch your dose history.');
    }
    return res.json();
}
