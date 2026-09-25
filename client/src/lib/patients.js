const BASE_URL = '/api/patients';

export async function getMyPatients() {
    const res = await fetch(BASE_URL, {
        credentials: 'include',
    });
    if (res.status === 403) {
        throw new Error('This page is for physicians.');
    }
    if (!res.ok) {
        throw new Error('Failed to fetch your patients.');
    }
    return res.json();
}

export async function getPatient(patientId) {
    const res = await fetch(`${BASE_URL}/${patientId}`, {
        credentials: 'include',
    });
    if (res.status === 403) {
        throw new Error('This page is for physicians.');
    }
    if (res.status === 404) {
        throw new Error('That patient is not on your list.');
    }
    if (!res.ok) {
        throw new Error('Failed to fetch that patient.');
    }
    return res.json();
}

export async function assignProtocol(assignment) {
    const res = await fetch('/api/patient-protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(assignment),
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to assign that routine.');
    }
    return res.json();
}

export async function getPatientHistory(patientId) {
    const res = await fetch(`${BASE_URL}/${patientId}/history`, {
        credentials: 'include',
    });
    if (!res.ok) {
        throw new Error('Failed to fetch that patient\'s history.');
    }
    return res.json();
}
