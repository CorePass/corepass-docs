---
title: KYC webhooks
sidebar_label: Webhooks & Corepass-KYC-Signature
sidebar_position: 3
description: The KYC v3 webhook envelope, event catalogue, the Corepass-KYC-Signature header, deduplication, retries, quarantine and pulling results.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Every KYC event is delivered to the one endpoint you [registered](./overview.md#register-a-webhook-endpoint) for the client domain, always in the same envelope:

```http title="Webhook delivery"
POST <your registered endpoint>
Content-Type: application/json
Corepass-KYC-Signature: t=1761213852,v1=<hex hmac>,kv=1
Corepass-Event-Id: 01JB7Q9A1C3E5G7J9M1P3R5T7V
Corepass-Delivery-Attempt: 1
Corepass-Kyc-Api-Version: 2026-10-23

{
  "event":       "kyc.data_request.released",
  "event_id":    "01JB7Q9A1C3E5G7J9M1P3R5T7V",
  "stream_id":   "01JB7Q0M8R2V4X6Z8B0D2F4H6K",
  "seq":         2,
  "timestamp":   1761213852,
  "api_version": "2026-10-23",
  "data":        { "…": "routing fields only, see below" },
  "attestation": "eyJhbGciOiJSUzI1NiIs…"
}
```

| Field | Meaning |
| --- | --- |
| `event` | Event type. See the [catalogue](#event-catalogue). |
| `event_id` | 26-character ULID. It is identical on every retry and redelivery. **Use it to deduplicate.** It equals the attestation's `jti`. |
| `stream_id` | The data request this event belongs to (its `requestId`). |
| `seq` | Sequence number within the stream. |
| `timestamp` | Unix seconds when the event was created. |
| `attestation` | RS256-signed JWT. Present on `released` only. **This is what you trust.** |

The envelope uses `snake_case` and Unix seconds, like the KYB envelope. The REST API uses `camelCase` and ISO-8601.

## Event catalogue {#event-catalogue}

| Event | Attested | `data` carries |
| --- | :---: | --- |
| `kyc.data_request.pending_approval` | no | `request_id`, `provider_core_id`, `fields[{name, hash, kind, optional}]`, `created_at`, `expires_at`, `merchant_reference`, `price{quoted_cents, currency, lines[]}` and, when the request came from a QR offer, `offer_id`. |
| `kyc.data_request.released` | **yes** | Routing fields only: `request_id`, `provider_core_id`, `released_at`, `field_count`, `refused_fields[{field, hash, outcome}]` (the requested fields that released nothing, with their [outcome](./statuses.md#field-outcomes); absent when every field released), `attestation_ver`, `attestation_kid`, `attestation_expires_at`, `charge{charged_cents, currency, lines[]}`. **The values are only inside the attestation.** |
| `kyc.data_request.refused` | no | `request_id`, `provider_core_id`, `reason`, `refused_at`. `reason` is one of the [reason codes](./statuses.md#reason-codes), for example `declined_by_user`, `expired` or `cancelled_by_merchant`. |

```jsonc title="Pricing on the wire"
// pending_approval: the reserved amount
"price":  {"quoted_cents": 150, "currency": "CHF", "lines": [{"field": "PASSPORT_FACE_IMAGE", "cents": 110}, …]}
// released: the actual charge, released fields only
"charge": {"charged_cents": 40, "currency": "CHF", "lines": [{"field": "PASSPORT_NAME", "cents": 20}, …]}
```

:::warning Verify every attestation, including unknown event types
New attested event types may be added. If an envelope carries `attestation`, verify it, whatever the `event` is. Skipping verification for an event type you don't recognize throws the guarantee away.
:::

## Verifying a delivery

:::info The attestation JWT is your security boundary
The `Corepass-KYC-Signature` HMAC header is **transport hygiene**. **The attestation JWT is the proof.** A receiver that verifies the JWT and ignores the header is fully protected for released data. Events without an attestation (`pending_approval`, `refused`) carry no personal data. If you act on them, check the header or confirm with [`GET /api/v3/kyc/data-requests/{requestId}`](./api.md#read-requests).
:::

### The attestation checks

Run them in this order. Reference code is in [Verifying attestations](./verifying-attestations.md).

1. The JWT header `typ` is `kyc-attestation+jwt`. Check it **before** the signature, so any other kind of token (a KYB attestation, a login token) is rejected right away.
2. `alg` is `RS256`. Hard-code it and never read the algorithm from the header.
3. The signature verifies against the key named by `kid`, from `https://api.corepass.net/.well-known/kyc-jwks.json`.
4. `iss` is `https://api.corepass.net/kyc`, `aud` is **your client domain UUID**, and `exp` / `iat` are valid, with a small clock-skew leeway.
5. The envelope agrees with the signed copies: `event_id` equals `jti`, `stream_id` equals `request_id`, and `seq` equals the signed `seq` when the claim is present.

### Deduplicate on `event_id`

Delivery is **at-least-once**. You will sometimes receive the same event twice, for example after a timeout on your side or a manual redelivery. `event_id` is byte-identical on every retry and is the only correct deduplication key. A unique index on it is enough.

### Optional: checking the `Corepass-KYC-Signature` header {#signature-header}

The header is `t=<unix>,v1=<hex hmac>,kv=<secret version>`:

- `v1` is `hex(HMAC-SHA256(secret, "<t>.<raw body bytes>"))`, keyed with your endpoint `secret`.
- Compare `t` with **your own clock** and allow **5 minutes** of skew. Never use a timestamp from the body.
- MAC the **exact bytes you received**, not a re-serialization of the parsed JSON.
- Compare MACs in **constant time**.
- `kv` names the secret version. During the 24 hours after a [rotation](./api.md#webhook-endpoint), accept the previous version too.

The header name differs from KYB's `Corepass-KYB-Signature` on purpose, so a KYB verifier can never be pointed at KYC traffic by mistake.

<Tabs groupId="lang">
<TabItem value="go" label="Go" default>

```go title="kycsignature.go"
package kycwebhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"
)

// VerifySignatureHeader checks Corepass-KYC-Signature against the raw body.
// secrets maps secret version (the kv member) to the endpoint secret.
func VerifySignatureHeader(header string, body []byte, secrets map[int]string, now time.Time) error {
	var ts int64
	var mac string
	kv := -1
	for _, part := range strings.Split(header, ",") {
		key, value, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok {
			continue
		}
		switch key {
		case "t":
			ts, _ = strconv.ParseInt(value, 10, 64)
		case "v1":
			mac = value
		case "kv":
			kv, _ = strconv.Atoi(value)
		}
	}
	if ts == 0 || mac == "" {
		return errors.New("malformed Corepass-KYC-Signature")
	}
	if d := now.Sub(time.Unix(ts, 0)); d > 5*time.Minute || d < -5*time.Minute {
		return errors.New("signature timestamp outside tolerance")
	}
	secret, ok := secrets[kv]
	if !ok {
		return errors.New("unknown secret version")
	}
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(strconv.FormatInt(ts, 10) + "."))
	h.Write(body)
	want := hex.EncodeToString(h.Sum(nil))
	if !hmac.Equal([]byte(want), []byte(strings.ToLower(mac))) {
		return errors.New("signature mismatch")
	}
	return nil
}
```

</TabItem>
<TabItem value="node" label="Node.js">

```js title="kycSignature.js"
import { createHmac, timingSafeEqual } from "node:crypto";

// rawBody must be the exact Buffer received, e.g. express.raw({ type: "application/json" }).
// secrets maps secret version (kv) to the endpoint secret.
export function verifySignatureHeader(header, rawBody, secrets, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=", 2)),
  );
  const t = Number(parts.t);
  if (!t || !parts.v1) throw new Error("malformed Corepass-KYC-Signature");
  if (Math.abs(nowSeconds - t) > 300) throw new Error("signature timestamp outside tolerance");

  const secret = secrets[Number(parts.kv)];
  if (!secret) throw new Error("unknown secret version");

  const want = createHmac("sha256", secret).update(`${t}.`).update(rawBody).digest();
  const got = Buffer.from(parts.v1, "hex");
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    throw new Error("signature mismatch");
  }
}
```

</TabItem>
</Tabs>

## Retries, ordering and recovery {#retries-ordering-and-recovery}

- Return any **2xx** within **10 seconds** to accept a delivery. Anything else, including a timeout or a redirect, counts as a failure.
- Failed deliveries are retried with exponential backoff: the first retry after about **15 seconds**, doubling each time, with at most **2 hours** between attempts. After **10 attempts** the event is dead-lettered. It stays visible in the [delivery log](./api.md#delivery-log-events-and-redelivery) and can be queued again with `redeliver` while the release is retained.
- Events of one request (`stream_id`) are delivered **in order**: `seq` 2 is never sent before `seq` 1 has succeeded or run out of attempts.
- After **25 consecutive failures** your endpoint is **quarantined**. Events keep queuing and nothing is dropped. Fix your receiver, then call `POST /api/v3/kyc/webhook-endpoint/reactivate`; the backlog is delivered automatically.
- `GET …/{requestId}/deliveries` shows each attempt and what your host answered. `GET …/{requestId}/events?afterSeq=` returns the full event stream. `POST …/{requestId}/redeliver` queues the events again with the same `event_id`s.
- The endpoint must resolve to a public address. Redirects are never followed. Loopback, private and metadata addresses are rejected at registration and again at delivery.

## Pulling instead of waiting {#pulling-instead-of-waiting}

If you missed a webhook and don't want to wait for redelivery, [pull the release](./api.md#pull-the-release):

```bash title="Pull a release"
curl https://api.corepass.net/api/v3/kyc/data-requests/<requestId>/release \
  -H "Authorization: <YOUR_API_KEY>"
```

It returns the same attestation the webhook carried. **Verify it exactly as you would a webhook delivery**, using `eventId`, `requestId` and `seq` from the response as the envelope fields. After 168 hours it answers `410 payload_expired`.

## What you're never told

Why a field is unavailable, which documents the user holds beyond what you asked for, or anything about the user's other requests. A refusal carries only a [reason code](./statuses.md#reason-codes). Released values exist only inside the attestation, never in `data`.
