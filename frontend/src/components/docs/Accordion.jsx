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
        className={`accordion my-6 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 ${className}`}
        data-testid="accordion"
      >
        {children}
      </div>
    );
  }

  return (
    <div 
      className={`accordion my-6 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 ${className}`}
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
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        data-testid="accordion-trigger"
      >
        <span className="!text-slate-900 dark:!text-white font-medium">{title}</span>
        <ChevronDown 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
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
          className="px-4 pb-4 prose prose-sm dark:prose-invert max-w-none [&_p]:!text-slate-600 dark:[&_p]:!text-slate-400 [&_code]:!text-emerald-600 dark:[&_code]:!text-emerald-400 [&_strong]:!text-slate-800 dark:[&_strong]:!text-slate-200 [&_a]:!text-indigo-600 dark:[&_a]:!text-indigo-400 [&_ul]:!text-slate-600 dark:[&_ul]:!text-slate-400 [&_ol]:!text-slate-600 dark:[&_ol]:!text-slate-400 [&_li]:!text-slate-600 dark:[&_li]:!text-slate-400"
          data-testid="accordion-content"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

AccordionItem.displayName = 'AccordionItem';
