/**
 * PublicDocs — Emergent Documentation Site (redesign)
 *
 * Layout
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Sticky top header — logo · search · theme · CTA           │
 *   ├──────────┬────────────────────────────────────────┬─────────┤
 *   │ Sidebar  │  Article (max-w-3xl)                   │  TOC    │
 *   │ (sticky) │   eyebrow + h1 + copy                  │ (sticky)│
 *   │          │   prose content                        │         │
 *   │          │   prev/next                            │         │
 *   └──────────┴────────────────────────────────────────┴─────────┘
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import {
    Search, Menu, X, ChevronDown, ChevronRight,
    Copy, Check, ArrowLeft, ArrowRight, Sparkles, Book,
} from 'lucide-react';
import { DocContent } from '@/components/docs/DocContent';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { search, initializeSearch } from '@/lib/search';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ============================================================
   TOP HEADER — sticky, backdrop-blur, full-width
   ============================================================ */
const TopHeader = ({ config, project, onSearchOpen, onMobileMenuToggle, mobileMenuOpen }) => {
    const { isDark } = useTheme();
    const navbar = config?.navbar || {};
    const links = navbar.links || [{ label: 'Support', href: '#' }];
    const primaryCta = navbar.primary || { label: 'Try Emergent', href: 'https://app.emergent.sh' };
    const logoSrc = isDark ? (config?.logo_dark_url || config?.logo_light_url) : (config?.logo_light_url || config?.logo_dark_url);

    return (
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md">
            <div className="h-14 px-4 sm:px-6 lg:px-10 flex items-center gap-4">
                {/* Mobile menu */}
                <button
                    type="button"
                    onClick={onMobileMenuToggle}
                    className="btn-press lg:hidden -ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Toggle menu"
                    data-testid="mobile-nav-toggle"
                >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <Link to="/" className="flex items-center gap-2 flex-shrink-0" data-testid="logo-link">
                    {logoSrc ? (
                        <img src={logoSrc} alt={project?.name || 'Logo'} className="h-6 w-auto" />
                    ) : (
                        <span className="font-heading text-base font-black tracking-tight text-zinc-950 dark:text-white">
                            {config?.site_title || project?.name || 'emergent'}
                        </span>
                    )}
                </Link>

                {/* Search trigger — wide on desktop, icon on mobile */}
                <button
                    type="button"
                    onClick={onSearchOpen}
                    className="btn-press hidden md:flex flex-1 max-w-md mx-auto items-center gap-3 px-3 h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    data-testid="header-search"
                >
                    <Search className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">Search documentation</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">⌘K</kbd>
                </button>

                <div className="ml-auto md:ml-0 flex items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onSearchOpen}
                        className="btn-press md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label="Search"
                    >
                        <Search className="h-4 w-4" />
                    </button>

                    {links.map((link, i) => (
                        <a
                            key={i}
                            href={link.href}
                            className="hidden sm:inline-block text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}

                    <ThemeToggle compact />

                    <a
                        href={primaryCta.href}
                        className="btn-press inline-flex h-9 items-center gap-1.5 px-3 sm:px-4 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-bold hover:opacity-90"
                        data-testid="cta-button"
                    >
                        <span className="hidden sm:inline">{primaryCta.label}</span>
                        <span className="sm:hidden">Try</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>
        </header>
    );
};

/* ============================================================
   LEFT SIDEBAR — sticky scroll, tab → groups → pages
   ============================================================ */
const SidebarLink = ({ active, missing, onClick, children, testId, depth = 0 }) => {
    const pad = depth === 0 ? 'pl-4' : 'pl-6';
    if (missing) {
        return (
            <span className={`flex items-center ${pad} pr-3 py-1.5 text-[13px] text-zinc-400 dark:text-zinc-600 cursor-not-allowed`}>
                <span className="truncate flex-1">{children}</span>
                <span className="text-[10px] text-rose-500 ml-2">missing</span>
            </span>
        );
    }
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={testId}
            className={`btn-press w-full flex items-center ${pad} pr-3 py-1.5 rounded-md text-[13px] text-left transition-colors relative ${
                active
                    ? 'text-brand font-semibold bg-brand/5 dark:bg-brand/10 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-brand before:rounded-r'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-zinc-900'
            }`}
        >
            <span className="truncate flex-1">{children}</span>
        </button>
    );
};

const GroupSection = ({ group, groupId, documents, activeSlug, onDocSelect, defaultOpen = true, depth = 0 }) => {
    const [open, setOpen] = useState(defaultOpen);
    const hasPages = group.pages?.length > 0;
    const hasSubgroups = group.groups?.length > 0;
    const groupLabel = group.group;

    return (
        <div className="mt-1">
            {groupLabel && (
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="btn-press w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white tracking-tight"
                    data-testid={`group-${groupId}`}
                >
                    <span className="truncate text-left">{groupLabel}</span>
                    {(hasPages || hasSubgroups) && (
                        <ChevronRight
                            className={`h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-90' : ''}`}
                        />
                    )}
                </button>
            )}
            {open && (
                <div className="mt-0.5 space-y-0.5">
                    {hasPages && group.pages.map((page, idx) => {
                        const slug = typeof page === 'string' ? page : page.page;
                        const doc = documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
                        const title = typeof page === 'string' ? (doc?.title || page) : (page.title || doc?.title || page.page);
                        const active = slug?.toLowerCase() === activeSlug?.toLowerCase();
                        return (
                            <SidebarLink
                                key={`${groupId}-p-${idx}`}
                                active={active}
                                missing={!doc}
                                onClick={() => onDocSelect(slug)}
                                testId={`page-${slug}`}
                                depth={depth}
                            >
                                {title}
                            </SidebarLink>
                        );
                    })}
                    {hasSubgroups && group.groups.map((sub, idx) => (
                        <GroupSection
                            key={`${groupId}-g-${idx}`}
                            group={sub}
                            groupId={`${groupId}-${idx}`}
                            documents={documents}
                            activeSlug={activeSlug}
                            onDocSelect={onDocSelect}
                            defaultOpen={defaultOpen}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const LeftSidebar = ({ tabs, documents, activeSlug, onDocSelect, mobileOpen, onMobileClose }) => {
    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-30 lg:hidden"
                    onClick={onMobileClose}
                />
            )}
            <aside
                className={`
                    fixed top-14 bottom-0 left-0 z-40 w-72 lg:w-64
                    bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800
                    overflow-y-auto
                    transform transition-transform duration-300 ease-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
                data-testid="left-sidebar"
            >
                <nav className="px-3 pb-12 pt-2">
                    {tabs.map((tab, ti) => (
                        <section key={tab.id || ti} className={ti === 0 ? 'pt-4' : 'pt-7'}>
                            <h3
                                className="px-3 mb-1.5 text-[11px] font-bold tracking-[0.14em] uppercase text-zinc-950 dark:text-white"
                                data-testid={`sidebar-tab-${tab.id}`}
                            >
                                {tab.label}
                            </h3>
                            <div className="space-y-0.5">
                                {(tab.groups || []).map((g, gi) => (
                                    <GroupSection
                                        key={gi}
                                        group={g}
                                        groupId={`${tab.id}-${gi}`}
                                        documents={documents}
                                        activeSlug={activeSlug}
                                        onDocSelect={(slug) => { onDocSelect(slug); onMobileClose(); }}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </nav>
            </aside>
        </>
    );
};

/* ============================================================
   RIGHT TOC SIDEBAR — auto-highlight active heading
   ============================================================ */
const RightTOC = ({ headings }) => {
    const [activeId, setActiveId] = useState('');
    const [valid, setValid] = useState([]);

    useEffect(() => {
        const present = headings.filter(h => document.getElementById(h.id));
        setValid(present);
    }, [headings]);

    useEffect(() => {
        if (valid.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveId(entry.target.id);
                });
            },
            { rootMargin: '-80px 0px -80% 0px' }
        );
        valid.forEach(h => {
            const el = document.getElementById(h.id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [valid]);

    if (valid.length === 0) return null;

    return (
        <aside className="hidden xl:block fixed top-14 right-0 bottom-0 w-60 overflow-y-auto z-10 px-6 py-8">
            <p className="eyebrow text-zinc-500 mb-4">On this page</p>
            <nav className="space-y-1">
                {valid.map(h => (
                    <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={`block py-1 text-[12.5px] leading-snug transition-colors break-words border-l-2 -ml-3 pl-3 ${
                            activeId === h.id
                                ? 'border-brand text-zinc-950 dark:text-white font-medium'
                                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                        }`}
                        style={{ paddingLeft: `${12 + (h.level - 2) * 8}px` }}
                    >
                        {h.text}
                    </a>
                ))}
            </nav>
        </aside>
    );
};

/* ============================================================
   SEARCH DIALOG
   ============================================================ */
const SearchDialog = ({ open, onClose, onSelect, config }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ documents: [], headings: [] });
    const inputRef = useRef(null);
    const tabs = config?.navigation?.tabs || [];

    const getBreadcrumb = (slug) => {
        for (const tab of tabs) {
            for (const g of (tab.groups || [])) {
                for (const p of (g.pages || [])) {
                    const ps = typeof p === 'string' ? p : p.page;
                    if (ps?.toLowerCase() === slug?.toLowerCase()) return `${tab.label} › ${g.group || ''}`;
                }
            }
        }
        return null;
    };

    useEffect(() => {
        if (open) {
            setQuery('');
            setResults({ documents: [], headings: [] });
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        if (query.length >= 2) setResults(search(query));
        else setResults({ documents: [], headings: [] });
    }, [query]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && open) onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;
    const hasResults = (results.documents?.length || 0) + (results.headings?.length || 0) > 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] px-4">
            <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search documentation..."
                        className="flex-1 bg-transparent text-sm sm:text-base placeholder:text-zinc-400 outline-none text-zinc-950 dark:text-white"
                        data-testid="search-input"
                    />
                    <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">ESC</kbd>
                </div>
                <div className="max-h-[60vh] overflow-auto">
                    {hasResults ? (
                        <div className="p-2">
                            {results.documents?.map((r, i) => {
                                const bc = getBreadcrumb(r.slug);
                                return (
                                    <button
                                        key={`d-${i}`}
                                        type="button"
                                        onClick={() => { onSelect(r.slug); onClose(); }}
                                        className="btn-press w-full text-left px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 group"
                                    >
                                        {bc && <div className="text-[11px] text-zinc-500 mb-0.5">{bc}</div>}
                                        <div className="text-sm font-semibold text-zinc-950 dark:text-white group-hover:text-brand">
                                            {r.title}
                                        </div>
                                        {r.snippet && (
                                            <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                                {r.snippet}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                            {results.headings?.map((r, i) => {
                                const bc = getBreadcrumb(r.slug);
                                return (
                                    <button
                                        key={`h-${i}`}
                                        type="button"
                                        onClick={() => {
                                            onSelect(r.slug);
                                            onClose();
                                            setTimeout(() => {
                                                const el = document.getElementById(r.anchor);
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            }, 200);
                                        }}
                                        className="btn-press w-full text-left px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 group"
                                    >
                                        {bc && <div className="text-[11px] text-zinc-500 mb-0.5">{bc} › {r.docTitle}</div>}
                                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-brand">
                                            <span className="text-zinc-400">{'#'.repeat(r.level || 1)}</span>
                                            <span>{r.text}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : query.length >= 2 ? (
                        <div className="px-4 py-12 text-center">
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">No results for "{query}"</div>
                        </div>
                    ) : (
                        <div className="px-4 py-12 text-center">
                            <div className="text-sm text-zinc-500">Type at least 2 characters to search</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   COPY-PAGE PILL
   ============================================================ */
const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handle = async () => {
        try { await navigator.clipboard.writeText(text); } catch (e) {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            type="button"
            onClick={handle}
            className="btn-press inline-flex items-center gap-2 h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:border-zinc-300 dark:hover:border-zinc-700"
            data-testid="copy-page-btn"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy page'}</span>
        </button>
    );
};

/* ============================================================
   MAIN
   ============================================================ */
const PublicDocs = () => {
    const { docSlug } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [config, setConfig] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [toc, setToc] = useState([]);
    const [isNavigating, setIsNavigating] = useState(false);

    const tabs = useMemo(() => {
        const rawTabs = config?.navigation?.tabs || [];
        const autoGroups = documents.length > 0 ? [{
            group: 'Documentation',
            pages: documents.map(d => ({ page: d.slug, title: d.title }))
        }] : [];
        return rawTabs.length > 0
            ? rawTabs.map(t => ({
                id: t.id || t.tab || t.label,
                label: t.label || t.tab || t.id,
                groups: t.groups || [],
            }))
            : [{
                id: 'docs',
                label: 'Documentation',
                groups: config?.navigation?.groups?.length > 0 ? config.navigation.groups : autoGroups,
            }];
    }, [config?.navigation, documents]);

    const fetchPublic = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/public/default-project`, { withCredentials: false });
            setProject(res.data.project);
            setConfig(res.data.config);
            setDocuments(res.data.documents);
            if (res.data.documents.length > 0) initializeSearch(res.data.documents);
        } catch (e) {
            console.error('Failed to fetch:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPublic(); }, [fetchPublic]);

    useEffect(() => {
        if (config?.favicon_url) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = config.favicon_url;
        }
    }, [config?.favicon_url]);

    const getFirstNavDoc = useCallback(() => {
        for (const t of tabs) {
            for (const g of (t.groups || [])) {
                for (const p of (g.pages || [])) {
                    const slug = typeof p === 'string' ? p : p.page;
                    const doc = documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
                    if (doc) return doc;
                }
            }
        }
        return null;
    }, [tabs, documents]);

    useEffect(() => {
        if (isNavigating) return;
        if (documents.length > 0 && !selectedDoc) {
            if (docSlug) {
                const doc = documents.find(d => d.slug?.toLowerCase() === docSlug?.toLowerCase());
                setSelectedDoc(doc || getFirstNavDoc() || documents[0]);
            } else {
                setSelectedDoc(getFirstNavDoc() || documents[0]);
            }
        } else if (documents.length > 0 && docSlug && selectedDoc?.slug?.toLowerCase() !== docSlug?.toLowerCase()) {
            const doc = documents.find(d => d.slug?.toLowerCase() === docSlug?.toLowerCase());
            if (doc) setSelectedDoc(doc);
        }
    }, [documents, docSlug, selectedDoc, getFirstNavDoc, isNavigating]);

    const handleDocSelect = useCallback((slug) => {
        if (isNavigating) return;
        const doc = documents.find(d => d.slug?.toLowerCase() === slug?.toLowerCase());
        if (doc && doc.id !== selectedDoc?.id) {
            setIsNavigating(true);
            setSelectedDoc(doc);
            requestAnimationFrame(() => {
                navigate(`/${slug}`);
                setTimeout(() => setIsNavigating(false), 100);
                window.scrollTo({ top: 0, behavior: 'instant' });
            });
        }
    }, [documents, navigate, selectedDoc, isNavigating]);

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(o => !o);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Breadcrumb for current doc
    const breadcrumb = useMemo(() => {
        if (!selectedDoc) return null;
        for (const t of tabs) {
            for (const g of (t.groups || [])) {
                const found = (g.pages || []).some(p => (typeof p === 'string' ? p : p.page)?.toLowerCase() === selectedDoc.slug?.toLowerCase());
                if (found) return { tab: t.label, group: g.group };
            }
        }
        return null;
    }, [selectedDoc, tabs]);

    // Prev/next
    const currentIndex = documents.findIndex(d => d.id === selectedDoc?.id);
    const prevDoc = currentIndex > 0 ? documents[currentIndex - 1] : null;
    const nextDoc = currentIndex >= 0 && currentIndex < documents.length - 1 ? documents[currentIndex + 1] : null;

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
            </div>
        );
    }

    const siteTitle = config?.site_title || project?.name || 'Documentation';
    const pageTitle = selectedDoc ? `${selectedDoc.title} | ${siteTitle}` : siteTitle;
    const pageDesc = selectedDoc
        ? selectedDoc.content?.substring(0, 160).replace(/[#*>`]/g, '').trim() || config?.site_description
        : config?.site_description || 'Documentation and guides';
    const pageUrl = `${window.location.origin}${selectedDoc ? `/${selectedDoc.slug}` : ''}`;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDesc} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={pageUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDesc} />
                <meta property="og:site_name" content={siteTitle} />
                {config?.logo_dark_url && <meta property="og:image" content={config.logo_dark_url} />}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={pageDesc} />
                <link rel="canonical" href={pageUrl} />
                {selectedDoc && (
                    <script type="application/ld+json">{JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": selectedDoc.title,
                        "description": pageDesc,
                        "url": pageUrl,
                        "datePublished": selectedDoc.created_at,
                        "dateModified": selectedDoc.updated_at,
                        "publisher": { "@type": "Organization", "name": siteTitle }
                    })}</script>
                )}
            </Helmet>

            <TopHeader
                config={config}
                project={project}
                onSearchOpen={() => setSearchOpen(true)}
                onMobileMenuToggle={() => setMobileMenuOpen(o => !o)}
                mobileMenuOpen={mobileMenuOpen}
            />

            <SearchDialog
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSelect={handleDocSelect}
                config={config}
            />

            <LeftSidebar
                tabs={tabs}
                documents={documents}
                activeSlug={selectedDoc?.slug}
                onDocSelect={handleDocSelect}
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
            />

            <main className="lg:ml-64 xl:mr-60 min-h-screen pt-14">
                {selectedDoc ? (
                    <article
                        key={selectedDoc.id}
                        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14 fade-up"
                    >
                        {/* Eyebrow breadcrumb */}
                        {breadcrumb && (
                            <p className="eyebrow text-zinc-500 mb-3">
                                {breadcrumb.tab}{breadcrumb.group ? ` › ${breadcrumb.group}` : ''}
                            </p>
                        )}

                        {/* Title row */}
                        <div className="flex items-start justify-between gap-4 mb-8">
                            <h1 className="h-display text-3xl sm:text-4xl lg:text-5xl text-zinc-950 dark:text-white text-balance">
                                {selectedDoc.title}
                            </h1>
                            <div className="flex-shrink-0 mt-1">
                                <CopyButton text={window.location.href} />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="doc-content">
                            <DocContent
                                content={selectedDoc.content?.replace(
                                    new RegExp(`^#\\s*${selectedDoc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`, 'i'),
                                    ''
                                ) || selectedDoc.content}
                                onHeadings={setToc}
                            />
                        </div>

                        {/* Prev / Next */}
                        {(prevDoc || nextDoc) && (
                            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                                {prevDoc ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDocSelect(prevDoc.slug)}
                                        className="btn-press card-lift flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left"
                                        data-testid="prev-doc-btn"
                                    >
                                        <ArrowLeft className="h-4 w-4 text-zinc-400" />
                                        <div>
                                            <span className="eyebrow text-zinc-500 block mb-0.5">Previous</span>
                                            <span className="text-sm font-semibold text-zinc-950 dark:text-white">{prevDoc.title}</span>
                                        </div>
                                    </button>
                                ) : <div />}
                                {nextDoc && (
                                    <button
                                        type="button"
                                        onClick={() => handleDocSelect(nextDoc.slug)}
                                        className="btn-press card-lift flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-right"
                                        data-testid="next-doc-btn"
                                    >
                                        <div>
                                            <span className="eyebrow text-zinc-500 block mb-0.5">Next</span>
                                            <span className="text-sm font-semibold text-zinc-950 dark:text-white">{nextDoc.title}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-zinc-400" />
                                    </button>
                                )}
                            </div>
                        )}
                    </article>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                        <Book className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                        <p className="text-sm text-zinc-500">Select a document from the sidebar to start reading.</p>
                    </div>
                )}
            </main>

            <RightTOC headings={toc} />
        </div>
    );
};

export default PublicDocs;
