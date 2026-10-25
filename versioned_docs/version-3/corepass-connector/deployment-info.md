---
title: Environments & migration
sidebar_label: Environments & migration
sidebar_position: 8
description: Hosts to use for CorePass Connector, per-environment setup, and how concepts from the former self-hosted Connector map to the hosted service.
---

CorePass Connector is a **hosted service**. You don't deploy, configure or operate any Connector components.

## Hosts

| Surface | Host | Used for |
| --- | --- | --- |
| Auth | `https://auth.corepass.net` | OAuth 2.0 / OIDC and the login JWKS. |
| KYC and KYB merchant API | `https://api.corepass.net` | KYC v3 (`/api/v3/kyc/*`, `/.well-known/kyc-jwks.json`) and KYB (`/api/v1/kyb/*`, `/.well-known/kyb-jwks.json`). |
| Developer dashboard | Provided by your CorePass contact | One-time setup: organization, domains, OAuth clients, API keys, KYC and KYB requests, billing, webhook delivery logs. |

:::tip Separate your environments
Register one domain per environment in the [dashboard](./dashboard-setup.md#register-domain), for example `dev.example.com`, `staging.example.com` and `app.example.com`. Give each its own OAuth client, `redirectUris` and API key, so credentials never cross environments.
:::

## Requirements for your side

| What | Why |
| --- | --- |
| Public HTTPS endpoint(s) | The registered KYC and KYB webhook endpoints. Plain `https://` on a public host; redirects are not followed. |
| A server-side component | Holds the client secret and API key, and calls the KYC/KYB APIs. |
| Durable storage | Store released KYC and KYB values and the `event_id`s you use for deduplication. |

## Migrating from the self-hosted Connector {#migrating-from-the-self-hosted-connector}

Earlier versions of these docs described a self-hosted Connector: Helm charts, PostgreSQL, NATS, Redis, Ory Hydra and a funded Core wallet. That model has been **replaced**. If you're migrating, use this mapping:

| Self-hosted | Hosted Connector |
| --- | --- |
| Run your own services (gateway, login, KYC, blockchain, callback) | Use the hosted Connector at `https://auth.corepass.net`. |
| Fund a Core wallet with CTN and pay per KYC on-chain | Top up prepaid CHF credit in the dashboard. KYC and KYB share it. |
| Configure environment variables (`POSTGRES_URL`, `NATS_URL`, `HYDRA_*`, `NATS_CALLBACK_TOPICS`, …) | Configure your integration in the dashboard (OAuth client, API key) and register webhook endpoints by API. CorePass manages retry intervals. |
| Your own Hydra issuer URL | The shared issuer at `https://auth.corepass.net`. |
| Self-hosted login page + `static/js/login.js` snippet | Any standard OAuth 2.0 / OIDC client. The Connector hosts the QR login page at `/oauth2/auth`. |
| Statuses such as `ACCEPTED`, `VALIDITY_CHECK`, `FINISH_SUCCESS` | `PENDING_APPROVAL`, `RELEASED`, `DECLINED`, `CANCELLED`, `EXPIRED`, `FAILED`. See [KYC statuses](./kyc/statuses.md). |
| Field names such as `SH_IDCard_DOB`, `SH_EMAIL` | New names such as `IDCARD_DOB`, `EMAIL`. See [KYC fields](./kyc/fields.md). |
| `POST /api/v1/blockchain/verified` (JSON body) | `GET /api/v1/blockchain/verified?user=…&items=…`, plus the `Authorization` API-key header. |
| `POST /api/v1/kyc/qrcode` | `POST /api/v3/kyc/data-requests/offers` (QR code) or `POST /api/v3/kyc/data-requests` (by CoreID). See [KYC API](./kyc/api.md). |
| `POST /api/v1/kyc/status`, `POST /api/v1/kyc/all-statuses` (user + items) | `GET /api/v3/kyc/data-requests/{requestId}` and `…/events`. |
| `POST /api/v1/blockchain/valid` with `{fieldID, fieldValue, pepper}` | Retired. The signed attestation is the proof; see [Migrating from KYC v2](./kyc/migration-from-v2.md). |
| Callback body `{user, infos:[{fieldID, fieldValue, pepper}], deadline, signature}` (multipart), plus a separate `statusCallback` | `kyc.data_request.*` envelopes delivered to your registered endpoint; values arrive in a signed attestation JWT. See [KYC webhooks](./kyc/webhooks.md). |
| Callback signature: SHA3 hash + secp256k1 `Ecrecover` | RS256 attestation JWT verified against `/.well-known/kyc-jwks.json`, plus an optional `Corepass-KYC-Signature` HMAC header. See [Verifying attestations](./kyc/verifying-attestations.md). |

:::info Documentation for the self-hosted Connector
The previous self-hosted documentation is still available in the versioned docs (**CP v. 1** in the version menu).
:::
