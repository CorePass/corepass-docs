---
title: Business login
sidebar_label: Business login
sidebar_position: 2
description: Let a business sign in to your app with CorePass — the same OAuth flow as personal login, plus the business scope and extra token claims.
---

Business login uses **exactly the same OAuth 2.0 / OIDC flow** as [personal login](../authentication.md): discovery, `/oauth2/auth`, PKCE, `/oauth2/token`, JWKS verification. The only change is **one extra scope value**, `business`:

```http title="Authorization request with the business scope"
GET https://auth.corepass.net/oauth2/auth
    ?client_id=<YOUR_CLIENT_ID>
    &redirect_uri=<one of your redirectUris>
    &response_type=code
    &scope=openid%20offline%20offline_access%20business
    &state=<random>
    &code_challenge=<S256 PKCE challenge>
    &code_challenge_method=S256
    &audience=<one of your audiences>
    &prompt=consent
    &access_type=offline
```

Nothing else changes on your side. You still don't render the QR page, and you exchange the code and verify the JWT the same way.

## What happens in CorePass

The phone shows a **business-login** deep link instead of a personal one. A member scans it and approves. Depending on the business's `signature_requests` [governance rule](./overview.md#governance), other members may have to approve too before the login completes. The minimum is `MAJORITY`, and a business can require `UNANIMOUS`.

If the approval never completes, the login times out like any QR code that nobody scans. There's no separate error state to handle.

## What's in the token

`sub` is **unchanged**: it is still `coreid:<address>`, and the address belongs to the **member who acted**, not to the business. The business identity and the acting member's details arrive as extra claims under `ext`:

```json title="Business login token claims (excerpt)"
{
  "sub": "coreid:ab1234567890abcdef1234567890abcdef123456",
  "scp": ["openid", "offline", "offline_access", "business"],
  "ext": {
    "login_type": "business",
    "business": {
      "id": "ab9988776655443322119900aabbccddeeff0011",
      "name": "Acme Robotics GmbH",
      "domain": "acme.corepass",
      "verified": true,
      "status": "ACTIVE"
    },
    "acting_member": {
      "id": "ab1234567890abcdef1234567890abcdef123456",
      "name": "Jana Novak",
      "authority": "CREATOR",
      "voting_rights": true,
      "voting_weight": 3,
      "is_creator": true
    },
    "approved_at": 1758000000
  }
}
```

| You need | Read |
| --- | --- |
| The business's own CoreID / wallet address | `ext.business.id` |
| The acting member's CoreID | `ext.acting_member.id` (equals `sub` without the `coreid:` prefix) |
| When the login was approved | `ext.approved_at` |

- Verify the token exactly as for personal login (JWKS signature, issuer, expiry). Only the claims differ. `/userinfo` returns the same claims if you'd rather not decode the token yourself.

:::warning No business claims means no business login
If you requested the `business` scope but the `ext.business` claims are missing, treat it as **no business context approved**. Don't assume a partial or downgraded grant. There's no partial-success state.
:::
