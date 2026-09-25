const BASE_URL = '/api/protocols';

export async function getProtocols() {
    const res = await fetch(BASE_URL, {
        credentials: 'include',
    });
    if (!res.ok) {
        throw new Error('Failed to fetch the available routines.');
    }
    return res.json();
}

export async function getProtocol(protocolId) {
    const res = await fetch(`${BASE_URL}/${protocolId}`, {
        credentials: 'include',
    });
    if (!res.ok) {
        throw new Error('Failed to fetch that routine.');
    }
    return res.json();
}
