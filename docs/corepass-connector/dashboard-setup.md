---
title: Dashboard setup
sidebar_label: Dashboard setup
sidebar_position: 3
description: One-time onboarding in the CorePass developer dashboard — sign in, KYC, organization, domain, OAuth client, API key, Source Key and webhook history.
---

All configuration happens once, in the **CorePass developer dashboard**. After that your application talks only to the public API at `https://auth.corepass.net`.

:::info Dashboard address
Your CorePass contact provides the developer dashboard URL together with your onboarding.
:::

## 1. Sign in

There is **no email/password sign-up**. The dashboard's login page shows a QR code. Scan it with the CorePass app to sign in. On a mobile browser, tap **Login with CorePass** instead.

## 2. Complete personal KYC

Open **Profile**. If your CoreID is not KYC-verified yet, the page shows a **Kyc Your Data** button. Click it and scan the QR code with CorePass. Finish the identity verification in the app, then return to the dashboard. Profile now lists your verified fields.

You only do this once per CoreID.

## 3. Choose or create an organization

Every dashboard action belongs to one **organization**. Pick an organization in the switcher in the header, or create a new one. The organization UUID is also what you give CorePass when you request [KYB entitlements](./kyb/overview.md#entitlements).

## 4. Register your application's domain {#register-domain}

Open **Applications → Create** and enter the domain that hosts your app, e.g. `app.example.com`. The dashboard checks that the domain is reachable, then registers it. Each registered domain gets a **client domain** ID that you select when creating an OAuth client and an API key.

:::tip One domain per environment
You can register several domains per organization, for example `dev.example.com`, `staging.example.com` and `app.example.com`, each with its own OAuth client and API key.
:::

## 5. Create an OAuth client {#create-oauth-client}

Open **OAuth → Create**:

| Field | Description |
| --- | --- |
| `clientName` | Human-readable name shown to users on the consent screen. |
| `audiences` | Audience URIs the issued tokens are valid for. This is usually your API origin, e.g. `["https://api.example.com"]`. |
| `redirectUris` | Allow-list of OAuth callback URLs in your app. At runtime `redirect_uri` must match one of them **exactly**. |
| `clientDomainUUID` | One of the domains registered in step 4. |

The response contains:

- `oauth2ClientID`: your **client ID**.
- `secret`: your **client secret**. It is **shown only once**, so store it securely.
- `scope`, `grantTypes`, `responseTypes`, `tokenEndpointAuthMethod`: the defaults, for reference.

You can edit `audiences` and `redirectUris` later.

## 6. Generate an API key {#generate-api-key}

Open **ApiKeys → Create** and select the same client domain. The returned `token` is your **API key**. It authenticates every server-to-server KYC and KYB call:

```http
Authorization: <YOUR_API_KEY>
```

:::warning
The API key is sent **as-is**, with **no** `Bearer ` prefix. It is not the user's OAuth access token. Treat it like a password. To rotate it, create a new key, deploy it, then delete the old one.
:::

## 7. Buy a KYC package: Source Key and webhook signing key {#source-key}

KYC orders are created against a **package**. Open **Packages**, choose a package and complete the purchase. A package either has a fixed set of KYC fields that you select when buying it, or lets you name the fields on each request ([Choosing fields](./kyc/overview.md#choosing-fields)).

Each package shows two credentials:

| Credential | Used for |
| --- | --- |
| **Source key** | An opaque string that identifies the package. Send it unchanged as `sourceKey` in every [`POST /api/v2/kyc/qrcode`](./kyc/api.md#generate-a-kyc-qr-code) call. |
| **Webhook signing key** | The HMAC key that signs the `Corepass-Signature` header of every KYC webhook for orders created with this package. See [Verifying the signature](./kyc/webhooks.md#verifying-the-signature). |

:::warning
Both values are credentials. Keep them on your server. If you use several packages, keep a signing key per Source Key.
:::

:::note
KYB does **not** use Source Keys or packages. Access is controlled by entitlements and billed from a prepaid credit balance. See [KYB overview](./kyb/overview.md).
:::

## 8. Inspect webhook deliveries {#webhook-history}

The **Webhook** page shows every webhook call the Connector made to your KYC callback URLs, with status codes, response bodies and timestamps. Check it first when you debug callback handling. KYC callback URLs are not configured here: you pass them per request in `callback`.
