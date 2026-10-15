//The server runs in UTC on Render, so "today" has to be worked out in the patient's
//own zone.  Everything here takes an IANA zone name like 'America/Detroit'.

const FALLBACK_TIME_ZONE = process.env.APP_TIMEZONE || 'America/New_York';

//a bad zone name makes Postgres throw on AT TIME ZONE, so check before storing one
export function isValidTimeZone(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
    } catch (e) {
        return false;
    }
}

export function resolveTimeZone(value) {
    if (isValidTimeZone(value)) {
        return value;
    }
    return FALLBACK_TIME_ZONE;
}

//'YYYY-MM-DD' for right now in the given zone
export function todayInZone(timezone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: resolveTimeZone(timezone),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const parts = {};
    for (const part of formatter.formatToParts(new Date())) {
        parts[part.type] = part.value;
    }

    return `${parts.year}-${parts.month}-${parts.day}`;
}
