---
title: KYC overview
sidebar_label: Overview
sidebar_position: 1
description: How KYC transfer works — request verified personal data from a logged-in CorePass user and receive it on your webhook.
---

**KYC transfer** lets your application request specific **verified** identity fields from a CorePass user, such as their name, date of birth, a document number, their address or email. The user approves the request in the CorePass app, and the Connector delivers the data to your webhook.

The Connector handles all blockchain interaction and settlement for you. You don't need a wallet or Core Token.

## Requirements

- The user is **logged in** to your app, so you know their CoreID ([Login](../authentication.md)).
- The user has **completed KYC** in their CorePass app for the fields you need.
- You have an **API key** and a **package** from the [dashboard](../dashboard-setup.md). The package gives you a **Source Key** and a **webhook signing key**.
- You have a public HTTPS endpoint for the `callback` webhooks.

:::warning Server-to-server only
Every KYC endpoint is authenticated with your raw API key in the `Authorization` header, without a `Bearer ` prefix. It is **not** the user's OAuth access token. Never call these endpoints from a browser or mobile app.
:::

## The flow

1. **Check** that the user has the fields you need verified: [`GET /api/v1/blockchain/verified`](./api.md#check-which-fields-are-verified).
2. **Create** the order: [`POST /api/v2/kyc/qrcode`](./api.md#generate-a-kyc-qr-code) returns a QR code (desktop), a deep link (mobile) and a `referenceKey`. Show the QR code or link to the user.
3. The user **scans and accepts** the request in CorePass. Each status change is POSTed to your `callback` as a `status.updated` event.
4. The Connector checks the data, then POSTs it to your `callback` as a `data.transferred` event ([Webhooks](./webhooks.md)) and settles on-chain. Verify the signature and return `200`.
5. Optionally, **poll** the order's status with the `referenceKey`: [`/api/v2/kyc/status`](./api.md#poll-the-latest-status) and [`/api/v2/kyc/all-statuses`](./api.md#fetch-the-full-status-history).
6. Later, **re-validate** data you stored before relying on it: [`POST /api/v1/blockchain/valid`](./api.md#check-that-stored-data-is-still-valid).

[![KYC transfer sequence: your backend, CorePass Connector, Core Blockchain and the CorePass app](/img/docs/corepass-flow.png)](/img/docs/corepass-flow.png)

*Conceptual sequence of a KYC transfer between your backend, the Connector, Core Blockchain and the user's CorePass app. The current status names are listed in [Status values](./statuses.md).*

## Choosing fields {#choosing-fields}

Field names such as `IDCARD_DOB`, `PASSPORT_DOCUMENT_NUMBER`, `ADDRESS_CITY` or `EMAIL` are listed in [KYC fields](./fields.md). How you choose them depends on the package:

| Package | Fields |
| --- | --- |
| **Fixed field set** | You select the fields when you buy the package. Every order created with its Source Key requests exactly those fields. Don't send `fields` in the request. |
| **Pay per request** | The package has no fixed fields. Name them on each request in `fields` (required) and `optionalFields` (the user may decline these). |

:::tip Don't care which document?
Use a **parent field** to accept a value from whichever document the user has verified. For example `DOB_PARENT_FIELD` accepts any one of `IDCARD_DOB`, `PASSPORT_DOB`, `DRIVER_LICENSE_DOB` or `RESIDENCE_PERMIT_DOB`. See [Parent fields](./fields.md#parent-fields).
:::

## Timing

The QR code / link `expiration` must be **5–15 minutes** in the future. That's how long the user has to accept.

## Storing results

Each delivered field comes as a `(field, data, pepper)` triple. **Persist all three.** The `pepper` is as sensitive as the value itself, and you need both to [re-validate](./api.md#check-that-stored-data-is-still-valid) the data later. Every order costs you, so store what you receive.
