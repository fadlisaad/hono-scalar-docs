---
title: NexGen API Overview
description: Base URLs, authentication, request format and error handling for the NexGen API.
category: API Reference
order: 1
---

# NexGen API Overview

The NexGen API lets you create bills and take payments. It follows RESTful principles and every response, including errors, is JSON.

👉 **[Open the interactive API reference](/reference)** to try each endpoint in the browser.

## Products

| Product | What it does | Guide |
| :--- | :--- | :--- |
| **Collection Payment** | Group bills into **Collections**, send customers to a hosted payment page | [Collection Payment](/docs/api/collection-payment) |
| **QR Payment** | Register **Terminals** and generate dynamic, per-transaction QR codes | [QR Payment](/docs/api/qr-payment) |
| **Callbacks & Redirects** | How NexGen tells your server and your customer about a payment result | [Callbacks & Redirects](/docs/api/callbacks-and-redirects) |

## Base URL

Examples use `https://nexgen.example.com`. Replace it with the staging or production host you receive with your credentials. All paths start with the API version, `api/v1`:

```text
https://nexgen.example.com/api/v1/collection/get/list
```

## Authentication

Every request needs two credentials from your **NexGen dashboard**:

| Credential | Sent as | Example |
| :--- | :--- | :--- |
| `ApiKey` | HTTP header | `ApiKey: YOUR_API_KEY` |
| `ApiSecret` | Query string parameter | `?ApiSecret=YOUR_API_SECRET` |

```bash
curl "https://nexgen.example.com/api/v1/collection/get/list?ApiSecret=$NEXGEN_API_SECRET" \
  -H "ApiKey: $NEXGEN_API_KEY"
```

> [!WARNING]
> Keep your API key and secret on your server. Never ship them in browser or mobile app code.

## Request format

Endpoints that create data accept `multipart/form-data`. `application/x-www-form-urlencoded` and `application/json` bodies are also supported. Request fields are prefixed with `field`, for example `fieldName` or `fieldAmount`.

## Errors

Errors share one shape:

```json
{
  "status": "error",
  "message": "There was a validation error. Please review the input and try again.",
  "error": {
    "fieldName": "The field name field is required."
  }
}
```

| HTTP status | Meaning | `error` contains |
| :--- | :--- | :--- |
| `400` | Validation failed | An object mapping each invalid field to its message |
| `401` | Missing or invalid `ApiKey` / `ApiSecret` | Not present |
| `404` | Collection, terminal or bill not found | A short reason string |
| `500` | Unexpected server error | A diagnostic string |

## Statuses

| Resource | Values |
| :--- | :--- |
| **Collection / Terminal** | `active`, `inactive` |
| **Bill / QR** | `unpaid`, `pending`, `paid`, `expired` |

> [!IMPORTANT]
> NexGen assumes no liability for financial losses caused by improper use of the API. Always confirm a payment from the server-side callback or the Get Billing Data endpoint, not only from the redirect.
