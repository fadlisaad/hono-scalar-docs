import { FC } from 'hono/jsx'
import { AdminLayout } from './admin-layout'
import { StoredDoc } from '../../storage/types'

interface DocsListViewProps {
  docs: StoredDoc[]
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

export const DocsListView: FC<DocsListViewProps> = ({ docs }) => {
  return (
    <AdminLayout title="Documentation Management" activePath="/admin/docs">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700;">All Documentation Pages ({docs.length})</h2>
          <p style="font-size: 0.875rem; color: var(--admin-muted);">Manage static and dynamic documentation articles.</p>
        </div>
        <a href="/admin/docs/new" class="btn btn-primary">
          ➕ New Document
        </a>
      </div>

      <div class="card">
        <div style="margin-bottom: 1rem;">
          <input
            type="text"
            id="doc-filter-input"
            class="form-control"
            placeholder="Filter documentation by title, slug, owner, or category..."
          />
        </div>

        <div style="overflow-x: auto;">
          <table class="admin-table" id="docs-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Last Updated</th>
                <th>Slug</th>
                <th>Type</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.slug} data-search={`${doc.title.toLowerCase()} ${doc.category.toLowerCase()} ${doc.slug.toLowerCase()} ${(doc.author || '').toLowerCase()}`}>
                  <td>
                    <div style="font-weight: 600; color: var(--admin-text);">{doc.title}</div>
                    <div style="font-size: 0.75rem; color: var(--admin-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {doc.description || 'No description provided'}
                    </div>
                  </td>
                  <td>{doc.category}</td>
                  <td style="color: var(--admin-muted); font-size: 0.8125rem; white-space: nowrap;">
                    👤 {doc.author || 'Docs Team'}
                  </td>
                  <td style="color: var(--admin-muted); font-size: 0.8125rem; white-space: nowrap;">
                    🕒 {formatDate(doc.updatedAt)}
                  </td>
                  <td style="font-family: var(--admin-mono); font-size: 0.8125rem; color: var(--admin-muted);">
                    <a href={`/docs/${doc.slug}`} target="_blank" style="color: var(--admin-muted); text-decoration: underline;">
                      /docs/{doc.slug} ↗
                    </a>
                  </td>
                  <td>
                    <span class={`badge ${doc.isDynamic ? 'badge-dynamic' : 'badge-static'}`}>
                      {doc.isDynamic ? 'Dynamic (KV)' : 'Filesystem'}
                    </span>
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <a
                      href={`/admin/docs/edit/${encodeURIComponent(doc.slug)}`}
                      class="btn btn-outline"
                      style="padding: 0.25rem 0.6rem; font-size: 0.75rem; margin-right: 0.5rem;"
                    >
                      Edit
                    </a>
                    {doc.isDynamic && (
                      <button
                        type="button"
                        class="btn btn-danger"
                        style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
                        onclick={`deleteDoc('${doc.slug}')`}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        // Search filter
        document.getElementById('doc-filter-input')?.addEventListener('input', (e) => {
          const val = e.target.value.toLowerCase().trim();
          document.querySelectorAll('#docs-table tbody tr').forEach(row => {
            const searchData = row.getAttribute('data-search') || '';
            row.style.display = searchData.includes(val) ? '' : 'none';
          });
        });

        // Delete Handler
        async function deleteDoc(slug) {
          if (!confirm('Are you sure you want to delete the document /docs/' + slug + '?')) return;
          try {
            const res = await fetch('/api/admin/docs/' + encodeURIComponent(slug), {
              method: 'DELETE'
            });
            if (res.ok) {
              showToast('Document deleted successfully!');
              setTimeout(() => window.location.reload(), 500);
            } else {
              const err = await res.json();
              alert('Failed to delete: ' + (err.message || 'Unknown error'));
            }
          } catch (e) {
            alert('Error deleting document');
          }
        }
      `}} />
    </AdminLayout>
  )
}
