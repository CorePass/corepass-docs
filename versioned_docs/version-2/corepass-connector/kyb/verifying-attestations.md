---
title: Verifying attestations
sidebar_label: Verifying attestations
sidebar_position: 7
description: Reference code in Go and Node.js that runs the five attestation checks on a KYB webhook or pulled release.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The code below runs the [five checks](./webhooks.md#the-five-checks-that-matter) on a KYB envelope and returns the signed claims. Use it for webhook deliveries and for releases pulled from `GET /api/v1/kyb/data-requests/{requestId}/release`.

You pass the expected `issuer` and `audience` in (see [below](#issuer-and-audience)). `claims.fields` contains the released data. For fields answered by several people, key on `subject` ([why](./webhooks.md#multiple-people-answering-one-field)).

## Issuer and audience {#issuer-and-audience}

| Claim | Expected value |
| --- | --- |
| `iss` | `https://corepass.net/kyb`. This is deliberately different from the login issuer, so a login token can never pass as an attestation. |
| `aud` | Your **client domain UUID**: the ID of the registered domain your API key belongs to ([Dashboard setup](../dashboard-setup.md#register-domain)). |

The key set at `https://api.corepass.net/.well-known/kyb-jwks.json` also publishes the current `issuer` and the required `typ` next to `keys`, so you can read them from there instead of hard-coding them. Cache the key set for about 5 minutes and refetch when you see an unknown `kid`.

## Reference code

<Tabs groupId="lang">
<TabItem value="go" label="Go" default>

Standard library only, with no dependencies to `go get`.

```go title="attestation.go"
package main

import (
	"context"
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

const jwksURL = "https://api.corepass.net/.well-known/kyb-jwks.json"

type Envelope struct {
	Event       string          `json:"event"`
	EventID     string          `json:"event_id"`
	StreamID    string          `json:"stream_id"`
	Seq         int32           `json:"seq"`
	Attestation string          `json:"attestation,omitempty"`
	Data        json.RawMessage `json:"data"`
}

type Claims struct {
	Issuer    string `json:"iss"`
	Audience  string `json:"aud"`
	ExpiresAt int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
	RequestID string `json:"request_id"`
	StreamID  string `json:"stream_id"`
	EventID   string `json:"event_id"`
	TokenID   string `json:"jti"`
	Seq       int32  `json:"seq"`
	Fields    []struct {
		Name        string `json:"name"`
		Hash        string `json:"hash"`
		SubjectType string `json:"subject_type"`
		Subject     string `json:"subject"`
		Provenance  string `json:"provenance"`
		Value       string `json:"value"`
	} `json:"fields"`
}

// fetchKey looks up the RSA public key for kid. Cache the JWKS in production
// and refetch only when an unknown kid appears.
func fetchKey(kid string) (*rsa.PublicKey, error) {
	resp, err := http.Get(jwksURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var set struct {
		Keys []struct{ Kid, N, E string } `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return nil, err
	}
	for _, k := range set.Keys {
		if k.Kid != kid {
			continue
		}
		n, _ := base64.RawURLEncoding.DecodeString(k.N)
		e, _ := base64.RawURLEncoding.DecodeString(k.E)
		return &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}, nil
	}
	return nil, fmt.Errorf("unknown kid %q", kid)
}

// VerifyAttestation runs all five checks and returns the signed claims.
func VerifyAttestation(ctx context.Context, envelope Envelope, issuer, audience string) (Claims, error) {
	var claims Claims

	parts := strings.Split(envelope.Attestation, ".")
	if len(parts) != 3 {
		return claims, errors.New("malformed attestation")
	}

	headerJSON, _ := base64.RawURLEncoding.DecodeString(parts[0])
	var header struct{ Alg, Typ, Kid string }
	if err := json.Unmarshal(headerJSON, &header); err != nil {
		return claims, err
	}

	// Check 1: typ, before the signature.
	if header.Typ != "kyb-attestation+jwt" {
		return claims, fmt.Errorf("wrong typ %q", header.Typ)
	}
	// Check 2: alg is a constant we require, never a lookup we perform.
	if header.Alg != "RS256" {
		return claims, fmt.Errorf("wrong alg %q", header.Alg)
	}

	// Check 3: signature.
	key, err := fetchKey(header.Kid)
	if err != nil {
		return claims, err
	}
	signature, _ := base64.RawURLEncoding.DecodeString(parts[2])
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], signature); err != nil {
		return claims, errors.New("signature does not verify")
	}

	claimsJSON, _ := base64.RawURLEncoding.DecodeString(parts[1])
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return claims, err
	}

	// Check 4: iss/aud/exp/iat.
	leeway := time.Minute
	now := time.Now().UTC()
	if subtle.ConstantTimeCompare([]byte(claims.Issuer), []byte(issuer)) != 1 {
		return claims, errors.New("wrong issuer")
	}
	if subtle.ConstantTimeCompare([]byte(claims.Audience), []byte(audience)) != 1 {
		return claims, errors.New("wrong audience")
	}
	if claims.ExpiresAt == 0 || now.After(time.Unix(claims.ExpiresAt, 0).Add(leeway)) {
		return claims, errors.New("expired")
	}
	if claims.IssuedAt != 0 && time.Unix(claims.IssuedAt, 0).After(now.Add(leeway)) {
		return claims, errors.New("issued in the future")
	}

	// Check 5: envelope fields must equal the signed copies.
	if claims.EventID != envelope.EventID || claims.TokenID != envelope.EventID ||
		claims.StreamID != envelope.StreamID || claims.RequestID != envelope.StreamID ||
		claims.Seq != envelope.Seq {
		return claims, errors.New("envelope does not match the signed attestation")
	}

	return claims, nil
}
```

</TabItem>
<TabItem value="node" label="Node.js">

Uses [`jose`](https://github.com/panva/jose), the same library as in the [login](../authentication.md#4-verify-the-jwt-and-get-the-coreid) examples.

```js title="attestation.js"
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://api.corepass.net/.well-known/kyb-jwks.json"),
);

