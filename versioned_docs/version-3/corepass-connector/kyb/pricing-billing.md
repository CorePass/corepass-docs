---
title: KYB pricing & billing
sidebar_label: Pricing & billing
sidebar_position: 9
description: How KYB data requests are priced per disclosed field, how credit is reserved and charged, and how to read your balance.
---

**Only data requests cost money.** Business login, business lookups and signature requests are free.

## How it works

Data requests draw on a **prepaid CHF credit balance** per organization. Top it up in **Dashboard → KYB → Billing**. There's no payment step per request and no invoice per call.

1. **Quote (optional).** [`POST /api/v1/kyb/data-requests/quote`](./data-requests.md#quote-a-price-before-you-commit) shows the price without reserving anything.
2. **Reserve.** Creating a request **reserves** the full quoted amount right away. It appears as `price` on the request and on the `pending_approval` [event](./webhooks.md#pricing-fields).
3. **Charge.** When the data is released, you are **charged only for the fields that were actually released**. The charge appears as `charge` on the `released` event. A field the business doesn't have, a field your entitlement doesn't cover, or a field CorePass can't answer yet costs nothing.

If your balance can't cover a request, it is refused up front with `402 insufficient_credit`, before anyone is asked to vote.

## Pricing per field

Each field belongs to a pricing **tier**. The current tiers and prices are available from the API:

```bash title="Field vocabulary, PII flags and tiers"
curl https://api.corepass.net/api/v1/kyb/pricing \
  -H "Authorization: <YOUR_API_KEY>"
```

A price line looks like `{"field": "BUSINESS_LEGAL_NAME", "tier": "A", "cents": 100}`. All amounts are in CHF cents.

## Balance and charges

```bash title="Balance"
curl https://api.corepass.net/api/v1/kyb/billing/account \
  -H "Authorization: <YOUR_API_KEY>"
```

```json title="Response"
{
  "currency": "CHF",
  "totalChf": 500.00,
  "spentChf": 120.50,
  "frozenChf": 15.00,
  "availableChf": 364.50,
  "billingEnabled": true
}
```

```bash title="Charge history"
curl https://api.corepass.net/api/v1/kyb/billing/charges \
  -H "Authorization: <YOUR_API_KEY>"
```

:::warning Use `availableChf`
Base your decisions on **`availableChf`**, not `totalChf - spentChf`. That calculation ignores `frozenChf`, the amount reserved by requests that are still waiting for a vote.
:::

## Insufficient credit

A `402 insufficient_credit` or `402 no_credit_account` response includes the shortfall:

```json
{ "success": false, "error": { "code": 402, "reason": "insufficient_credit", "requiredChf": 4.20, "availableChf": 1.10 } }
```
