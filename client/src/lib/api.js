const BASE_URL = '/api/auth';

export async function registerUser({ name, email, password }) {
    const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });
    if (res.status === 201) {
        return res.json();
    }
    if (res.status === 409) {
        throw new Error('That email is already registered.');
    }
    throw new Error('Something went wrong creating your account.  Please try again.');
}

export async function loginUser({ email, password }) {
    const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        throw new Error('Invalid email or password.');
    }
    return res.json();
}

export async function getCurrentUser() {
    const res = await fetch(`${BASE_URL}/me`, {
        credentials: 'include', //redundant, future requirement when vite proxy isn't used to maintain user sessions with cookie-parser
    });
    if (res.status === 401) {
        return null;
    }
    if (!res.ok) {
        throw new Error('Failed to fetch current user.');
    }
    return res.json();
}