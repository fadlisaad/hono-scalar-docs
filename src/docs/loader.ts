import matter from 'gray-matter'
import { DocFrontmatter, DocItem, NavigationCategory, SearchIndexItem } from './types'
import { parseMarkdown } from './markdown'
import { StorageProvider } from '../storage/types'

function formatCategoryName(folderName: string): string {
  return folderName
    .replace(/^\d+-/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function parseOrderPrefix(name: string, fallback: number): number {
  const match = name.match(/^(\d+)-/)
  return match ? parseInt(match[1], 10) : fallback
}

function cleanSlugPart(part: string): string {
  return part.replace(/^\d+-/, '').replace(/\.md$/, '').toLowerCase()
}

// Eagerly imported at compile time by Vite bundler
const markdownFiles = import.meta.glob('../../content/docs/**/*.md', {
  query: '?raw',
  eager: true,
  import: 'default'
}) as Record<string, string>

let cachedStaticDocs: DocItem[] | null = null

function initializeStaticDocs(): DocItem[] {
  if (cachedStaticDocs) return cachedStaticDocs

  const rawDocs: Array<{
    categoryFolder: string
    fileSlug: string
    categoryOrder: number
    fileOrder: number
    content: string
  }> = []

  for (const [filepath, rawContent] of Object.entries(markdownFiles)) {
    const normalizedPath = filepath.replace(/\\/g, '/')
    const parts = normalizedPath.split('/content/docs/')[1]?.split('/')

    if (!parts || parts.length === 0) continue

    let categoryFolder = ''
    let filename = ''

    if (parts.length === 1) {
      categoryFolder = '00-general'
      filename = parts[0]
    } else {
      categoryFolder = parts[0]
      filename = parts.slice(1).join('/')
    }

    const categoryOrder = parseOrderPrefix(categoryFolder, 99)
    const fileOrder = parseOrderPrefix(filename.split('/').pop() || '', 99)

    rawDocs.push({
      categoryFolder,
      fileSlug: filename,
      categoryOrder,
      fileOrder,
      content: rawContent
    })
  }

  const items: DocItem[] = []

  for (const raw of rawDocs) {
    const parsed = matter(raw.content)
    const frontmatter = (parsed.data || {}) as DocFrontmatter
    const { html, headings } = parseMarkdown(parsed.content)

    const categorySlug = cleanSlugPart(raw.categoryFolder)
    const fileSlug = cleanSlugPart(raw.fileSlug)
    
    const customSlug = frontmatter.slug?.replace(/^\//, '')
    const fullSlug = customSlug || `${categorySlug}/${fileSlug}`

    const categoryTitle = frontmatter.category || formatCategoryName(raw.categoryFolder)
    const docTitle = frontmatter.title || headings[0]?.text || fileSlug
    const order = typeof frontmatter.order === 'number' ? frontmatter.order : raw.fileOrder

    const docAuthor = frontmatter.author || frontmatter.owner || 'Docs Team'
    const docUpdatedAt = frontmatter.updatedAt || frontmatter.lastUpdated || '2026-08-19'

    items.push({
      slug: fullSlug,
      category: categoryTitle,
      categorySlug,
      categoryOrder: raw.categoryOrder,
      title: docTitle,
      description: frontmatter.description || '',
      order,
      rawContent: parsed.content,
      htmlContent: html,
      headings,
      author: docAuthor,
      updatedAt: docUpdatedAt
    })
  }

  cachedStaticDocs = items
  return items
}

export function getAllStaticDocs(): DocItem[] {
  return initializeStaticDocs()
}

export async function getMergedDocs(storage: StorageProvider): Promise<DocItem[]> {
  const storedDocs = await storage.getDocs()
  
  // Group into categories
  const categoryMap = new Map<string, { title: string; slug: string; order: number; items: DocItem[] }>()

  for (const doc of storedDocs) {
    const categorySlug = doc.categorySlug || cleanSlugPart(doc.category)
    if (!categoryMap.has(categorySlug)) {
      categoryMap.set(categorySlug, {
        title: doc.category,
        slug: categorySlug,
        order: doc.categoryOrder || 99,
        items: []
      })
    }
    categoryMap.get(categorySlug)!.items.push(doc)
  }

  const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => a.order - b.order)
  const sortedDocs: DocItem[] = []

  for (const cat of sortedCategories) {
    cat.items.sort((a, b) => a.order - b.order)
    sortedDocs.push(...cat.items)
  }

  // Next / Prev linkages
  for (let i = 0; i < sortedDocs.length; i++) {
    const current = sortedDocs[i]
    if (i > 0) {
      const prev = sortedDocs[i - 1]
      current.prevDoc = { slug: prev.slug, title: prev.title }
    } else {
      current.prevDoc = undefined
    }
    if (i < sortedDocs.length - 1) {
      const next = sortedDocs[i + 1]
      current.nextDoc = { slug: next.slug, title: next.title }
    } else {
      current.nextDoc = undefined
    }
  }

  return sortedDocs
}

export async function getMergedDocBySlug(storage: StorageProvider, slug: string): Promise<DocItem | undefined> {
  const allDocs = await getMergedDocs(storage)
  return allDocs.find(d => d.slug === slug || d.slug.endsWith(`/${slug}`))
}

export async function getMergedNavigation(storage: StorageProvider): Promise<NavigationCategory[]> {
  const docs = await getMergedDocs(storage)
  const categoryMap = new Map<string, NavigationCategory>()

  for (const doc of docs) {
    const catSlug = doc.categorySlug || cleanSlugPart(doc.category)
    if (!categoryMap.has(catSlug)) {
      categoryMap.set(catSlug, {
        title: doc.category,
        slug: catSlug,
        order: doc.categoryOrder || 99,
        items: []
      })
    }
    categoryMap.get(catSlug)!.items.push({
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      order: doc.order
    })
  }

  return Array.from(categoryMap.values()).sort((a, b) => a.order - b.order)
}

export async function getMergedSearchIndex(storage: StorageProvider): Promise<SearchIndexItem[]> {
  const docs = await getMergedDocs(storage)
  return docs.map(doc => {
    const plainText = doc.rawContent
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
      description: doc.description,
      contentSnippet: plainText.slice(0, 200),
      author: doc.author,
      updatedAt: doc.updatedAt
    }
  })
}
