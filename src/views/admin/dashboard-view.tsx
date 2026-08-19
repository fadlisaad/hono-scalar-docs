import { FC } from 'hono/jsx'
import { AdminLayout } from './admin-layout'
import { StoredDoc, StoredOpenAPISpec } from '../../storage/types'

interface DashboardViewProps {
  docs: StoredDoc[]
  specs: StoredOpenAPISpec[]
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Recently'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export const DashboardView: FC<DashboardViewProps> = ({ docs, specs }) => {
  const dynamicCount = docs.filter(d => d.isDynamic).length
  const staticCount = docs.filter(d => !d.isDynamic).length
  const uniqueCategories = new Set(docs.map(d => d.category)).size

  return (
    <AdminLayout title="Dashboard Overview" activePath="/admin">
      {/* 4 Stat Cards */}
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
        <div class="card" style="margin-bottom: 0;">
          <div style="font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;">Total Articles</div>
          <div style="font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;">{docs.length}</div>
          <div style="font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;">
            <span>{staticCount} static</span> • <span style="color: var(--admin-accent); font-weight: 600;">{dynamicCount} dynamic</span>
          </div>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <div style="font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;">Categories</div>
          <div style="font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;">{uniqueCategories}</div>
          <div style="font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;">Organized doc sections</div>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <div style="font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;">OpenAPI Specs</div>
          <div style="font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;">{specs.length}</div>
          <div style="font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;">Active in Scalar playground</div>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <div style="font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;">Edge Runtime</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: #10b981; margin-top: 0.5rem;">Operational ⚡</div>
          <div style="font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;">Cloudflare Workers + KV</div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div class="card" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
        <div>
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--admin-text);">Quick Operations</h3>
          <p style="font-size: 0.8125rem; color: var(--admin-muted);">Add new guides or manage OpenAPI document specifications.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a href="/admin/docs/new" class="btn btn-primary">➕ Create New Article</a>
          <a href="/admin/openapi" class="btn btn-secondary">📖 Manage OpenAPI</a>
        </div>
      </div>

      {/* Recent Docs Table */}
      <div class="card">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--admin-text); margin-bottom: 1rem;">
          Recent Documentation Articles
        </h3>
        <div style="overflow-x: auto;">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Last Updated</th>
                <th>Type</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              {docs.slice(0, 6).map(doc => (
                <tr key={doc.slug}>
                  <td style="font-weight: 600;">{doc.title}</td>
                  <td>{doc.category}</td>
                  <td style="color: var(--admin-muted); font-size: 0.8125rem;">
                    👤 {doc.author || 'Docs Team'}
                  </td>
                  <td style="color: var(--admin-muted); font-size: 0.8125rem;">
                    🕒 {formatDate(doc.updatedAt)}
                  </td>
                  <td>
                    <span class={`badge ${doc.isDynamic ? 'badge-dynamic' : 'badge-static'}`}>
                      {doc.isDynamic ? 'Dynamic (KV)' : 'Filesystem'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <a href={`/admin/docs/edit/${encodeURIComponent(doc.slug)}`} class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
