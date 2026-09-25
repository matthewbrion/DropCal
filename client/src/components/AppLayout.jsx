import { NavLink, Outlet } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

const patientLinks = [
    { to: '/', label: 'Home', end: true },
    { to: '/protocols', label: 'Protocols' },
    { to: '/medications', label: 'Medications' },
];

const doctorLinks = [
    { to: '/physician', label: 'My Patients', end: true },
];

function linksForRole(role) {
    if (role === 'doctor') {
        return doctorLinks;
    }
    return patientLinks;
}

function navLinkClassName({ isActive }) {
     let classes = 'whitespace-nowrap rounded-md px-4 py-2 text-label-md text-ink-muted';
     if (isActive) {
        classes = 'whitespace-nowrap rounded-md px-4 py-2 text-label-md text-on-primary bg-primary';
     }
     return classes;
}

export default function AppLayout() {
    const auth = useAuth();
    const navLinks = linksForRole(auth.user?.role);

    return (
        <div className="min-h-screen flex flex-col bg-surface">
            <header className="flex items-center justify-between border-b border-border-subtle bg-surface-card px-gutter-mobile py-4 md:px-gutter-desktop">
                <div className="flex items-center gap-3">
                    <Logo className="h-9 w-9" />
                    <span className="text-headline-md text-ink">Drop<span className="text-primary">Cal</span></span>
                </div>
                <ProfileMenu />
            </header>
            <div className="flex-1 md:flex">
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