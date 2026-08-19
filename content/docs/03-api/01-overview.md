---
title: API Architecture & Overview
description: Overview of the REST API endpoints and interactive Scalar playground.
category: API Reference
order: 1
---

# API Overview & Playground

This project includes a built-in REST API powered by `@hono/zod-openapi` and interactive documentation rendered via `@scalar/hono-api-reference`.

## Interactive API Playground

You can explore all endpoints and test requests directly in the browser:

👉 **[Launch Interactive Scalar API Playground](/reference)**

## API Design Principles

1. **Type-Safe Validation**: All request bodies, query parameters, path params, and responses are validated via Zod.
2. **OpenAPI 3.1 Standard**: Specification generated natively at `/openapi.json`.
3. **Consistent Responses**: Standardized JSON response envelope across all endpoints.

## Base URLs

| Environment | URL |
| :--- | :--- |
| **Local Development** | `http://localhost:5173` |
| **Production Edge** | `https://hono-scalar-docs.your-subdomain.workers.dev` |

## Endpoints Overview

- `GET /api/v1/health` - System health and edge latency check.
- `GET /api/v1/users` - List all registered users with pagination.
- `POST /api/v1/users` - Create a new user with validation.
- `GET /api/v1/users/:id` - Retrieve user profile by ID.
- `GET /api/v1/projects` - List active projects.

## Example Request

```bash
curl -X GET "http://localhost:5173/api/v1/users/usr_1" \
  -H "Accept: application/json"
```

Response:

```json
{
  "id": "usr_1",
  "name": "Sarah Connor",
  "email": "sarah@example.com",
  "role": "admin",
  "createdAt": "2026-01-15T08:30:00.000Z"
}
```
