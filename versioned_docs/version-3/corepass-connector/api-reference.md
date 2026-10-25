---
title: API reference
sidebar_label: API reference
sidebar_position: 7
description: Every CorePass Connector endpoint in one place — OAuth/OIDC, KYC and KYB — with authentication, conventions and links to the detailed pages.
---

Base URLs:

- **`https://auth.corepass.net`**: OAuth 2.0 / OIDC and KYC
- **`https://api.corepass.net`**: KYB merchant API and `/.well-known/kyb-jwks.json`

## Authentication

| Surface | How to authenticate |
| --- | --- |
| OAuth 2.0 / OIDC endpoints | Standard OAuth 2.0. The token endpoint takes HTTP Basic `client_id:secret` (or PKCE only, for public clients). `/userinfo` takes `Authorization: Bearer <access_token>`. |
| KYC and KYB endpoints | `Authorization: <YOUR_API_KEY>`: the raw API key from the dashboard, **without** a `Bearer ` prefix. Server-to-server only. |

## OAuth 2.0 / OpenID Connect

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/.well-known/openid-configuration` | OIDC discovery document. |
| `GET` | `/.well-known/jwks.json` | Keys for verifying login tokens. |
| `GET` | `/oauth2/auth` | Authorization endpoint. Serves the CorePass QR login page. Add scope `business` for [business login](./kyb/business-login.md). |
| `POST` | `/oauth2/token` | Exchange an authorization code or refresh token for tokens. |
| `GET` | `/userinfo` | Claims of the authenticated user. |

Details: [Login (OAuth 2.0 / OIDC)](./authentication.md).

## KYC

All KYC paths are on `https://api.corepass.net` and require the `kyc:data-request` entitlement. Responses are wrapped in `{ "success": true, "data": … }`. Errors are `{ "success": false, "error": { "code": …, "reason": "…", "message": "…" } }`. See [KYC error codes](./kyc/statuses.md#error-reasons).

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v3/kyc/verified?coreId=…&fields=…` | [Which fields a user holds verified.](./kyc/api.md#check-which-fields-are-verified) |
| `POST` | `/api/v3/kyc/data-requests` | [Create a request by CoreID (pushed to the phone).](./kyc/api.md#create-a-request-by-coreid) |
| `POST` | `/api/v3/kyc/data-requests/offers` | [Create a QR code / deep link offer.](./kyc/api.md#create-an-offer-qr-code) |
| `GET` | `/api/v3/kyc/data-requests/offers/{offerId}` | [Poll an offer.](./kyc/api.md#poll-or-cancel-an-offer) |
| `POST` | `/api/v3/kyc/data-requests/offers/{offerId}/cancel` | [Cancel an open offer.](./kyc/api.md#poll-or-cancel-an-offer) |
| `GET` | `/api/v3/kyc/data-requests`, `/api/v3/kyc/data-requests/{requestId}` | [List or read requests.](./kyc/api.md#read-requests) |
| `POST` | `/api/v3/kyc/data-requests/{requestId}/cancel` | [Cancel a pending request.](./kyc/api.md#cancel-a-request) |
| `GET` | `/api/v3/kyc/data-requests/{requestId}/release` | [Pull the signed attestation.](./kyc/api.md#pull-the-release) |
| `GET` | `/api/v3/kyc/documents/{requestId}/{fieldName}` | [Fetch a released document image.](./kyc/api.md#fetch-a-document-image) |
| `GET` | `/api/v3/kyc/data-requests/{requestId}/deliveries`, `/events`; `POST …/redeliver` | [Delivery log, event stream, redelivery.](./kyc/api.md#delivery-log-events-and-redelivery) |
| `POST` | `/api/v3/kyc/data-requests/quote` | [Price a field list.](./kyc/api.md#quote-a-price) |
| `GET` | `/api/v3/kyc/pricing` | [Per-field CHF prices.](./kyc/api.md#pricing) |
| `PUT`, `GET` | `/api/v3/kyc/webhook-endpoint` | [Register or read the webhook endpoint.](./kyc/api.md#webhook-endpoint) |
| `POST` | `/api/v3/kyc/webhook-endpoint/rotate-secret`, `/reactivate` | [Rotate the secret, clear a quarantine.](./kyc/api.md#webhook-endpoint) |
| `GET` | `/api/v3/kyc/billing/charges` | [KYC charges.](./kyc/api.md#charges) |
| `GET` | `/.well-known/kyc-jwks.json` | [Public keys for KYC attestations.](./kyc/api.md#jwks) |
| `GET` | `/api/v1/blockchain/verified?user=…&items=…` | Older pre-check, kept unchanged. |

Webhooks: [KYC webhooks](./kyc/webhooks.md) · Attestations: [Verifying attestations](./kyc/verifying-attestations.md) · Fields: [KYC fields](./kyc/fields.md) · Statuses: [KYC statuses & error codes](./kyc/statuses.md) · Moving from v2: [Migration guide](./kyc/migration-from-v2.md)

## KYB

All KYB paths are on `https://api.corepass.net`. Errors use `{ "success": false, "error": { "code": …, "reason": "…", "message": "…" } }`. See [KYB error codes](./kyb/reference.md#error-responses).

