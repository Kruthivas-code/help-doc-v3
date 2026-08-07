import { useState, Children } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Accordion Component - Collapsible content sections
 * Theme-aware: works in both light and dark modes
 * Usage:
 * <Accordion>
 *   <AccordionItem title="How does it work?">Explanation here</AccordionItem>
 *   <AccordionItem title="FAQ">Answer here</AccordionItem>
 * </Accordion>
 */
export const Accordion = ({ children, className = '' }) => {
  const items = Children.toArray(children).filter(
    child => child?.type === AccordionItem || child?.type?.displayName === 'AccordionItem'
  );

  // If no valid AccordionItem children, render children as-is
  if (items.length === 0 && children) {
    return (
      <div 
        className={`accordion my-6 border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 ${className}`}
        data-testid="accordion"
      >
        {children}
      </div>
    );
  }

  return (
    <div 
      className={`accordion my-6 border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 ${className}`}
      data-testid="accordion"
    >
      {items}
    </div>
  );
};

export const AccordionItem = ({ 
  title, 
  children, 
  defaultOpen = false,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`accordion-item ${className}`} data-testid="accordion-item">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
        data-testid="accordion-trigger"
      >
        <span className="!text-zinc-950 dark:!text-white font-medium">{title}</span>
        <ChevronDown 
          className={`w-4 h-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      <div 
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div 
          className="px-4 pb-4 prose prose-sm dark:prose-invert max-w-none [&_p]:!text-zinc-700 dark:[&_p]:!text-zinc-300 [&_code]:!text-emerald-600 dark:[&_code]:!text-brand [&_strong]:!text-zinc-900 dark:[&_strong]:!text-zinc-100 [&_a]:!text-indigo-600 dark:[&_a]:!text-brand [&_ul]:!text-zinc-700 dark:[&_ul]:!text-zinc-300 [&_ol]:!text-zinc-700 dark:[&_ol]:!text-zinc-300 [&_li]:!text-zinc-700 dark:[&_li]:!text-zinc-300"
          data-testid="accordion-content"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

AccordionItem.displayName = 'AccordionItem';
