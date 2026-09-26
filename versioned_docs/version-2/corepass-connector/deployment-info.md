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
| Auth and KYC API | `https://auth.corepass.net` | OAuth 2.0 / OIDC, login JWKS, KYC endpoints. |
| KYB merchant API | `https://api.corepass.net` | KYB endpoints and `/.well-known/kyb-jwks.json`. |
| Developer dashboard | Provided by your CorePass contact | One-time setup: organization, domains, OAuth clients, API keys, KYC packages, KYB billing, webhook history. |

:::tip Separate your environments
Register one domain per environment in the [dashboard](./dashboard-setup.md#register-domain), for example `dev.example.com`, `staging.example.com` and `app.example.com`. Give each its own OAuth client, `redirectUris` and API key, so credentials never cross environments.
:::

## Requirements for your side

| What | Why |
| --- | --- |
| Public HTTPS endpoint(s) | The KYC `callback` URL and the KYB webhook endpoint. Plain `https://` on a public host (for KYB, redirects are not followed). |
| A server-side component | Holds the client secret and API key, and calls the KYC/KYB APIs. |
| Durable storage | Store KYC `(field, data, pepper)` triples and KYB `event_id`s for deduplication. |

## Migrating from the self-hosted Connector {#migrating-from-the-self-hosted-connector}

Earlier versions of these docs described a self-hosted Connector: Helm charts, PostgreSQL, NATS, Redis, Ory Hydra and a funded Core wallet. That model has been **replaced**. If you're migrating, use this mapping:

| Self-hosted | Hosted Connector |
| --- | --- |
| Run your own services (gateway, login, KYC, blockchain, callback) | Use the hosted Connector at `https://auth.corepass.net`. |
| Fund a Core wallet with CTN and pay per KYC on-chain | Buy a prepaid bundle on the dashboard's **Packages** page (KYC). Top up CHF credit (KYB). |
| Configure environment variables (`POSTGRES_URL`, `NATS_URL`, `HYDRA_*`, `NATS_CALLBACK_TOPICS`, …) | Configure your integration in the dashboard (OAuth client, API key, packages). CorePass manages retry intervals. |
| Your own Hydra issuer URL | The shared issuer at `https://auth.corepass.net`. |
| Self-hosted login page + `static/js/login.js` snippet | Any standard OAuth 2.0 / OIDC client. The Connector hosts the QR login page at `/oauth2/auth`. |
| Statuses such as `ACCEPTED`, `VALIDITY_CHECK`, `FINISH_SUCCESS` | `PENDING`, `INITIATING`, `INITIATED`, `CONFIRMING`, `CONFIRMED`, `FAILED`. See [KYC status values](./kyc/statuses.md). |
| Field names such as `SH_IDCard_DOB`, `SH_EMAIL` | New names such as `IDCARD_DOB`, `EMAIL`. See [KYC fields](./kyc/fields.md). |
| `POST /api/v1/blockchain/verified` (JSON body) | `GET /api/v1/blockchain/verified?user=…&items=…`, plus the `Authorization` API-key header. |
| `POST /api/v1/kyc/qrcode` | `POST /api/v2/kyc/qrcode`, plus the required `sourceKey` field and the `Authorization` API-key header. The response adds `referenceKey`. |
| `POST /api/v1/kyc/status`, `POST /api/v1/kyc/all-statuses` (user + items) | `GET /api/v2/kyc/status?referenceKey=…`, `GET /api/v2/kyc/all-statuses?referenceKey=…` |
| `POST /api/v1/blockchain/valid` with `{fieldID, fieldValue, pepper}` | Same path, with the `Authorization` API-key header and `infos` entries `{field, data, pepper}` (pepper hex-encoded). The response lists `valids` / `unValids`. |
| Callback body `{user, infos:[{fieldID, fieldValue, pepper}], deadline, signature}` (multipart), plus a separate `statusCallback` | JSON envelopes `status.updated` and `data.transferred`, both sent to `callback`. `data.infos` is Base64-encoded JSON. See [KYC webhooks](./kyc/webhooks.md). |
| Callback signature: SHA3 hash + secp256k1 `Ecrecover` | `Corepass-Signature: t=<unix>,s=<hex>` header: HMAC-SHA256 over `<t>.<raw body>`, keyed with the package's webhook signing key, ±5 minutes. |

:::info Documentation for the self-hosted Connector
The previous self-hosted documentation is still available in the versioned docs (**CP v. 1** in the version menu).
:::
