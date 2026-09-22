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