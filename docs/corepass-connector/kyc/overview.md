---
title: KYC overview
sidebar_label: Overview & onboarding
sidebar_position: 1
description: How KYC data requests work in API v3. Ask a CorePass user for verified identity fields by QR code or by CoreID, and receive a signed attestation on your webhook.
---

**KYC data requests** let your application ask a CorePass user for specific **verified** identity fields: their name, date of birth, a document number, their address, a document image, their email, and so on. The user approves the request in the CorePass app. CorePass then reads the verified values **on its own servers**, signs them into an **attestation** (an RS256 JWT) and delivers it to the webhook endpoint you registered.

KYC v3 works the same way as [KYB data requests](../kyb/data-requests.md), with a single person in place of a business. If you are moving from the v2 API (`/api/v2/kyc/qrcode`, `callback`, `Corepass-Signature`, peppers), read the [migration guide](./migration-from-v2.md) first.

:::info What changed in v3
Values no longer travel from the user's phone to you. There is no blockchain step, no `callback` URL on the request, no pepper and no `/api/v1/blockchain/valid`. You register **one** webhook endpoint and receive a **signed JWT** that carries the values. Images are **links** you fetch with your API key. Every request is billed **per released field** from the same prepaid CHF credit as KYB.
:::

## Two ways to ask

