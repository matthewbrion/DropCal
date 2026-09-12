import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { registerUser } from "../lib/api";

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    async function handleSubmit(n) {
        n.preventDefault();
        setError(null);
        try {
            await registerUser({ name, email, password });
            navigate('/login', { state: { justRegistered: true } });
        } catch (e) {
            setError(e.message || 'Something went wrong.  Please try again.');
        }
    }

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-5">
            <div className="w-full max-w-sm">
                <h1 className="text-[26px] leading-[34px] tracking-[-0.01em] font-semibold text-ink mb-6 text-center">
                    Create an account
                    </h1>

                <form onSubmit={handleSubmit} className='mb-2 text-ink font-medium text-sm inline-block w-full'>
                    <label>
                        Name
                        <input
                            type='text'
                            required
                            className="mt-1 px-3.5 h-[52px] text-sm text-ink rounded-[10px] bg-surface-card w-full outline outline-1 -outline-offset-1 outline-border-subtle focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                            value={name}
                            onChange={(n) => setName(n.target.value)}
                        />
                    </label>

                    <label className="mb-2 text-ink font-medium text-sm inline-block w-full">
                        Email
                        <input
                            type='email'
                            required
                            className="mt-1 px-3.5 h-[52px] text-sm text-ink rounded-[10px] bg-surface-card w-full outline outline-1 -outline-offset-1 outline-border-subtle focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                            value={email}
                            onChange={(n) => setEmail(n.target.value)}
                        />
                    </label>
                    <label htmlFor='password' className='mb-2 text-ink font-medium text-sm inline-block w-full'>
                        Password
                        <input
                            type='password'
                            required
                            className="mt-1 px-3.5 h-[52px] text-sm text-ink rounded-[10px] bg-surface-card w-full outline outline-1 -outline-offset-1 outline-border-subtle focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                            value={password}
                            onChange={(n) => setPassword(n.target.value)}
                        />
                    </label>
                    {error && <p role='alert' className='text-sm text-error bg-error-surface rounded-[10px] px-3.5 py-2.5'>{error}</p>}
                    <button type='submit' className='!mt-2 w-full h-14 text-sm rounded-[12px] font-semibold tracking-wide text-on-primary bg-primary hover:bg-primary-active transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-active'
                    >
                        Submit
                        </button>
                </form>
            </div>
        </div>
    );
}

export default Register;