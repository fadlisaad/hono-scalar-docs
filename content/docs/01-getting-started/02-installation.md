---
title: Installation & Setup
description: Learn how to install prerequisites and run the documentation platform locally.
category: Getting Started
order: 2
---

# Installation & Local Setup

Setting up your Hono and Scalar documentation project is straightforward and requires only Node.js (or Bun / pnpm).

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js**: `v18.0.0` or later (Node 20+ recommended)
- **Package Manager**: `npm`, `pnpm`, `yarn`, or `bun`
- **Cloudflare Account**: (Optional, for production deployment)

## Clone & Install Dependencies

Clone your repository and install the project dependencies:

```bash
# Install dependencies with npm
npm install

# Or using pnpm
pnpm install

# Or using bun
bun install
```

## Running the Development Server

Start the local development server with hot-module replacement (HMR):

```bash
npm run dev
```

The server will start at `http://localhost:5173`. Open your browser to navigate the site:
- **Landing Page**: `http://localhost:5173/`
- **Documentation**: `http://localhost:5173/docs`
- **Scalar API Reference**: `http://localhost:5173/reference`
- **OpenAPI JSON Spec**: `http://localhost:5173/openapi.json`

> [!TIP]
> Changes made to markdown files inside `content/docs/` will automatically update on refresh!

## Project Verification

To verify that TypeScript types and builds pass without errors:

```bash
# Check TypeScript types
npm run check

# Build production bundle
npm run build
```
