import { OpenAPIHono } from '@hono/zod-openapi'
import { HomePage } from './views/home'
import { NotFoundPage } from './views/not-found'
import { docsApp } from './docs/routes'
import { apiRouter } from './api/routes'
import { scalarReference } from './api/scalar'
import { adminAuthMiddleware } from './admin/auth'
import { adminViews } from './admin/routes'
import { adminApi } from './admin/api'
import { getStorage } from './storage/kv'
import nexgenSpec from '../NexGen API Reference-openapi.json'

const app = new OpenAPIHono()

// Mount API routes
app.route('/', apiRouter)

// Mount OpenAPI 3.1 JSON Specification
app.doc('/openapi.default.json', {
  openapi: '3.1.0',
  info: {
    title: 'Hono + Scalar Documentation Platform API',
    version: '1.0.0',
    description: `### Edge-Native REST API & Documentation
Welcome to the API specification generated natively via **@hono/zod-openapi** and rendered via **Scalar**.
- ⚡ **Framework**: [Hono](https://hono.dev)
- 📖 **Interactive UI**: [Scalar](https://scalar.com)
- ☁️ **Host**: Cloudflare Workers`
  },
  servers: [
    {
      url: 'http://localhost:5173',
      description: 'Local Dev Server'
    },
    {
      url: 'https://hono-scalar-docs.your-subdomain.workers.dev',
      description: 'Cloudflare Workers Production'
    }
  ]
})

// Dynamic or Default OpenAPI endpoint
app.get('/openapi.json', async (c) => {
  const storage = getStorage(c.env)
  const storedSpec = await storage.getOpenAPISpec('main')

  if (storedSpec && storedSpec.specJson) {
    try {
      const parsed = JSON.parse(storedSpec.specJson)
      // If custom paths were added in admin, return them
      if (parsed.paths && Object.keys(parsed.paths).length > 0) {
        return c.json(parsed)
      }
    } catch {
      // Fallback
    }
  }

  // NexGen API spec is the project's source of truth
  return c.json(nexgenSpec)
})

// Scalar Interactive API Reference
app.get('/reference', scalarReference)
app.get('/reference/*', scalarReference)
app.get('/scalar', (c) => c.redirect('/reference'))
app.get('/docs/api/reference', (c) => c.redirect('/reference'))

// Admin Authentication Guard
app.use('/admin/*', adminAuthMiddleware)
app.use('/api/admin/*', adminAuthMiddleware)

// Mount Admin Routes
app.route('/', adminViews)
app.route('/', adminApi)

// Home Landing Page
app.get('/', (c) => {
  return c.html(<HomePage />)
})

// Mount Markdown Docs Routes & Search
app.route('/', docsApp)

// 404 Not Found Catch-All
app.notFound((c) => {
  return c.html(<NotFoundPage />, 404)
})

export default app
