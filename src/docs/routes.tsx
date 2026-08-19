import { Hono } from 'hono'
import { getMergedDocs, getMergedDocBySlug, getMergedNavigation, getMergedSearchIndex } from './loader'
import { getStorage } from '../storage/kv'
import { DocPage } from '../views/doc-page'
import { NotFoundPage } from '../views/not-found'

export const docsApp = new Hono()

// Search API endpoint
docsApp.get('/api/search', async (c) => {
  const storage = getStorage(c.env)
  const searchIndex = await getMergedSearchIndex(storage)
  return c.json(searchIndex)
})

// Docs root redirect: /docs -> first document
docsApp.get('/docs', async (c) => {
  const storage = getStorage(c.env)
  const docs = await getMergedDocs(storage)
  if (docs.length > 0) {
    return c.redirect(`/docs/${docs[0].slug}`)
  }
  return c.html(<NotFoundPage />)
})

// Single level slug: /docs/introduction or /docs/:slug
docsApp.get('/docs/:slug', async (c) => {
  const slug = c.req.param('slug')
  const storage = getStorage(c.env)
  const doc = await getMergedDocBySlug(storage, slug)
  const navigation = await getMergedNavigation(storage)

  if (!doc) {
    // If not found, check if there's a doc starting with this category
    const allDocs = await getMergedDocs(storage)
    const categoryMatch = allDocs.find(d => d.categorySlug === slug)
    if (categoryMatch) {
      return c.redirect(`/docs/${categoryMatch.slug}`)
    }
    c.status(404)
    return c.html(<NotFoundPage />)
  }

  return c.html(<DocPage doc={doc} navigation={navigation} />)
})

// Two-level slug: /docs/getting-started/introduction
docsApp.get('/docs/:category/:slug', async (c) => {
  const category = c.req.param('category')
  const slug = c.req.param('slug')
  const fullSlug = `${category}/${slug}`
  
  const storage = getStorage(c.env)
  const doc = (await getMergedDocBySlug(storage, fullSlug)) || (await getMergedDocBySlug(storage, slug))
  const navigation = await getMergedNavigation(storage)

  if (!doc) {
    c.status(404)
    return c.html(<NotFoundPage />)
  }

  return c.html(<DocPage doc={doc} navigation={navigation} />)
})
