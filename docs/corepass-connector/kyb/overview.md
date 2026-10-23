---
title: KYB overview
sidebar_label: Overview & onboarding
sidebar_position: 1
description: What KYB is, how business governance works, and the onboarding steps KYB adds on top of KYC — entitlements, a webhook endpoint and prepaid credit.
---

**KYC** verifies a *person*. **KYB** verifies a *business*. A CorePass business is not one keyholder. It is a **smart-contract wallet with a member roster and governance rules**, deployed on-chain through a shared factory. Nobody holds a key for it, neither CorePass nor you. Members approve with their own personal CorePass keys, and the contract checks their combined signatures against its roster and thresholds.

## Governed actions

You (the merchant) can ask a business to perform one of three **governed actions**:

| Action | What it does | KYC counterpart | Cost |
| --- | --- | --- | --- |
| [**Business login**](./business-login.md) | A member signs in on behalf of the business. If enough members approve, you get an OAuth identity for the business. | Personal login | Free |
| [**Data request**](./data-requests.md) | The business releases verified company, director or UBO fields to you as a signed attestation. | [KYC data request](../kyc/overview.md) | Per released field |
| [**Signature request**](./signature-requests.md) | The business signs a message or EIP-712 typed-data document that you provide, such as updated terms or an order confirmation. | — | Free |

### Governance

Each action belongs to a **governance category**, and each business sets its own approval rule per category, either `MAJORITY` or `UNANIMOUS`:

| Category | Covers |
| --- | --- |
| `signature_requests` | Business login and signature requests |
| `data_requests` | Data requests |

You can read a business's current rules before you ask it for anything. See [Business lookups](./business-lookup.md).

Approval is a **multi-member vote**, not a single tap on one phone, so KYB windows are long:

- A **data request** stays open for a fixed **24 hours**.
- A **signature request** uses an expiry you choose, clamped to **5 minutes – 24 hours**.

## Onboarding

### Reused from KYC

Set these up once, exactly as for KYC ([Dashboard setup](../dashboard-setup.md)):

- **Domain registration.** There's no separate KYB domain step.
- **OAuth client.** The same client handles personal and business login. You only add a scope value.
- **API key.** The same key, sent the same way (`Authorization: <YOUR_API_KEY>`, no `Bearer` prefix), authenticates every `/api/v1/kyb/...` call.

:::note No Source Key
KYB (like KYC v3) has **no Source Key or package purchase**. You name the fields you want on each request, and access is controlled by [entitlements](#entitlements).
:::

### Entitlements {#entitlements}

Every `/api/v1/kyb/...` route requires your API key's organization to hold the right **entitlement**:

| Entitlement | Unlocks | Default |
| --- | --- | --- |
| `kyb:read` | Business and member lookups, pricing, billing views, webhook endpoint management | Granted to **every organization** automatically |
| `kyb:data-request` | Creating and managing data requests, price quotes | Must be requested |
| `kyb:pii` | Naming a director- or UBO-level (natural-person) field in a data request. It is separate from `kyb:data-request` on purpose. | Must be requested |
| `kyb:signature` | Creating and managing signature requests | Must be requested |

:::info Not self-service
CorePass grants `kyb:data-request`, `kyb:pii` and `kyb:signature` on request. Each grant is tied to a named person and a reason. **Ask your CorePass contact to grant them to your organization UUID**, which you can find in the dashboard's organization switcher.

A call without the required entitlement fails with `403 kyb_not_entitled`, `403 kyb_signature_not_entitled` or `403 pii_not_entitled`. That tells you which entitlement to request; it isn't a bug.
:::

### Register a webhook endpoint {#register-a-webhook-endpoint}

You **register one HTTPS endpoint per client domain, once**, and every KYB request delivers to it. KYC v3 works the same way with its own, separate endpoint ([KYC webhook endpoint](../kyc/overview.md#register-a-webhook-endpoint)).

```bash title="Register (or replace) the endpoint"
curl -X PUT https://api.corepass.net/api/v1/kyb/webhook-endpoint \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://merchant.example/kyb/webhooks"}'
```

```json title="Response"
{
  "url": "https://merchant.example/kyb/webhooks",
  "secret": "<64-hex webhook secret>",
  "secretVersion": 1,
  "active": true,
  "createdAt": 1758000000
}
```

:::warning The secret is shown exactly once
Store `secret` right away. You need it only if you check the optional [`Corepass-KYB-Signature` header](./webhooks.md#signature-verification).
:::

- The URL must be plain `https://` on a public host, without userinfo or a fragment.
- **Rotate the secret** with `POST /api/v1/kyb/webhook-endpoint/rotate-secret`. The old secret stays valid for 24 hours.
- **Reactivate after quarantine** with `POST /api/v1/kyb/webhook-endpoint/reactivate`. See [Retries](./webhooks.md#retries-ordering-and-recovery).
- Offer endpoints (QR codes) **require** a registered endpoint. Without one they fail immediately with `409 no_webhook_endpoint`, so you find out before a customer is standing at your checkout.

### Top up prepaid credit (data requests only)

Data requests are billed per released field from a prepaid **CHF** balance. Top it up in **Dashboard → KYB → Billing**. Business login, lookups and signature requests are free. See [Pricing & billing](./pricing-billing.md).

## KYC vs. KYB at a glance

KYC v3 and KYB use the same model: entitlements, a registered webhook endpoint, signed RS256 attestations, offers, a 168-hour retention window and the same prepaid CHF credit. The differences:

| KYC v3 | KYB |
| --- | --- |
| Personal OAuth login | Business login: same flow, add `business` to `scope` |
| `sub` = the logged-in person's CoreID | `sub` is still the *acting member's* CoreID. The business's CoreID is `ext.business.id`. |
| One person approves on their phone | Members vote according to the business's governance rule |
| Entitlement `kyc:data-request` | Entitlements `kyb:read`, `kyb:data-request`, `kyb:pii`, `kyb:signature` |
| `/api/v3/kyc/*`, endpoint registered with `PUT /api/v3/kyc/webhook-endpoint` | `/api/v1/kyb/*`, endpoint registered with `PUT /api/v1/kyb/webhook-endpoint` |
| `Corepass-KYC-Signature` header, `typ: kyc-attestation+jwt`, keys at `/.well-known/kyc-jwks.json` | `Corepass-KYB-Signature` header, `typ: kyb-attestation+jwt`, keys at `/.well-known/kyb-jwks.json` |
| Request by CoreID: fixed 24 h. Offer: 30 min by default, 1 h at most. | Data request: fixed 24 h. Signature request: your choice, clamped to 5 min – 24 h. |
| The same API key | The same API key; there's no separate KYB key |
