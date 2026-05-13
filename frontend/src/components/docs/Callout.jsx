import { Info, AlertTriangle, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Callout — Mintlify-style highlighted information blocks.
 * Brand-palette compliant: rounded-xl, eyebrow-style title, AA-contrast icons.
 */

const CALLOUT_STYLES = {
    info: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-200 dark:border-blue-500/30',
        icon: Info,
        iconBg: 'bg-blue-100 dark:bg-blue-500/20',
        iconColor: 'text-blue-700 dark:text-blue-300',
        titleColor: 'text-blue-900 dark:text-blue-100',
    },
    note: {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        border: 'border-blue-200 dark:border-blue-500/30',
        icon: Info,
        iconBg: 'bg-blue-100 dark:bg-blue-500/20',
        iconColor: 'text-blue-700 dark:text-blue-300',
        titleColor: 'text-blue-900 dark:text-blue-100',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/30',
        icon: AlertTriangle,
        iconBg: 'bg-amber-100 dark:bg-amber-500/20',
        iconColor: 'text-amber-700 dark:text-amber-300',
        titleColor: 'text-amber-900 dark:text-amber-100',
    },
    caution: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/30',
        icon: AlertTriangle,
        iconBg: 'bg-amber-100 dark:bg-amber-500/20',
        iconColor: 'text-amber-700 dark:text-amber-300',
        titleColor: 'text-amber-900 dark:text-amber-100',
    },
    tip: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-200 dark:border-emerald-500/30',
        icon: Lightbulb,
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconColor: 'text-emerald-700 dark:text-emerald-300',
        titleColor: 'text-emerald-900 dark:text-emerald-100',
    },
    error: {
        bg: 'bg-rose-50 dark:bg-rose-500/10',
        border: 'border-rose-200 dark:border-rose-500/30',
        icon: AlertCircle,
        iconBg: 'bg-rose-100 dark:bg-rose-500/20',
        iconColor: 'text-rose-700 dark:text-rose-300',
        titleColor: 'text-rose-900 dark:text-rose-100',
    },
    danger: {
        bg: 'bg-rose-50 dark:bg-rose-500/10',
        border: 'border-rose-200 dark:border-rose-500/30',
        icon: AlertCircle,
        iconBg: 'bg-rose-100 dark:bg-rose-500/20',
        iconColor: 'text-rose-700 dark:text-rose-300',
        titleColor: 'text-rose-900 dark:text-rose-100',
    },
    success: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-200 dark:border-emerald-500/30',
        icon: CheckCircle,
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconColor: 'text-emerald-700 dark:text-emerald-300',
        titleColor: 'text-emerald-900 dark:text-emerald-100',
    },
};

export const Callout = ({ type = 'info', title, children, className = '' }) => {
    const style = CALLOUT_STYLES[String(type).toLowerCase()] || CALLOUT_STYLES.info;
    const Icon = style.icon;

    return (
        <div
            className={`callout my-5 p-4 rounded-xl border ${style.bg} ${style.border} ${className}`}
            data-callout-type={String(type).toLowerCase()}
            data-testid={`callout-${type}`}
        >
            <div className="flex gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${style.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    {title && (
                        <h5 className={`font-bold tracking-tight ${style.titleColor} mb-1 text-sm`}>
                            {title}
                        </h5>
                    )}
                    <div className="callout-content text-[14.5px] leading-relaxed [&_p]:m-0 [&_p:not(:last-child)]:mb-2 [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-white/60 dark:[&_code]:bg-black/30">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

Callout.displayName = 'Callout';
