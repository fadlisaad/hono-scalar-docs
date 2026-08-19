---
title: Introduction
description: Welcome to the Hono + Scalar + Cloudflare documentation platform.
category: Getting Started
order: 1
---

# Introduction to the Docs Platform

Welcome to your modern, lightning-fast documentation site! This project brings together the best tools in the TypeScript and edge ecosystems to deliver instant load times, seamless markdown authoring, and interactive API documentation.

> [!NOTE]
> This platform runs natively on **Cloudflare Workers**, giving your documentation sub-millisecond cold starts and global edge caching worldwide.

## Why this Stack?

- ⚡ **[Hono](https://hono.dev)**: Ultra-fast, lightweight web framework built on web standards with zero external dependencies in the core.
- 📖 **[Scalar](https://scalar.com)**: World-class, interactive API reference playground that renders OpenAPI 3.0 and 3.1 specifications beautifully.
- 📝 **Markdown-Powered**: Author documentation in standard Markdown or GitHub Flavored Markdown (GFM) with frontmatter metadata.
- ☁️ **Cloudflare Ecosystem**: Deploy in seconds to Cloudflare Workers with Wrangler, backed by Cloudflare's global edge network.

## Key Features

1. **Server-Side Rendered (SSR) Markdown**: Markdown files are parsed and transformed to HTML at the edge using Hono JSX, ensuring fast first-contentful-paint (FCP) and optimal SEO.
2. **Type-Safe OpenAPI Spec Generation**: Define your API routes and validation schemas with `@hono/zod-openapi` and generate documentation automatically.
3. **Interactive API Reference**: Explore endpoints, inspect schemas, and test API calls live using the embedded Scalar interface.
4. **Built-in Search & Navigation**: Instant client-side search across all markdown articles with keyboard navigation (`Ctrl+K` / `Cmd+K`).
5. **Code Syntax Highlighting & Copy**: Pre-rendered syntax highlighting with one-click copy buttons and language badges.
6. **Alerts & Callouts**: GitHub-style alert callouts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`).

## Quick Navigation

- [Installation Guide](/docs/getting-started/installation)
- [Quickstart Tutorial](/docs/getting-started/quickstart)
- [Configuration Reference](/docs/guides/configuration)
- [Interactive API Playground](/reference)

```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono()

app.get('/scalar', Scalar({ url: '/openapi.json' }))

export default app
```
