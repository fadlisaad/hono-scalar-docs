import { StoredDoc, StoredOpenAPISpec, StorageProvider } from './types'
import { getAllStaticDocs } from '../docs/loader'

class MemoryStorageProvider implements StorageProvider {
  private docsMap = new Map<string, StoredDoc>()
  private specsMap = new Map<string, StoredOpenAPISpec>()
  private initialized = false

  private async ensureInitialized() {
    if (this.initialized) return
    // Seed with static filesystem docs
    const staticDocs = getAllStaticDocs()
    for (const doc of staticDocs) {
      this.docsMap.set(doc.slug, {
        ...doc,
        isDynamic: false,
        updatedAt: new Date().toISOString()
      })
    }

    // Seed with default OpenAPI spec
    this.specsMap.set('main', {
      id: 'main',
      title: 'Hono + Scalar Documentation Platform API',
      version: '1.0.0',
      description: 'Primary REST API and Documentation Specification',
      specJson: JSON.stringify({
        openapi: '3.1.0',
        info: {
          title: 'Hono + Scalar Documentation Platform API',
          version: '1.0.0',
          description: 'Primary REST API Specification'
        },
        paths: {}
      }, null, 2),
      updatedAt: new Date().toISOString()
    })

    this.initialized = true
  }

  async getDocs(): Promise<StoredDoc[]> {
    await this.ensureInitialized()
    return Array.from(this.docsMap.values())
  }

  async getDoc(slug: string): Promise<StoredDoc | undefined> {
    await this.ensureInitialized()
    return this.docsMap.get(slug)
  }

  async saveDoc(doc: StoredDoc): Promise<void> {
    await this.ensureInitialized()
    this.docsMap.set(doc.slug, {
      ...doc,
      updatedAt: new Date().toISOString()
    })
  }

  async deleteDoc(slug: string): Promise<boolean> {
    await this.ensureInitialized()
    return this.docsMap.delete(slug)
  }

  async getOpenAPISpec(id: string): Promise<StoredOpenAPISpec | undefined> {
    await this.ensureInitialized()
    return this.specsMap.get(id)
  }

  async getAllOpenAPISpecs(): Promise<StoredOpenAPISpec[]> {
    await this.ensureInitialized()
    return Array.from(this.specsMap.values())
  }

  async saveOpenAPISpec(spec: StoredOpenAPISpec): Promise<void> {
    await this.ensureInitialized()
    this.specsMap.set(spec.id, {
      ...spec,
      updatedAt: new Date().toISOString()
    })
  }

  async deleteOpenAPISpec(id: string): Promise<boolean> {
    await this.ensureInitialized()
    return this.specsMap.delete(id)
  }
}

class KVStorageProvider implements StorageProvider {
  constructor(private kv: KVNamespace) {}

  private DOC_PREFIX = 'doc:'
  private SPEC_PREFIX = 'spec:'

  async getDocs(): Promise<StoredDoc[]> {
    // List all doc keys
    const list = await this.kv.list({ prefix: this.DOC_PREFIX })
    const docs: StoredDoc[] = []
    
    // Also include static filesystem docs as baseline
    const staticDocs = getAllStaticDocs()
    const docMap = new Map<string, StoredDoc>()

    for (const d of staticDocs) {
      docMap.set(d.slug, {
        ...d,
        isDynamic: false,
        updatedAt: new Date().toISOString()
      })
    }

    for (const key of list.keys) {
      const raw = await this.kv.get(key.name)
      if (raw) {
        try {
          const doc: StoredDoc = JSON.parse(raw)
          docMap.set(doc.slug, doc)
        } catch {
          // Ignore invalid JSON
        }
      }
    }

    return Array.from(docMap.values())
  }

  async getDoc(slug: string): Promise<StoredDoc | undefined> {
    const raw = await this.kv.get(`${this.DOC_PREFIX}${slug}`)
    if (raw) {
      try {
        return JSON.parse(raw) as StoredDoc
      } catch {
        // Fallback to static
      }
    }
    const staticDoc = getAllStaticDocs().find(d => d.slug === slug)
    if (staticDoc) {
      return {
        ...staticDoc,
        isDynamic: false,
        updatedAt: new Date().toISOString()
      }
    }
    return undefined
  }

  async saveDoc(doc: StoredDoc): Promise<void> {
    await this.kv.put(`${this.DOC_PREFIX}${doc.slug}`, JSON.stringify(doc))
  }

  async deleteDoc(slug: string): Promise<boolean> {
    await this.kv.delete(`${this.DOC_PREFIX}${slug}`)
    return true
  }

  async getOpenAPISpec(id: string): Promise<StoredOpenAPISpec | undefined> {
    const raw = await this.kv.get(`${this.SPEC_PREFIX}${id}`)
    if (raw) {
      try {
        return JSON.parse(raw) as StoredOpenAPISpec
      } catch {
        return undefined
      }
    }
    return undefined
  }

  async getAllOpenAPISpecs(): Promise<StoredOpenAPISpec[]> {
    const list = await this.kv.list({ prefix: this.SPEC_PREFIX })
    const specs: StoredOpenAPISpec[] = []
    for (const key of list.keys) {
      const raw = await this.kv.get(key.name)
      if (raw) {
        try {
          specs.push(JSON.parse(raw) as StoredOpenAPISpec)
        } catch {
          // ignore
        }
      }
    }
    return specs
  }

  async saveOpenAPISpec(spec: StoredOpenAPISpec): Promise<void> {
    await this.kv.put(`${this.SPEC_PREFIX}${spec.id}`, JSON.stringify(spec))
  }

  async deleteOpenAPISpec(id: string): Promise<boolean> {
    await this.kv.delete(`${this.SPEC_PREFIX}${id}`)
    return true
  }
}

// Global in-memory singleton for development / testing
const defaultMemoryStorage = new MemoryStorageProvider()

export function getStorage(env?: any): StorageProvider {
  if (env && env.DOCS_KV) {
    return new KVStorageProvider(env.DOCS_KV)
  }
  return defaultMemoryStorage
}
