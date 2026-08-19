import { Hono } from 'hono'
import { getStorage } from '../storage/kv'
import { getAdminPassword, loginAdmin, logoutAdmin } from './auth'
import { LoginView } from '../views/admin/login-view'
import { DashboardView } from '../views/admin/dashboard-view'
import { DocsListView } from '../views/admin/docs-list-view'
import { DocEditorView } from '../views/admin/doc-editor-view'
import { OpenAPIEditorView } from '../views/admin/openapi-editor-view'

export const adminViews = new Hono()

// Login page
adminViews.get('/admin/login', (c) => {
  const redirect = c.req.query('redirect') || '/admin'
  return c.html(<LoginView redirect={redirect} />)
})

// Login form POST submission
adminViews.post('/admin/login', async (c) => {
  const body = await c.req.parseBody()
  const password = String(body.password || '')
  const redirect = String(body.redirect || '/admin')
  const expectedPassword = getAdminPassword(c)

  if (password !== expectedPassword) {
    return c.html(<LoginView error="Invalid admin password. Please try again." redirect={redirect} />, 401)
  }

  await loginAdmin(c)
  return c.redirect(redirect)
})

// Logout
adminViews.get('/admin/logout', (c) => {
  logoutAdmin(c)
  return c.redirect('/admin/login')
})

// Dashboard
adminViews.get('/admin', async (c) => {
  const storage = getStorage(c.env)
  const docs = await storage.getDocs()
  const specs = await storage.getAllOpenAPISpecs()
  return c.html(<DashboardView docs={docs} specs={specs} />)
})

// All Docs
adminViews.get('/admin/docs', async (c) => {
  const storage = getStorage(c.env)
  const docs = await storage.getDocs()
  return c.html(<DocsListView docs={docs} />)
})

// New Doc Editor
adminViews.get('/admin/docs/new', (c) => {
  return c.html(<DocEditorView isNew={true} />)
})

// Edit Existing Doc
adminViews.get('/admin/docs/edit/:slug{.+}', async (c) => {
  const slug = decodeURIComponent(c.req.param('slug'))
  const storage = getStorage(c.env)
  const doc = await storage.getDoc(slug)

  if (!doc) {
    return c.redirect('/admin/docs')
  }

  return c.html(<DocEditorView doc={doc} isNew={false} />)
})

// OpenAPI Specs Editor
adminViews.get('/admin/openapi', async (c) => {
  const storage = getStorage(c.env)
  const allSpecs = await storage.getAllOpenAPISpecs()
  let mainSpec = await storage.getOpenAPISpec('main')

  if (!mainSpec) {
    mainSpec = {
      id: 'main',
      title: 'Hono + Scalar Documentation Platform API',
      version: '1.0.0',
      description: 'Primary REST API Specification',
      specJson: JSON.stringify({
        openapi: '3.1.0',
        info: {
          title: 'Hono + Scalar Documentation Platform API',
          version: '1.0.0'
        },
        paths: {}
      }, null, 2),
      updatedAt: new Date().toISOString()
    }
    await storage.saveOpenAPISpec(mainSpec)
  }

  return c.html(<OpenAPIEditorView spec={mainSpec} allSpecs={allSpecs} />)
})
