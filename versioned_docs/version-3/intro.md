---
title: Introduction
sidebar_position: 1
description: CorePass developer documentation — log users and businesses in with CorePass, request verified identity data, and integrate the CorePass and Payto URI protocols.
---

CorePass gives people and businesses full control over their digital identity. Users keep their verified data in the CorePass app and decide what to share, with whom and when.

## Getting started

Get started by **downloading CorePass for Android or iOS**:

- [Download for Android](https://play.google.com/store/apps/details?id=net.corepass.app)
- [Download for iOS](https://apps.apple.com/app/corepass-id/id1644928641)

## Integrate CorePass into your application

**CorePass Connector** is the hosted service that connects your application to CorePass. You don't need any infrastructure or blockchain wallet.

| I want to… | Read |
| --- | --- |
| Understand what the Connector does | [What is CorePass Connector?](./corepass-connector/what-is-connector.md) |
| Get a working integration fast | [Quickstart](./corepass-connector/quickstart.md) |
| Set up my app, OAuth client and API key | [Dashboard setup](./corepass-connector/dashboard-setup.md) |
| Add "Login with CorePass" | [Login (OAuth 2.0 / OIDC)](./corepass-connector/authentication.md) |
| Request verified personal data (KYC) | [KYC overview](./corepass-connector/kyc/overview.md) |
| Verify businesses, request company data or signatures (KYB) | [KYB overview](./corepass-connector/kyb/overview.md) |
| Look up an endpoint | [API reference](./corepass-connector/api-reference.md) |
| Migrate from the self-hosted Connector | [Environments & migration](./corepass-connector/deployment-info.md#migrating-from-the-self-hosted-connector) |

## Protocols

- [CorePass Protocol](./corepass-protocol/corepass-protocol.md): the `corepass:` URI scheme for data transfer, login and other actions in the CorePass app.
- [Payto Protocol](./payto-protocol/payto-protocol.md): the `payto:` URI scheme for payment requests.
