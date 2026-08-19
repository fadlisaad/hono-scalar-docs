import app from './src/index'

async function runTests() {
  console.log('--- Testing Documentation & Admin Platform Endpoints ---')

  let passed = 0
  let failed = 0

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`✅ [PASS] ${name}`)
      passed++
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`)
      failed++
    }
  }

  // --- Phase 1 Baseline Tests ---

  // 1. Home page
  await test('GET / returns 200 HTML with hero content', async () => {
    const res = await app.request('/')
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`)
    const text = await res.text()
    if (!text.includes('Next-Gen Documentation')) throw new Error('Missing hero heading')
    if (!text.includes('HonoDocs')) throw new Error('Missing brand name')
  })

  // 2. Docs redirect
  await test('GET /docs redirects to first document', async () => {
    const res = await app.request('/docs')
    if (res.status !== 302) throw new Error(`Expected status 302, got ${res.status}`)
  })

  // 3. Render static markdown doc
  await test('GET /docs/getting-started/introduction renders markdown SSR with alerts', async () => {
    const res = await app.request('/docs/getting-started/introduction')
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`)
    const html = await res.text()
    if (!html.includes('Introduction to the Docs Platform')) throw new Error('Missing document title')
    if (!html.includes('callout callout-note')) throw new Error('Missing callout class')
  })

  // 4. Scalar API Reference
  await test('GET /reference returns Scalar HTML interface', async () => {
    const res = await app.request('/reference')
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`)
    const html = await res.text()
    if (!html.includes('scalar') && !html.includes('Scalar')) throw new Error('Missing Scalar references')
  })

  // 5. REST API Users
  await test('GET /api/v1/users returns array of users', async () => {
    const res = await app.request('/api/v1/users')
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`)
    const data = await res.json() as any
    if (!Array.isArray(data) || data.length < 2) throw new Error('Expected users array')
  })

  // --- Phase 2 Admin Backend & Auth Tests ---

  // 6. Unauthenticated admin guard
  await test('GET /admin redirects unauthenticated user to /admin/login', async () => {
    const res = await app.request('/admin')
    if (res.status !== 302) throw new Error(`Expected 302 redirect, got ${res.status}`)
    const loc = res.headers.get('location')
    if (!loc || !loc.includes('/admin/login')) throw new Error(`Unexpected redirect location: ${loc}`)
  })

  // 7. Unauthenticated admin API guard
  await test('GET /api/admin/docs blocks unauthenticated request with 401', async () => {
    const res = await app.request('/api/admin/docs')
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`)
  })

  // 8. Admin login failure
  await test('POST /api/admin/login fails with wrong password', async () => {
    const res = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password' })
    })
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`)
  })

  // 9. Admin login success
  let adminAuthToken = ''
  await test('POST /api/admin/login succeeds with correct password', async () => {
    const res = await app.request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin123' })
    })
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const data = await res.json() as any
    if (!data.token) throw new Error('Missing token in login response')
    adminAuthToken = data.token
  })

  const authHeaders = {
    'Authorization': `Bearer ${adminAuthToken}`,
    'Content-Type': 'application/json'
  }

  // 10. Authenticated Admin Dashboard & Theme Toggle
  await test('GET /admin renders dashboard with dark mode theme toggle when authenticated', async () => {
    const res = await app.request('/admin', { headers: authHeaders })
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const html = await res.text()
    if (!html.includes('admin-theme-toggle')) throw new Error('Missing admin-theme-toggle button')
    if (!html.includes('data-theme')) throw new Error('Missing data-theme script')
  })

  // 11. Authenticated Admin Docs List
  await test('GET /api/admin/docs returns list of documents when authenticated', async () => {
    const res = await app.request('/api/admin/docs', { headers: authHeaders })
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const docs = await res.json() as any[]
    if (!Array.isArray(docs) || docs.length === 0) throw new Error('Expected non-empty docs array')
  })

  // 12. Create Dynamic Documentation Page with Owner
  await test('POST /api/admin/docs creates a new dynamic documentation page with custom author', async () => {
    const newDocPayload = {
      title: 'Webhooks & Subscriptions',
      category: 'Guides',
      author: 'Sarah Connor',
      slug: 'guides/webhooks-guide',
      order: 5,
      description: 'Learn how to configure webhook events in real-time.',
      content: `# Webhooks & Event Subscriptions

