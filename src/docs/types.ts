export interface DocFrontmatter {
  title: string
  description?: string
  category?: string
  order?: number
  slug?: string
  tags?: string[]
  author?: string
  owner?: string
  updatedAt?: string
  lastUpdated?: string
}

export interface HeadingItem {
  id: string
  text: string
  level: number
}

export interface DocItem {
  slug: string
  category: string
  categorySlug: string
  categoryOrder: number
  title: string
  description: string
  order: number
  rawContent: string
  htmlContent: string
  headings: HeadingItem[]
  author?: string
  updatedAt?: string
  prevDoc?: { slug: string; title: string }
  nextDoc?: { slug: string; title: string }
}

export interface NavigationCategory {
  title: string
  slug: string
  order: number
  items: {
    title: string
    slug: string
    description?: string
    order: number
  }[]
}

export interface SearchIndexItem {
  slug: string
  title: string
  category: string
  description: string
  contentSnippet: string
  author?: string
  updatedAt?: string
}
