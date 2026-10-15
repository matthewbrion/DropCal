//true only when the url points at a database on this machine
//anything else, including a missing url, counts as remote
export function isLocalDatabase(url) {
    if (!url) {
        return false;
    }
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
}