Webhooks allow external applications to receive real-time notifications about events occurring on your platform.

> [!TIP]
> Always verify the HMAC signature of incoming webhooks!

## Payload Example

\`\`\`json
{
  "event": "user.created",
  "data": { "id": "usr_789" }
}
\`\`\`
`
    }

    const res = await app.request('/api/admin/docs', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newDocPayload)
    })

    if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status}`)
    const created = await res.json() as any
    if (created.slug !== 'guides/webhooks-guide') throw new Error(`Unexpected slug: ${created.slug}`)
    if (created.author !== 'Sarah Connor') throw new Error(`Expected author Sarah Connor, got ${created.author}`)
    if (!created.isDynamic) throw new Error('Expected isDynamic: true')
  })

  // 13. Verify newly created dynamic doc is accessible on public /docs with owner & timestamp
  await test('Public GET /docs/guides/webhooks-guide renders dynamic document with owner & timestamp', async () => {
    const res = await app.request('/docs/guides/webhooks-guide')
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const html = await res.text()
    if (!html.includes('Webhooks & Event Subscriptions')) throw new Error('Missing new document heading')
    if (!html.includes('Sarah Connor')) throw new Error('Missing owner/author Sarah Connor')
    if (!html.includes('Last updated')) throw new Error('Missing Last updated timestamp')
    if (!html.includes('callout-tip')) throw new Error('Missing tip callout')
  })

  // 13. Search index contains newly created doc
  await test('Public GET /api/search includes dynamic document in search index', async () => {
    const res = await app.request('/api/search')
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const searchIndex = await res.json() as any[]
    const found = searchIndex.find(d => d.slug === 'guides/webhooks-guide')
    if (!found) throw new Error('New dynamic doc not found in search index')
  })

  // 14. Update Dynamic Doc
  await test('PUT /api/admin/docs/guides/webhooks-guide updates document', async () => {
    const res = await app.request('/api/admin/docs/guides/webhooks-guide', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Updated Webhooks Guide',
        category: 'Guides',
        order: 5,
        description: 'Updated description for webhooks',
        content: '# Updated Webhooks Guide\n\nUpdated content here.'
      })
    })

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    const updated = await res.json() as any
    if (updated.title !== 'Updated Webhooks Guide') throw new Error('Document title was not updated')
  })

  // 15. Manage OpenAPI Spec via Admin
  await test('PUT /api/admin/openapi/main updates OpenAPI specification', async () => {
    const customSpec = {
      id: 'main',
      title: 'Customized Edge Platform API',
      version: '2.0.0',
      description: 'Customized OpenAPI Spec from Admin Panel',
      specJson: JSON.stringify({
        openapi: '3.1.0',
        info: {
          title: 'Customized Edge Platform API',
          version: '2.0.0',
          description: 'Customized via Admin'
        },
        paths: {
          '/api/v2/custom': {
            get: {
              summary: 'Custom Admin Route',
              responses: {
                '200': { description: 'Custom Success' }
              }
            }
          }
        }
      })
    }

    const res = await app.request('/api/admin/openapi/main', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(customSpec)
    })

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    
    // Verify GET /openapi.json returns updated version
    const specRes = await app.request('/openapi.json')
    const specData = await specRes.json() as any
    if (specData.info.title !== 'Customized Edge Platform API') {
      throw new Error(`Expected customized title, got ${specData.info.title}`)
    }
  })

  // 16. Delete Dynamic Doc
  await test('DELETE /api/admin/docs/guides/webhooks-guide removes dynamic document', async () => {
    const res = await app.request('/api/admin/docs/guides/webhooks-guide', {
      method: 'DELETE',
      headers: authHeaders
    })
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    
    // Verify it is no longer accessible
    const publicRes = await app.request('/docs/guides/webhooks-guide')
    if (publicRes.status !== 404) throw new Error(`Expected 404 after deletion, got ${publicRes.status}`)
  })

  console.log(`\n========================================`)
  console.log(`Results: ${passed} passed, ${failed} failed.`)
  console.log(`========================================\n`)

  if (failed > 0) process.exit(1)
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
