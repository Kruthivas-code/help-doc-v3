/* Dev/preview-only server middleware (CRA/craco loads this automatically).
 *
 * The k8s ingress routes every non-/api path to this webpack dev server, so the
 * SEO endpoints the backend exposes (llms.txt, per-page .md, sitemap, robots)
 * are shadowed by the SPA and return the HTML shell. This bridges them to the
 * backend and gives unknown URLs a real HTTP 404 with a helpful page.
 *
 * Production serves these via the build's prerender + hosting layer; this file
 * only affects the preview/dev server and never runs in the production bundle.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const BACKEND = 'http://localhost:8001';

// App route first-segments that are NOT document slugs — never 404 these.
const APP_ROUTES = new Set(['admin', 'review', 'api', 'static', 'assets', 'favicon.ico']);

module.exports = function (app) {
  // 1) Bridge SEO text endpoints to the backend's /api/seo/* generators.
  const seoMap = {
    '/llms.txt': '/api/seo/llms.txt',
    '/llms-full.txt': '/api/seo/llms-full.txt',
    '/sitemap.xml': '/api/seo/sitemap.xml',
    '/sitemap_index.xml': '/api/seo/sitemap_index.xml',
    '/robots.txt': '/api/seo/robots.txt',
  };
  app.use(
    createProxyMiddleware((pathname) => Object.prototype.hasOwnProperty.call(seoMap, pathname), {
      target: BACKEND,
      changeOrigin: true,
      pathRewrite: (path) => seoMap[path.split('?')[0]] || path,
    })
  );

  // 2) Per-page raw markdown: /<slug>.md -> /api/seo/pages/<slug>.md
  app.use(
    createProxyMiddleware((pathname) => /^\/[^/]+\.md$/.test(pathname), {
      target: BACKEND,
      changeOrigin: true,
      pathRewrite: (path) => {
        const slug = path.split('?')[0].replace(/^\//, '').replace(/\.md$/, '');
        return `/api/seo/pages/${slug}.md`;
      },
    })
  );

  // 3) Real 404s for unknown document routes (A4). Keeps a fresh set of valid
  //    slugs from the backend; unknown single-segment HTML routes get a helpful
  //    404 page instead of the SPA shell (which would return 200).
  let validSlugs = new Set();
  let lastFetch = 0;
  const refreshSlugs = async () => {
    if (Date.now() - lastFetch < 60000) return;
    lastFetch = Date.now();
    try {
      const r = await fetch(`${BACKEND}/api/public/default-project`);
      const d = await r.json();
      validSlugs = new Set((d.documents || []).map((x) => x.slug).filter(Boolean));
    } catch (_) {}
  };
  refreshSlugs();

  app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    const accept = req.headers.accept || '';
    const wantsHtml = !accept || accept.includes('text/html') || accept.includes('*/*');
    if (!wantsHtml) return next();
    const p = req.path;
    if (p === '/' || p.includes('.')) return next();
    const first = p.split('/')[1] || '';
    if (APP_ROUTES.has(first)) return next();
    // Only single-segment paths are document slugs.
    const isSingle = p.split('/').filter(Boolean).length === 1;
    await refreshSlugs();
    const known = isSingle && validSlugs.has(p.slice(1));
    if (known) return next();
    res.status(404).type('html').send(notFoundHtml([...validSlugs].slice(0, 8)));
  });
};

function notFoundHtml(popular) {
  const links = popular
    .map((s) => `<li><a href="/${s}">${s.replace(/-/g, ' ')}</a></li>`)
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found</title>
<style>
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
background:#0a0a0a;color:#e5e5e5;padding:24px}
.card{max-width:560px;width:100%}
.code{font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#8b8b8b}
h1{font-size:32px;margin:.3em 0 .2em;font-weight:700;color:#fff}
p{color:#a3a3a3;line-height:1.6;margin:0 0 20px}
form{display:flex;gap:8px;margin:0 0 28px}
input{flex:1;padding:12px 14px;border-radius:10px;border:1px solid #2a2a2a;background:#141414;color:#fff;font-size:15px}
button{padding:12px 18px;border-radius:10px;border:0;background:#1588FC;color:#fff;font-weight:600;cursor:pointer}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#8b8b8b;margin:0 0 10px}
ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}
a{color:#1588FC;text-decoration:none}a:hover{text-decoration:underline}
.home{display:inline-block;margin-top:24px;color:#a3a3a3}
</style></head>
<body><div class="card" data-testid="not-found-page">
<div class="code">404 — Not found</div>
<h1>We couldn't find that page</h1>
<p>The page you were looking for doesn't exist or may have moved.</p>
<form action="/" method="get"><input name="q" placeholder="Search the documentation…" aria-label="Search"><button type="submit">Search</button></form>
${links ? `<h2>Popular pages</h2><ul>${links}</ul>` : ''}
<a class="home" href="/">← Back to documentation home</a>
</div></body></html>`;
}
