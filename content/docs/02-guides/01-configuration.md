---
title: Configuration & Customization
description: How to configure themes, site metadata, Scalar options, and Cloudflare settings.
category: Guides
order: 1
---

# Configuration & Customization

This guide details how to customize your documentation site's branding, themes, OpenAPI settings, and Cloudflare deployment configurations.

## Wrangler Configuration (`wrangler.jsonc`)

The `wrangler.jsonc` file controls how Cloudflare Workers executes and deploys your project:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hono-scalar-docs",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-14",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "observability": {
    "enabled": true
  }
}
```

### Key Wrangler Properties

- `name`: The name of your Cloudflare Worker project.
- `main`: The entry point script (`src/index.ts`).
- `compatibility_date`: Locks the Cloudflare runtime version to prevent breaking changes.
- `compatibility_flags`: Includes `nodejs_compat` to allow Node-compatible APIs.

## Scalar API Reference Customization

Scalar can be customized inside `src/api/scalar.ts` using the `@scalar/hono-api-reference` options:

```typescript
import { Scalar } from '@scalar/hono-api-reference'

export const scalarMiddleware = Scalar({
  url: '/openapi.json',
  theme: 'purple', // 'default' | 'alternate' | 'moon' | 'purple' | 'solarized' | 'bluePlanet' | 'deepSpace'
  layout: 'modern', // 'modern' | 'classic'
  showSidebar: true,
  searchHotKey: 'k',
  customCss: `
    :root {
      --scalar-font: 'Inter', sans-serif;
    }
  `
})
```

## OpenAPI Specification Info

The metadata displayed at the top of your Scalar API reference is defined in `src/index.ts`:

```typescript
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Cloudflare Documentation & REST API',
    version: '1.0.0',
    description: 'Interactive API reference and documentation powered by Hono and Scalar on Cloudflare Workers.'
  },
  servers: [
    {
      url: 'https://hono-scalar-docs.your-subdomain.workers.dev',
      description: 'Production Edge Worker'
    },
    {
      url: 'http://localhost:5173',
      description: 'Local Development Server'
    }
  ]
})
```
