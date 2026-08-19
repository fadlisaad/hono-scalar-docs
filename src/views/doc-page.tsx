import { FC } from 'hono/jsx'
import { DocItem, NavigationCategory } from '../docs/types'
import { Layout } from './layout'

interface DocPageProps {
  doc: DocItem
  navigation: NavigationCategory[]
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Recently'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export const DocPage: FC<DocPageProps> = ({ doc, navigation }) => {
  return (
    <Layout
      title={doc.title}
      description={doc.description || `Read ${doc.title} on the documentation site.`}
      activePath={`/docs/${doc.slug}`}
    >
      <div class="docs-container">
        
        {/* Left Sidebar Navigation */}
        <aside class="sidebar">
          {navigation.map(cat => (
            <div class="sidebar-group" key={cat.slug}>
              <div class="sidebar-group-title">{cat.title}</div>
              <ul class="sidebar-menu">
                {cat.items.map(item => {
                  const isActive = item.slug === doc.slug
                  return (
                    <li class="sidebar-item" key={item.slug}>
                      <a
                        href={`/docs/${item.slug}`}
                        class={`sidebar-link ${isActive ? 'active' : ''}`}
                      >
                        {item.title}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Center Main Content Area */}
        <main class="content-area">
          {/* Breadcrumbs */}
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/docs">Docs</a>
            <span class="breadcrumb-separator">/</span>
            <span>{doc.category}</span>
            <span class="breadcrumb-separator">/</span>
            <span style="color: var(--text-primary); font-weight: 500;">{doc.title}</span>
          </nav>

          {/* Document Meta (Author / Owner & Last Updated) */}
          <div style="display: flex; align-items: center; gap: 1.5rem; font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap;">
            <div style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <span>👤</span>
              <span>Owner: <strong style="color: var(--text-primary);">{doc.author || 'Docs Team'}</strong></span>
            </div>
            <div style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <span>🕒</span>
              <span>Last updated: <time datetime={doc.updatedAt || ''} style="color: var(--text-primary); font-weight: 500;">{formatDate(doc.updatedAt)}</time></span>
            </div>
          </div>

          {/* Rendered Markdown Body */}
          <article class="doc-prose">
            <div dangerouslySetInnerHTML={{ __html: doc.htmlContent }} />
          </article>

          {/* Next / Previous Navigation Footer */}
          {(doc.prevDoc || doc.nextDoc) && (
            <div class="docs-pagination">
              {doc.prevDoc ? (
                <a href={`/docs/${doc.prevDoc.slug}`} class="pagination-card prev">
                  <span class="pagination-label">← Previous</span>
                  <span class="pagination-title">{doc.prevDoc.title}</span>
                </a>
              ) : (
                <div />
              )}

              {doc.nextDoc && (
                <a href={`/docs/${doc.nextDoc.slug}`} class="pagination-card next">
                  <span class="pagination-label">Next →</span>
                  <span class="pagination-title">{doc.nextDoc.title}</span>
                </a>
              )}
            </div>
          )}
        </main>

        {/* Right Table of Contents */}
        {doc.headings && doc.headings.length > 0 ? (
          <aside class="toc-area">
            <div class="toc-title">On this page</div>
            <ul class="toc-list">
              {doc.headings.map(heading => (
                <li class={`toc-item level-${heading.level}`} key={heading.id}>
                  <a href={`#${heading.id}`} class="toc-link">
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        ) : (
          <div style="width: var(--toc-width); flex-shrink: 0;" />
        )}

      </div>
    </Layout>
  )
}
