---
title: Admin Backend Panel
description: Guide on using the built-in Admin Panel to manage dynamic documentation and OpenAPI specifications.
category: Guides
order: 4
---

# Admin Backend Panel

The documentation platform includes a built-in, edge-native **Admin Backend Panel** located at `/admin`.

## Accessing the Admin Panel

1. Navigate to `http://localhost:5173/admin` (or `https://your-worker.workers.dev/admin`).
2. You will be prompted to log in.
3. Enter the default administrator password: `admin123` (customizable via `ADMIN_PASSWORD` environment secret).

> [!NOTE]
> Sessions are protected via HTTP-only signed cookies or `Authorization: Bearer <password>` headers.

## Admin Features

### 1. Dashboard Overview (`/admin`)
- Real-time statistics: Total articles, static vs dynamic counts, categories, and OpenAPI specifications.
- Quick navigation shortcuts to create new documents or edit OpenAPI schemas.

### 2. Documentation Management (`/admin/docs`)
- Full catalog of all static (filesystem) and dynamic (KV) documentation pages.
- Live search filter by title, category, or slug.
- Delete buttons for dynamic articles.

### 3. Markdown Live Editor (`/admin/docs/new`, `/admin/docs/edit/:slug`)
- Edit title, category, slug, sort order, and SEO description.
- **Split-screen live Markdown preview**: Watch headings, lists, code blocks, and GitHub alerts render in real-time as you type.
- Quick formatting toolbar (H2, H3, Bold, Italic, Code, Callout alerts).
- One-click **Save & Publish** button that instantly persists changes to Cloudflare KV.

### 4. OpenAPI Specification Editor (`/admin/openapi`)
- Edit OpenAPI 3.0 / 3.1 JSON definitions.
- Built-in JSON validator and formatting tool (`Format JSON`).
- Changes immediately update the live [Scalar API Reference](/reference) playground!

## Edge Storage Configuration (Cloudflare KV)

In production, dynamic documentation and OpenAPI schemas are saved to Cloudflare KV (`DOCS_KV` binding in `wrangler.jsonc`). In local development, an in-memory storage provider automatically handles all operations seamlessly.
