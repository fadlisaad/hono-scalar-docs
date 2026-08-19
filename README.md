# ⚡ Hono + Scalar + Cloudflare Documentation Platform

A modern, edge-native documentation platform and interactive API reference powered by **[Hono](https://hono.dev)**, **[Scalar](https://scalar.com)**, **Markdown with Frontmatter**, and **Cloudflare Workers**.

---

## 🌟 Highlights

- **⚡ Hono Framework**: Lightning-fast routing and SSR with Hono JSX and zero runtime bloat.
- **⚙️ Built-in Admin Backend Panel**: Manage, edit, and publish dynamic documentation articles and OpenAPI schemas with a live split-screen Markdown editor (`/admin`).
- **📖 Scalar API Reference**: Gorgeous, interactive OpenAPI 3.1 reference mounted at `/reference`.
- **📝 Markdown Content Engine**: Markdown files with YAML frontmatter, automatic category structuring, code highlighting (Prism.js), GitHub-style callouts (`> [!NOTE]`), and Table of Contents (TOC).
- **🔍 Instant Search**: Built-in client-side full-text search across documentation articles (`Cmd+K` / `Ctrl+K`).
- **☁️ Cloudflare Workers & KV Ready**: Serverless deployment with Wrangler (`wrangler.jsonc`) and global edge persistence via Cloudflare KV.

---

## 📁 Project Structure

```
hono-scalar-docs/
├── content/
│   └── docs/                     # Documentation markdown files
│       ├── 01-getting-started/   # Category: Getting Started
│       │   ├── 01-introduction.md
│       │   ├── 02-installation.md
│       │   └── 03-quickstart.md
│       ├── 02-guides/            # Category: Guides
│       │   ├── 01-configuration.md
│       │   ├── 02-writing-docs.md
│       │   ├── 03-cloudflare-deployment.md
│       │   └── 04-admin-panel.md
│       └── 03-api/               # Category: API Reference
│           └── 01-overview.md
├── src/
│   ├── admin/                    # Admin backend controller & auth
│   │   ├── api.ts                # Admin REST API endpoints (CRUD docs & OpenAPI)
│   │   ├── auth.ts               # Session token & cookie authentication
│   │   └── routes.tsx            # Admin web UI router
│   ├── api/                      # Public OpenAPI routes and Scalar integration
│   │   ├── routes.ts             # Zod OpenAPI route definitions & schemas
│   │   └── scalar.ts             # Scalar API Reference config
│   ├── docs/                     # Markdown parser, loader & routing
│   │   ├── loader.ts             # Static + Dynamic doc merger & search index
│   │   ├── markdown.ts           # Marked parser with Prism highlighting & alerts
│   │   ├── routes.tsx            # Doc page handlers & /api/search
│   │   └── types.ts              # TypeScript interfaces
│   ├── storage/                  # Cloudflare KV & Memory storage abstraction
│   │   ├── kv.ts                 # KV and fallback Memory storage provider
│   │   └── types.ts              # Storage models
│   ├── views/                    # Hono JSX UI components
│   │   ├── admin/                # Admin Panel Views (Dashboard, Editor, OpenAPI)
│   │   ├── doc-page.tsx          # Public documentation reader view
│   │   ├── home.tsx              # Landing / hero page
│   │   ├── layout.tsx            # Base HTML shell, CSS styles & scripts
│   │   └── not-found.tsx         # 404 page
│   └── index.tsx                 # Main OpenAPIHono entrypoint
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc                # Cloudflare Workers & KV configuration
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```

Visit the following URLs:
- 🏠 **Home Page**: [http://localhost:5173](http://localhost:5173)
- 📚 **Documentation**: [http://localhost:5173/docs](http://localhost:5173/docs)
- ⚙️ **Admin Panel**: [http://localhost:5173/admin](http://localhost:5173/admin) *(Password: `admin123`)*
- 🚀 **Scalar API Reference**: [http://localhost:5173/reference](http://localhost:5173/reference)
- 📄 **OpenAPI 3.1 Spec**: [http://localhost:5173/openapi.json](http://localhost:5173/openapi.json)

---

## ⚙️ Admin Backend Panel

The Admin Panel (`/admin`) allows you to:
- **Create & Edit Articles**: Live side-by-side Markdown preview with instant rendering, frontmatter controls, and toolbar shortcuts.
- **Manage OpenAPI Specifications**: Edit OpenAPI 3.1 JSON schemas with syntax validation that updates the live Scalar playground immediately.
- **Authentication**: Secured with HTTP-only signed cookies or `Authorization: Bearer <password>` tokens.

---

## ☁️ Cloudflare Deployment

### 1. Authenticate with Wrangler

```bash
npx wrangler login
```

### 2. Deploy to Cloudflare Workers

```bash
npm run deploy
```

---

## 📜 Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local development server with HMR |
| `npm test` | Runs automated test suite covering public + admin endpoints |
| `npm run check` | Runs TypeScript typechecker (`tsc --noEmit`) |
| `npm run build` | Builds bundle for Cloudflare Workers |
| `npm run deploy` | Deploys directly to Cloudflare Workers |
