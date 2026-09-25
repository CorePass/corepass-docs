---
title: KYC webhooks
sidebar_label: Webhooks & signatures
sidebar_position: 3
description: Payloads the Connector POSTs to your KYC callback URL, how to verify the Corepass-Signature HMAC header, and how to decode delivered data.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The Connector sends every webhook for a KYC order to the **`callback`** URL you passed to [`POST /api/v2/kyc/qrcode`](./api.md#generate-a-kyc-qr-code), both status changes and the delivered data. Your handler must therefore tell the two event types apart by `event`:

| `event` | Sent when | Carries |
| --- | --- | --- |
| `status.updated` | The order changes status (`initiating`, `initiated`, `confirming`, `confirmed`, `failed`). | The new status and the order's fields. |
| `data.transferred` | The user's verified data has been received and checked. | The data, Base64-encoded. |

:::note `statusCallback`
The `statusCallback` request field is accepted for compatibility but is optional. Status updates are delivered to `callback`.
:::

Every webhook is a `POST` with a JSON body and a `Corepass-Signature` header. Respond with any **2xx** status to acknowledge it.

## Status update

```http title="status.updated"
POST <your callback URL>
Content-Type: application/json
Corepass-Signature: t=1748000100,s=5f0c…e91a

{
  "event": "status.updated",
  "timestamp": 1748000100,
  "data": {
    "userAddress": "ab148af5f9cdad10beddb05fbec4a3bef02577130e56",
    "fields": ["EMAIL", "IDCARD_DOB"],
    "status": "initiated",
    "deadline": 1748000400,
    "txHash": "0xd90eb1…",
    "timestamp": 1748000100
  }
}
```

| Field | Meaning |
| --- | --- |
| `status` | The new order status, **lower-case**. See [Status values](./statuses.md). |
| `fields` | The fields of this order. |
| `deadline` | The order's `expiration` (Unix seconds). |
| `txHash` | Hash of the order's on-chain *initiate* transaction, once it exists. |

When an order ends in `failed`, no `data.transferred` event follows. Call [`GET /api/v2/kyc/status`](./api.md#poll-the-latest-status) to read the `failureReason`.

## Data delivered

```http title="data.transferred"
POST <your callback URL>
Content-Type: application/json
Corepass-Signature: t=1748000123,s=8a41…07bc

{
  "event": "data.transferred",
  "timestamp": 1748000123,
  "data": {
    "userAddress": "ab432e666932c53128d9f73712b058a7a8f7df52f5cb",
    "infos": "<Base64-encoded JSON array>",
    "deadline": 1748000400,
    "txHash": "0xd90eb1…",
    "timestamp": 1748000123
  }
}
```

`data.infos` is a Base64 string. Decode it and parse the result as JSON to get one entry per field:

```json title="decoded data.infos"
[
  { "field": "DRIVER_LICENSE_DOB",        "data": "MTk4Ni0wOS0wNg==", "pepper": "N050Jk1LMVp4…" },
  { "field": "DRIVER_LICENSE_ISSUE_DATE", "data": "MjAyMC0xMS0xMg==", "pepper": "N050Jk1LMVp4…" }
]
```

`data` and `pepper` are byte arrays, themselves **Base64-encoded** in the JSON. Base64-decode `data` to get the value; for text fields it's a UTF-8 string such as `1986-09-06`.

:::warning Persist every triple
Store `field`, the decoded `data` and the decoded `pepper` for every delivered field. You need all three to [re-validate](./api.md#check-that-stored-data-is-still-valid) the data later, and the pepper is as sensitive as the value itself.
:::

## Verifying the signature

Every webhook carries a `Corepass-Signature` header:

```http
Corepass-Signature: t=<unix timestamp>,s=<hex HMAC>
```

- **Algorithm:** HMAC-SHA256, hex-encoded (lower case).
- **Key:** the **webhook signing key** of the package (Source Key) the order was created with. You find it next to the Source Key on the dashboard's **Packages** page ([details](../dashboard-setup.md#source-key)). Each package has its own key.
- **Signed message:** `<t>.<raw request body>`: the timestamp from the header, a dot, then the exact body bytes you received.
- **Freshness:** reject requests whose `t` is more than **5 minutes** away from your own clock.

To verify:

1. Split the header on `,` and read `t` and `s`.
2. Check that `t` is within 5 minutes of your current time.
3. Compute `HMAC-SHA256(key, t + "." + rawBody)` and hex-encode it.
4. Compare it with `s` in **constant time**. Reject on mismatch.

:::warning Use the raw body
Compute the MAC over the bytes exactly as received, before any JSON parsing. Re-serializing a parsed object changes the bytes and breaks the signature.
:::

<Tabs groupId="lang">
<TabItem value="node" label="Node.js" default>

```js title="kycWebhook.js"
import crypto from "node:crypto";
import express from "express";

const SIGNING_KEY = process.env.COREPASS_KYC_WEBHOOK_KEY; // from the Packages page
const TOLERANCE_SECONDS = 5 * 60;

function verifyCorepassSignature(header, rawBody) {
  const parts = Object.fromEntries(
    (header ?? "").split(",").map((p) => p.trim().split("=", 2)),
  );
  const t = Number.parseInt(parts.t, 10);
  if (!Number.isFinite(t) || !parts.s) throw new Error("malformed signature header");

  if (Math.abs(Math.floor(Date.now() / 1000) - t) > TOLERANCE_SECONDS) {
    throw new Error("stale signature");
  }

  const expected = crypto
    .createHmac("sha256", SIGNING_KEY)
    .update(`${t}.`)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.s, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("signature does not match");
  }
}

const app = express();

// Keep the raw bytes: the MAC is computed over them.
app.post("/corepass/callback", express.raw({ type: "application/json" }), (req, res) => {
  try {
    verifyCorepassSignature(req.header("Corepass-Signature"), req.body);
  } catch (e) {
    return res.status(400).send(e.message);
  }

  const event = JSON.parse(req.body.toString("utf8"));
  if (event.event === "data.transferred") {
    const infos = JSON.parse(Buffer.from(event.data.infos, "base64").toString("utf8"));
    for (const info of infos) {
      const value = Buffer.from(info.data, "base64");   // the field value
      const pepper = Buffer.from(info.pepper, "base64"); // keep for re-validation
      // Durably store { field: info.field, value, pepper } …
    }
  }
  res.sendStatus(200);
});
```

</TabItem>
<TabItem value="go" label="Go">

```go title="signature.go"
package corepass

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"
)

const tolerance = 5 * time.Minute

// VerifySignature checks a Corepass-Signature header against the raw body.
// key is the package's webhook signing key from the dashboard.
func VerifySignature(header string, rawBody []byte, key string, now time.Time) error {
	var t int64
	var sig []byte
	for _, part := range strings.Split(header, ",") {
		k, v, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok {
			continue
		}
		switch k {
		case "t":
			ts, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return errors.New("malformed timestamp")
			}
			t = ts
		case "s":
			b, err := hex.DecodeString(v)
			if err != nil {
				return errors.New("malformed signature")
			}
			sig = b
		}
	}
	if t == 0 || sig == nil {
		return errors.New("malformed signature header")
	}

	age := now.Sub(time.Unix(t, 0))
	if age < 0 {
		age = -age
	}
	if age > tolerance {
		return errors.New("stale signature")
	}

	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte(strconv.FormatInt(t, 10) + "."))
	mac.Write(rawBody)
	if !hmac.Equal(mac.Sum(nil), sig) {
		return errors.New("signature does not match")
	}
	return nil
}
```

Decoding a `data.transferred` payload:

```go title="decode.go"
package corepass

import (
	"encoding/base64"
	"encoding/json"
)

type Info struct {
	Field  string `json:"field"`
	Data   []byte `json:"data"`   // encoding/json Base64-decodes []byte for you
	Pepper []byte `json:"pepper"`
}

func DecodeInfos(infosB64 string) ([]Info, error) {
	raw, err := base64.StdEncoding.DecodeString(infosB64)
	if err != nil {
		return nil, err
	}
	var infos []Info
	return infos, json.Unmarshal(raw, &infos)
}
```

</TabItem>
</Tabs>

:::caution Legacy verification removed
The self-hosted Connector put a `signature` field in the body and verified it with a SHA3 hash and `Ecrecover`. That scheme no longer exists. Don't port old verification code.
:::

## Retries

If your endpoint doesn't answer with a 2xx status (or times out), the Connector retries on a schedule that CorePass manages. Design your handler to:

- **Be idempotent.** The same event can arrive more than once.
- **Acknowledge fast.** Return `200` as soon as the payload is durably stored, and do the rest in your own background workers.

The dashboard's [Webhook page](../dashboard-setup.md#webhook-history) shows every delivery attempt with the status code and response body.
