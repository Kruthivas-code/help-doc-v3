import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ThemeToggle — pill-style segmented control for light/dark.
 * Use compact={true} for icon-only button.
 */
export const ThemeToggle = ({ compact = false, className = '' }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    if (compact) {
        return (
            <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                className={`btn-press inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${className}`}
                data-testid="theme-toggle"
            >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
        );
    }

    return (
        <div
            className={`inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 p-1 bg-zinc-50 dark:bg-zinc-900 ${className}`}
            data-testid="theme-toggle"
        >
            <button
                type="button"
                onClick={() => theme !== 'light' && toggleTheme()}
                aria-label="Light mode"
                className={`btn-press inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    !isDark
                        ? 'bg-white text-zinc-950 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                }`}
                data-testid="theme-light"
            >
                <Sun className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={() => theme !== 'dark' && toggleTheme()}
                aria-label="Dark mode"
                className={`btn-press inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isDark
                        ? 'bg-zinc-950 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                }`}
                data-testid="theme-dark"
            >
                <Moon className="h-3.5 w-3.5" />
            </button>
        </div>
    );
};
