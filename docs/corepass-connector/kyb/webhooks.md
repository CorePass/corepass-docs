---
title: KYB webhooks
sidebar_label: Webhooks & Corepass-KYB-Signature
sidebar_position: 6
description: The KYB webhook envelope, event catalogue, pricing fields, the Corepass-KYB-Signature header, deduplication, retries and pulling results.
---

Every KYB event, whether for a data request or a signature request, is delivered to the one endpoint you [registered](./overview.md#register-a-webhook-endpoint), always in the same envelope:

```http title="Webhook delivery"
POST <your registered endpoint>
Content-Type: application/json
Corepass-KYB-Signature: t=1758010000,v1=<hex hmac>,kv=1
Corepass-Event-Id: 01K3QW8P4Z0M5R7T9V2X6B4Y8C
Corepass-Delivery-Attempt: 1
Corepass-Kyb-Api-Version: 2026-08-23
User-Agent: corepass-kyb-webhooks/1

{
  "event":       "kyb.data_request.released",
  "event_id":    "01K3QW8P4Z0M5R7T9V2X6B4Y8C",
  "stream_id":   "01K3QW1A0000000000000000AB",
  "seq":         2,
  "timestamp":   1758010000,
  "api_version": "2026-08-23",
  "data":        { "…": "routing and version fields only, see below" },
  "attestation": "eyJhbGciOiJSUzI1NiIs…"
}
```

| Field | Meaning |
| --- | --- |
| `event` | Event type. See the [catalogue](#event-catalogue). |
| `event_id` | 26-character ULID. It is identical on every retry and redelivery. **Use it to deduplicate.** |
| `stream_id` | The request this event belongs to. There's no top-level `request_id`. Inside the signed claims the same value appears as both `stream_id` and `request_id`. |
| `seq` | Sequence number within the stream. |
| `attestation` | RS256-signed JWT. Present on attested events only. **This is what you trust.** |

## Event catalogue

| Event | Attested | Carries |
| --- | :---: | --- |
| `kyb.data_request.pending_approval` | no | `expires_at`, `price` (the reserved cost) and, when claimed from a QR offer, `offer_id`. |
| `kyb.data_request.released` | **yes** | The values are **only** inside the attestation. `data` holds routing fields only: `request_id`, `released_at`, `field_count`, `pii_included`, `attestation_kid`, `attestation_expires_at`, `charge`. No field names, hashes or values. |
| `kyb.data_request.refused` | no | `reason`, one of `declined`, `threshold_not_met`, `expired`, `business_not_verified`, `business_wallet_rotated`, `cancelled_by_merchant`, `unavailable`. |
| `kyb.signature_request.pending_approval` | no | `digest`, `message_kind` and timestamps, so you can check the digest before the vote finishes. |
| `kyb.signature_request.signed` | no\* | `signature`, `digest`, `signed_at`, `verification{…}`. |
| `kyb.signature_request.refused` | no | `reason`, `digest`. |
| `kyb.business.wallet_address_changed` | **yes** | A business you hold data about changed its wallet address. |

\* A signed signature request isn't JWT-attested because the signature itself can be verified on-chain ([how](./signature-requests.md#verify-the-signature)). Wrapping it in another signature would add nothing.

:::danger Wallet address changes take effect immediately
After `kyb.business.wallet_address_changed`, the `previous_wallet_address` stops resolving **immediately**. There's no grace period and no forwarding. Don't keep the old address as an alias.
:::

:::warning Verify every attestation, including unknown event types
New attested event types may be added. If your integration only verifies the event types it knows, it will accept a future event without verifying it. Verification costs one signature check. Skipping it for an unknown attested event throws away the whole guarantee.
:::

### Pricing fields

```jsonc title="Pricing on the wire"
// on pending_approval: the reserved amount
"price":  {"quoted_cents": 250, "currency": "CHF", "lines": [{"field": "BUSINESS_LEGAL_NAME", "tier": "A", "cents": 100}]}
// on released: the actual charge (only released fields are billed)
"charge": {"charged_cents": 100, "currency": "CHF", "lines": [{"field": "BUSINESS_LEGAL_NAME", "tier": "A", "cents": 100}]}
```

Treat both as optional, because requests created before pricing was introduced don't have them. A request you can't afford is refused up front with `402 insufficient_credit`, before anyone is asked to vote. See [Pricing & billing](./pricing-billing.md).

## Signature verification

:::info The attestation JWT is your security boundary
The `Corepass-KYB-Signature` HMAC header is **transport hygiene**, not your security boundary. **The attestation JWT is.** A merchant that verifies only the JWT and ignores the header is fully protected.
:::

### The five checks that matter

Run them in this order. Reference code is in [Verifying attestations](./verifying-attestations.md).

1. The JWT `typ` is `kyb-attestation+jwt`. Check it **before** the signature, so a token of the wrong kind (such as a login token) is rejected right away.
2. `alg` is `RS256`. Hard-code it and never read the algorithm from the header.
3. The signature verifies against the key named by `kid`, from `https://auth.corepass.net/.well-known/kyb-jwks.json`.
4. `iss` is `https://corepass.net/kyb`, `aud` is **your client domain UUID**, and `exp` / `iat` are valid, with a small clock-skew leeway. See [Issuer and audience](./verifying-attestations.md#issuer-and-audience).
5. The envelope's `event_id`, `stream_id` and `seq` equal the **signed** copies inside the claims. If they don't, something between CorePass and you relabelled the delivery.

### Deduplicate on `event_id`

No library does this for you. **Deduplicate on `event_id`.** It is byte-identical on every retry and every manual redelivery, and it's the *only* correct deduplication key. Don't use the timestamp or a hash of the body. Delivery is **at-least-once**, so you will sometimes see the same `event_id` twice. A unique index on `event_id` is enough.

### Optional: checking the `Corepass-KYB-Signature` header

If you also check the header (`t=<unix>,v1=<hex hmac>,kv=<secret version>`):

- The MAC is `HMAC-SHA256(secret, "<t>.<raw body bytes>")`, keyed with your endpoint `secret`, and hex-encoded in `v1`.
- Compare `t` against **your own clock** and allow **5 minutes** of skew. Never use a timestamp from the body.
- MAC the **exact bytes you received**, not a re-serialization of the parsed JSON.
- Compare the MACs in **constant time**.
- `kv` tells you which secret version was used, which matters during the 24-hour overlap after a [secret rotation](./overview.md#register-a-webhook-endpoint).

## Retries, ordering and recovery

- Return any **2xx** to accept a delivery. Anything else is retried on an exponential schedule for about **9 hours**.
- Events on one stream (`stream_id`) are delivered **in order**: `seq` 2 is never sent before `seq` 1 has succeeded or run out of retries.
- If deliveries keep failing, your endpoint is **quarantined**. Events keep queuing and nothing is dropped. Clear the quarantine with `POST /api/v1/kyb/webhook-endpoint/reactivate`, and the backlog is then delivered automatically.
- If you think you missed something, `GET …/{requestId}/deliveries` shows each attempt and what your host returned, and `GET …/{requestId}/events?after_seq=` returns the full event stream. Both are available at any time. `POST …/{requestId}/redeliver` queues the events again.
- Redirects are never followed. The endpoint must resolve to a public address; loopback and metadata addresses are rejected.

## Pulling instead of waiting

If you missed a webhook and don't want to wait for redelivery, pull the release directly:

```bash title="Pull a release"
curl https://auth.corepass.net/api/v1/kyb/data-requests/<requestId>/release \
  -H "Authorization: <YOUR_API_KEY>"
```

It returns the same attestation the webhook would have carried. **Verify it exactly as you would verify a webhook delivery.**

| Result | Meaning |
| --- | --- |
| `200` | The release, if it is still within retention. |
| `404 not_released` | Not released yet. This is not an error. |
| `410 payload_expired` | Released, but the values were purged on schedule. They **can't be signed again**. Create a new request if you need the data. |

## Multiple people answering one field

A company with two directors answers a director-level field **twice**. The entries differ only in `subject` (and value):

```jsonc title="Two answers to one field"
{"name": "BUSINESS_DIRECTOR_DOB", "subject_type": "DIRECTOR", "subject": "01H…", "value": "1980-04-12"},
{"name": "BUSINESS_DIRECTOR_DOB", "subject_type": "DIRECTOR", "subject": "01H…", "value": "1975-11-03"}
```

:::warning Key on `subject`, not only on `name`
If you key on `name` alone, you'll silently lose one of the two answers.
:::

## What you're never told

Who voted, how each member voted, the tally, the threshold, or which member declined. A release's `approval` block contains only `{approved_at, action_id, threshold_met}`: a boolean and an audit handle. It is present only on a successful release.
