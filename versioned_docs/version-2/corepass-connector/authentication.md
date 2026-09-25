---
title: Login with CorePass (OAuth 2.0 / OIDC)
sidebar_label: Login (OAuth 2.0 / OIDC)
sidebar_position: 4
description: Add "Login with CorePass" using the standard OAuth 2.0 authorization-code flow with PKCE, and extract the user's CoreID from the issued JWT.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

CorePass Login is the **standard OAuth 2.0 authorization-code flow with PKCE**, on top of OpenID Connect. Any compliant OAuth 2.0 / OIDC client library works. Users don't need passwords, emails or phone numbers: they scan a QR code with the CorePass app, or tap a button on mobile.

:::info Before you start
You need an OAuth client (`client ID`, `secret`, registered `redirectUris` and `audiences`) from the [dashboard](./dashboard-setup.md#create-oauth-client).
:::

## Flow at a glance

1. Your app redirects the browser to `https://auth.corepass.net/oauth2/auth`.
2. The Connector shows its own CorePass QR login page. The user scans it with the CorePass app and approves. On mobile the page shows a button that opens the app.
3. The browser comes back to your `redirect_uri` with `?code=…&state=…`.
4. Your backend exchanges the `code` for tokens at `/oauth2/token`.
5. You verify the JWT and read the user's **CoreID** from `sub`.

You don't build the QR page yourself. The Connector hosts it at `/oauth2/auth`.

## 1. Discovery

```http title="OIDC discovery"
GET https://auth.corepass.net/.well-known/openid-configuration
GET https://auth.corepass.net/.well-known/jwks.json
```

Fetch the JWKS at startup and cache it. You need it to verify token signatures ([step 4](#4-verify-the-jwt-and-get-the-coreid)).

## 2. Authorization request

Redirect the user's browser to:

```http title="Authorization request"
GET https://auth.corepass.net/oauth2/auth
    ?client_id=<YOUR_CLIENT_ID>
    &redirect_uri=<one of your redirectUris>
    &response_type=code
    &scope=openid%20offline%20offline_access
    &state=<random>
    &code_challenge=<S256 PKCE challenge>
    &code_challenge_method=S256
    &audience=<one of your audiences>
    &prompt=consent
    &access_type=offline
```

| Parameter | Value |
| --- | --- |
| `client_id` | Your `oauth2ClientID`. |
| `redirect_uri` | Must exactly match one of the client's `redirectUris`. |
| `scope` | `openid offline offline_access`. Add `business` for [business login](./kyb/business-login.md). |
| `state` | A random value that you check on the callback (CSRF protection). |
| `code_challenge`, `code_challenge_method` | PKCE, method `S256`. |
| `audience` | One of the client's `audiences`. |
| `prompt`, `access_type` | `consent` and `offline`. |

After the user approves in CorePass, the browser returns to `redirect_uri?code=…&state=…`.

### Browser example

This example uses [AppAuth-JS](https://github.com/openid/AppAuth-JS) (`@openid/appauth`), which handles PKCE for you. Any OIDC client library works the same way.

```ts title="src/auth/corepass.ts"
import {
  AuthorizationNotifier,
  AuthorizationRequest,
  AuthorizationServiceConfiguration,
  BaseTokenRequestHandler,
  FetchRequestor,
  GRANT_TYPE_AUTHORIZATION_CODE,
  RedirectRequestHandler,
  TokenRequest,
} from "@openid/appauth";

const settings = {
  authority: "https://auth.corepass.net",
  audience: "https://api.example.com",
  client_id: "<YOUR_CLIENT_ID>",
  redirect_uri: `${window.location.origin}/login/callback`,
  scope: "openid offline offline_access",
};

const requestor = new FetchRequestor();
const handler = new RedirectRequestHandler();

// 1) Start login: redirects the browser to the CorePass QR page.
export async function login() {
  const config = await AuthorizationServiceConfiguration.fetchFromIssuer(
    settings.authority,
    requestor,
  );
  handler.performAuthorizationRequest(
    config,
    new AuthorizationRequest({
      client_id: settings.client_id,
      redirect_uri: settings.redirect_uri,
      response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
      scope: settings.scope,
      extras: {
        audience: settings.audience,
        prompt: "consent",
        access_type: "offline",
      },
    }),
  );
}

// 2) On /login/callback: finish the flow and exchange the code.
export async function completeLogin(): Promise<string | undefined> {
  const config = await AuthorizationServiceConfiguration.fetchFromIssuer(
    settings.authority,
    requestor,
  );
  const notifier = new AuthorizationNotifier();
  handler.setAuthorizationNotifier(notifier);

  return new Promise((resolve, reject) => {
    notifier.setAuthorizationListener(async (request, response, error) => {
      if (error || !response) return reject(error);
      const tokens = await new BaseTokenRequestHandler(requestor).performTokenRequest(
        config,
        new TokenRequest({
          client_id: settings.client_id,
          redirect_uri: settings.redirect_uri,
          grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
          code: response.code,
          extras: { code_verifier: request.internal?.code_verifier ?? "" },
        }),
      );
      resolve(tokens.accessToken);
    });
    handler.completeAuthorizationRequestIfPossible();
  });
}
```

:::tip Public vs. confidential clients
Browser-only apps exchange the code with PKCE alone, as in the example above. If you have a backend, the recommended approach is to send the `code` (and the PKCE verifier) to your backend and exchange it there with the client secret ([step 3](#3-exchange-the-code-for-tokens)). The secret never reaches the browser.
:::

## 3. Exchange the code for tokens

<Tabs groupId="lang">
<TabItem value="curl" label="cURL" default>

```bash title="Token exchange"
curl -X POST https://auth.corepass.net/oauth2/token \
  -u "<YOUR_CLIENT_ID>:<YOUR_CLIENT_SECRET>" \
  -d "grant_type=authorization_code" \
  -d "code=<code from redirect>" \
  -d "redirect_uri=<same redirect_uri as the authorize step>" \
  -d "code_verifier=<PKCE verifier>"
```

</TabItem>
<TabItem value="node" label="Node.js">

```js title="exchangeCode.js"
// Node.js 18+ (built-in fetch), no extra dependencies.
export async function exchangeCode({ code, redirectUri, codeVerifier }) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  const basic = Buffer.from(
    `${process.env.COREPASS_CLIENT_ID}:${process.env.COREPASS_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch("https://auth.corepass.net/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return res.json(); // { access_token, id_token, refresh_token, expires_in, token_type }
}
```

</TabItem>
</Tabs>

The response is JSON containing `access_token`, `id_token` (a JWT), `refresh_token` (when the `offline_access` scope was granted), `expires_in` and `token_type: bearer`.

## 4. Verify the JWT and get the CoreID

Verify the token signature against the JWKS, then read the `sub` claim. It has the literal form `coreid:<address>`. Strip the prefix and you have the user's **CoreID**.

<Tabs groupId="lang">
<TabItem value="node" label="Node.js" default>

```js title="coreid.js"
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://auth.corepass.net/.well-known/jwks.json"),
);

export async function getCoreId(accessToken) {
  const { payload } = await jwtVerify(accessToken, JWKS, {
    issuer: "https://auth.corepass.net",
  });
  // payload.sub === "coreid:ab44ba435432d4099657b36bd1d8f41a78002f755146"
  return payload.sub.replace(/^coreid:/, "");
}
```

</TabItem>
<TabItem value="curl" label="cURL (userinfo)">

```bash title="OIDC userinfo"
curl https://auth.corepass.net/userinfo \
  -H "Authorization: Bearer <access_token>"
```

</TabItem>
</Tabs>

:::info Verify the issuer
Check the `iss` claim against the `issuer` value from the discovery document (`/.well-known/openid-configuration`) rather than a hard-coded string.
:::

Store the CoreID as the user's stable identifier. It is also the `user` value in every [KYC request](./kyc/overview.md).

## Sign-up vs. login

With CorePass, sign-up and login are the same operation. The first successful login for a CoreID you haven't seen before is a sign-up. If you want a separate "Sign up" page with more information for new users, point its button at the same login flow.

Users who don't have CorePass yet need to install the app ([Android](https://play.google.com/store/apps/details?id=net.corepass.app) · [iOS](https://apps.apple.com/app/corepass-id/id1644928641)) and create an account first.
