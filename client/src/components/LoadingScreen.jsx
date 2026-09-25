import { useEffect, useState } from "react";

//the API sleeps after a while with no traffic, so the very first request of the day
//can take close to a minute.  say so rather than looking broken.
export default function LoadingScreen({ message }) {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setSlow(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-flow-gap px-gutter-mobile">
            <p className="text-body-lg text-ink-muted">{message}</p>
            {slow && (
                <p aria-live="polite" className="text-body-md text-ink-muted text-center max-w-[420px]">
                    Waking up the server.  The first visit of the day can take up to a minute.
                </p>
            )}
        </div>
    );
}
