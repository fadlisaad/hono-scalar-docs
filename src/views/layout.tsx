import { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
  description?: string
  activePath?: string
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  children,
  title = 'Modern Edge Docs',
  description = 'Documentation and API Reference powered by Hono, Scalar, and Cloudflare Workers.',
  activePath = '/'
}) => {
  const fullTitle = title === 'Modern Edge Docs' ? title : `${title} | Edge Docs`

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
        
        {/* CSS Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --border-color: #e2e8f0;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --accent: #f97316; /* Cloudflare orange */
            --accent-hover: #ea580c;
            --accent-light: #fff7ed;
            --accent-text: #c2410c;
            --code-bg: #1e293b;
            --code-text: #e2e8f0;
            --sidebar-width: 280px;
            --toc-width: 240px;
            --header-height: 64px;
            --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          [data-theme="dark"] {
            --bg-primary: #0b0f19;
            --bg-secondary: #111827;
            --bg-tertiary: #1f2937;
            --border-color: #1f2937;
            --text-primary: #f9fafb;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --accent: #fb923c;
            --accent-hover: #f97316;
            --accent-light: #2c1a11;
            --accent-text: #fdba74;
            --code-bg: #090d16;
            --code-text: #f1f5f9;
          }

          @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
              --bg-primary: #0b0f19;
              --bg-secondary: #111827;
              --bg-tertiary: #1f2937;
              --border-color: #1f2937;
              --text-primary: #f9fafb;
              --text-secondary: #cbd5e1;
              --text-muted: #94a3b8;
              --accent: #fb923c;
              --accent-hover: #f97316;
              --accent-light: #2c1a11;
              --accent-text: #fdba74;
              --code-bg: #090d16;
              --code-text: #f1f5f9;
            }
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: var(--font-sans);
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
          }

          a {
            color: var(--accent);
            text-decoration: none;
            transition: color 0.15s ease;
          }
          a:hover {
            color: var(--accent-hover);
          }

          /* Header / Navbar */
          .site-header {
            position: sticky;
            top: 0;
            z-index: 40;
            height: var(--header-height);
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
            backdrop-filter: blur(8px);
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 1.5rem;
          }

          .brand-logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--text-primary);
          }

          .brand-badge {
            background: var(--accent-light);
            color: var(--accent-text);
            font-size: 0.75rem;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            font-weight: 600;
            border: 1px solid var(--accent);
          }

          .nav-links {
            display: flex;
            align-items: center;
            gap: 1.25rem;
            list-style: none;
          }

          .nav-link {
            font-size: 0.9375rem;
            font-weight: 500;
            color: var(--text-secondary);
            padding: 0.375rem 0.625rem;
            border-radius: 0.375rem;
          }
          .nav-link:hover, .nav-link.active {
            color: var(--accent);
            background: var(--bg-tertiary);
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .search-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 0.375rem 0.75rem;
            color: var(--text-muted);
            font-size: 0.875rem;
            cursor: pointer;
            transition: border-color 0.15s;
          }
          .search-btn:hover {
            border-color: var(--accent);
            color: var(--text-primary);
          }

          .search-shortcut {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            padding: 0.1rem 0.35rem;
            font-size: 0.75rem;
            font-family: var(--font-mono);
          }

          .theme-toggle-btn, .mobile-menu-btn {
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 0.45rem 0.6rem;
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .theme-toggle-btn:hover, .mobile-menu-btn:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
          }

          .mobile-menu-btn {
            display: none;
          }

          /* Content Container */
          .main-wrapper {
            min-height: calc(100vh - var(--header-height));
            display: flex;
            flex-direction: column;
          }

          /* Docs Layout Grid */
          .docs-container {
            display: flex;
            max-width: 1536px;
            margin: 0 auto;
            width: 100%;
            flex: 1;
          }

          .sidebar {
            width: var(--sidebar-width);
            flex-shrink: 0;
            position: sticky;
            top: var(--header-height);
            height: calc(100vh - var(--header-height));
            overflow-y: auto;
            padding: 1.5rem 1rem;
            border-right: 1px solid var(--border-color);
            background: var(--bg-primary);
          }

          .sidebar-group {
            margin-bottom: 1.5rem;
          }

          .sidebar-group-title {
            font-size: 0.8125rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
            padding: 0 0.5rem;
          }

          .sidebar-menu {
            list-style: none;
          }

          .sidebar-item {
            margin: 0.125rem 0;
          }

          .sidebar-link {
            display: block;
            padding: 0.4rem 0.6rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
            border-radius: 0.375rem;
            font-weight: 400;
            line-height: 1.4;
          }
          .sidebar-link:hover {
            color: var(--text-primary);
            background: var(--bg-secondary);
          }
          .sidebar-link.active {
            color: var(--accent-text);
            background: var(--accent-light);
            font-weight: 600;
          }

          .content-area {
            flex: 1;
            min-width: 0;
            padding: 2.5rem 3rem;
            max-width: 860px;
          }

          .toc-area {
            width: var(--toc-width);
            flex-shrink: 0;
            position: sticky;
            top: var(--header-height);
            height: calc(100vh - var(--header-height));
            overflow-y: auto;
            padding: 2rem 1rem;
            display: block;
          }

          .toc-title {
            font-size: 0.8125rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 0.75rem;
          }

          .toc-list {
            list-style: none;
            border-left: 2px solid var(--border-color);
            padding-left: 0.75rem;
          }

          .toc-item {
            margin: 0.375rem 0;
          }
          .toc-item.level-3 {
            padding-left: 0.75rem;
          }
          .toc-item.level-4 {
            padding-left: 1.5rem;
          }

          .toc-link {
            font-size: 0.8125rem;
            color: var(--text-muted);
            display: block;
            line-height: 1.4;
          }
          .toc-link:hover, .toc-link.active {
            color: var(--accent);
          }

          /* Breadcrumbs */
          .breadcrumbs {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: 1.25rem;
          }
          .breadcrumb-separator {
            opacity: 0.5;
          }

          /* Markdown Prose Typography */
          .doc-prose {
            color: var(--text-primary);
            line-height: 1.75;
          }

          .doc-prose h1 {
            font-size: 2.25rem;
            font-weight: 800;
            margin-bottom: 1rem;
            line-height: 1.25;
            letter-spacing: -0.02em;
          }

          .doc-prose h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 2.25rem;
            margin-bottom: 0.75rem;
            padding-bottom: 0.4rem;
            border-bottom: 1px solid var(--border-color);
            letter-spacing: -0.01em;
          }

          .doc-prose h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 1.75rem;
            margin-bottom: 0.5rem;
          }

          .doc-prose p {
            margin-bottom: 1.25rem;
            color: var(--text-secondary);
          }

          .doc-prose ul, .doc-prose ol {
            margin-bottom: 1.25rem;
            padding-left: 1.5rem;
            color: var(--text-secondary);
          }

          .doc-prose li {
            margin-bottom: 0.375rem;
          }

          .doc-prose strong {
            color: var(--text-primary);
          }

          .doc-prose code:not(pre code) {
            background: var(--bg-tertiary);
            color: var(--accent-text);
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
            font-family: var(--font-mono);
          }

          /* Code block container */
          .code-block-wrapper {
            background: var(--code-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            margin: 1.25rem 0;
            overflow: hidden;
          }

          .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.2);
            padding: 0.35rem 0.75rem;
            font-size: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .code-lang {
            color: #94a3b8;
            text-transform: uppercase;
            font-family: var(--font-mono);
            font-weight: 600;
          }

          .copy-code-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #cbd5e1;
            padding: 0.2rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            cursor: pointer;
            font-family: var(--font-sans);
          }
          .copy-code-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
          }

          pre[class*="language-"] {
            margin: 0;
            padding: 1rem;
            overflow-x: auto;
            font-family: var(--font-mono);
            font-size: 0.875rem;
            line-height: 1.6;
            color: var(--code-text);
            background: transparent;
          }

          /* Prism Token Styles */
          .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #64748b; font-style: italic; }
          .token.punctuation { color: #94a3b8; }
          .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol { color: #f472b6; }
          .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin { color: #38bdf8; }
          .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #a78bfa; }
          .token.atrule, .token.attr-value, .token.keyword { color: #fb923c; font-weight: 600; }
          .token.function, .token.class-name { color: #4ade80; }
          .token.regex, .token.important, .token.variable { color: #fbbf24; }

          /* Tables */
          .table-container {
            width: 100%;
            overflow-x: auto;
            margin: 1.5rem 0;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.875rem;
          }

          th {
            background: var(--bg-secondary);
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: var(--text-primary);
            border-bottom: 1px solid var(--border-color);
          }

          td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-secondary);
          }

          tr:last-child td {
            border-bottom: none;
          }

          /* Callouts / Alerts */
          .callout {
            border-radius: 0.5rem;
            padding: 1rem 1.25rem;
            margin: 1.5rem 0;
            border-left: 4px solid;
            background: var(--bg-secondary);
          }

          .callout-title {
            font-weight: 700;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .callout-body p {
            margin-bottom: 0.5rem;
          }
          .callout-body p:last-child {
            margin-bottom: 0;
          }

          .callout-note { border-color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
          .callout-note .callout-title { color: #2563eb; }

          .callout-tip { border-color: #10b981; background: rgba(16, 185, 129, 0.08); }
          .callout-tip .callout-title { color: #059669; }

          .callout-important { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.08); }
          .callout-important .callout-title { color: #7c3aed; }

          .callout-warning { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
          .callout-warning .callout-title { color: #d97706; }

          /* Mermaid Diagram Container */
          .mermaid-block {
            margin: 1.5rem 0;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 1.5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow-x: auto;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .mermaid-block .mermaid {
            width: 100%;
            display: flex;
            justify-content: center;
            background: transparent;
            font-family: var(--font-sans);
          }

          .mermaid-block .mermaid svg {
            max-width: 100%;
            height: auto;
          }

          /* Heading Anchors */
          .heading-anchor {
            opacity: 0;
            margin-left: 0.5rem;
            color: var(--text-muted);
            font-weight: 400;
            font-size: 0.85em;
          }
          .doc-heading:hover .heading-anchor {
            opacity: 1;
          }

          /* Pagination footer */
          .docs-pagination {
            display: flex;
            justify-content: space-between;
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
            gap: 1rem;
          }

          .pagination-card {
            display: flex;
            flex-direction: column;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            flex: 1;
            text-decoration: none;
            transition: all 0.15s ease;
          }
          .pagination-card:hover {
            border-color: var(--accent);
            background: var(--bg-secondary);
          }
          .pagination-card.next {
            text-align: right;
          }

          .pagination-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }

          .pagination-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-top: 0.25rem;
          }

          /* Search Modal */
          .search-modal-backdrop {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 100;
            align-items: flex-start;
            justify-content: center;
            padding-top: 10vh;
          }
          .search-modal-backdrop.open {
            display: flex;
          }

          .search-modal {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            width: 100%;
            max-width: 600px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 70vh;
          }

          .search-input-wrapper {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .search-modal-input {
            width: 100%;
            background: transparent;
            border: none;
            outline: none;
            font-size: 1.125rem;
            color: var(--text-primary);
            font-family: var(--font-sans);
          }

          .search-results-list {
            list-style: none;
            overflow-y: auto;
            padding: 0.5rem;
          }

          .search-result-item {
            padding: 0.75rem;
            border-radius: 0.5rem;
            cursor: pointer;
          }
          .search-result-item:hover, .search-result-item.selected {
            background: var(--bg-tertiary);
          }

          .search-result-title {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9375rem;
          }

          .search-result-category {
            font-size: 0.75rem;
            color: var(--accent);
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          .search-result-snippet {
            font-size: 0.8125rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
            line-height: 1.4;
          }

          /* Responsive Breakpoints */
          @media (max-width: 1100px) {
            .toc-area {
              display: none;
            }
          }

          @media (max-width: 768px) {
            .sidebar {
              display: none;
              position: fixed;
              left: 0;
              top: var(--header-height);
              bottom: 0;
              z-index: 50;
              width: 80%;
              max-width: 320px;
              box-shadow: 10px 0 20px rgba(0,0,0,0.2);
            }
            .sidebar.mobile-open {
              display: block;
            }
            .mobile-menu-btn {
              display: flex;
            }
            .content-area {
              padding: 1.5rem 1rem;
            }
            .nav-links {
              display: none;
            }
          }
        `}} />
      </head>
      <body>
        {/* Navigation Header */}
        <header class="site-header">
          <div class="header-left">
            <button class="mobile-menu-btn" id="mobile-toggle" aria-label="Toggle sidebar menu">
              ☰
            </button>
            <a href="/" class="brand-logo">
              <span style="font-size: 1.35rem">⚡</span>
              <span>HonoDocs</span>
              <span class="brand-badge">Cloudflare</span>
            </a>
            <ul class="nav-links">
              <li>
                <a href="/docs" class={`nav-link ${activePath.startsWith('/docs') ? 'active' : ''}`}>
                  Documentation
                </a>
              </li>
              <li>
                <a href="/reference" class={`nav-link ${activePath.startsWith('/reference') ? 'active' : ''}`}>
                  API Reference
                </a>
              </li>
              <li>
                <a href="/openapi.json" class="nav-link" target="_blank" rel="noopener">
                  OpenAPI Spec ↗
                </a>
              </li>
            </ul>
          </div>

          <div class="header-right">
            <button class="search-btn" id="open-search-btn" aria-label="Search documentation">
              <span>🔍 Search...</span>
              <span class="search-shortcut">⌘K</span>
            </button>
            <button class="theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle theme" title="Toggle dark/light mode">
              🌓
            </button>
          </div>
        </header>

        {/* Search Modal */}
        <div class="search-modal-backdrop" id="search-modal">
          <div class="search-modal">
            <div class="search-input-wrapper">
              <span>🔍</span>
              <input
                type="text"
                id="search-input"
                class="search-modal-input"
                placeholder="Search documentation, guides, API..."
                autocomplete="off"
              />
              <span class="search-shortcut">ESC</span>
            </div>
            <div id="search-results" class="search-results-list">
              <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                Type to start searching...
              </div>
            </div>
          </div>
        </div>

        {/* Main Content View */}
        <div class="main-wrapper">
          {children}
        </div>

        {/* Mermaid JS Library for Diagrams */}
        <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>

        {/* Interactive Client-Side Scripts */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Mermaid Diagrams Rendering
          function renderMermaid() {
            if (typeof mermaid === 'undefined') return;
            const nodes = document.querySelectorAll('.mermaid');
            if (nodes.length === 0) return;

            const currentTheme = document.documentElement.getAttribute('data-theme') || 
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            const isDark = currentTheme === 'dark';

            mermaid.initialize({
              startOnLoad: false,
              theme: isDark ? 'dark' : 'default',
              themeVariables: isDark ? {
                darkMode: true,
                background: '#111827',
                primaryColor: '#f97316',
                primaryTextColor: '#f9fafb',
                primaryBorderColor: '#f97316',
                lineColor: '#fdba74',
                secondaryColor: '#1f2937',
                tertiaryColor: '#0b0f19'
              } : {
                primaryColor: '#fff7ed',
                primaryBorderColor: '#f97316',
                primaryTextColor: '#0f172a',
                lineColor: '#ea580c'
              },
              securityLevel: 'loose'
            });

            nodes.forEach(el => {
              if (!el.getAttribute('data-original-code')) {
                el.setAttribute('data-original-code', el.textContent || '');
              } else {
                el.removeAttribute('data-processed');
                el.innerHTML = el.getAttribute('data-original-code') || '';
              }
            });

            mermaid.run({ nodes: Array.from(nodes) }).catch(err => {
              console.warn('Mermaid rendering notice:', err);
            });
          }

          // Initial run on page load
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderMermaid);
          } else {
            renderMermaid();
          }

          // Theme toggling
          const themeToggleBtn = document.getElementById('theme-toggle-btn');
          const savedTheme = localStorage.getItem('theme');
          if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
          }

          themeToggleBtn?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('theme', nextTheme);
            renderMermaid();
          });

          // Mobile sidebar drawer
          const mobileToggle = document.getElementById('mobile-toggle');
          const sidebar = document.querySelector('.sidebar');
          mobileToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('mobile-open');
          });

          // Search Modal Logic
          const searchModal = document.getElementById('search-modal');
          const openSearchBtn = document.getElementById('open-search-btn');
          const searchInput = document.getElementById('search-input');
          const searchResults = document.getElementById('search-results');
          let searchData = [];

          async function loadSearchData() {
            if (searchData.length === 0) {
              try {
                const res = await fetch('/api/search');
                searchData = await res.json();
              } catch (e) {
                console.error('Failed to load search index', e);
              }
            }
          }

          function openSearch() {
            searchModal?.classList.add('open');
            loadSearchData();
            setTimeout(() => searchInput?.focus(), 50);
          }

          function closeSearch() {
            searchModal?.classList.remove('open');
            if (searchInput) searchInput.value = '';
          }

          openSearchBtn?.addEventListener('click', openSearch);

          window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              openSearch();
            }
            if (e.key === 'Escape') {
              closeSearch();
            }
          });

          searchModal?.addEventListener('click', (e) => {
            if (e.target === searchModal) closeSearch();
          });

          searchInput?.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (!query) {
              searchResults.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">Type to start searching...</div>';
              return;
            }

            const matches = searchData.filter(item => 
              item.title.toLowerCase().includes(query) ||
              item.category.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query) ||
              item.contentSnippet.toLowerCase().includes(query)
            ).slice(0, 8);

            if (matches.length === 0) {
              searchResults.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">No matching documents found.</div>';
              return;
            }

            searchResults.innerHTML = matches.map(item => \`
              <div class="search-result-item" onclick="window.location.href='/docs/\${item.slug}'">
                <div class="search-result-category">\${item.category}</div>
                <div class="search-result-title">\${item.title}</div>
                <div class="search-result-snippet">\${item.description || item.contentSnippet}</div>
              </div>
            \`).join('');
          });

          // Scroll Spy for TOC active links
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                document.querySelectorAll('.toc-link').forEach(link => {
                  link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
              }
            });
          }, { rootMargin: '0px 0px -80% 0px' });

          document.querySelectorAll('.doc-heading').forEach(heading => {
            observer.observe(heading);
          });
        `}} />
      </body>
    </html>
  )
}
