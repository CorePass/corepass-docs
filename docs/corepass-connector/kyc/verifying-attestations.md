---
title: Verifying KYC attestations
sidebar_label: Verifying attestations
sidebar_position: 4
description: The claims of a KYC attestation and reference code in Go and Node.js that runs the checks on a webhook delivery or a pulled release.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A **KYC attestation** is an RS256-signed JWT issued by CorePass. It carries the released values, so it is the only thing you need to trust. You receive it on the `kyc.data_request.released` [webhook](./webhooks.md) and from [`GET /api/v3/kyc/data-requests/{requestId}/release`](./api.md#pull-the-release).

## Header and claims

```json title="Header"
{ "alg": "RS256", "typ": "kyc-attestation+jwt", "kid": "kyc-2026-10" }
```

```json title="Claims"
{
  "iss": "https://api.corepass.net/kyc",
  "aud": "8f1e2c4a-…",
  "sub": "cb72a31c718d343b45e558099ec503087f734433785d",
  "jti": "01JB7Q9A1C3E5G7J9M1P3R5T7V",
  "iat": 1761213852,
  "exp": 1761818652,
  "ver": "1",
  "vocab": "<vocabulary digest>",
  "request_id": "01JB7Q0M8R2V4X6Z8B0D2F4H6K",
  "requester": {
    "kind": "merchant",
    "organization_uuid": "5d0c…",
    "client_domain_uuid": "8f1e2c4a-…",
    "name": "Example Shop"
  },
  "approval": {
    "approved_at": 1761213840,
    "fields_digest": "<hex sha3-256>",
    "signature": "<the user's consent signature>"
  },
  "fields": [
    { "name": "PASSPORT_NAME", "hash": "…", "kind": "value", "value": "Jane Doe", "doc_type": "passport", "verified_at": 1750000000, "expires_at": 2050000000 },
    { "name": "PASSPORT_DOB", "hash": "…", "kind": "value", "value": "1990-04-12", "doc_type": "passport", "verified_at": 1750000000 },
    { "name": "PASSPORT_FACE_IMAGE", "hash": "…", "kind": "image", "doc_type": "passport",
      "url": "https://api.corepass.net/api/v3/kyc/documents/01JB7Q0M8R2V4X6Z8B0D2F4H6K/PASSPORT_FACE_IMAGE" }
  ]
}
```

| Claim | Meaning |
| --- | --- |
| `iss` | `https://api.corepass.net/kyc`. Different from the login issuer and from the KYB issuer, so neither kind of token can pass as a KYC attestation. |
| `aud` | Your **client domain UUID**, the `attestationAudience` on every request view. |
| `sub` | The CoreID of the user whose data this is. For a request by CoreID it is the `coreId` you sent. For an offer it is the user who claimed it. |
| `jti` | The event ID. It equals the envelope's `event_id`. |
| `iat`, `exp` | Issued at and expiry, Unix seconds. `exp` is `iat` + 168 hours, the same as the [retention window](./overview.md#retention). |
| `ver`, `vocab` | Attestation format version and the digest of the field vocabulary in force. |
| `request_id` | The data request. It equals the envelope's `stream_id`. |
| `requester` | Who asked: you, as registered with CorePass. |
| `approval` | The user's consent: when they approved, `fields_digest` over the approved field hashes, and their EIP-712 signature (domain `CorePassKYC` version `1`, type `ApproveDataRequest(string requestId,bytes32 fieldsDigest)`). You don't need to check it; CorePass did. It is there so you can show the subject consented. |
| `fields` | One entry per **released** field. `name` is the concrete field (a parent field appears as the child it resolved to). `kind: "value"` and `kind: "json"` carry `value` (for `json`, a JSON document encoded as a string). `kind: "image"` carries `url` instead, which you [fetch with your API key](./api.md#fetch-a-document-image). `doc_type`, `verified_at` and `expires_at` describe the underlying verification when known. `doc_type` is lower case: `passport`, `idcard`, `residence_permit`, `driver_license`, `proof_address`, `email`, `phone` or `external_wallet_<network>` (for example `external_wallet_btc`). |

Fields that were not released (declined, unavailable, no value) are **absent** from the claims. Their `outcome` is on the [request view](./api.md#read-requests).

## The checks {#checks}

1. `typ` is `kyc-attestation+jwt`, checked **before** the signature.
2. `alg` is `RS256`, as a constant. Never take the algorithm from the header.
3. The signature verifies with the key named by `kid` from `https://api.corepass.net/.well-known/kyc-jwks.json`. Cache the key set for about 5 minutes and refetch when an unknown `kid` appears.
4. `iss` and `aud` are what you expect, `exp` is in the future and `iat` is not, each with about a minute of leeway.
5. The envelope matches the signed copies: `event_id == jti`, `stream_id == request_id`, and `seq` equals the signed `seq` when that claim is present. For a pulled release, use `eventId`, `requestId` and `seq` from the response as the envelope.

If you created a request by CoreID, also check that `sub` is the CoreID you asked about.

## Reference code

<Tabs groupId="lang">
<TabItem value="go" label="Go" default>

Standard library only.

```go title="kycattestation.go"
package kycattestation

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"
)

const (
	JWKSURL = "https://api.corepass.net/.well-known/kyc-jwks.json"
	Issuer  = "https://api.corepass.net/kyc"
	Typ     = "kyc-attestation+jwt"
)

// Envelope is the part of a webhook delivery (or a pulled release) that is
// compared against the signed claims.
type Envelope struct {
	EventID     string `json:"event_id"`
	StreamID    string `json:"stream_id"`
	Seq         int32  `json:"seq"`
	Attestation string `json:"attestation"`
}

type Field struct {
	Name       string `json:"name"`
	Hash       string `json:"hash"`
	Kind       string `json:"kind"`
	Value      string `json:"value,omitempty"`
	URL        string `json:"url,omitempty"`
	DocType    string `json:"doc_type,omitempty"`
	VerifiedAt int64  `json:"verified_at,omitempty"`
	ExpiresAt  int64  `json:"expires_at,omitempty"`
}

type Claims struct {
	Issuer    string  `json:"iss"`
	Audience  string  `json:"aud"`
	Subject   string  `json:"sub"`
	TokenID   string  `json:"jti"`
	IssuedAt  int64   `json:"iat"`
	ExpiresAt int64   `json:"exp"`
	Ver       string  `json:"ver"`
	Vocab     string  `json:"vocab"`
	RequestID string  `json:"request_id"`
	Seq       *int32  `json:"seq,omitempty"`
	Fields    []Field `json:"fields"`
}

// fetchKey looks up the RSA key for kid. Cache the key set in production and
// refetch only when an unknown kid appears.
func fetchKey(kid string) (*rsa.PublicKey, error) {
	resp, err := http.Get(JWKSURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var set struct {
		Keys []struct{ Kty, Kid, N, E string } `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return nil, err
	}
	for _, k := range set.Keys {
		if k.Kid != kid || k.Kty != "RSA" {
			continue
		}
		n, err := base64.RawURLEncoding.DecodeString(k.N)
		if err != nil {
			return nil, err
		}
		e, err := base64.RawURLEncoding.DecodeString(k.E)
		if err != nil {
			return nil, err
		}
		return &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}, nil
	}
	return nil, fmt.Errorf("unknown kid %q", kid)
}

// Verify runs the checks and returns the signed claims. audience is your
// client domain UUID.
func Verify(env Envelope, audience string, now time.Time) (Claims, error) {
	var claims Claims

	parts := strings.Split(env.Attestation, ".")
	if len(parts) != 3 {
		return claims, errors.New("malformed attestation")
	}

	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return claims, err
	}
	var header struct{ Alg, Typ, Kid string }
	if err := json.Unmarshal(headerJSON, &header); err != nil {
		return claims, err
	}

	// 1. typ, before the signature.
	if header.Typ != Typ {
		return claims, fmt.Errorf("wrong typ %q", header.Typ)
	}
	// 2. alg is a constant we require.
	if header.Alg != "RS256" {
		return claims, fmt.Errorf("wrong alg %q", header.Alg)
	}

	// 3. signature.
	key, err := fetchKey(header.Kid)
	if err != nil {
		return claims, err
	}
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return claims, err
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], signature); err != nil {
		return claims, errors.New("signature does not verify")
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return claims, err
	}
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return claims, err
	}

	// 4. iss, aud, exp, iat.
	leeway := time.Minute
	if subtle.ConstantTimeCompare([]byte(claims.Issuer), []byte(Issuer)) != 1 {
		return claims, errors.New("wrong issuer")
	}
	if subtle.ConstantTimeCompare([]byte(claims.Audience), []byte(audience)) != 1 {
		return claims, errors.New("wrong audience")
	}
	if claims.ExpiresAt == 0 || now.After(time.Unix(claims.ExpiresAt, 0).Add(leeway)) {
		return claims, errors.New("attestation expired")
	}
	if claims.IssuedAt != 0 && time.Unix(claims.IssuedAt, 0).After(now.Add(leeway)) {
		return claims, errors.New("attestation issued in the future")
	}

	// 5. the envelope must equal the signed copies.
	if claims.TokenID != env.EventID || claims.RequestID != env.StreamID {
		return claims, errors.New("envelope does not match the signed attestation")
	}
	if claims.Seq != nil && *claims.Seq != env.Seq {
		return claims, errors.New("envelope seq does not match the signed attestation")
	}

	return claims, nil
}
```

</TabItem>
<TabItem value="node" label="Node.js">

Uses [`jose`](https://github.com/panva/jose), the same library as in the [login](../authentication.md#4-verify-the-jwt-and-get-the-coreid) examples.

```js title="kycAttestation.js"
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from "jose";

