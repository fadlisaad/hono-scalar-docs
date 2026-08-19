---
title: Quickstart Guide
description: Get up and running in under 5 minutes with a new documentation page and API route.
category: Getting Started
order: 3
---

# Quickstart Guide

This quick tutorial will guide you through adding a new documentation article and defining a new API endpoint that appears automatically in Scalar.

## Step 1: Add a New Markdown Page

Create a new file in `content/docs/02-guides/04-custom-guide.md`:

```markdown
---
title: My Custom Guide
description: An awesome custom guide.
category: Guides
order: 4
---

# My Custom Guide

Write your markdown here using standard Markdown syntax, callouts, and code blocks!

> [!NOTE]
> This note callout renders with custom styles.
```

Your new page will immediately be available at `/docs/guides/custom-guide` and will be added to the sidebar navigation and search index!

## Step 2: Define a Documented OpenAPI Endpoint

Add a new route with `@hono/zod-openapi` in `src/api/routes.ts`:

```typescript
import { createRoute, z } from '@hono/zod-openapi'

export const helloRoute = createRoute({
  method: 'get',
  path: '/api/v1/hello',
  tags: ['Greetings'],
  summary: 'Say Hello',
  description: 'Returns a friendly greeting message.',
  responses: {
    200: {
      description: 'Successful greeting response',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({ example: 'Hello, world!' })
          })
        }
      }
    }
  }
})
```

Register it in your app:

```typescript
app.openapi(helloRoute, (c) => {
  return c.json({ message: 'Hello, world!' }, 200)
})
```

## Step 3: View in Scalar

Open `http://localhost:5173/reference` in your browser. The new **Greetings** tag and `/api/v1/hello` route will be immediately visible, complete with schema definitions and interactive testing!
