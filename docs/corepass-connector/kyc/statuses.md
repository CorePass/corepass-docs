---
title: KYC statuses & error codes
sidebar_label: Statuses & error codes
sidebar_position: 6
description: Status values, reason codes, field outcomes and HTTP error reasons of the KYC v3 API, and how they map from the v2 order statuses.
---

## Data request lifecycle {#lifecycle}

```text
PENDING_APPROVAL ──▶ APPROVED ──▶ RELEASING ──▶ RELEASED
        │                              │
        ├──▶ DECLINED                  └──▶ FAILED
        ├──▶ CANCELLED
        ├──▶ EXPIRED
        └──▶ FAILED
```

| Status | Meaning | Charged |
| --- | --- | --- |
| `PENDING_APPROVAL` | Created (or claimed from an offer) and waiting for the user. The price is reserved. | Reserved |
| `APPROVED` | The user approved. CorePass is about to release. Usually too brief to observe. | Reserved |
| `RELEASING` | CorePass is reading and signing the values. If the identity provider is briefly unavailable, it retries for about 15 minutes. | Reserved |
| `RELEASED` | **Terminal.** The attestation was issued and the `released` webhook queued. | Released fields only |
| `DECLINED` | **Terminal.** The user declined. | No |
| `CANCELLED` | **Terminal.** You cancelled it while it was pending. | No |
| `EXPIRED` | **Terminal.** The user did not answer within 24 hours. | No |
| `FAILED` | **Terminal.** CorePass could not complete it. See `reasonCode`. | No |

`DECLINED`, `CANCELLED`, `EXPIRED` and `FAILED` are all reported to your webhook as `kyc.data_request.refused`, with the reason in `data.reason`.

## Offer lifecycle

| Status | Meaning |
| --- | --- |
| `OPEN` | The QR code / link can be claimed. Default lifetime 30 minutes, at most 1 hour. |
| `CLAIMED` | **Terminal.** A user claimed it. The offer now names `requestId` and `coreId`; follow the data request from there. |
| `CANCELLED` | **Terminal.** You cancelled it. |
| `EXPIRED` | **Terminal.** Nobody claimed it in time. Create a new offer (and a new QR code). |

## Reason codes {#reason-codes}

`reasonCode` on the request view, and `reason` on the `refused` webhook:

| Reason | Meaning |
| --- | --- |
| `declined_by_user` | The user declined in the CorePass app. |
| `cancelled_by_merchant` | You cancelled the request. |
| `cancelled_by_requester` | The requester withdrew the request. You see this only on requests made by a CorePass user, never on your own. |
| `expired` | Nobody answered within the request's lifetime. |
| `fields_unverified` | None of the required fields is verified any more at release time. |
| `provider_unavailable` | The identity provider stayed unavailable through all release retries. |
| `payment_failed` | Payment could not be collected. Only for requests made by a CorePass user. |

## Field outcomes {#field-outcomes}

After release, each field on the request view carries an `outcome`:

| Outcome | Meaning | Charged |
| --- | --- | --- |
| `RELEASED` | The value (or image link) is in the attestation. | Yes |
| `NOT_APPROVED` | The user did not approve this field. Only possible for optional fields, or when the user approved a subset. | No |
| `UNAVAILABLE` | The user holds no currently verified value for it. | No |
| `NO_VALUE` | The verification exists but has no value for this attribute, for example no back image for a passport. | No |

## Error reasons {#error-reasons}

Non-2xx responses carry `error.reason`. Branch on it rather than on the HTTP status alone, because several reasons share a status.

```json
{ "success": false, "error": { "code": 402, "reason": "insufficient_credit", "message": "…" } }
```

| Reason | Status | What to do |
| --- | :---: | --- |
| `malformed_request` | 400 | Fix the body or parameters. |
| `apikey_missing` | 401 | Send your API key in `Authorization`, without `Bearer`. |
| `apikey_invalid` | 401 | The API key is unknown or revoked. |
| `insufficient_credit` | 402 | Top up your credit. `error.requiredCents` and `error.availableCents` (CHF cents) say by how much; the older `requiredChf` / `availableChf` may also be present. |
| `no_credit_account` | 402 | Your organization has no credit account yet. Buy credit in the dashboard. |
| `not_entitled` | 403 | Ask your CorePass contact for `kyc:data-request`. |
| `subject_not_found` | 404 | No CorePass user with that CoreID has any KYC record. |
| `request_not_found` | 404 | Unknown request ID, or not yours. |
| `offer_not_found` | 404 | Unknown offer ID, or not yours. |
| `not_released` | 404 | The request hasn't been released. Not an error. |
| `no_webhook_endpoint` | 404 | `GET /webhook-endpoint`, `rotate-secret` or `reactivate` with no endpoint registered. |
| `webhook_endpoint_required` | 409 | Creating an offer while no webhook endpoint is registered. [Register one](./overview.md#register-a-webhook-endpoint) first. Requests by CoreID do not need one. |
| `open_request_exists` | 409 | This CoreID already has an open (`PENDING_APPROVAL` or `APPROVED`) request from your client domain. Wait for it, or cancel it. |
| `idempotency_key_conflict` | 409 | The `Idempotency-Key` was used before with a different body. |
| `request_not_open` | 409 | The request is already resolved. |
| `offer_not_open` | 409 | The offer was claimed, cancelled or has expired. |
| `endpoint_not_quarantined` | 409 | Reactivate was called on an active endpoint. |
| `document_not_available` | 409 | The document is not in good standing right now. |
| `payload_expired` | 410 | The release was purged after 168 hours. Create a new request. |
| `kyc_api_retired` | 410 | You called a v2 endpoint. See the [migration guide](./migration-from-v2.md). |
| `unknown_field` | 422 | A field name is not in the [vocabulary](./fields.md). |
| `fields_unverified` | 422 | None of the required fields is verified for this user. Check with [`/verified`](./api.md#check-which-fields-are-verified) first. |
| `cooldown_active` | 429 | The user declined your last request recently (24 hours by default). `Retry-After` says when you may ask again. |
| `daily_quota_exceeded` | 429 | Your daily request quota is used up. `Retry-After` says when it resets. |
| `rate_limited` | 429 | Back off and retry. `Retry-After` may say when. |
| `internal_error` | 500 | Unexpected error. Retry later. |
| `entitlement_unavailable` | 503 | The entitlement check is temporarily unavailable. **Retry**; it is not an authorization failure. |
| `verification_unavailable` | 503 / 504 | A backing service is temporarily unavailable. Retry later. |

## Mapping from v2 statuses {#v2-mapping}

The v2 order statuses described an on-chain settlement that no longer exists. If you stored them, map them like this:

| v2 status | v3 equivalent |
| --- | --- |
| `PENDING` | `PENDING_APPROVAL` (or an `OPEN` offer, if the QR code was not scanned yet) |
| `INITIATING`, `INITIATED` | `APPROVED` / `RELEASING`. There is no transaction and no `txHash`. |
| `CONFIRMING`, `CONFIRMED` | `RELEASED`. The data arrives once, at release, not before settlement. |
| `FAILED` with `PENDING_FOR_LONG_TIME` | `EXPIRED` |
| `FAILED` with `INVALID_CONFIRM_DATA`, `FAILED_TO_MINED`, `UNKNOWN` | No equivalent. Values are read by CorePass, so they can't mismatch. `FAILED` remains for `provider_unavailable`. |
| *(no v2 status)* | `DECLINED` and `CANCELLED` are new: v2 had no explicit decline or cancel. |

The v2 `status.updated` webhook has no v3 counterpart. v3 sends exactly three events: `pending_approval`, `released` and `refused`.
