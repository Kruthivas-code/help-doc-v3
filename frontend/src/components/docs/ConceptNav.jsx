/**
 * ConceptNav - Concept graph-based navigation
 * Builds navigation from document structure and relationships
 */
import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder, Link2 } from 'lucide-react';
import { getIcon } from './IconPicker';
import { buildConceptGraph } from '@/lib/mdx/parser';

/**
 * Build navigation tree from concept graph
 */
function buildNavTree(documents) {
  const graph = buildConceptGraph(documents);
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
  
  // Build hierarchical structure
  const roots = [];
  const childMap = new Map();
  
  for (const node of graph.nodes) {
    if (node.parentId) {
      if (!childMap.has(node.parentId)) {
        childMap.set(node.parentId, []);
      }
      childMap.get(node.parentId).push(node);
    } else {
      roots.push(node);
    }
  }
  
  // Sort by order
  roots.sort((a, b) => a.order - b.order);
  for (const [, children] of childMap) {
    children.sort((a, b) => a.order - b.order);
  }
  
  return { roots, childMap, graph };
}

/**
 * Navigation Item component
 */
const NavItem = ({ 
  node, 
  childMap, 
  selectedId, 
  onSelect, 
  level = 0,
  expandedItems,
  onToggle 
}) => {
  const children = childMap.get(node.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedItems.has(node.id);
  const isSelected = selectedId === node.id;
  
  const IconComponent = node.icon ? getIcon(node.icon) : (hasChildren ? (isExpanded ? FolderOpen : Folder) : FileText);
  
  return (
    <div className="nav-item" data-testid={`nav-item-${node.id}`}>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle(node.id);
          }
          onSelect(node);
        }}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
          ${isSelected 
            ? 'bg-brand/10 text-brand' 
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white'
          }
        `}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {hasChildren && (
          <span className="w-4 h-4 flex items-center justify-center -ml-1">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}
        <IconComponent className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm truncate">{node.title}</span>
      </button>
      
      {hasChildren && isExpanded && (
        <div className="nav-children">
          {children.map(child => (
            <NavItem
              key={child.id}
              node={child}
              childMap={childMap}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
              expandedItems={expandedItems}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Related Docs - Shows documents related to current selection
 */
const RelatedDocs = ({ currentId, graph, onSelect }) => {
  const related = useMemo(() => {
    if (!currentId || !graph) return [];
    
    const relatedIds = new Set();
    
    for (const edge of graph.edges) {
      if (edge.source === currentId) {
        relatedIds.add(edge.target);
      } else if (edge.target === currentId) {
        relatedIds.add(edge.source);
      }
    }
    
    return graph.nodes.filter(n => relatedIds.has(n.id));
  }, [currentId, graph]);
  
  if (related.length === 0) return null;
  
  return (
    <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
      <div className="px-3 mb-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Related
        </span>
      </div>
      <div className="space-y-0.5">
        {related.slice(0, 5).map(node => {
          const IconComponent = node.icon ? getIcon(node.icon) : FileText;
          return (
            <button
              key={node.id}
              onClick={() => onSelect(node)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-lg transition-colors"
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span className="text-xs truncate">{node.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * ConceptNav - Main navigation component
 */
export const ConceptNav = ({ 
  documents, 
  selectedId, 
  onSelect,
  className = '' 
}) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  const { roots, childMap, graph } = useMemo(() => 
    buildNavTree(documents),
    [documents]
  );
  
  // Auto-expand parent of selected item
  useMemo(() => {
    if (selectedId) {
      const node = graph.nodes.find(n => n.id === selectedId);
      if (node?.parentId && !expandedItems.has(node.parentId)) {
        setExpandedItems(prev => new Set([...prev, node.parentId]));
      }
    }
  }, [selectedId, graph.nodes]);
  
  const handleToggle = (nodeId) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };
  
  if (roots.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-zinc-500 text-sm">No documents</p>
      </div>
    );
  }
  
  return (
    <nav className={`concept-nav ${className}`} data-testid="concept-nav">
      <div className="space-y-0.5">
        {roots.map(node => (
          <NavItem
            key={node.id}
            node={node}
            childMap={childMap}
            selectedId={selectedId}
            onSelect={onSelect}
            expandedItems={expandedItems}
            onToggle={handleToggle}
          />
        ))}
      </div>
      
      <RelatedDocs
        currentId={selectedId}
        graph={graph}
        onSelect={onSelect}
      />
    </nav>
  );
};

export default ConceptNav;
