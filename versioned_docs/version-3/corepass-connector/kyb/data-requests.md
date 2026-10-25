---
title: Data requests
sidebar_label: Data requests
sidebar_position: 4
description: Ask a business to release verified company, director and UBO data — directly by wallet address or via a QR-code offer — and manage the request lifecycle.
---

A **data request** asks a business to release verified fields, such as its legal name, registration number, directors or beneficial owners. The business's members vote according to its `data_requests` [governance rule](./overview.md#governance). If the vote passes, you receive the values in a **signed attestation** on your [webhook](./webhooks.md).

**Requirements:** the `kyb:data-request` entitlement (plus `kyb:pii` for director/UBO fields), a [registered webhook endpoint](./overview.md#register-a-webhook-endpoint) and enough [prepaid credit](./pricing-billing.md).

## Create a request by wallet address

Use this when you already know the business's wallet address, for example from [business login](./business-login.md) (`ext.business.id`) or a [lookup](./business-lookup.md).

`POST /api/v1/kyb/data-requests`

```bash title="Request"
curl -X POST https://api.corepass.net/api/v1/kyb/data-requests \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Idempotency-Key: order-48291-kyb" \
  -H "Content-Type: application/json" \
  -d '{
    "businessWalletAddress": "ab998877665544332211…",
    "fields": ["BUSINESS_LEGAL_NAME", "BUSINESS_REGISTRATION_NUMBER"],
    "optionalFields": ["BUSINESS_VAT_NUMBER"],
    "purpose": "Verifying supplier legal identity before onboarding",
    "reference": "order-48291"
  }'
```

| Field | Notes |
| --- | --- |
| `businessWalletAddress` | Required on this endpoint. Offers don't take it (see below). |
| `fields` / `optionalFields` | Names from the [field reference](./fields.md), or bare 64-character hex field hashes. **Up to 40 in total.** If you name a natural-person (director/UBO) field without `kyb:pii`, the whole call is refused with `403 pii_not_entitled`, and the response names the fields at fault. |
| `purpose` | **Required.** Free text, 8–280 characters after normalization. It is shown to the business's members when they vote. |
| `reference` | Your own order or reference string, up to 280 characters. It is echoed back on webhooks. |
| `Idempotency-Key` header | Recommended. A retry with the same key returns the original request instead of creating a duplicate. |

```json title="Response — 201 Created (200 on an idempotent replay)"
{
  "requestId": "01J8Z3K9QABCDEFGHJKMNPQRST",
  "businessWalletAddress": "ab998877…",
  "purpose": "Verifying supplier legal identity before onboarding",
  "fields": [
    { "name": "BUSINESS_LEGAL_NAME", "hash": "…", "naturalPersonPii": false, "optional": false, "subjectType": "BUSINESS" }
  ],
  "status": "pending_approval",
  "createdAt": 1758000000,
  "expiresAt": 1758086400,
  "price": { "quotedCents": 250, "currency": "CHF", "lines": [{ "field": "BUSINESS_LEGAL_NAME", "tier": "A", "cents": 100 }] },
  "apiVersion": "2026-08-23"
}
```

:::info One open request per business
Each client domain can have only one open request per business at a time. A second create while one is pending returns `409 request_already_open`.
:::

## Create a request by QR code (offer)

Use an **offer** when you don't know the business's wallet address, for example at a counter or on a sign-up page. It works like the KYC QR flow.

`POST /api/v1/kyb/data-requests/offers`

```bash title="Request"
curl -X POST https://api.corepass.net/api/v1/kyb/data-requests/offers \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Idempotency-Key: till-3-2026-09-17-0001" \
  -H "Content-Type: application/json" \
  -d '{"fields": ["BUSINESS_LEGAL_NAME"], "purpose": "Trade account application", "reference": "till-3"}'
```

:::warning `Idempotency-Key` is required for offers
If you retry without a key, a second QR code is created, and a claim on it would be wasted.
:::

```json title="Response"
{
  "offerId": "01K3QW8P4Z0M5R7T9V2X6B4Y8C",
  "status": "OPEN",
  "link": "corepass:bizdata/?app=…&exp=1758001800&offer=01K3…&tok=<64-hex>",
  "qrcode": "<base64 PNG>",
  "expiresAt": 1758001800
}
```

Show `qrcode` on screen, or `link` as a button on mobile. A member scans it and chooses **which of their businesses** it applies to. The data request is created at that moment, so you learn which business claimed it only afterwards, from the `kyb.data_request.pending_approval` [webhook](./webhooks.md#event-catalogue) (it carries `offer_id`) or by polling the offer:

```bash title="Poll an offer"
curl https://api.corepass.net/api/v1/kyb/data-requests/offers/<offerId> \
  -H "Authorization: <YOUR_API_KEY>"
```

:::danger Treat the offer link as a secret
Don't log `link` or its token. They are returned **only once**, in the create response, and CorePass stores only a hash. An offer is single-use and short-lived: 30 minutes by default, 1 hour at most.
:::

## Manage a request

| Call | Purpose |
| --- | --- |
| `GET /api/v1/kyb/data-requests/{requestId}` | Fetch the current state. |
| `GET /api/v1/kyb/data-requests?status=pending_approval&limit=25` | List and filter. `status` is one of `pending_approval`, `released`, `refused`, `cancelled`, `failed`. |
| `POST /api/v1/kyb/data-requests/{requestId}/cancel` | Withdraw a request while it is `pending_approval`. This emits a `refused` event with `reason: cancelled_by_merchant`. On a resolved request it returns `409 request_not_open`. |
| `GET /api/v1/kyb/data-requests/{requestId}/deliveries` | Log of each webhook delivery attempt. Check it before you contact support. |
| `GET /api/v1/kyb/data-requests/{requestId}/events?after_seq=` | The request's full event stream, paginated by sequence number. |
| `POST /api/v1/kyb/data-requests/{requestId}/redeliver` | Ask CorePass to send this request's webhook events again. |
| `GET /api/v1/kyb/data-requests/{requestId}/release` | **Pull the result directly** if you missed the webhook or don't trust it. See [Pulling instead of waiting](./webhooks.md#pulling-instead-of-waiting). |

:::caution Released data cannot be recalled
Cancel only works while a request is `pending_approval`. After a release, the data has been disclosed, and cancelling returns `409 request_not_open`.
:::

## Quote a price before you commit

`POST /api/v1/kyb/data-requests/quote`

```bash title="Request"
curl -X POST https://api.corepass.net/api/v1/kyb/data-requests/quote \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"fields": ["BUSINESS_LEGAL_NAME", "BUSINESS_REGISTRATION_NUMBER"]}'
```

```json title="Response"
{ "lines": [{ "field": "BUSINESS_LEGAL_NAME", "tier": "A", "cents": 100 }], "totalCents": 100, "currency": "CHF" }
```

A quote doesn't reserve anything. The actual create can still fail with `402 insufficient_credit` if your balance changes in the meantime. See [Pricing & billing](./pricing-billing.md).

## Lifecycle

```text
pending_approval ──▶ released
                 ├─▶ refused     (reason: declined, threshold_not_met, expired, business_not_verified,
                 │                         business_wallet_rotated, cancelled_by_merchant, unavailable)
                 ├─▶ cancelled
                 └─▶ failed
```

A data request stays open for a fixed **24 hours**. If the vote hasn't finished by then, the request is refused with `reason: expired`.