const KYC_ISSUER = "https://api.corepass.net/kyc";
const JWKS = createRemoteJWKSet(
  new URL("https://api.corepass.net/.well-known/kyc-jwks.json"),
);

// envelope: { event_id, stream_id, seq, attestation }
// audience: your client domain UUID
export async function verifyKycAttestation(envelope, audience) {
  // 1. typ, before the signature.
  const header = decodeProtectedHeader(envelope.attestation);
  if (header.typ !== "kyc-attestation+jwt") {
    throw new Error(`wrong typ: ${header.typ}`);
  }

  // 2-4. alg, signature, iss, aud, exp and iat, enforced by jwtVerify.
  const { payload: claims } = await jwtVerify(envelope.attestation, JWKS, {
    algorithms: ["RS256"], // never let the header pick the algorithm
    typ: "kyc-attestation+jwt",
    issuer: KYC_ISSUER,
    audience,
    clockTolerance: 60,
  });

  // 5. the envelope must equal the signed copies.
  if (claims.jti !== envelope.event_id || claims.request_id !== envelope.stream_id) {
    throw new Error("envelope does not match the signed attestation");
  }
  if (claims.seq !== undefined && claims.seq !== envelope.seq) {
    throw new Error("envelope seq does not match the signed attestation");
  }

  return claims; // claims.fields holds the released data
}
```

</TabItem>
</Tabs>

## Putting it together

```js title="kycWebhook.js"
import express from "express";
import { verifySignatureHeader } from "./kycSignature.js"; // optional, see Webhooks
import { verifyKycAttestation } from "./kycAttestation.js";

