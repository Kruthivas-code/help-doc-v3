import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

/**
 * ThemeProvider — manages light/dark via `html.dark` class + localStorage.
 * Default is "light"; user toggle persists.
 */
export const ThemeProvider = ({ children, defaultTheme = 'light' }) => {
    const [theme, setThemeState] = useState(() => {
        if (typeof window === 'undefined') return defaultTheme;
        const stored = window.localStorage.getItem('emergent-theme');
        if (stored === 'light' || stored === 'dark') return stored;
        return defaultTheme;
    });

    // Sync DOM
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        // Also keep legacy data-theme attribute for any older CSS that depends on it
        root.setAttribute('data-theme', theme);
    }, [theme]);

    const setTheme = useCallback((next) => {
        const value = next === 'dark' ? 'dark' : 'light';
        window.localStorage.setItem('emergent-theme', value);
        setThemeState(value);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
