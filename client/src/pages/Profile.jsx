import { useAuth } from "#context/AuthContext";

export default function Profile() {
    const auth = useAuth();

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop pv-section-gap">
            <div className="max-w-[640px] mx-auto flex flex-col gap-flow-gap">
                <header>
                    <h1 className="text-headline-lg text-ink">My Profile</h1>
                </header>
                <div className="bg-surface-card rounded-md p-card-padding flex flex-col gap-flow-gap">
                    <div>
                        <p className="text-label-sm text-ink-muted">Name</p>
                        <p className="text-body-lg text-ink">{auth.user.name}</p>
                    </div>
                    <div>
                        <p className='text-label-sm text-ink-muted'>Email</p>
                        <p className="text-body-lg text-ink">{auth.user.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}