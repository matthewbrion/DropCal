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