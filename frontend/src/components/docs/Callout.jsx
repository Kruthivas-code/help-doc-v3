import { Info, AlertTriangle, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Callout Component - Mintlify-style highlighted information blocks
 * Clean design with subtle background and icon
 */

const CALLOUT_STYLES = {
  info: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    icon: Info,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  note: {
    bg: 'bg-slate-500/5',
    border: 'border-slate-500/20',
    icon: Info,
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-zinc-600 dark:text-zinc-400',
  },
  warning: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  caution: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  tip: {
    bg: 'bg-brand/5',
    border: 'border-emerald-500/20',
    icon: Lightbulb,
    iconBg: 'bg-brand/10',
    iconColor: 'text-brand',
  },
  error: {
    bg: 'bg-rose-500/5',
    border: 'border-red-500/20',
    icon: AlertCircle,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  danger: {
    bg: 'bg-rose-500/5',
    border: 'border-red-500/20',
    icon: AlertCircle,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  success: {
    bg: 'bg-brand/5',
    border: 'border-emerald-500/20',
    icon: CheckCircle,
    iconBg: 'bg-brand/10',
    iconColor: 'text-brand',
  },
};

export const Callout = ({ 
  type = 'info', 
  title, 
  children, 
  className = '' 
}) => {
  const style = CALLOUT_STYLES[type.toLowerCase()] || CALLOUT_STYLES.info;
  const Icon = style.icon;

  return (
    <div 
      className={`callout my-6 p-4 rounded-xl border ${style.bg} ${style.border} ${className}`}
      data-testid={`callout-${type}`}
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          {title && (
            <h5 className="font-semibold text-zinc-950 dark:text-white mb-1 text-[15px]">
              {title}
            </h5>
          )}
          <div className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed [&>p]:m-0 [&>p:not(:last-child)]:mb-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

Callout.displayName = 'Callout';
