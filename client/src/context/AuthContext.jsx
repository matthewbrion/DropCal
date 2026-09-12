import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, loginUser } from "#lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCurrentUser()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const loggedInUser = await loginUser({ email, password });
        setUser(loggedInUser);
        return loggedInUser;
    }

    function logout() {
        //no logout route yet
        //clears local state
        //page refresh will re-hydrate 'user' w/getCurrentUser()
        setUser(null);
    }
    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}