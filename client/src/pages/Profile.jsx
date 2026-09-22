import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const themeOptions = [
    { value: 'system', label: 'Match my device' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

export default function Profile() {
    const auth = useAuth();
    const theme = useTheme();

    return (
        <div className="px-gutter-mobile md:px-gutter-desktop py-section-gap">
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
                <div className="bg-surface-card rounded-md p-card-padding flex flex-col">
                    <p id="appearance-label" className="text-label-sm text-ink-muted">Appearance</p>
                    <div role="radiogroup" aria-labelledby="appearance-label" className="flex flex-col">
                        {themeOptions.map((option) => (
                            <label key={option.value} className="flex min-h-touch-min items-center gap-3 text-body-lg text-ink">
                                <input
                                    type="radio"
                                    name="theme"
                                    value={option.value}
                                    checked={theme.choice === option.value}
                                    onChange={() => theme.changeTheme(option.value)}
                                    className="h-5 w-5 accent-primary"
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}