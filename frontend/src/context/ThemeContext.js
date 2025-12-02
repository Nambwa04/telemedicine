/**
 * Theme Context Provider.
 * Manages application theme (light/dark mode).
 * Persists theme preference to local storage.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => { } });

export const ThemeProvider = ({ children }) => {
    const [dark, setDark] = useState(() => {
        try {
            const saved = localStorage.getItem('tm_theme');
            return saved === 'dark';
        } catch { return false; }
    });

    useEffect(() => {
        const cls = 'dark-mode';
        if (dark) {
            document.body.classList.add(cls);
        } else {
            document.body.classList.remove(cls);
        }
        try { localStorage.setItem('tm_theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
    }, [dark]);

    const toggle = () => setDark(d => !d);

    return (
        <ThemeContext.Provider value={{ dark, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
