import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const justRegistered = location.state?.justRegistered;

    async function handleSubmit(n) {
        n.preventDefault();
        setError(null);
        try {
            await login(email, password);
            navigate('/');
        } catch (e) {
            setError(e.message || 'Something went wrong.  Please try again.');
        }
    }

    //scaffolding for below was derived from 'Form with Password Visibility Toggle' @ https://readymadeui.com/tailwind-components/form
    //i omitted validation/eye as they interfered with the input/form structure i had in place
    //requiring additional changes to other docs
    return (
        <div className='min-h-screen bg-surface flex items-center justify-center px-5'>
            <div className='w-full max-w-sm'>
                <h1 className='text-[26px] leading-[34px] tracking-[-0.01em] font-semibold text-ink mb-6 text-center'>
                    Log In
                </h1>

                {justRegistered && (
                    <p className='mb-4 text-sm text-success bg-success-surface rounded-[10px] px-3.5 py-2.5'>Account created - please log in.
                    </p>
                )}

                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-4 max-w-sm mx-auto'>
                        <label htmlFor='email' className='mb-2 text-ink font-medium text-sm inline-block w-full'>
                            Email
                            <input
                                id='email'
                                type='email'
                                name='email'
                                placeholder='user@example.com'
                                required
                                className='mt-1 px-3.5 h-[52px] text-sm text-ink rounded-[10px] bg-surface-card w-full outline outline-1 -outline-offset-1 outline-border-subtle focus:outline-2 focus:-outline-offset-2 focus:outline-primary'
                                value={email}
                                onChange={(n) => setEmail(n.target.value)}
                            />
                        </label>

                        <label htmlFor='password' className='mb-2 text-ink font-medium text-sm inline-block w-full'>
                            Password
                            <input
                                type='password'
                                id='password'
                                name='password'
                                required
                                className='mt-1 px-3.5 h-[52px] text-sm text-ink rounded-[10px] bg-surface-card w-full outline outline-1 -outline-offset-1 outline-border-subtle focus:outline-2 focus:-outline-offset-2 focus:outline-primary'
                                value={password}
                                onChange={(n) => setPassword(n.target.value)}
                            />
                        </label>
                        {error && (
                            <p role='alert' className='text-sm text-error bg-error-surface rounded-[10px] px-3.5 py-2.5'>
                                {error}
                            </p>
                        )}
                        <button type='submit' className='!mt-2 w-full h-14 text-sm rounded-[12px] font-semibold tracking-wide text-on-primary bg-primary hover:bg-primary-active transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-active'
                        >
                            Submit
                        </button>
                    </div>
                </form>
                <p className='mt-4 text-sm text-ink-muted text-center'>
                    Don't have an account?{' '}
                    <Link to='/register' className='text-primary font-medium hover:text-primary-active'>
                    Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;