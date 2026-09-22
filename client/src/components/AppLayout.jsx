import { NavLink, Outlet } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";

const navLinks = [
    { to: '/', label: 'Home', end: true },
    { to: '/protocols', label: 'Protocols' },
    { to: '/medications', label: 'Medications' },
    { to: '/physician', label: 'Physician' },
];

function navLinkClassName({ isActive }) {
     let classes = 'whitespace-nowrap rounded-md px-4 py-2 text-label-md text-ink-muted';
     if (isActive) {
        classes = 'whitespace-nowrap rounded-md px-4 py-2 text-label-md text-on-primary bg-primary';
     }
     return classes;
}

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-surface">
            <header className="flex items-center justify-between border-b border-border-subtle bg-surface-card px=gutter-mobile py-4 md:px-gutter-desktop">
                <span className="text-headline-md text-ink">DropCal</span>
                <ProfileMenu />
            </header>
            <div className="md:flex">
                <nav className="flex gap-flow-gap overflow-x-auto border-b border-border-subtle bg-surface-card px-gutter-mobile py-3 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-card-padding md:py-section-gap">
                    {navLinks.map((link) => (
                        <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClassName}>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}