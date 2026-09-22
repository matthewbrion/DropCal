import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readSavedChoice() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
        return saved;
    }
    return 'system';
}

export function ThemeProvider({ children }) {
    const [choice, setChoice] = useState(readSavedChoice);
    const [systemDark, setSystemDark] = useState(systemPrefersDark);

    useEffect(() => {
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        function handleChange(e) {
            setSystemDark(e.matches);
        }
        query.addEventListener('change', handleChange);
        return () => query.removeEventListener('change', handleChange);
    }, []);

    let resolved = choice;
    if (choice === 'system') {
        resolved = systemDark ? 'dark' : 'light';
    }

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolved);
    }, [resolved]);

    function changeTheme(next) {
        setChoice(next);
        if (next === 'system') {
            localStorage.removeItem('theme');
        } else {
            localStorage.setItem('theme', next);
        }
    }

    return (
        <ThemeContext.Provider value={{ choice, resolved, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
