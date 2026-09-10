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
        <div>
            <h1>Register</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    Name
                    <input
                        type='text'
                        required
                        value={name}
                        onChange={(n) => setName(n.target.value)}
                    />
                </label>
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
                <button type='submit'>Register</button>
            </form>
        </div>
    );
}

export default Register;