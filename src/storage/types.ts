import { HeadingItem } from '../docs/types'

export interface StoredDoc {
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
  isDynamic: boolean
  updatedAt: string
}

export interface StoredOpenAPISpec {
  id: string
  title: string
  version: string
  description: string
  specJson: string // JSON string
  author?: string
  updatedAt: string
}

export interface StorageProvider {
  getDocs(): Promise<StoredDoc[]>
  getDoc(slug: string): Promise<StoredDoc | undefined>
  saveDoc(doc: StoredDoc): Promise<void>
  deleteDoc(slug: string): Promise<boolean>
  getOpenAPISpec(id: string): Promise<StoredOpenAPISpec | undefined>
  getAllOpenAPISpecs(): Promise<StoredOpenAPISpec[]>
  saveOpenAPISpec(spec: StoredOpenAPISpec): Promise<void>
  deleteOpenAPISpec(id: string): Promise<boolean>
}
