---
title: Quickstart
sidebar_label: Quickstart
sidebar_position: 2
description: Go from zero to "Login with CorePass" and your first verified KYC field in a handful of steps.
---

This page walks through the shortest path to a working integration. Each step links to the detailed page.

## Prerequisites

1. **The CorePass mobile app** ([Android](https://play.google.com/store/apps/details?id=net.corepass.app) · [iOS](https://apps.apple.com/app/corepass-id/id1644928641)) with an account. The account's address is your **CoreID**. You sign in to the developer dashboard with it, and your end users sign in to your app with theirs.
2. **A KYC-verified CorePass account.** Required to use the developer dashboard. It's a one-time step inside the app. End users also need to have completed KYC in their own CorePass app before they can answer a KYC request from you.
3. **A public HTTPS endpoint** that the Connector can call as your webhook. While developing, a request inspector such as [webhook.site](https://webhook.site/) works.

:::tip No infrastructure, no wallet
You do **not** run any services, fund any wallet or hold any Core Token (CTN). The hosted Connector handles all on-chain settlement for you.
:::

## 1. Set up your application in the dashboard

In the CorePass developer dashboard ([details](./dashboard-setup.md)):

1. Sign in by scanning the QR code with CorePass.
2. Complete personal KYC (**Profile**), if you haven't yet.
3. Choose or create an **organization**.
4. Register your application's **domain** (**Applications**).
5. Create an **OAuth client**. Note the `oauth2ClientID` and `secret`.
6. Generate an **API key** (**ApiKeys**).
7. For KYC: buy a package on **Packages** and copy its **Source key** and **Webhook signing key**.

## 2. Add "Login with CorePass"

Redirect the browser to the authorization endpoint (standard OAuth 2.0 authorization-code flow with PKCE):

```http title="Authorization request"
GET https://auth.corepass.net/oauth2/auth
    ?client_id=<YOUR_CLIENT_ID>
    &redirect_uri=https://app.example.com/login/callback
    &response_type=code
    &scope=openid%20offline%20offline_access
    &state=<random>
    &code_challenge=<S256 PKCE challenge>
    &code_challenge_method=S256
    &audience=https://api.example.com
    &prompt=consent
    &access_type=offline
```

Exchange the returned `code` on your backend:

```bash title="Token exchange"
curl -X POST https://auth.corepass.net/oauth2/token \
  -u "<YOUR_CLIENT_ID>:<YOUR_CLIENT_SECRET>" \
  -d "grant_type=authorization_code" \
  -d "code=<code from redirect>" \
  -d "redirect_uri=https://app.example.com/login/callback" \
  -d "code_verifier=<PKCE verifier>"
```

Verify the JWT against `https://auth.corepass.net/.well-known/jwks.json` and read `sub`. It looks like `coreid:<address>`. Strip the prefix and you have the user's CoreID. [Full guide →](./authentication.md)

## 3. Request verified KYC data

From your backend, with your API key:

```bash title="1 — Is the field verified?"
curl -G "https://auth.corepass.net/api/v1/blockchain/verified" \
  -H "Authorization: <YOUR_API_KEY>" \
  --data-urlencode "user=<USER_COREID>" \
  --data-urlencode "items=EMAIL"
```

```bash title="2 — Create the request and get a QR code / deep link"
curl -X POST https://auth.corepass.net/api/v2/kyc/qrcode \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "<USER_COREID>",
    "sourceKey": "<YOUR_SOURCE_KEY>",
    "callback": "https://api.example.com/corepass/callback",
    "expiration": <unix seconds, 5–15 minutes from now>
  }'
```

Show the returned `qrcode` to desktop users and `link` to mobile users. Your `callback` receives `status.updated` events and, once the user approves, a `data.transferred` event with the data. Verify the `Corepass-Signature` header with the package's webhook signing key and return HTTP `200`. [Full guide →](./kyc/overview.md)

## 4. (Optional) Business identity — KYB

KYB reuses the same OAuth client and API key. You also need **entitlements** granted by CorePass and a registered **webhook endpoint**. [Start here →](./kyb/overview.md)

:::warning Keep secrets on the server
The OAuth client secret, the API key and the KYB webhook secret must never be shipped to a browser or mobile app. All KYC and KYB endpoints are server-to-server.
:::