const AUDIENCE = process.env.COREPASS_CLIENT_DOMAIN_UUID;
const API_KEY = process.env.COREPASS_API_KEY;

app.post("/corepass/kyc-webhooks", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const envelope = JSON.parse(req.body.toString("utf8"));

    if (envelope.attestation) {
      // Verify every attested event, including event types you don't recognize.
      const claims = await verifyKycAttestation(envelope, AUDIENCE);
      if (await db.insertEventIdIfAbsent(envelope.event_id)) {
        for (const field of claims.fields) {
          if (field.kind === "image") {
            const img = await fetch(field.url, { headers: { Authorization: API_KEY } });
            await db.saveImage(claims.request_id, field.name, Buffer.from(await img.arrayBuffer()));
          } else {
            await db.saveValue(claims.request_id, field.name, field.value);
          }
        }
      }
    } else if (await db.insertEventIdIfAbsent(envelope.event_id)) {
      await queue.enqueue(envelope.event, envelope.data); // pending_approval, refused
    }
    res.sendStatus(200); // any 2xx accepts the delivery
  } catch (e) {
    res.status(400).send(e.message);
  }
});
```

:::tip Respond fast
Return the 2xx within 10 seconds. If image downloads or other work can take longer, record the verified claims and do the rest in a background job.
:::
