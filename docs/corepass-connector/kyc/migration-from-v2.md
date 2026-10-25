---
title: Migrating from KYC v2
sidebar_label: Migrating from v2
sidebar_position: 7
description: Every breaking change between the KYC v2 API (qrcode, callback, Corepass-Signature, peppers) and KYC v3 (data requests, offers, signed attestations, per-field CHF billing), with a step-by-step checklist.
---

KYC v3 replaces the v2 rail completely. It is a **hard cut-over**: the v2 endpoints answer `410 Gone` with reason `kyc_api_retired`, and CorePass app versions that only speak v2 must update. There is no period in which both rails serve the same user, so plan to ship your v3 integration before the switch date your CorePass contact gives you.

## Checklist

1. Make sure your organization holds the **`kyc:data-request`** [entitlement](./overview.md#entitlements). Organizations with a KYC package received it with the [package conversion](#packages-become-credit).
2. **Register a webhook endpoint** once per client domain with `PUT /api/v3/kyc/webhook-endpoint` and store the secret ([how](./overview.md#register-a-webhook-endpoint)).
3. Replace `POST /api/v2/kyc/qrcode` with [`POST /api/v3/kyc/data-requests/offers`](./api.md#create-an-offer-qr-code) (QR code) or [`POST /api/v3/kyc/data-requests`](./api.md#create-a-request-by-coreid) (by CoreID, pushed to the phone). Drop `sourceKey`, `callback`, `statusCallback`, `expiration` and `withoutQRCode`. Add `purpose` and an `Idempotency-Key` header.
4. Rewrite your receiver: accept `kyc.data_request.*` envelopes, [verify the attestation JWT](./verifying-attestations.md), deduplicate on `event_id`, read values from the JWT claims, and fetch image fields from their `url` with your API key.
5. Stop storing peppers and stop calling `/api/v1/blockchain/valid`. Keep the attestation instead.
6. Replace status polling with [`GET /api/v3/kyc/data-requests/{requestId}`](./api.md#read-requests) and map your stored statuses ([mapping](./statuses.md#v2-mapping)).
7. Point all KYC calls at **`https://api.corepass.net`** (v2 used `https://auth.corepass.net`).
8. Make sure you have enough prepaid CHF credit. KYC now draws on the same balance as KYB.

## Breaking changes

### 1. Registered webhook endpoint replaces the per-request `callback`

v2 took a `callback` URL in every `qrcode` body and POSTed to it, including status updates. v3 delivers to **one registered HTTPS endpoint per client domain**. Its secret is shown once and rotates with a 24-hour overlap. It is guarded against private and loopback addresses and never follows redirects. Endpoints are quarantined after 25 consecutive failures and reactivated with an API call. See [Webhooks](./webhooks.md).

### 2. New signature header and secret

`Corepass-Signature: t=…,s=…`, keyed with the package's *webhook signing key*, is gone. v3 sends `Corepass-KYC-Signature: t=…,v1=…,kv=…`, keyed with the endpoint secret, and the HMAC covers `"<t>.<raw body>"`. It is now **transport hygiene only**: the RS256 attestation is the proof. Package webhook signing keys are no longer used.

### 3. Signed attestation replaces `data.transferred`

v2 delivered `{"event":"data.transferred","data":{"infos":"<base64 JSON [{field,data,pepper}]>",…}}` with unsigned values. v3 delivers `kyc.data_request.released` with an **RS256 JWT** (`typ: kyc-attestation+jwt`, keys at `/.well-known/kyc-jwks.json`) whose `fields` claim holds the values. The envelope's `data` holds routing fields only. Receivers must be rewritten. See [Verifying attestations](./verifying-attestations.md).

### 4. Peppers and `/api/v1/blockchain/valid` are removed

v2 told you to persist `(field, data, pepper)` and re-validate against the chain with `POST /api/v1/blockchain/valid`. v3 delivers no peppers, and that endpoint answers `410 kyc_api_retired`. The attestation is the proof of what CorePass verified and the user released, at the time it was released (`fields[].verified_at`, `fields[].expires_at`). To learn whether something is **still** valid later, make a new request, or check current standing with [`GET /api/v3/kyc/verified`](./api.md#check-which-fields-are-verified). Your stored peppers have no further use; delete them along with any v2 data you no longer need.

### 5. No blockchain statuses and no `txHash`

`INITIATING`, `INITIATED`, `CONFIRMING`, `CONFIRMED` and `txHash` described the on-chain escrow, which is gone. The v3 lifecycle is `PENDING_APPROVAL → APPROVED → RELEASING → RELEASED`, or `DECLINED` / `CANCELLED` / `EXPIRED` / `FAILED`. The `status.updated` event is gone. See [Statuses](./statuses.md).

### 6. Longer windows, offers and ULIDs

v2 QR codes had to expire 5–15 minutes ahead and were bound to a CoreID you already knew. In v3:

- **Offers** need no CoreID. The user who claims the QR code becomes the subject. They are claimable for 30 minutes by default, at most 1 hour.
- **Requests by CoreID** stay open for a fixed 24 hours and reach the user by push notification. v2 had no push.
- The deterministic `referenceKey` (a SHA-256 of source key, user and fields) is replaced by a random **ULID** `requestId` and `offerId`. Use `reference` for your own correlation key and the `Idempotency-Key` header for safe retries. The v2 "same QR returned with `alreadySent: true`" behaviour is replaced by idempotency keys.
- The deep link changed from `corepass:request/<coreid>?attr=…&conn=…` to `corepass:kycdata/?app=…&exp=…&offer=…&tok=…`. It carries no gateway URL and no CoreID. Don't build it yourself; use `link` from the offer response.

### 7. Packages become credit {#packages-become-credit}

Packages, Source Keys and the flat price per order (BUNDLE runs, CHARGE credit) are gone. v3 bills **per released field in CHF** from your organization's prepaid credit, the same balance KYB uses. Prices are on the [field reference](./fields.md) and at `GET /api/v3/kyc/pricing`.

Existing packages were converted once, automatically:

- Each unused **BUNDLE** run became **CHF 2.50** of credit.
- Any remaining **CHARGE** balance became the same amount of CHF credit.
- Organizations that held a KYC package were granted `kyc:data-request`.

The dashboard's **Packages** page no longer sells KYC packages. Top up in the dashboard's **Billing** page. A request your credit can't cover is refused up front with `402 insufficient_credit`.

### 8. Images are links, not inline blobs

v2 put images inline in `infos` as encoded strings, with a separate upload path for large payloads. In v3, image fields carry a `url` (`/api/v3/kyc/documents/{requestId}/{fieldName}`) that you fetch **with your API key** while the release is retained (168 hours). That is a second call per image. Download images when you receive the release if you need to keep them.

### 9. Retention

v2 had no defined retention for undelivered data on CorePass's side. v3 keeps the signed payload for exactly **168 hours** after release, then purges it. After that, `/release` and `/documents` answer `410 payload_expired` and nothing can be signed again.

### 10. Entitlement required

v2 had no entitlement check: any API key that knew a Source Key could create orders. v3 requires `kyc:data-request` on every route and binds every request to the client domain of the API key that created it. Another client domain can't read, cancel or pull it.

### 11. Field validation and parent fields

Field names are unchanged. `BUSINESS_*` names are now rejected on the KYC API (`422 unknown_field`). Parent fields still work. The request view reports the resolved field as `resolvedName`, and the attestation names the concrete field.

### 12. Pre-check endpoint

`GET /api/v1/blockchain/verified?user=…&items=…` is **kept** unchanged. The new [`GET /api/v3/kyc/verified?coreId=…&fields=…`](./api.md#check-which-fields-are-verified) also resolves parent fields and returns prices.

### 13. Old CorePass app versions

App versions that only know `corepass:request/…` links and the provide/transmit flow can't answer v3 requests and are asked to update. v2 QR codes you generated before the cut-over stop working.

### 14. Limits on repeated requests

v2 could not push a request to a user at all: the user had to scan your QR code. v3 can, so it limits how often one application may ask one person. Only one request to a CoreID can be open at a time (`409 open_request_exists`), a request the user declines starts a cooldown (`429 cooldown_active`, 24 hours by default; an expired request does not), and a daily quota per organization applies (`429 daily_quota_exceeded`, counting only requests that were created). Both `429`s carry `Retry-After`. A request names at most 64 fields, and `purpose` and `reference` are at most 512 bytes each. See [Limits](./overview.md#limits).

## Retired endpoints

| v2 endpoint | Answer in v3 | Replacement |
| --- | --- | --- |
| `POST /api/v2/kyc/qrcode` | `410 kyc_api_retired` | `POST /api/v3/kyc/data-requests/offers` or `POST /api/v3/kyc/data-requests` |
| `GET /api/v2/kyc/status?referenceKey=` | `410 kyc_api_retired` | `GET /api/v3/kyc/data-requests/{requestId}` |
| `GET /api/v2/kyc/all-statuses?referenceKey=` | `410 kyc_api_retired` | `GET /api/v3/kyc/data-requests/{requestId}/events` |
| `POST /api/v2/kyc/webhook-responses` | `410 kyc_api_retired` | `GET /api/v3/kyc/data-requests/{requestId}/deliveries` |
| `POST /api/v2/kyc/pre-transmit` | `410 kyc_api_retired` | none (CorePass reads values itself) |
| `POST /api/v1/kyc/provide`, `POST /api/v1/kyc/transmit` | `410 kyc_api_retired` | none (these were called by the phone) |
| `POST /upload` | `410 kyc_api_retired` | none |
| `POST /api/v1/blockchain/valid` | `410 kyc_api_retired` | the attestation, or a new request |
| `GET /api/v1/blockchain/verified` | **unchanged** | optionally `GET /api/v3/kyc/verified` |

## Side by side

| Concern | v2 | v3 |
| --- | --- | --- |
| Host | `auth.corepass.net` | `api.corepass.net` |
| Start | `POST /api/v2/kyc/qrcode` with `user`, `sourceKey`, `callback`, `expiration` | Offer (no CoreID) or request by CoreID, `purpose`, `Idempotency-Key` |
| Reaching the user | QR scan / tap only | QR claim, or push by CoreID |
| Window | 5–15 minutes | Offer 30–60 minutes; request 24 hours |
| Delivery | POST to the per-request `callback` | Registered endpoint with retries, quarantine and redelivery |
| Proof | HMAC header + on-chain pepper check | RS256 attestation JWT (HMAC header optional) |
| Values | Base64 JSON with peppers | JWT `fields` claim; images as links |
| Pull | Status only | `/release` returns the signed attestation for 168 h |
| Billing | Package, flat per order | Per released field, CHF credit shared with KYB |
| Access | Any API key with a Source Key | `kyc:data-request` entitlement, scoped to the client domain |
