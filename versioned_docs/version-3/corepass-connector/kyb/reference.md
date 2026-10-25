---
title: KYB statuses & error codes
sidebar_label: Statuses & error codes
sidebar_position: 10
description: Status values, refusal reasons, HTTP error reasons and entitlements for the KYB API.
---

## Status values

| Object | Lifecycle |
| --- | --- |
| Data request | `pending_approval` → `released` \| `refused` \| `cancelled` \| `failed` |
| Signature request | `pending_approval` → `signed` \| `refused` \| `cancelled` \| `expired` |
| Offer (QR code) | Created as `OPEN`. It is single-use and expires after 30 minutes by default (1 hour at most). |

### Data-request refusal reasons

| `reason` | Meaning |
| --- | --- |
| `declined` | The business declined the request. |
| `threshold_not_met` | The vote didn't reach the business's approval threshold. |
| `expired` | The 24-hour window ended without a decision. |
| `business_not_verified` | The business isn't (or is no longer) verified. |
| `business_wallet_rotated` | The business changed its wallet address while the request was open. |
| `cancelled_by_merchant` | You cancelled the request. |
| `unavailable` | The request couldn't be fulfilled. |

## Error responses

Non-2xx responses carry a machine-readable reason in `error.reason`, the HTTP status in `error.code`, and usually a human-readable `error.message`:

```json
{ "success": false, "error": { "code": 403, "reason": "pii_not_entitled", "message": "…" } }
```

| Reason | Status | What to do |
| --- | :---: | --- |
| `malformed_request` | 400 | Fix the request body or parameters. |
| `field_not_priced` | 400 | The field has no price yet. Check `/api/v1/kyb/pricing`. |
| `apikey_missing` | 401 | Send your API key in `Authorization` (no `Bearer` prefix). |
| `apikey_invalid` | 401 | The API key is unknown or revoked. |
| `insufficient_credit`, `no_credit_account` | 402 | [Top up credit](./pricing-billing.md). The body can include `requiredChf`, `availableChf` and `quotedCents`. |
| `kyb_not_entitled` | 403 | Ask your CorePass contact for the entitlement the route needs (`kyb:read` or `kyb:data-request`). |
| `kyb_signature_not_entitled` | 403 | Ask for `kyb:signature`. |
| `pii_not_entitled` | 403 | Ask for `kyb:pii`, or remove director/UBO fields. The message names the fields at fault. |
| `business_not_found` | 404 | No business with that wallet address. |
| `request_not_found` | 404 | Unknown data-request or signature-request ID. |
| `offer_not_found` | 404 | Unknown offer ID. |
| `not_released` | 404 | The data request hasn't been released yet. This isn't an error; try again later. |
| `not_signed` | 404 | The signature request hasn't been signed yet. |
| `idempotency_key_conflict` | 409 | The `Idempotency-Key` was already used with a different request body. |
| `request_already_open` | 409 | There's already an open request for this business and client domain. |
| `no_webhook_endpoint` | 409 | [Register a webhook endpoint](./overview.md#register-a-webhook-endpoint) first. |
| `request_not_open` | 409 | The request is already resolved (released, refused, cancelled or expired). |
| `offer_not_open` | 409 | The offer has already been claimed, cancelled or has expired. Create a new offer. |
| `endpoint_not_quarantined` | 409 | Reactivate was called on an endpoint that isn't quarantined. |
| `document_not_available` | 409 | The requested document image isn't available. |
| `payload_expired` | 410 | The release was purged after its retention period. Create a new request. |
| `unknown_field` | 422 | A field name isn't in the vocabulary. See [KYB fields](./fields.md). |
| `retired_field` | 422 | The field name was retired. See [Retired names](./fields.md#retired-names). |
| `business_not_verified` | 422 | The business isn't KYB-verified. |
| `rate_limited` | 429 | Back off and retry. A `Retry-After` header may say when. |
| `internal_error` | 500 | Unexpected error. Retry later. |
| `not_implemented` | 501 | The operation isn't available yet. |
| `entitlement_unavailable` | 503 | The entitlement check is temporarily unavailable. **Retry.** Don't treat it as an authorization failure. |
| `verification_unavailable` | 503 / 504 | A backing service is temporarily unavailable or didn't answer in time. Retry later. |

Branch on `error.reason` rather than on the HTTP status code alone: several reasons share a status.

## Entitlements

| Entitlement | Controls | Default |
| --- | --- | --- |
| `kyb:read` | Business and member lookups, pricing, billing views, webhook endpoint management | Granted to every organization automatically |
| `kyb:data-request` | Creating and managing data requests, price quotes | Not granted by default. Ask your CorePass contact. |
| `kyb:pii` | Naming a director/UBO (natural-person) field in a data request | Not granted by default. It is separate from `kyb:data-request`. |
| `kyb:signature` | Creating and managing signature requests | Not granted by default. Ask your CorePass contact. |

There's currently no self-service way to get these in the dashboard.
