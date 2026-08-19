import { Hono } from 'hono'
import { getStorage } from '../storage/kv'
import { StoredDoc, StoredOpenAPISpec } from '../storage/types'
import { parseMarkdown } from '../docs/markdown'
import { getAdminPassword, loginAdmin, logoutAdmin } from './auth'

export const adminApi = new Hono()

// Login endpoint
adminApi.post('/api/admin/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const password = body.password || ''
  const expectedPassword = getAdminPassword(c)

  if (password !== expectedPassword) {
    return c.json({ error: 'Invalid admin password' }, 401)
  }

  const token = await loginAdmin(c)
  return c.json({ success: true, token })
})

// Logout endpoint
adminApi.post('/api/admin/logout', (c) => {
  logoutAdmin(c)
  return c.json({ success: true })
})

// List all docs
adminApi.get('/api/admin/docs', async (c) => {
  const storage = getStorage(c.env)
  const docs = await storage.getDocs()
  return c.json(docs)
})

// Create new doc
adminApi.post('/api/admin/docs', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { title, category, slug, order = 10, description = '', content = '', author = 'Docs Admin', owner } = body

  if (!title || !slug || !content) {
    return c.json({ error: 'Title, slug, and content are required' }, 400)
  }

  const cleanSlug = slug.replace(/^\//, '').toLowerCase().trim()
  const { html, headings } = parseMarkdown(content)
  const categoryTitle = category || 'Guides'
  const categorySlug = categoryTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')

  const newDoc: StoredDoc = {
    slug: cleanSlug,
    category: categoryTitle,
    categorySlug,
    categoryOrder: 50,
    title,
    description,
    order: Number(order) || 10,
    rawContent: content,
    htmlContent: html,
    headings,
    author: author || owner || 'Docs Admin',
    isDynamic: true,
    updatedAt: new Date().toISOString()
  }

  const storage = getStorage(c.env)
  await storage.saveDoc(newDoc)
  return c.json(newDoc, 201)
})

// Update doc (supports nested slugs e.g. guides/webhooks)
adminApi.put('/api/admin/docs/:slug{.+}', async (c) => {
  const slug = c.req.param('slug')
  const body = await c.req.json().catch(() => ({}))
  const { title, category, order = 10, description = '', content = '', author = 'Docs Admin', owner } = body

  if (!title || !content) {
    return c.json({ error: 'Title and content are required' }, 400)
  }

  const { html, headings } = parseMarkdown(content)
  const categoryTitle = category || 'Guides'
  const categorySlug = categoryTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')

  const updatedDoc: StoredDoc = {
    slug,
    category: categoryTitle,
    categorySlug,
    categoryOrder: 50,
    title,
    description,
    order: Number(order) || 10,
    rawContent: content,
    htmlContent: html,
    headings,
    author: author || owner || 'Docs Admin',
    isDynamic: true,
    updatedAt: new Date().toISOString()
  }

  const storage = getStorage(c.env)
  await storage.saveDoc(updatedDoc)
  return c.json(updatedDoc)
})

// Delete dynamic doc (supports nested slugs e.g. guides/webhooks)
adminApi.delete('/api/admin/docs/:slug{.+}', async (c) => {
  const slug = c.req.param('slug')
  const storage = getStorage(c.env)
  const success = await storage.deleteDoc(slug)
  return c.json({ success, slug })
})

// List all OpenAPI specs
adminApi.get('/api/admin/openapi', async (c) => {
  const storage = getStorage(c.env)
  const specs = await storage.getAllOpenAPISpecs()
  return c.json(specs)
})

// Update OpenAPI spec
adminApi.put('/api/admin/openapi/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const { title, version, description = '', specJson } = body

  if (!title || !version || !specJson) {
    return c.json({ error: 'Title, version, and specJson are required' }, 400)
  }

  // Validate JSON schema
  try {
    JSON.parse(specJson)
  } catch (e: any) {
    return c.json({ error: `Invalid JSON syntax: ${e.message}` }, 400)
  }

  const updatedSpec: StoredOpenAPISpec = {
    id,
    title,
    version,
    description,
    specJson,
    updatedAt: new Date().toISOString()
  }

  const storage = getStorage(c.env)
  await storage.saveOpenAPISpec(updatedSpec)
  return c.json(updatedSpec)
})
