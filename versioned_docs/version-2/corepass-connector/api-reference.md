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

Responses are wrapped in `{ "data": …, "message": "…", "success": true }`. Errors are `{ "success": false, "error": { "code": …, "message": "…" } }`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/blockchain/verified?user=…&items=…` | [Which requested fields the user has verified.](./kyc/api.md#check-which-fields-are-verified) |
| `POST` | `/api/v2/kyc/qrcode` | [Create a KYC request and get a QR code / deep link.](./kyc/api.md#generate-a-kyc-qr-code) |
| `GET` | `/api/v2/kyc/status?referenceKey=…` | [Latest status of an order.](./kyc/api.md#poll-the-latest-status) |
| `GET` | `/api/v2/kyc/all-statuses?referenceKey=…` | [Full status history of an order.](./kyc/api.md#fetch-the-full-status-history) |
| `POST` | `/api/v1/blockchain/valid` | [Re-validate stored field values.](./kyc/api.md#check-that-stored-data-is-still-valid) |

Webhooks: [KYC webhooks](./kyc/webhooks.md) · Fields: [KYC fields](./kyc/fields.md) · Statuses: [KYC status values](./kyc/statuses.md)

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
