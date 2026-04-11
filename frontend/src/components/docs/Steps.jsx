import { Children, cloneElement } from 'react';
import { getIcon } from './IconPicker';

/**
 * Steps Component - Mintlify-style vertical stepper
 * Supports both numbered steps and icon-based steps
 * Theme-aware: works in both light and dark modes
 */
export const Steps = ({ children, className = '' }) => {
  const steps = Children.toArray(children).filter(
    child => child?.type === Step || child?.type?.displayName === 'Step'
  );

  return (
    <div className={`steps-container my-8 relative z-10 ${className}`} data-testid="steps">
      {steps.map((child, index) => 
        cloneElement(child, {
          key: index,
          stepNumber: index + 1,
          isLast: index === steps.length - 1,
        })
      )}
    </div>
  );
};

export const Step = ({ 
  title, 
  children, 
  stepNumber = 1, 
  isLast = false,
  icon = null,
  className = '' 
}) => {
  // Get icon component if icon prop is provided
  const IconComponent = icon ? getIcon(icon) : null;

  return (
    <div 
      className={`step-item relative ${className}`}
      data-testid={`step-${stepNumber}`}
    >
      {/* Title row with number circle */}
      <div className="flex items-center gap-4 mb-2">
        {/* Number circle */}
        <div className="w-8 h-8 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center flex-shrink-0">
          {IconComponent ? (
            <IconComponent className="w-4 h-4 text-white" />
          ) : (
            <span className="text-sm font-semibold text-white">{stepNumber}</span>
          )}
        </div>
        {/* Title */}
        <h4 className="text-lg font-semibold !text-slate-900 dark:!text-white">{title}</h4>
      </div>
      
      {/* Content area with connecting line */}
      <div className="flex gap-4">
        {/* Line column */}
        <div className="w-8 flex justify-center flex-shrink-0">
          {!isLast && (
            <div className="w-0.5 h-full bg-indigo-500/30 dark:bg-indigo-400/30 min-h-[40px]" />
          )}
        </div>
        {/* Description */}
        <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
          <div className="text-[15px] !text-slate-600 dark:!text-slate-400 leading-relaxed italic [&>p]:mb-3 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

Step.displayName = 'Step';
