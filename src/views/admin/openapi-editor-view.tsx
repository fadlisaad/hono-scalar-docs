import { FC } from 'hono/jsx'
import { AdminLayout } from './admin-layout'
import { StoredOpenAPISpec } from '../../storage/types'

interface OpenAPIEditorViewProps {
  spec: StoredOpenAPISpec
  allSpecs: StoredOpenAPISpec[]
}

export const OpenAPIEditorView: FC<OpenAPIEditorViewProps> = ({ spec, allSpecs }) => {
  return (
    <AdminLayout title="OpenAPI Document Management" activePath="/admin/openapi">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700;">OpenAPI Specification Editor</h2>
          <p style="font-size: 0.875rem; color: var(--admin-muted);">
            Manage OpenAPI 3.0 / 3.1 definitions rendered in the Scalar interactive playground.
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a href="/reference" target="_blank" class="btn btn-outline">
            🚀 Open Scalar Playground ↗
          </a>
          <a href="/openapi.json" target="_blank" class="btn btn-outline">
            📄 Raw JSON Spec ↗
          </a>
          <button type="button" class="btn btn-primary" id="save-openapi-btn">
            💾 Save OpenAPI Spec
          </button>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; color: var(--admin-text);">
          Specification Metadata
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label class="form-label" for="spec-id">Spec Identifier</label>
            <input
              type="text"
              id="spec-id"
              class="form-control"
              value={spec.id}
              readonly
              style="opacity: 0.7; cursor: not-allowed;"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="spec-title">API Title</label>
            <input
              type="text"
              id="spec-title"
              class="form-control"
              value={spec.title}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="spec-version">Version</label>
            <input
              type="text"
              id="spec-version"
              class="form-control"
              value={spec.version}
              required
            />
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" for="spec-desc">Description</label>
          <input
            type="text"
            id="spec-desc"
            class="form-control"
            value={spec.description}
          />
        </div>
      </div>

      {/* JSON Editor Card */}
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--admin-text);">
              OpenAPI JSON Schema
            </h3>
            <span id="json-status" style="font-size: 0.75rem; color: #10b981; font-weight: 600;">
              ✓ Valid JSON
            </span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" id="format-json-btn">
              ✨ Format JSON
            </button>
          </div>
        </div>

        <textarea
          id="spec-json"
          class="form-control"
          style="min-height: 500px; font-size: 0.875rem; font-family: var(--admin-mono); white-space: pre;"
        >
          {spec.specJson}
        </textarea>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        const jsonTextarea = document.getElementById('spec-json');
        const jsonStatus = document.getElementById('json-status');
        const formatBtn = document.getElementById('format-json-btn');
        const saveBtn = document.getElementById('save-openapi-btn');

        function validateJSON() {
          try {
            JSON.parse(jsonTextarea.value);
            jsonStatus.innerText = '✓ Valid JSON';
            jsonStatus.style.color = '#10b981';
            return true;
          } catch (e) {
            jsonStatus.innerText = '⚠️ Invalid JSON: ' + e.message;
            jsonStatus.style.color = '#ef4444';
            return false;
          }
        }

        jsonTextarea?.addEventListener('input', validateJSON);

        formatBtn?.addEventListener('click', () => {
          try {
            const parsed = JSON.parse(jsonTextarea.value);
            jsonTextarea.value = JSON.stringify(parsed, null, 2);
            validateJSON();
            showToast('JSON formatted!');
          } catch (e) {
            alert('Cannot format invalid JSON: ' + e.message);
          }
        });

        saveBtn?.addEventListener('click', async () => {
          if (!validateJSON()) {
            alert('Please fix JSON syntax errors before saving.');
            return;
          }

          saveBtn.innerText = 'Saving...';
          const id = document.getElementById('spec-id').value;
          const title = document.getElementById('spec-title').value;
          const version = document.getElementById('spec-version').value;
          const description = document.getElementById('spec-desc').value;
          const specJson = jsonTextarea.value;

          try {
            const res = await fetch('/api/admin/openapi/' + encodeURIComponent(id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, title, version, description, specJson })
            });

            if (res.ok) {
              showToast('OpenAPI Specification saved successfully!');
              saveBtn.innerText = '💾 Save OpenAPI Spec';
            } else {
              const err = await res.json();
              alert('Failed to save spec: ' + (err.error || 'Unknown error'));
              saveBtn.innerText = '💾 Save OpenAPI Spec';
            }
          } catch (e) {
            alert('Network error saving spec');
            saveBtn.innerText = '💾 Save OpenAPI Spec';
          }
        });
      `}} />
    </AdminLayout>
  )
}
