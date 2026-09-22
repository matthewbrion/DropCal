export default function Logo({ className }) {
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
            <rect x="17" y="2" width="7" height="14" rx="3.5" className="fill-primary-active" />
            <rect x="40" y="2" width="7" height="14" rx="3.5" className="fill-primary-active" />
            <rect x="4" y="9" width="56" height="53" rx="12" className="fill-primary-active" />
            <path d="M4 25H60V50A12 12 0 0 1 48 62H16A12 12 0 0 1 4 50Z" className="fill-primary" />
            <path d="M32 17C36.83 27.92 43.5 32.6 43.5 43A11.5 11.5 0 0 1 20.5 43C20.5 32.6 27.17 27.92 32 17Z" className="fill-surface-card" />
        </svg>
    );
}
