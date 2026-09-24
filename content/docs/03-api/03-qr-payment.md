---
title: QR Payment
description: Register terminals and generate dynamic, per-transaction payment QR codes.
category: API Reference
order: 3
---

# QR Payment

QR Payment generates a unique QR code for each transaction. The customer scans it with their phone and pays. Typical uses:

- **Point of sale:** show a QR code at checkout.
- **Web and mobile apps:** show a QR code for the order.
- **Self-service kiosks:** show a QR code after the customer orders.

A **Terminal** represents a place that takes payments, such as a POS counter or a kiosk. Every QR code is created on a terminal.

## Terminals

### Create a terminal

`POST /api/v1/terminal/create`

| Field | Required | Description |
| :--- | :--- | :--- |
| `fieldName` | Yes | Terminal name |
| `fieldDescription` | Yes | Short description |
| `fieldStatus` | Yes | `active` or `inactive` |

```bash
curl -X POST "https://nexgen.example.com/api/v1/terminal/create?ApiSecret=$NEXGEN_API_SECRET" \
  -H "ApiKey: $NEXGEN_API_KEY" \
  -F fieldName="Counter 1" \
  -F fieldDescription="Front counter" \
  -F fieldStatus=active
```

Response `201`:

```json
{
  "code": "RLVTBAQA0003",
  "name": "Counter 1",
  "description": "Front counter",
  "status": "active"
}
```

### Other terminal endpoints

| Method | Path | Returns |
| :--- | :--- | :--- |
| `GET` | `/api/v1/terminal/get/list` | Array of all your terminals |
| `GET` | `/api/v1/terminal/get/data/{terminal_code}` | One terminal |
| `GET` | `/api/v1/terminal/get/data/{terminal_code}/billing` | One terminal, with its QR bills in `bill_list` |
| `PUT` | `/api/v1/terminal/switch/status/data/{terminal_code}?fieldStatus=inactive` | The updated terminal |

## Dynamic QR

### Create a QR code

`POST /api/v1/qr/create/{terminal_code}`

| Field | Required | Description |
| :--- | :--- | :--- |
| `fieldAmount` | Yes | Amount as a decimal string (e.g. `1.00`) |
| `fieldPaymentDescription` | Yes | What the payment is for |
| `fieldCallbackUrl` | Yes | Your server endpoint that receives the payment result |
| `fieldExternalReferenceLabel1` / `fieldExternalReferenceValue1` | No | Your own reference, e.g. `terminal_id` |
| `fieldExternalReferenceLabel2` / `fieldExternalReferenceValue2` | No | A second reference, e.g. a transaction ID |

```bash
curl -X POST "https://nexgen.example.com/api/v1/qr/create/RLVTBAQA0003?ApiSecret=$NEXGEN_API_SECRET" \
  -H "ApiKey: $NEXGEN_API_KEY" \
  -F fieldAmount=1.00 \
  -F fieldPaymentDescription="Order #1042" \
  -F fieldCallbackUrl="https://example.com/nexgen/callback"
```

Response `201`:

```json
{
  "code": "RLVQSD4241006AZ2O5",
  "status": "unpaid",
  "amount": "1.00",
  "payment_description": "Order #1042",
  "due_date": "06-10-2024 21:20:00",
  "external_reference_label_1": null,
  "external_reference_value_1": null,
  "external_reference_label_2": null,
  "external_reference_value_2": null,
  "callback_url": "https://example.com/nexgen/callback",
  "qr_code": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

`qr_code` is a base64-encoded PNG. Show it with:

```html
<img src="data:image/png;base64,{qr_code}" alt="Scan to pay" />
```

### Get a QR payment

`GET /api/v1/qr/get/data/{terminal_code}/{qr_code}`

This returns the QR bill with its current `status` and a `soundbox_response` field. `soundbox_response` holds the audio confirmation from a soundbox device, when one is used.

## Maybank QR

Maybank QR works like Dynamic QR. It also needs a `ClientTerminalId` header, which you get from Maybank.

### Create a Maybank QR code

`POST /api/v1/qr/maybank/create/{terminal_code}`

| Header | Description |
| :--- | :--- |
| `ApiKey` | From the NexGen dashboard |
| `ClientTerminalId` | From Maybank |

The body fields are the same as [Create a QR code](#create-a-qr-code). The response also includes `transaction_ref_id`:

```json
{
  "code": "STGQMZH5260505A0002",
  "status": "unpaid",
  "amount": "1",
  "payment_description": "Order #1042",
  "due_date": "05-05-2026 13:04:00",
  "callback_url": "https://example.com/nexgen/callback",
  "transaction_ref_id": "MBUAT111111115627039",
  "qr_code": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Check a Maybank transaction

`GET /api/v1/qr/maybank/status/{transaction_ref_id}`

```json
{
  "status": "OK",
  "transaction_status": "Success",
  "data": {
    "transaction_ref_id": "MBUAT111111115627269",
    "client_ref_id": "STGQMX19260507A0001",
    "startdate": "2026-05-07T11:07:37.330Z",
    "enddate": "2026-05-07T11:08:45.670Z",
    "sale_amount": "1.00",
    "final_amount": "1.00",
    "discount_amount": null,
    "promo_code": null,
    "client_terminal_id": "MBUAT1351514CASHRGB1"
  }
}
```

`client_ref_id` is the NexGen QR `code`.
