---
title: Business lookups
sidebar_label: Business lookups
sidebar_position: 3
description: Read a business's verification status, governance rules and member roster — free, and available to every organization.
---

Three read-only lookups let you check a counterparty before you request anything, or show a business's governance rules and members in your own UI. They require only `kyb:read`, which [every organization has](./overview.md#entitlements), and they are free.

These lookups aren't limited to businesses your organization already works with. They are meant for counterparty checks, for example before you extend credit to a supplier you've never dealt with.

## Status

`GET /api/v1/kyb/status/{walletAddress}`

```bash title="Request"
curl https://api.corepass.net/api/v1/kyb/status/ab998877… \
  -H "Authorization: <YOUR_API_KEY>"
```

```json title="Response"
{
  "walletAddress": "ab998877…",
  "verified": true,
  "status": "VERIFIED",
  "businessName": "Acme Robotics GmbH",
  "domainName": "acme.corepass",
  "registeredAt": 1735689600,
  "domainExpiresAt": 1767225600
}
```

## Verification details and governance rules

`GET /api/v1/kyb/verify/{walletAddress}`

Returns everything from `status`, plus `profilePictureUrl`, `teamMemberCount` and `governanceRules`:

```bash title="Request"
curl https://api.corepass.net/api/v1/kyb/verify/ab998877… \
  -H "Authorization: <YOUR_API_KEY>"
```

```json title="Response (excerpt)"
{
  "governanceRules": [
    { "category": "data_requests", "approvalMode": "MAJORITY" },
    { "category": "signature_requests", "approvalMode": "UNANIMOUS" }
  ]
}
```

## Members

`GET /api/v1/kyb/members/{walletAddress}`

```bash title="Request"
curl https://api.corepass.net/api/v1/kyb/members/ab998877… \
  -H "Authorization: <YOUR_API_KEY>"
```

```json title="Response"
{
  "walletAddress": "ab998877…",
  "businessName": "Acme Robotics GmbH",
  "totalMembers": 3,
  "members": [
    { "memberName": "Jana Novak", "walletAddress": "ab123456…", "cnsDomain": "jana.acme.corepass", "hasVotingRights": true, "votingWeight": 3, "isCreator": true },
    { "memberName": "Tomas Brik", "walletAddress": "ab654321…", "cnsDomain": null, "hasVotingRights": true, "votingWeight": 1, "isCreator": false }
  ]
}
```

Each member's own CoreID is `members[].walletAddress`.
