import { apiReference } from '@scalar/hono-api-reference'

export const scalarReference = apiReference({
  pageTitle: 'API Reference | Hono + Scalar on Cloudflare',
  theme: 'purple',
  layout: 'modern',
  spec: {
    url: '/openapi.json'
  }
})
