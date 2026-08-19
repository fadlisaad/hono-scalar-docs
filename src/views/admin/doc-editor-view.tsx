import { FC } from 'hono/jsx'
import { AdminLayout } from './admin-layout'
import { StoredDoc } from '../../storage/types'

interface DocEditorViewProps {
  doc?: StoredDoc
  isNew?: boolean
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not yet published'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return dateStr
  }
}

export const DocEditorView: FC<DocEditorViewProps> = ({ doc, isNew = false }) => {
  const pageTitle = isNew ? 'Create New Document' : `Edit: ${doc?.title || 'Document'}`

  const defaultContent = isNew
    ? `Write your markdown content here...

> [!NOTE]
> This is a callout note.

## Features

- Feature 1
- Feature 2

\`\`\`typescript
const example = "Hono on Cloudflare";
console.log(example);
\`\`\`
`
    : doc?.rawContent || ''

  return (
    <AdminLayout title={pageTitle} activePath={isNew ? '/admin/docs/new' : '/admin/docs'}>
      <form id="doc-editor-form">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <a href="/admin/docs" class="btn btn-outline">
              ← Back to Docs
            </a>
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 700;">{pageTitle}</h2>
              {!isNew && doc?.updatedAt && (
                <span style="font-size: 0.75rem; color: var(--admin-muted);">
                  Last edited: {formatDate(doc.updatedAt)} by <strong>{doc.author || 'Docs Team'}</strong>
                </span>
              )}
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            {!isNew && doc?.slug && (
              <a
                href={`/docs/${doc.slug}`}
                target="_blank"
                class="btn btn-outline"
              >
                Preview Public ↗
              </a>
            )}
            <button type="submit" class="btn btn-primary" id="save-btn">
              💾 Save &amp; Publish
            </button>
          </div>
        </div>

        {/* Metadata Card */}
        <div class="card">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; color: var(--admin-text);">
            Document Metadata
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            
            <div class="form-group">
              <label class="form-label" for="doc-title">Document Title *</label>
              <input
                type="text"
                id="doc-title"
                name="title"
                class="form-control"
                placeholder="e.g. Webhook Integration"
                value={doc?.title || ''}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="doc-category">Category *</label>
              <input
                type="text"
                id="doc-category"
                name="category"
                class="form-control"
                placeholder="e.g. Guides, Getting Started, API"
                value={doc?.category || 'Guides'}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="doc-author">Owner / Author</label>
              <input
                type="text"
                id="doc-author"
                name="author"
                class="form-control"
                placeholder="e.g. Sarah Connor or Docs Team"
                value={doc?.author || 'Docs Team'}
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="doc-slug">URL Slug *</label>
              <input
                type="text"
                id="doc-slug"
                name="slug"
                class="form-control"
                placeholder="e.g. guides/webhook-integration"
                value={doc?.slug || ''}
                required
              />
              <span style="font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem; display: block;">
                Will be served at: <code>/docs/{"<slug>"}</code>
              </span>
            </div>

            <div class="form-group">
              <label class="form-label" for="doc-order">Sort Order</label>
              <input
                type="number"
                id="doc-order"
                name="order"
                class="form-control"
                value={doc?.order !== undefined ? String(doc.order) : '10'}
              />
            </div>

          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="doc-desc">Short Description (for SEO &amp; Search)</label>
            <input
              type="text"
              id="doc-desc"
              name="description"
              class="form-control"
              placeholder="Brief summary of this article..."
              value={doc?.description || ''}
            />
          </div>
        </div>

        {/* Editor & Live Preview Card */}
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--admin-text);">
              Markdown Content
            </h3>
            
            {/* Toolbar Buttons */}
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertText('## ')">H2</button>
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertText('### ')">H3</button>
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertAround('**', '**')">Bold</button>
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertAround('*', '*')">Italic</button>
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertAround('```typescript\n', '\n```')">Code</button>
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertText('> [!NOTE]\n> ')">Note Alert</button>
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertText('> [!TIP]\n> ')">Tip Alert</button>
              <button type="button" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="insertText('> [!WARNING]\n> ')">Warning</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; min-height: 480px;">
            {/* Left Editor */}
            <div style="display: flex; flex-direction: column;">
              <textarea
                id="doc-content"
                name="content"
                class="form-control"
                style="flex: 1; resize: vertical; min-height: 450px; font-size: 0.875rem;"
                placeholder="Type your markdown here..."
                required
              >
                {defaultContent}
              </textarea>
            </div>

            {/* Right Live Preview */}
            <div style="background: var(--admin-preview-bg); border: 1px solid var(--admin-border); border-radius: 0.375rem; padding: 1.25rem; overflow-y: auto; max-height: 600px; transition: background-color 0.2s ease, border-color 0.2s ease;">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--admin-muted); font-weight: 700; margin-bottom: 0.75rem; border-bottom: 1px solid var(--admin-border); padding-bottom: 0.35rem;">
                Live Preview
              </div>
              <div id="live-preview-container" class="doc-prose" style="color: var(--admin-preview-text); font-size: 0.875rem;">
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Include client-side Marked for fast live preview */}
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <script dangerouslySetInnerHTML={{ __html: `
        const contentTextarea = document.getElementById('doc-content');
        const previewContainer = document.getElementById('live-preview-container');
        const titleInput = document.getElementById('doc-title');
        const slugInput = document.getElementById('doc-slug');
        const isNewDoc = ${isNew ? 'true' : 'false'};

        if (isNewDoc) {
          titleInput?.addEventListener('input', () => {
            if (!slugInput.dataset.manual) {
              const base = titleInput.value.toLowerCase().trim().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-');
              const cat = (document.getElementById('doc-category')?.value || 'guides').toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-');
              slugInput.value = cat ? cat + '/' + base : base;
            }
          });
          slugInput?.addEventListener('input', () => {
            slugInput.dataset.manual = 'true';
          });
        }

        function updatePreview() {
          if (typeof marked !== 'undefined' && contentTextarea && previewContainer) {
            let md = contentTextarea.value;
            md = md.replace(/> \\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\]\\n((?:> .*\\n?)+)/gi, (_m, type, content) => {
              const clean = content.split('\\n').map(l => l.replace(/^>\\s?/, '')).join('\\n');
              return '<div style="border-left: 4px solid var(--admin-accent); background: rgba(249,115,22,0.1); padding: 0.5rem 0.75rem; border-radius: 0.35rem; margin: 1rem 0;"><strong>' + type + '</strong><br>' + clean + '</div>';
            });
            previewContainer.innerHTML = marked.parse(md);
          }
        }

        contentTextarea?.addEventListener('input', updatePreview);
        setTimeout(updatePreview, 100);

        function insertText(text) {
          if (!contentTextarea) return;
          const start = contentTextarea.selectionStart;
          const end = contentTextarea.selectionEnd;
          contentTextarea.setRangeText(text, start, end, 'end');
          updatePreview();
        }

        function insertAround(before, after) {
          if (!contentTextarea) return;
          const start = contentTextarea.selectionStart;
          const end = contentTextarea.selectionEnd;
          const selected = contentTextarea.value.substring(start, end) || 'text';
          contentTextarea.setRangeText(before + selected + after, start, end, 'end');
          updatePreview();
        }

        // Save Form Handler
        document.getElementById('doc-editor-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const saveBtn = document.getElementById('save-btn');
          if (saveBtn) saveBtn.innerText = 'Saving...';

          const title = titleInput.value.trim();
          const category = document.getElementById('doc-category').value.trim();
          const author = (document.getElementById('doc-author')?.value || 'Docs Team').trim();
          const slug = slugInput.value.trim();
          const order = parseInt(document.getElementById('doc-order').value || '10', 10);
          const description = document.getElementById('doc-desc').value.trim();
          const content = contentTextarea.value;

          const payload = { title, category, author, slug, order, description, content };

          try {
            const url = isNewDoc ? '/api/admin/docs' : '/api/admin/docs/' + encodeURIComponent(slug);
            const method = isNewDoc ? 'POST' : 'PUT';

            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (res.ok) {
              showToast('Document saved successfully!');
              setTimeout(() => {
                window.location.href = '/admin/docs';
              }, 600);
            } else {
              const err = await res.json();
              alert('Error saving document: ' + (err.error || err.message || 'Unknown error'));
              if (saveBtn) saveBtn.innerText = '💾 Save & Publish';
            }
          } catch (err) {
            alert('Failed to connect to admin API.');
            if (saveBtn) saveBtn.innerText = '💾 Save & Publish';
          }
        });
      `}} />
    </AdminLayout>
  )
}