export async function verifyAttestation(envelope, { issuer, audience }) {
  // Check 1: typ, before the signature.
  const header = decodeProtectedHeader(envelope.attestation);
  if (header.typ !== "kyb-attestation+jwt") {
    throw new Error(`wrong typ: ${header.typ}`);
  }

  // Checks 2, 3 and 4: alg, signature, iss, aud, exp and iat, all enforced by jwtVerify.
  const { payload: claims } = await jwtVerify(envelope.attestation, JWKS, {
    algorithms: ["RS256"], // never let the header pick the algorithm
    issuer,
    audience,
    clockTolerance: 60,
  });

  // Check 5: envelope fields must equal the signed copies.
  if (
    claims.event_id !== envelope.event_id ||
    claims.jti !== envelope.event_id ||
    claims.stream_id !== envelope.stream_id ||
    claims.request_id !== envelope.stream_id ||
    claims.seq !== envelope.seq
  ) {
    throw new Error("envelope does not match the signed attestation");
  }

  return claims; // claims.fields is the released data
}
```

</TabItem>
</Tabs>

:::tip Then deduplicate
After verification, and **before** you act on a release, record `event_id` in your own database, for example with a unique index. Delivery is at-least-once.
:::

## Putting it together

```js title="kybWebhook.js"
const KYB_ISSUER = "https://corepass.net/kyb";
const KYB_AUDIENCE = process.env.COREPASS_CLIENT_DOMAIN_UUID; // your client domain UUID

app.post("/kyb/webhooks", express.json(), async (req, res) => {
  const envelope = req.body;
  try {
    if (envelope.attestation) {
      // Verify every attested event, including event types you don't recognize.
      const claims = await verifyAttestation(envelope, { issuer: KYB_ISSUER, audience: KYB_AUDIENCE });
      const isNew = await db.insertEventIdIfAbsent(envelope.event_id);
      if (isNew) await queue.enqueue(envelope.event, claims);
    } else {
      const isNew = await db.insertEventIdIfAbsent(envelope.event_id);
      if (isNew) await queue.enqueue(envelope.event, envelope.data);
    }
    res.sendStatus(200); // any 2xx accepts the delivery
  } catch (e) {
    res.status(400).send(e.message);
  }
});
```
