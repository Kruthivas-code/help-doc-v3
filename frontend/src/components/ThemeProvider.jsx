/**
 * Theme Provider - Global theme management
 * Handles dark/light mode with localStorage persistence
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('system'); // 'system' | 'light' | 'dark'
  const [resolvedTheme, setResolvedTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  // Apply theme to document
  const applyTheme = useCallback((newTheme) => {
    const html = document.documentElement;
    let resolved;
    
    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = isDark ? 'dark' : 'light';
      html.removeAttribute('data-theme');
    } else {
      resolved = newTheme;
      html.setAttribute('data-theme', newTheme);
    }
    
    // Apply dark class for Tailwind
    html.classList.toggle('dark', resolved === 'dark');
    
    // Update CSS variables
    if (resolved === 'dark') {
      html.style.setProperty('--color-bg-primary', '#0a0a0f');
      html.style.setProperty('--color-bg-secondary', '#0f0f15');
      html.style.setProperty('--color-bg-tertiary', '#1a1a25');
      html.style.setProperty('--color-text-primary', '#f1f5f9');
      html.style.setProperty('--color-text-secondary', '#94a3b8');
      html.style.setProperty('--color-border', '#1e293b');
    } else {
      html.style.setProperty('--color-bg-primary', '#ffffff');
      html.style.setProperty('--color-bg-secondary', '#f8fafc');
      html.style.setProperty('--color-bg-tertiary', '#f1f5f9');
      html.style.setProperty('--color-text-primary', '#0f172a');
      html.style.setProperty('--color-text-secondary', '#64748b');
      html.style.setProperty('--color-border', '#e2e8f0');
    }
    
    setResolvedTheme(resolved);
  }, []);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    if (saved && ['system', 'light', 'dark'].includes(saved)) {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme('system');
    }
  }, [applyTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
