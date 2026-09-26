---
title: Signature requests
sidebar_label: Signature requests
sidebar_position: 5
description: Ask a business to sign a text message or EIP-712 typed data, and verify the resulting EIP-1271 signature against the business wallet contract.
---

A **signature request** asks a business to sign a message or an EIP-712 typed-data document that **you** write. Examples are "We confirm the terms of order #48291" or a new version of your terms. Signature requests are **free**. They require the `kyb:signature` [entitlement](./overview.md#entitlements), and the business's `signature_requests` [governance rule](./overview.md#governance) decides how many members must approve.

## Create a request

`POST /api/v1/kyb/signature-requests`

```bash title="Request"
curl -X POST https://api.corepass.net/api/v1/kyb/signature-requests \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Idempotency-Key: terms-v3-acme" \
  -H "Content-Type: application/json" \
  -d '{
    "businessWalletAddress": "ab998877…",
    "messageKind": "TEXT",
    "message": "I accept the Example Supplier Terms v3, effective 2026-09-17.",
    "purpose": "Confirming acceptance of updated supplier terms",
    "expiresInSeconds": 3600
  }'
```

| Field | Notes |
| --- | --- |
| `Idempotency-Key` header | **Required** on every signature-request create, both direct and offer. |
| `businessWalletAddress` | The business to ask. Offers don't take it. |
| `messageKind` | `TEXT` or `TYPED_DATA`. |
| `message` | For `TEXT`: plain UTF-8, up to 4096 bytes. It is hashed **byte-for-byte as given**, with no trimming. |
| `typedData` | For `TYPED_DATA`: an EIP-712-shaped JSON document, up to 64 KB. Set exactly one of `message` or `typedData`, matching `messageKind`. |
| `purpose` | Shown to the members when they vote. |
| `expiresInSeconds` | Optional. If omitted or `0`, it defaults to 24 hours. Other values are **clamped** to 5 minutes – 24 hours, not rejected. |

```json title="Response"
{
  "requestId": "01J8Z4M2RSTUVWXYZABCDEFGHJ",
  "businessWalletAddress": "ab998877…",
  "messageKind": "TEXT",
  "message": "I accept the Example Supplier Terms v3, effective 2026-09-17.",
  "digest": "0xabc123…",
  "status": "pending_approval",
  "expiresAt": 1758003600
}
```

:::info The digest is computed by CorePass
CorePass always computes the digest on its side. Never send your own. The `kyb.signature_request.pending_approval` webhook includes the `digest`, so you can check it before the vote finishes.
:::

### QR-code offers and management

As with data requests, you can create a signature request as a QR-code offer: `POST /api/v1/kyb/signature-requests/offers`. It requires a [registered webhook endpoint](./overview.md#register-a-webhook-endpoint). You also get the same read, list and cancel endpoints:

| Call | Purpose |
| --- | --- |
| `GET /api/v1/kyb/signature-requests/{requestId}` | Fetch the current state. |
| `GET /api/v1/kyb/signature-requests/{requestId}/deliveries` | Webhook delivery attempts. |
| `GET /api/v1/kyb/signature-requests/{requestId}/events` | Full event stream. |
| `POST /api/v1/kyb/signature-requests/{requestId}/cancel` | Withdraw while `pending_approval`. |
| `GET /api/v1/kyb/signature-requests/{requestId}/signature` | Read the signature once it's signed. |

## Read the result

```bash title="Request"
curl https://api.corepass.net/api/v1/kyb/signature-requests/01J8Z4M2…/signature \
  -H "Authorization: <YOUR_API_KEY>"
```

```json title="Response"
{
  "requestId": "01J8Z4M2RSTUVWXYZABCDEFGHJ",
  "businessWalletAddress": "ab998877…",
  "signature": "0x…",
  "digest": "0xabc123…",
  "signedAt": 1758002000,
  "verification": { "method": "eip1271", "contract": "ab998877…", "selector": "0x9a2f1b4c" }
}
```

## Verify the signature

:::danger This is not an ECDSA signature
You **cannot** `ecrecover` it. It's an **EIP-1271** blob, `abi.encode(bytes[] memberSignatures)`, because only the business wallet contract knows the roster, voting weights and threshold at the time of signing.
:::

Verify it by calling the business wallet contract:

```text
BusinessWallet(<businessWalletAddress>).isValidSignature(digest, signature) == MAGICVALUE
```

:::warning Don't hard-code the Ethereum magic value
The magic value is **not** Ethereum's familiar `0x1626ba7e`. Core Blockchain hashes with SHA3-256 instead of Keccak, so the magic value is the first four bytes of `SHA3-256("isValidSignature(bytes32,bytes)")`. Use `verification.selector` (and `verification.contract` / `verification.method`) from the response instead of an EIP-1271 constant from Ethereum tooling.
:::

## Status values

```text
pending_approval ──▶ signed
                 ├─▶ refused    (the vote did not carry)
                 ├─▶ cancelled  (you withdrew it)
                 └─▶ expired    (no vote was proposed in time)
```

`expired` is different from `refused`: `expired` means nobody started a vote before the expiry, and `refused` means a vote took place and didn't pass.
