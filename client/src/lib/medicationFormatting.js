export function frequencyText(count) {
    if (count === 1) {
        return '1 time a day';
    }
    return `${count} times a day`;
}

export function eyeLabel(eye) {
    if (eye === 'both') {
        return 'Both eyes';
    }
    if (eye === 'left') {
        return 'Left eye';
    }
    if (eye === 'right') {
        return 'Right eye';
    }
    return eye;
}

export function timeText(value) {
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

//log dates arrive as 'YYYY-MM-DD' strings, so build the date from the parts
//rather than letting new Date() read them as UTC and shift the day
export function dateText(value) {
    const parts = value.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function doseCountText(logged, expected) {
    return `${logged} of ${expected} doses`;
}
