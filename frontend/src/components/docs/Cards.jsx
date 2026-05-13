import { ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getIcon } from './IconPicker';

/**
 * Columns - Responsive column layout component
 * Supports 1-4 columns with responsive breakpoints
 */
export const Columns = ({ children, cols = 2, className = '' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div 
      className={`columns-layout grid gap-4 my-6 relative z-10 ${gridCols[cols] || gridCols[2]} ${className}`}
      data-testid="columns"
    >
      {children}
    </div>
  );
};

/**
 * CardGroup - Mintlify-style card grid container
 * Clean 2-column grid with generous spacing
 */
export const CardGroup = ({ children, cols = 2, className = '' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div 
      className={`card-group grid gap-4 my-6 relative z-10 ${gridCols[cols] || gridCols[2]} ${className}`}
      data-testid="card-group"
    >
      {children}
    </div>
  );
};

/**
 * Card - Mintlify-style card component
 * Subtle border, clean typography, optional icon and color
 * Theme-aware: works in both light and dark modes
 */
export const Card = ({ 
  title, 
  children, 
  href, 
  icon,
  color,
  external = false,
  className = '' 
}) => {
  const navigate = useNavigate();
  const isExternal = external || href?.startsWith('http');
  const IconComponent = icon ? getIcon(icon) : null;

  const handleClick = () => {
    if (isExternal) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else if (href) {
      navigate(href);
    }
  };

  const content = (
    <>
      {/* Icon */}
      {IconComponent && (
        <div className="mb-4">
          <div 
            className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
            style={color ? { borderColor: `${color}30` } : {}}
          >
            <IconComponent 
              className="w-5 h-5 transition-colors text-zinc-700 dark:text-zinc-300"
              style={color ? { color } : undefined}
            />
          </div>
        </div>
      )}
      
      {/* Title */}
      <h4 className="text-base font-semibold !text-zinc-950 dark:!text-white mb-2 group-hover:text-brand transition-colors flex items-center gap-2">
        {title}
        {href && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            {isExternal ? (
              <ExternalLink className="w-3.5 h-3.5" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </h4>
      
      {/* Description - render as div to allow nested elements */}
      <div className="
        text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-none
        [&_p]:!text-zinc-600 dark:[&_p]:!text-zinc-400 [&_p]:!m-0 [&_p+p]:!mt-2
        [&_strong]:!font-semibold [&_strong]:!text-zinc-900 dark:[&_strong]:!text-zinc-100
        [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2
        [&_ul]:!my-2 [&_ol]:!my-2 [&_li]:!text-zinc-600 dark:[&_li]:!text-zinc-400
        [&_code:not(pre_*)]:!font-mono [&_code:not(pre_*)]:!text-[0.85em]
        [&_code:not(pre_*)]:!bg-zinc-100 dark:[&_code:not(pre_*)]:!bg-zinc-800
        [&_code:not(pre_*)]:!text-zinc-900 dark:[&_code:not(pre_*)]:!text-zinc-100
        [&_code:not(pre_*)]:!px-1 [&_code:not(pre_*)]:!py-0.5 [&_code:not(pre_*)]:!rounded
        [&_pre]:!my-2 [&_pre]:!bg-zinc-50 dark:[&_pre]:!bg-zinc-950
        [&_pre]:!border [&_pre]:!border-zinc-200 dark:[&_pre]:!border-zinc-800
        [&_pre]:!rounded-md [&_pre]:!p-3 [&_pre]:!text-xs
        [&_pre_code]:!text-zinc-800 dark:[&_pre_code]:!text-zinc-200
        [&_pre_code]:!font-mono [&_pre_code]:!bg-transparent
      ">
        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <button
        onClick={handleClick}
        className={`card group text-left w-full p-5 bg-white dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md dark:shadow-none ${className}`}
        data-testid="card"
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`card group p-5 bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-xl shadow-sm dark:shadow-none ${className}`}
      data-testid="card"
    >
      {content}
    </div>
  );
};

Card.displayName = 'Card';
