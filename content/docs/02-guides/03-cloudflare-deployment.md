---
title: Cloudflare Deployment
description: Deploy your documentation site to Cloudflare Workers with Wrangler in seconds.
category: Guides
order: 3
---

# Deploying to Cloudflare Workers

Deploying your documentation platform to Cloudflare Workers provides global distribution, DDoS protection, edge caching, and zero maintenance serverless architecture.

## Step 1: Login to Cloudflare via Wrangler

If you haven't already authenticated Wrangler with your Cloudflare account, run:

```bash
npx wrangler login
```

A browser window will open asking you to authorize the Cloudflare Workers CLI.

## Step 2: Deploy with a Single Command

To deploy the documentation site directly to your Cloudflare Workers account:

```bash
npm run deploy
# or: npx wrangler deploy
```

Wrangler will package your TypeScript code, bundle the markdown documentation, and deploy it to a `*.workers.dev` subdomain (or your custom domain).

## Custom Domain Setup

To attach your own domain (e.g. `docs.yourdomain.com`), update your `wrangler.jsonc` file:

```json
{
  "name": "hono-scalar-docs",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-14",
  "routes": [
    {
      "pattern": "docs.yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

Then run `npm run deploy` again. Cloudflare will automatically provision SSL certificates and route traffic to your worker.

## Continuous Deployment with GitHub Actions

You can automate deployments using GitHub Actions:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```
