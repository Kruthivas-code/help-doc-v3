import { useState, Children, cloneElement } from 'react';

/**
 * Tabs Component - Tabbed content sections
 * Theme-aware: works in both light and dark modes
 * Usage:
 * <Tabs>
 *   <Tab label="JavaScript">JS code here</Tab>
 *   <Tab label="Python">Python code here</Tab>
 * </Tabs>
 */
export const Tabs = ({ children, defaultTab = 0, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = Children.toArray(children).filter(
    child => child?.type === Tab || child?.type?.displayName === 'Tab'
  );

  return (
    <div className={`tabs-container my-6 ${className}`} data-testid="tabs">
      {/* Tab Headers */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === index
                ? 'text-emerald-600 dark:text-indigo-400 border-emerald-600 dark:border-indigo-400'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            data-testid={`tab-${index}`}
          >
            {tab.props.label || `Tab ${index + 1}`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={activeTab === index ? 'block' : 'hidden'}
            data-testid={`tab-content-${index}`}
          >
            {tab.props.children}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Tab = ({ label, children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

Tab.displayName = 'Tab';