### Webhook endpoint (`kyb:read`)

| Method | Path | Description |
| --- | --- | --- |
| `PUT` | `/api/v1/kyb/webhook-endpoint` | [Register or replace your endpoint.](./kyb/overview.md#register-a-webhook-endpoint) Returns the secret once. |
| `GET` | `/api/v1/kyb/webhook-endpoint` | Read the registered endpoint. |
| `POST` | `/api/v1/kyb/webhook-endpoint/rotate-secret` | Rotate the secret. The old one stays valid for 24 hours. |
| `POST` | `/api/v1/kyb/webhook-endpoint/reactivate` | Lift a quarantine. The queued backlog is then delivered. |

### Lookups (`kyb:read`)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/kyb/status/{walletAddress}` | [Verification status of a business.](./kyb/business-lookup.md#status) |
| `GET` | `/api/v1/kyb/verify/{walletAddress}` | [Status plus governance rules and team size.](./kyb/business-lookup.md#verification-details-and-governance-rules) |
| `GET` | `/api/v1/kyb/members/{walletAddress}` | [Member roster.](./kyb/business-lookup.md#members) |
| `GET` | `/api/v1/kyb/pricing` | [Field vocabulary, PII flags and pricing tiers.](./kyb/fields.md) |
| `GET` | `/api/v1/kyb/billing/account` | [Credit balance.](./kyb/pricing-billing.md#balance-and-charges) |
| `GET` | `/api/v1/kyb/billing/charges` | [Charge history.](./kyb/pricing-billing.md#balance-and-charges) |

### Data requests (`kyb:data-request`, plus `kyb:pii` for person-level fields)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/kyb/data-requests` | [Create by wallet address.](./kyb/data-requests.md#create-a-request-by-wallet-address) |
| `POST` | `/api/v1/kyb/data-requests/offers` | [Create a QR-code offer.](./kyb/data-requests.md#create-a-request-by-qr-code-offer) `Idempotency-Key` required. |
| `GET` | `/api/v1/kyb/data-requests/offers/{offerId}` | Poll an offer. |
| `POST` | `/api/v1/kyb/data-requests/offers/{offerId}/cancel` | Cancel an open offer. |
| `POST` | `/api/v1/kyb/data-requests/quote` | [Price quote.](./kyb/data-requests.md#quote-a-price-before-you-commit) |
| `GET` | `/api/v1/kyb/data-requests` | List and filter by `status`, `limit`. |
| `GET` | `/api/v1/kyb/data-requests/{requestId}` | Current state. |
| `POST` | `/api/v1/kyb/data-requests/{requestId}/cancel` | Cancel while `pending_approval`. |
| `GET` | `/api/v1/kyb/data-requests/{requestId}/deliveries` | Webhook delivery attempts. |
| `GET` | `/api/v1/kyb/data-requests/{requestId}/events?after_seq=` | Event stream. |
| `POST` | `/api/v1/kyb/data-requests/{requestId}/redeliver` | Send webhook events again. |
| `GET` | `/api/v1/kyb/data-requests/{requestId}/release` | [Pull the signed attestation.](./kyb/webhooks.md#pulling-instead-of-waiting) |

### Signature requests (`kyb:signature`)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/kyb/signature-requests` | [Create by wallet address.](./kyb/signature-requests.md#create-a-request) `Idempotency-Key` required. |
| `POST` | `/api/v1/kyb/signature-requests/offers` | Create a QR-code offer. `Idempotency-Key` required. |
| `GET` | `/api/v1/kyb/signature-requests/offers/{offerId}` | Poll an offer. |
| `POST` | `/api/v1/kyb/signature-requests/offers/{offerId}/cancel` | Cancel an open offer. |
| `GET` | `/api/v1/kyb/signature-requests` | List signature requests. |
| `GET` | `/api/v1/kyb/signature-requests/{requestId}` | Current state. |
| `POST` | `/api/v1/kyb/signature-requests/{requestId}/cancel` | Cancel while `pending_approval`. |
| `GET` | `/api/v1/kyb/signature-requests/{requestId}/deliveries` | Webhook delivery attempts. |
| `GET` | `/api/v1/kyb/signature-requests/{requestId}/events` | Event stream. |
| `GET` | `/api/v1/kyb/signature-requests/{requestId}/signature` | [Read the EIP-1271 signature.](./kyb/signature-requests.md#read-the-result) |

### KYB signing keys

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/.well-known/kyb-jwks.json` | Keys for verifying [KYB attestations](./kyb/verifying-attestations.md). They are separate from the login JWKS. Besides `keys`, the document also carries the required `issuer` and `typ`. |

## Conventions

- **Timestamps** are Unix time in seconds.
- **CoreIDs / wallet addresses** are sent without a `0x` prefix, e.g. `ab72a31c…`. Login tokens carry them as `coreid:<address>` in `sub`.
- **Idempotency.** KYB creates accept an `Idempotency-Key` header. It is required for offers and signature requests and recommended elsewhere. A replay returns the original object (`200` instead of `201`).
- **Webhook responses.** Answer any `2xx` to acknowledge a KYC or KYB webhook.
