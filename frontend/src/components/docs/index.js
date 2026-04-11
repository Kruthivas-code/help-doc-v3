// ====================================
// EMERGENT DOCS COMPONENT REGISTRY
// Mintlify-Class Documentation System
// ====================================

export { Steps, Step } from './Steps';
export { Card, CardGroup } from './Cards';
export { Callout } from './Callout';
export { Tabs, Tab } from './Tabs';
export { CodeBlock } from './CodeBlock';
export { Accordion, AccordionItem } from './Accordion';
export { DocContent } from './DocContent';
export { SlashCommandMenu, useSlashCommands } from './SlashCommands';
export { IconPicker, IconButton, Icon, getIcon, DOC_ICONS, ICON_CATEGORIES } from './IconPicker';

// Component whitelist - only these are allowed
export const ALLOWED_COMPONENTS = {
  Steps: true,
  Step: true,
  Card: true,
  CardGroup: true,
  Callout: true,
  Tabs: true,
  Tab: true,
  CodeBlock: true,
  Accordion: true,
  AccordionItem: true,
};