| | QR code / deep link (**offer**) | Request by **CoreID** |
| --- | --- | --- |
| You need to know | Nothing about the user | The user's CoreID, for example from [login](../authentication.md) (`sub`) |
| Call | [`POST /api/v3/kyc/data-requests/offers`](./api.md#create-an-offer-qr-code) | [`POST /api/v3/kyc/data-requests`](./api.md#create-a-request-by-coreid) |
| How it reaches the user | You show `qrcode` (desktop) or open `link` (mobile). The user scans and claims it. | CorePass sends a **push notification** to the user's phone. |
| When the request exists | When the user claims the offer | Immediately |

Both paths end in the same data request, the same approval screen and the same webhook events.

## The flow

1. **Check (optional).** [`GET /api/v3/kyc/verified`](./api.md#check-which-fields-are-verified) tells you which fields a CoreID currently holds verified. [`POST /api/v3/kyc/data-requests/quote`](./api.md#quote-a-price) tells you what a set of fields costs.
2. **Ask.** Create an offer or a request by CoreID. The price is **reserved** on your credit at this point (for an offer, when the user claims it).
3. **The user approves.** The CorePass app shows your organization's name and domain (taken from your registration, never from the request body), your `purpose` text and the fields. The user approves all or some of the fields, or declines. The approval is signed with the user's own key.
4. **CorePass releases.** CorePass re-checks that each approved field is still verified, reads the values, signs the attestation and sends `kyc.data_request.released` to your endpoint. You are **charged only for the fields actually released**. The rest of the reservation goes back to your balance.
5. **You verify and store.** [Verify the attestation](./verifying-attestations.md), deduplicate on `event_id`, store the values you need, and fetch image fields from their `url` with your API key while the release is retained.

```text
merchant ──POST offer / request──▶ CorePass ──push / QR claim──▶ user's CorePass app
                                      │                              │ approve (signed)
                                      ◀──────────────────────────────┘
                                      │ re-check, read values, sign JWT
merchant ◀── kyc.data_request.released (attestation) ── CorePass webhook dispatcher
merchant ──GET /api/v3/kyc/documents/{requestId}/{field} (API key)──▶ image bytes
```

## Onboarding

You need the same dashboard setup as for login ([Dashboard setup](../dashboard-setup.md)): an organization, a registered client domain, and an API key for that domain. KYC v3 adds three things.

### Entitlement {#entitlements}

Every `/api/v3/kyc/...` route that asks a person for data, or reads what they released, requires your organization to hold the **`kyc:data-request`** entitlement. A call without it fails with `403 not_entitled`.

The setup routes need only `kyb:read`, which every organization holds, so you can prepare while the grant is pending: [`GET /pricing`](./api.md#pricing), [`GET /billing/charges`](./api.md#charges) and the four [webhook endpoint](./api.md#webhook-endpoint) routes.

:::info Not self-service
CorePass grants `kyc:data-request` on request. Organizations that held a KYC package under v2 received it automatically with the [package conversion](./migration-from-v2.md#packages-become-credit). Otherwise ask your CorePass contact to grant it to your organization UUID.
:::

### Register a webhook endpoint {#register-a-webhook-endpoint}

Register **one HTTPS endpoint per client domain, once**. Every KYC event for that client domain is delivered to it. This endpoint is separate from your KYB endpoint.

```bash title="Register (or replace) the endpoint"
curl -X PUT https://api.corepass.net/api/v3/kyc/webhook-endpoint \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://merchant.example/corepass/kyc-webhooks"}'
```

```json title="Response"
{
  "success": true,
  "data": {
    "url": "https://merchant.example/corepass/kyc-webhooks",
    "secret": "<64-hex webhook secret>",
    "secretVersion": 1,
    "active": true,
    "createdAt": "2026-10-23T10:00:00Z"
  }
}
```

:::warning The secret is shown exactly once, and every PUT issues a new one
Store `secret` immediately. Calling `PUT` again, even with the same URL, issues a **new** secret. To make your startup code idempotent, call [`GET /api/v3/kyc/webhook-endpoint`](./api.md#webhook-endpoint) first and only `PUT` when no endpoint is registered or the URL differs.
:::

- The URL must be plain `https://` on a public host, without userinfo or a fragment. Redirects are not followed. Loopback, private and metadata addresses are rejected.
- **Rotate the secret** with `POST /api/v3/kyc/webhook-endpoint/rotate-secret`. The previous secret stays valid for 24 hours.
- **Reactivate after quarantine** with `POST /api/v3/kyc/webhook-endpoint/reactivate`. See [Retries](./webhooks.md#retries-ordering-and-recovery).
- The status code tells a first registration from a replacement: `201` when the endpoint was created, `200` when an existing one was replaced. The body has no `created` member.
- Offers (QR codes) **require** a registered endpoint. Without one, creating an offer fails with `409 webhook_endpoint_required`, so you find out before a customer is standing at your checkout. A QR checkout has no other way to learn that the user answered.
- Requests by CoreID work without an endpoint: follow them by [reading the request](./api.md#read-requests) and [pulling the release](./api.md#pull-the-release). Their events are delivered once you register an endpoint later.

### Prepaid credit {#billing}

KYC data requests are billed **per released field** in **CHF**, from your organization's prepaid credit. It is the **same balance** as KYB: one top-up in the dashboard's **Billing** page pays for both, and the charge history lists KYB and KYC charges together.

1. **Quote** (optional): [`POST /api/v3/kyc/data-requests/quote`](./api.md#quote-a-price) prices a field list without reserving anything.
2. **Reserve**: creating a request, or a user claiming your offer, reserves the full quoted amount.
3. **Charge**: at release you pay only for fields whose outcome is `RELEASED`. Declined, cancelled, expired and failed requests cost nothing.

If your balance cannot cover a request, it is refused up front with `402 insufficient_credit` (the error carries `requiredCents` and `availableCents`), or `402 no_credit_account` if your organization has no credit account yet. An offer is checked against your balance when you create it, and the amount is reserved when a user claims it. Per-field prices are on the [field reference](./fields.md) and always current at [`GET /api/v3/kyc/pricing`](./api.md#pricing).

The user who shares their data receives 90% of the charge as a reward in Core Token, and CorePass keeps 10%. You never handle tokens.

## Limits {#limits}

So that a user is never flooded with requests from one application:

- **One open request per person.** While a request from your client domain to a CoreID is `PENDING_APPROVAL` or `APPROVED`, a new request to the same CoreID fails with `409 open_request_exists`. Wait for the answer, or [cancel](./api.md#cancel-a-request) the open one.
- **A cooldown after a decline.** When the user declines a request from your client domain, your next request from that client domain to that CoreID fails with `429 cooldown_active` for 24 hours by default. Only an explicit decline by the user starts a cooldown. A request that expires unanswered, that you cancel or that fails does not.
- **A daily quota per organization.** Your organization may create 500 requests per UTC day by default. The quota is shared by all of your organization's client domains. Only requests that were actually created count: a request refused with `402`, `409` or `429` does not use up the quota. Past the quota, new requests fail with `429 daily_quota_exceeded` until the next UTC day.

Both `429` answers carry a `Retry-After` header with the number of seconds to wait.

A request names at most **64 fields** (required plus optional), and `purpose` and `reference` are at most **512 bytes** of UTF-8 each. Larger requests fail with `400 malformed_request`.

## Retention {#retention}

Released values exist on CorePass's side for **168 hours (7 days)** after release, inside the signed payload only. During that window you can [pull the release](./api.md#pull-the-release) again and fetch [document images](./api.md#fetch-a-document-image). After it, both answer `410 payload_expired` and nothing can be signed again. **Store what you need when you receive it.** The attestation itself also expires after 168 hours (`exp`).

## Requirements on the user's side

- The user has completed identity verification in CorePass for the fields you ask for. A request whose required (non-optional) fields are all unavailable is refused with `422 fields_unverified`.
- The user runs a current CorePass app. Older app versions must update before they can answer v3 requests.

## Next

- [KYC API](./api.md): every route with examples.
- [Webhooks](./webhooks.md): envelope, events, signature header, retries.
- [Verifying attestations](./verifying-attestations.md): Go and Node.js reference code.
- [Field reference](./fields.md), [Statuses & errors](./statuses.md), [Migrating from v2](./migration-from-v2.md).
