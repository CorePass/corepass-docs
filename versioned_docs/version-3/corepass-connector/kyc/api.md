---
title: KYC API
sidebar_label: KYC API
sidebar_position: 2
description: Every KYC v3 endpoint. Create data requests and QR offers, read and cancel them, pull releases, fetch document images, manage the webhook endpoint, and read pricing and charges.
---

All endpoints are on **`https://api.corepass.net`** under `/api/v3/kyc`. They are server-to-server only and require your raw API key, without a `Bearer ` prefix:

```http
Authorization: <YOUR_API_KEY>
```

Every route also requires the [`kyc:data-request` entitlement](./overview.md#entitlements), except the setup routes ([pricing](#pricing), [charges](#charges) and the [webhook endpoint](#webhook-endpoint)), which need only the default `kyb:read`.

Successful responses use the standard envelope. Errors carry a machine-readable `reason` ([full list](./statuses.md#error-reasons)):

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": 409, "reason": "webhook_endpoint_required", "message": "…" } }
```

**Conventions**

- CoreIDs are 44-character **lower-case** hex ICAN addresses without `0x`, for example `cb72a31c718d343b45e558099ec503087f734433785d`. Upper case and a `0x` prefix are accepted on input and normalized.
- Request, offer and event IDs are 26-character ULIDs.
- Timestamps in JSON responses are ISO-8601 UTC strings. Webhook envelopes and JWT claims use Unix seconds.
- Money is in **CHF cents** (`priceCents`, `chargedCents`, …).
- A request names at most **64 fields** across `fields` and `optionalFields`. `purpose` (at least 8 characters) and `reference` are at most **512 bytes** of UTF-8 each. See [Limits](./overview.md#limits).
- Field names are listed in the [field reference](./fields.md). You can also send a field's 64-hex `sha3_256` hash in place of its name. Each field may appear once across `fields` and `optionalFields`, whichever way it is spelled: a name and its own hash together are `400 malformed_request`.

## Check which fields are verified {#check-which-fields-are-verified}

`GET /api/v3/kyc/verified?coreId=…&fields=…`

```bash title="Request"
curl -G https://api.corepass.net/api/v3/kyc/verified \
  -H "Authorization: <YOUR_API_KEY>" \
  --data-urlencode "coreId=cb72a31c718d343b45e558099ec503087f734433785d" \
  --data-urlencode "fields=DOB_PARENT_FIELD,PASSPORT_DOCUMENT_NUMBER,EMAIL"
```

```json title="Response"
{
  "success": true,
  "data": {
    "coreId": "cb72a31c718d343b45e558099ec503087f734433785d",
    "verified": ["DOB_PARENT_FIELD", "PASSPORT_DOCUMENT_NUMBER"],
    "unverified": ["EMAIL"],
    "fields": [
      { "name": "DOB_PARENT_FIELD", "hash": "…", "kind": "value", "available": true, "resolvedName": "PASSPORT_DOB", "priceCents": 20 },
      { "name": "PASSPORT_DOCUMENT_NUMBER", "hash": "…", "kind": "value", "available": true, "priceCents": 11 },
      { "name": "EMAIL", "hash": "…", "kind": "value", "available": false, "priceCents": 3 }
    ]
  }
}
```

`available: false` means the user has no currently verified value for that field. It never says why.

:::note `/api/v1/blockchain/verified` still works
The older pre-check `GET /api/v1/blockchain/verified?user=…&items=…` is kept unchanged for existing integrations. New code should use `/api/v3/kyc/verified`, which also resolves parent fields and returns prices.
:::

## Create a request by CoreID {#create-a-request-by-coreid}

`POST /api/v3/kyc/data-requests`

Use this when you already know the user's CoreID, for example from [login](../authentication.md). CorePass pushes the request to the user's phone.

```bash title="Request"
curl -X POST https://api.corepass.net/api/v3/kyc/data-requests \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Idempotency-Key: order-48291-kyc" \
  -H "Content-Type: application/json" \
  -d '{
    "coreId": "cb72a31c718d343b45e558099ec503087f734433785d",
    "fields": ["NAME_PARENT_FIELD", "DOB_PARENT_FIELD"],
    "optionalFields": ["EMAIL"],
    "purpose": "Age and identity check for your account",
    "reference": "order-48291"
  }'
```

| Field | Notes |
| --- | --- |
| `coreId` | **Required.** The user's CoreID. |
| `fields` | **Required.** Field names or hashes the request is about. Parent fields are allowed. At least one of them must be available, otherwise the request is refused with `422 fields_unverified`. |
| `optionalFields` | Fields the user may leave out. Missing optional fields never refuse the request. |
| `purpose` | **Required.** Free text shown to the user on the approval screen. Keep it short and specific. |
| `reference` | Your own order or reference string. It is echoed on the request, on webhooks and on charges. |
| `Idempotency-Key` header | Recommended. A retry with the same key returns the original request instead of creating a second one. The same key with a different body fails with `409 idempotency_key_conflict`. |

```json title="Response"
{
  "success": true,
  "data": {
    "requestId": "01JB7Q0M8R2V4X6Z8B0D2F4H6K",
    "coreId": "cb72a31c718d343b45e558099ec503087f734433785d",
    "requester": {
      "kind": "merchant",
      "organizationUUID": "5d0c…",
      "clientDomainUUID": "8f1e…",
      "name": "Example Shop",
      "domain": "shop.example"
    },
    "purpose": "Age and identity check for your account",
    "purposeDigest": "…",
    "fields": [
      { "name": "NAME_PARENT_FIELD", "hash": "…", "kind": "value", "optional": false, "available": true, "priceCents": 20, "approved": false },
      { "name": "DOB_PARENT_FIELD", "hash": "…", "kind": "value", "optional": false, "available": true, "priceCents": 20, "approved": false },
      { "name": "EMAIL", "hash": "…", "kind": "value", "optional": true, "available": true, "priceCents": 3, "approved": false }
    ],
    "status": "PENDING_APPROVAL",
    "createdAt": "2026-10-23T10:00:00Z",
    "expiresAt": "2026-10-24T10:00:00Z",
    "reference": "order-48291",
    "vocab": "<vocabulary digest>",
    "priceCents": 43,
    "currency": "CHF",
    "audience": "merchant",
    "attestationAudience": "8f1e…"
  }
}
```

- A request by CoreID stays open for a fixed **24 hours**. If the user does nothing, it ends as `EXPIRED`.
- `priceCents` is the amount **reserved** now. You are charged only for the fields actually released.
- `attestationAudience` is the value the attestation's `aud` will carry, which is your client domain UUID.
- A field **never** carries a value on this view. Values exist only in the [release](#pull-the-release).

| Refusal | Meaning |
| --- | --- |
| `402 insufficient_credit` | Your credit cannot cover `priceCents`. `requiredCents` and `availableCents` say by how much. |
| `409 open_request_exists` | This CoreID already has an open request from your client domain. |
| `429 cooldown_active` | The user declined a request from this client domain recently. Only a decline starts a cooldown, never an expiry. Wait `Retry-After` seconds. |
| `429 daily_quota_exceeded` | Your organization's daily request quota is used up. It covers all of its client domains and counts only created requests. Wait `Retry-After` seconds. |
| `422 fields_unverified` | None of the required fields is verified for this user. |

See [Limits](./overview.md#limits) for the rules behind the `409` and the `429`s.

## Create an offer (QR code) {#create-an-offer-qr-code}

`POST /api/v3/kyc/data-requests/offers`

Use an **offer** when you don't know who the user is yet, for example at checkout or on a sign-up page. The user scans the QR code (or taps the link on mobile) and claims it. The data request is created at that moment, with the claiming user as the subject.

```bash title="Request"
curl -X POST https://api.corepass.net/api/v3/kyc/data-requests/offers \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Idempotency-Key: checkout-2026-10-23-0001" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": ["NAME_PARENT_FIELD", "DOB_PARENT_FIELD"],
    "optionalFields": ["FACE_IMAGE_PARENT_FIELD"],
    "purpose": "Age check for your order",
    "reference": "checkout-1042",
    "expiresInSeconds": 1800
  }'
```

| Field | Notes |
| --- | --- |
| `fields`, `optionalFields`, `purpose`, `reference` | As for a request by CoreID. |
| `expiresInSeconds` | How long the QR code can be claimed. Default **1800** (30 minutes), maximum **3600**. |
| `Idempotency-Key` header | **Required.** Without it, a retry would create a second QR code. |

```json title="Response"
{
  "success": true,
  "data": {
    "offerId": "01JB7Q3W5Y7A9C1E3G5J7M9P1R",
    "status": "OPEN",
    "link": "corepass:kycdata/?app=Example%20Shop&exp=1761215400&offer=01JB7Q3W5Y7A9C1E3G5J7M9P1R&tok=<64-hex>",
    "qrcode": "<base64 PNG>",
    "createdAt": "2026-10-23T10:00:00Z",
    "expiresAt": "2026-10-23T10:30:00Z",
    "purpose": "Age check for your order",
    "purposeDigest": "…",
    "fields": [ { "name": "NAME_PARENT_FIELD", "hash": "…", "kind": "value", "optional": false, "priceCents": 20 } ],
    "reference": "checkout-1042",
    "vocab": "<vocabulary digest>",
    "priceCents": 150
  }
}
```

Show `qrcode` as an image (`data:image/png;base64,<qrcode>`) on desktop, and use `link` as a button href on mobile.

An offer is refused with `409 webhook_endpoint_required` while your client domain has no [webhook endpoint](./overview.md#register-a-webhook-endpoint), and with `402 insufficient_credit` when your credit cannot cover `priceCents`.

:::danger Treat the offer link as a secret
`link` and `qrcode` are returned **only once**, in this response. CorePass stores only a hash of the claim token. Don't log them. An offer is single-use: the first user to claim it becomes the subject.
:::

### Poll or cancel an offer

| Call | Purpose |
| --- | --- |
| `GET /api/v3/kyc/data-requests/offers/{offerId}` | Current state. `status` is `OPEN`, `CLAIMED`, `CANCELLED` or `EXPIRED`. Once `CLAIMED`, it carries `requestId`, `coreId` and `claimedAt`. |
| `POST /api/v3/kyc/data-requests/offers/{offerId}/cancel` | Withdraw an open offer. On an offer that is no longer open it returns `409 offer_not_open`. |

You also learn about the claim from the `kyc.data_request.pending_approval` [webhook](./webhooks.md#event-catalogue), which carries `offer_id`.

## Read requests

| Call | Purpose |
| --- | --- |
| `GET /api/v3/kyc/data-requests/{requestId}` | One request, in the view shown above. After release each field also carries `resolvedName` (for parent fields), `approved` and `outcome`. |
| `GET /api/v3/kyc/data-requests?status=PENDING_APPROVAL&limit=25&offset=0` | List your client domain's requests, newest first. `status` may repeat. The response is `{requests[], total, limit, offset, vocab}`. |

Field `outcome` after release is one of `RELEASED`, `NO_VALUE`, `NOT_APPROVED` or `UNAVAILABLE`. See [Statuses](./statuses.md#field-outcomes).

## Cancel a request

`POST /api/v3/kyc/data-requests/{requestId}/cancel`

Withdraws a request while it is `PENDING_APPROVAL`. The reservation is returned and a `kyc.data_request.refused` event is sent with `reason: cancelled_by_merchant`. On a resolved request it returns `409 request_not_open`.

:::caution Released data cannot be recalled
After a release, the data has been disclosed. Cancelling returns `409 request_not_open`.
:::

## Pull the release {#pull-the-release}

`GET /api/v3/kyc/data-requests/{requestId}/release`

Returns the same signed attestation the `released` webhook carried, for as long as the release is [retained](./overview.md#retention). Use it when you missed a webhook or prefer pulling. The response is sent with `Cache-Control: no-store`.

```json title="Response"
{
  "success": true,
  "data": {
    "requestId": "01JB7Q0M8R2V4X6Z8B0D2F4H6K",
    "coreId": "cb72a31c718d343b45e558099ec503087f734433785d",
    "releasedAt": "2026-10-23T10:04:12Z",
    "eventId": "01JB7Q9A1C3E5G7J9M1P3R5T7V",
    "seq": 2,
    "attestation": "eyJhbGciOiJSUzI1NiIsInR5cCI6Imt5Yy1hdHRlc3RhdGlvbitqd3QiLCJraWQiOiLigKYifQ.…",
    "attestationKid": "kyc-2026-10",
    "attestationVer": "1",
    "attestationExpiresAt": "2026-10-30T10:04:12Z",
    "fields": [
      { "name": "PASSPORT_NAME", "hash": "…", "kind": "value", "value": "Jane Doe" },
      { "name": "PASSPORT_DOB", "hash": "…", "kind": "value", "value": "1990-04-12" },
      { "name": "PASSPORT_FACE_IMAGE", "hash": "…", "kind": "image", "docType": "passport",
        "url": "https://api.corepass.net/api/v3/kyc/documents/01JB7Q0M8R2V4X6Z8B0D2F4H6K/PASSPORT_FACE_IMAGE" }
    ],
    "payloadPurgeAfter": "2026-10-30T10:04:12Z",
    "chargedCents": 150,
    "chargeCurrency": "CHF"
  }
}
```

:::warning Trust the attestation, not the convenience copy
`fields` repeats what is inside the JWT for convenience. **Verify `attestation`** ([how](./verifying-attestations.md)) and read the values from its claims. Pass `eventId`, `requestId` and `seq` from this response as the envelope fields.
:::

| Result | Meaning |
| --- | --- |
| `200` | The release, while it is retained. |
| `404 not_released` | Not released yet. This is not an error; the request is still open or ended without a release. |
| `410 payload_expired` | Released, but purged after 168 hours. The values **can't be signed again**. Create a new request if you need them. |

## Fetch a document image {#fetch-a-document-image}

`GET /api/v3/kyc/documents/{requestId}/{fieldName}`

Image fields (`kind: "image"`) carry a `url` instead of a value. Fetch it **with your API key**. The bytes are read live from the verification provider on every call and are never stored by CorePass.

```bash title="Request"
curl -o face.jpg \
  https://api.corepass.net/api/v3/kyc/documents/01JB7Q0M8R2V4X6Z8B0D2F4H6K/PASSPORT_FACE_IMAGE \
  -H "Authorization: <YOUR_API_KEY>"
```

The response is the raw document with its `Content-Type`: an image type such as `image/jpeg`, or `application/pdf`. Any other type is served as `application/octet-stream`. Responses carry `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, so treat the bytes as a file, never as a page to render.

- `fieldName` is the **concrete** released field name, such as `PASSPORT_FACE_IMAGE`, never a parent field name.
- Only the client domain that received the release can fetch it, and only while the release is retained. After that: `410 payload_expired`.
- If the document is no longer in good standing at the moment you fetch it (the user's verification was reset or revoked), the call fails with `409 document_not_available`.
- Download images **when you receive the release** if you need to keep them.

## Delivery log, events and redelivery

| Call | Purpose |
| --- | --- |
| `GET /api/v3/kyc/data-requests/{requestId}/deliveries?limit=&offset=` | Every webhook delivery attempt: `{deliveries[{eventId, eventType, seq, attempt, attemptedAt, status, httpStatus, error, nextAttemptAt}], total}`. Check it before you contact support. |
| `GET /api/v3/kyc/data-requests/{requestId}/events?afterSeq=&limit=` | The request's event stream: `{events[{eventId, eventType, seq, timestamp, apiVersion, data, deliveryStatus, attestation, attestationExpired}], total}`. |
| `POST /api/v3/kyc/data-requests/{requestId}/redeliver` | Queue this request's events again: `{requestId, requeued, total}`. Event IDs don't change, so your deduplication still works. |

## Quote a price {#quote-a-price}

`POST /api/v3/kyc/data-requests/quote`

```bash title="Request"
curl -X POST https://api.corepass.net/api/v3/kyc/data-requests/quote \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"fields": ["NAME_PARENT_FIELD", "PASSPORT_FACE_IMAGE"], "optionalFields": ["EMAIL"]}'
```

```json title="Response"
{ "success": true, "data": { "lines": [ { "field": "NAME_PARENT_FIELD", "cents": 20 }, { "field": "PASSPORT_FACE_IMAGE", "cents": 110 }, { "field": "EMAIL", "cents": 3 } ], "totalCents": 133, "currency": "CHF" } }
```

A quote reserves nothing. Creating the request can still fail with `402 insufficient_credit` if your balance changes in the meantime.

## Pricing {#pricing}

`GET /api/v3/kyc/pricing`

```json title="Response"
{
  "success": true,
  "data": {
    "fields": [
      { "name": "PASSPORT_DOB", "hash": "…", "priceCents": 20, "kind": "value", "label": "Passport date of birth", "parent": false },
      { "name": "DOB_PARENT_FIELD", "hash": "…", "priceCents": 20, "kind": "value", "label": "Date of birth (any document)", "parent": true }
    ],
    "currency": "CHF",
    "payoutBps": 9000,
    "feeBps": 1000,
    "vocab": "<vocabulary digest>"
  }
}
```

This is the authoritative price list. A field with price `0` is free. A parent field costs what the field it resolves to costs.

## Webhook endpoint {#webhook-endpoint}

| Call | Purpose |
| --- | --- |
| `PUT /api/v3/kyc/webhook-endpoint` `{url}` | Register or replace the endpoint. Returns `{url, secret, secretVersion, active, createdAt}`, with `201` when the endpoint was created and `200` when it replaced one. **Every PUT issues a new secret**, shown once. See [Register a webhook endpoint](./overview.md#register-a-webhook-endpoint). |
| `GET /api/v3/kyc/webhook-endpoint` | The current endpoint, without the secret: `{url, secretVersion, active, disabledAt, disabledReason, consecutiveFailures, lastDeliveryAt, previousSecretValidUntil, createdAt, updatedAt}`. `404 no_webhook_endpoint` if none is registered. |
| `POST /api/v3/kyc/webhook-endpoint/rotate-secret` | Issue a new secret: `{secret, secretVersion, previousSecretValidUntil}`. The previous secret keeps verifying for 24 hours. |
| `POST /api/v3/kyc/webhook-endpoint/reactivate` | Clear a quarantine. The queued backlog is then delivered. `409 endpoint_not_quarantined` if the endpoint is active. |

## Charges {#charges}

`GET /api/v3/kyc/billing/charges?limit=&offset=`

```json title="Response"
{
  "success": true,
  "data": {
    "charges": [
      {
        "requestId": "01JB7Q0M8R2V4X6Z8B0D2F4H6K",
        "reference": "order-48291",
        "coreId": "cb72a31c718d343b45e558099ec503087f734433785d",
        "quotedCents": 43,
        "chargedCents": 40,
        "currency": "CHF",
        "ledgerState": "SPENT",
        "createdAt": "2026-10-23T10:00:00Z",
        "releasedAt": "2026-10-23T10:04:12Z"
      }
    ],
    "total": 1, "limit": 25, "offset": 0
  }
}
```

`ledgerState` is `RESERVED` (open request), `SPENT` (released and charged), `RELEASED` (the reservation was returned: declined, cancelled, expired or failed), `FAILED` or `DISABLED` (billing switched off for your organization). The balance itself is the shared organization credit; read it with [`GET /api/v1/kyb/billing/account`](../kyb/pricing-billing.md#balance-and-charges) or in the dashboard.

## JWKS {#jwks}

`GET /.well-known/kyc-jwks.json`. Public, no API key, no envelope.

```json
{ "keys": [ { "kty": "RSA", "use": "sig", "alg": "RS256", "kid": "kyc-2026-10", "n": "…", "e": "AQAB" } ] }
```

It holds the **KYC** attestation keys only. They are different from the KYB keys at `/.well-known/kyb-jwks.json`. See [Verifying attestations](./verifying-attestations.md).

## Retired endpoints

These v2 endpoints answer **`410 Gone`** with reason `kyc_api_retired`: `POST /api/v1/kyc/provide`, `POST /api/v1/kyc/transmit`, every `/api/v2/kyc/*` route (`qrcode`, `status`, `all-statuses`, `pre-transmit`, `webhook-responses`), `POST /upload` and `POST /api/v1/blockchain/valid`. See the [migration guide](./migration-from-v2.md).
