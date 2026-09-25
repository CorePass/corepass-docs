---
title: What is CorePass Connector?
sidebar_label: Overview
sidebar_position: 1
description: CorePass Connector is the hosted service that lets your application log users and businesses in with CorePass and request verified identity data.
---

**CorePass Connector** is the gateway between your application and the CorePass identity ecosystem. It is a **hosted service**: you do not deploy or operate any infrastructure, and you do not need to hold a Core wallet or Core Token (CTN). You register your application in the CorePass developer dashboard and call the public API.

## What you can build

| Capability | What it does | Where to start |
| --- | --- | --- |
| **CorePass Login** | Users sign in by scanning a QR code with the CorePass app. Standard OAuth 2.0 / OpenID Connect; you receive a JWT whose `sub` claim is the user's **CoreID** (their blockchain address). | [Login (OAuth 2.0 / OIDC)](./authentication.md) |
| **KYC — personal identity** | Once a user is logged in, request specific verified fields (name, date of birth, document number, address, email, …). The user approves on their phone and the data is delivered to your webhook. | [KYC overview](./kyc/overview.md) |
| **KYB — business identity** | Log in as a *business*, request verified company / director / UBO data as a signed attestation, and ask a business to sign a message or typed-data document. | [KYB overview](./kyb/overview.md) |

## How it fits together

```text
┌───────────────┐   OAuth 2.0 / OIDC    ┌─────────────────────┐   QR / deep link   ┌───────────────┐
│ Your app      │ ────────────────────▶ │ CorePass Connector  │ ◀────────────────▶ │ CorePass app  │
│ (frontend and │ ◀──── JWT (CoreID) ── │ auth.corepass.net   │   approve / sign   │ (user phone)  │
│  backend)     │                       │                     │                    └───────────────┘
│               │ ── API key: KYC/KYB ▶ │                     │
│               │ ◀── signed webhooks ─ │                     │ ── settlement ──▶ Core Blockchain
└───────────────┘                       └─────────────────────┘
```

- **Browser-facing:** the OAuth 2.0 endpoints (`/oauth2/auth`, `/oauth2/token`, `/userinfo`, discovery and JWKS). The Connector serves the QR login page itself.
- **Server-to-server:** the KYC (`/api/v1/blockchain/*`, `/api/v2/kyc/*`) and KYB (`/api/v1/kyb/*`) endpoints, authenticated with your **API key**. Never call these from a browser.
- **Webhooks:** the Connector calls your HTTPS endpoints with status updates and delivered data.

## Integration journey

1. [Quickstart](./quickstart.md) — the whole integration in one page.
2. [Dashboard setup](./dashboard-setup.md) — register your domain, create an OAuth client and an API key.
3. [Login](./authentication.md) — add "Login with CorePass" and obtain the user's CoreID.
4. [KYC](./kyc/overview.md) and/or [KYB](./kyb/overview.md) — request verified data.
5. [API reference](./api-reference.md) — every endpoint, header and response shape in one place.
6. [Environments & migration](./deployment-info.md) — hosts, and what changed if you used the former self-hosted Connector.

:::info Previously self-hosted
CorePass Connector (previously "CorePass Hydra") used to be a bundle of services that you deployed yourself (PostgreSQL, NATS, Redis, a funded Core wallet, …). That model has been replaced by the hosted service described here. See [Environments & migration](./deployment-info.md#migrating-from-the-self-hosted-connector) for a mapping of old concepts to new ones.
:::
