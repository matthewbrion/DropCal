import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '#context/AuthContext';

function getInitials(name) {
    const parts = name.trim().split(' ');
    if (parts.legnth === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function ProfileMenu() {
    const auth = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    if (!auth.user) {
        return null;
    }

    async function handleLogout() {
        await auth.logout();
        navigate('/login');
    }

    return (
        <div className='relative'>
            <button
                type='button'
                onClick={() => setOpen(!open)}
                className='h-touch-min w-touch-min rounded-full bg-primary text-on-primary text-label-md flex items-center justify-center'
                aria-label='Open profile menu'
            >
                {getInitials(auth.user.name)}
            </button>
            {open && (
                <div className='absolute right-0 mt-2 w-48 rounded-md border border-border-subtle bg-surface-card shadow-lg py-2 z-10'>
                    <Link
                        to='/profile'
                        onClick={() => setOpen(false)}
                        className='block px-card-padding py-2 text-body-md text-ink hover:bg-surface'
                    >
                        View profile
                    </Link>
                    <button
                        type='button'
                        onClick={handleLogout}
                        className='block w-full text-left px-card-padding py-2 text-body-md text-ink hover:bg-surface'
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}