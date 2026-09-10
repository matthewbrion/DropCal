import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

    return (
        <div>
            <h1>Log In</h1>
            {justRegistered && <p>Account created - please log in.</p>}
            <form onSubmit={handleSubmit}>
                <label>
                    Email
                    <input
                    type='email'
                    required
                    value={email}
                    onChange={(n) => setEmail(n.target.value)}
                    />
                </label>
                <label>
                    Password
                    <input
                    type='password'
                    required
                    value={password}
                    onChange={(n) => setPassword(n.target.value)}
                    />
                </label>
                {error && <p role='alert'>{error}</p>}
                <button type='submit'>Log In</button>
            </form>
        </div>
    );
}

export default Login;