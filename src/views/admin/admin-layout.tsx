import { FC, PropsWithChildren } from 'hono/jsx'

interface AdminLayoutProps {
  title?: string
  activePath?: string
}

export const AdminLayout: FC<PropsWithChildren<AdminLayoutProps>> = ({
  children,
  title = 'Admin Dashboard',
  activePath = '/admin'
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} | Docs Admin</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚙️</text></svg>" />
        
        {/* Instant theme initializer to prevent flashing */}
        <script dangerouslySetInnerHTML={{ __html: `
          const savedTheme = localStorage.getItem('admin_theme') || localStorage.getItem('theme');
          if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
          }
        `}} />

        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --admin-bg: #090d16;
            --admin-card-bg: #111827;
            --admin-sidebar-bg: #0d1322;
            --admin-border: #1f2937;
            --admin-text: #f9fafb;
            --admin-muted: #94a3b8;
            --admin-accent: #f97316;
            --admin-accent-hover: #ea580c;
            --admin-danger: #ef4444;
            --admin-success: #10b981;
            --admin-input-bg: #090d16;
            --admin-preview-bg: #090d16;
            --admin-preview-text: #cbd5e1;
            --admin-table-hover: rgba(255, 255, 255, 0.03);
            --admin-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --admin-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          [data-theme="light"] {
            --admin-bg: #f8fafc;
            --admin-card-bg: #ffffff;
            --admin-sidebar-bg: #ffffff;
            --admin-border: #e2e8f0;
            --admin-text: #0f172a;
            --admin-muted: #64748b;
            --admin-accent: #ea580c;
            --admin-accent-hover: #c2410c;
            --admin-danger: #dc2626;
            --admin-success: #059669;
            --admin-input-bg: #f8fafc;
            --admin-preview-bg: #f8fafc;
            --admin-preview-text: #334155;
            --admin-table-hover: rgba(0, 0, 0, 0.02);
          }

          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: var(--admin-font);
            background-color: var(--admin-bg);
            color: var(--admin-text);
            line-height: 1.5;
            display: flex;
            min-height: 100vh;
            transition: background-color 0.2s ease, color 0.2s ease;
          }

          /* Sidebar */
          .admin-sidebar {
            width: 260px;
            background: var(--admin-sidebar-bg);
            border-right: 1px solid var(--admin-border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .admin-brand {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--admin-border);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--admin-text);
            text-decoration: none;
          }

          .admin-nav {
            padding: 1.5rem 1rem;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .nav-section-title {
            font-size: 0.6875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--admin-muted);
            padding: 0.5rem 0.75rem 0.25rem;
            font-weight: 700;
          }

          .admin-nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.625rem 0.875rem;
            border-radius: 0.5rem;
            color: var(--admin-muted);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.15s ease;
          }
          .admin-nav-item:hover {
            color: var(--admin-text);
            background: rgba(125, 125, 125, 0.08);
          }
          .admin-nav-item.active {
            color: #fff;
            background: var(--admin-accent);
            font-weight: 600;
          }

          .admin-footer-nav {
            padding: 1rem;
            border-top: 1px solid var(--admin-border);
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          /* Main Body */
          .admin-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .admin-topbar {
            height: 64px;
            border-bottom: 1px solid var(--admin-border);
            background: var(--admin-card-bg);
            padding: 0 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .admin-page-title {
            font-size: 1.125rem;
            font-weight: 700;
          }

          .admin-content {
            padding: 2rem;
            flex: 1;
            overflow-y: auto;
          }

          /* Cards & UI Elements */
          .card {
            background: var(--admin-card-bg);
            border: 1px solid var(--admin-border);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border: none;
            transition: opacity 0.15s, background-color 0.15s;
          }
          .btn:hover { opacity: 0.9; }

          .btn-primary { background: var(--admin-accent); color: white; }
          .btn-secondary { background: var(--admin-border); color: var(--admin-text); }
          .btn-danger { background: var(--admin-danger); color: white; }
          .btn-outline { background: transparent; border: 1px solid var(--admin-border); color: var(--admin-text); }
          .btn-outline:hover { background: rgba(125, 125, 125, 0.08); }

          .badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .badge-dynamic { background: rgba(249, 115, 22, 0.15); color: var(--admin-accent); border: 1px solid rgba(249, 115, 22, 0.3); }
          .badge-static { background: rgba(100, 116, 139, 0.15); color: var(--admin-muted); border: 1px solid rgba(100, 116, 139, 0.3); }

          /* Tables */
          .admin-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
          }
          .admin-table th {
            text-align: left;
            padding: 0.75rem 1rem;
            color: var(--admin-muted);
            border-bottom: 1px solid var(--admin-border);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
          }
          .admin-table td {
            padding: 0.875rem 1rem;
            border-bottom: 1px solid var(--admin-border);
            color: var(--admin-text);
          }
          .admin-table tr:hover td {
            background: var(--admin-table-hover);
          }

          /* Forms */
          .form-group {
            margin-bottom: 1.25rem;
          }
          .form-label {
            display: block;
            margin-bottom: 0.375rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--admin-text);
          }
          .form-control {
            width: 100%;
            padding: 0.625rem 0.875rem;
            background: var(--admin-input-bg);
            border: 1px solid var(--admin-border);
            border-radius: 0.375rem;
            color: var(--admin-text);
            font-size: 0.875rem;
            font-family: var(--admin-font);
            outline: none;
            transition: border-color 0.15s;
          }
          .form-control:focus {
            border-color: var(--admin-accent);
          }
          textarea.form-control {
            font-family: var(--admin-mono);
            line-height: 1.6;
          }

          /* Toast message */
          .toast-box {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 100;
            background: var(--admin-card-bg);
            border: 1px solid var(--admin-accent);
            color: var(--admin-text);
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            display: none;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          }
        `}} />
      </head>
      <body>
        <aside class="admin-sidebar">
          <a href="/admin" class="admin-brand">
            <span style="font-size: 1.3rem">⚡</span>
            <span>Hono Admin</span>
          </a>

          <nav class="admin-nav">
            <div class="nav-section-title">Overview</div>
            <a href="/admin" class={`admin-nav-item ${activePath === '/admin' ? 'active' : ''}`}>
              <span>📊</span>
              <span>Dashboard</span>
            </a>

            <div class="nav-section-title" style="margin-top: 1rem;">Content Management</div>
            <a href="/admin/docs" class={`admin-nav-item ${activePath.startsWith('/admin/docs') && activePath !== '/admin/docs/new' ? 'active' : ''}`}>
              <span>📝</span>
              <span>All Documents</span>
            </a>
            <a href="/admin/docs/new" class={`admin-nav-item ${activePath === '/admin/docs/new' ? 'active' : ''}`}>
              <span>➕</span>
              <span>New Document</span>
            </a>
            <a href="/admin/openapi" class={`admin-nav-item ${activePath.startsWith('/admin/openapi') ? 'active' : ''}`}>
              <span>📖</span>
              <span>OpenAPI Specs</span>
            </a>
          </nav>

          <div class="admin-footer-nav">
            <a href="/docs" target="_blank" class="admin-nav-item">
              <span>🌐</span>
              <span>View Public Docs ↗</span>
            </a>
            <a href="/reference" target="_blank" class="admin-nav-item">
              <span>🚀</span>
              <span>Scalar Reference ↗</span>
            </a>
            <a href="/admin/logout" class="admin-nav-item" style="color: var(--admin-danger);">
              <span>🚪</span>
              <span>Log Out</span>
            </a>
          </div>
        </aside>

        <main class="admin-main">
          <header class="admin-topbar">
            <div class="admin-page-title">{title}</div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span style="font-size: 0.8125rem; color: var(--admin-muted);">Role: <strong>Administrator</strong></span>
              
              {/* Theme Toggle Button */}
              <button
                id="admin-theme-toggle"
                class="btn btn-outline"
                style="padding: 0.35rem 0.75rem; font-size: 0.8125rem; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.4rem;"
                title="Toggle Dark / Light theme"
                aria-label="Toggle Dark / Light theme"
              >
                <span id="theme-icon">🌓</span>
                <span id="theme-label" style="font-size: 0.75rem;">Theme</span>
              </button>
            </div>
          </header>

          <div class="admin-content">
            {children}
          </div>
        </main>

        <div id="admin-toast" class="toast-box"></div>

        <script dangerouslySetInnerHTML={{ __html: `
          // Toast Notification
          function showToast(msg, isError = false) {
            const toast = document.getElementById('admin-toast');
            if (!toast) return;
            toast.innerText = msg;
            toast.style.borderColor = isError ? 'var(--admin-danger)' : 'var(--admin-success)';
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 3000);
          }

          // Dark / Light Mode Toggle
          const themeToggleBtn = document.getElementById('admin-theme-toggle');
          const themeIcon = document.getElementById('theme-icon');
          const themeLabel = document.getElementById('theme-label');

          function updateThemeUI(theme) {
            if (themeIcon) {
              themeIcon.innerText = theme === 'light' ? '☀️' : '🌙';
            }
            if (themeLabel) {
              themeLabel.innerText = theme === 'light' ? 'Light' : 'Dark';
            }
          }

          const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
          updateThemeUI(currentTheme);

          themeToggleBtn?.addEventListener('click', () => {
            const activeTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            const nextTheme = activeTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('admin_theme', nextTheme);
            localStorage.setItem('theme', nextTheme);
            updateThemeUI(nextTheme);
          });
        `}} />
      </body>
    </html>
  )
}
