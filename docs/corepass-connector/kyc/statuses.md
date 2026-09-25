---
title: KYC status values
sidebar_label: Status values
sidebar_position: 5
description: Lifecycle statuses of a KYC order, as returned by the status endpoints and delivered in status.updated webhooks.
---

A KYC order moves through these statuses. The [status endpoints](./api.md#poll-the-latest-status) return them in upper case. [`status.updated` webhooks](./webhooks.md#status-update) carry the same values in lower case.

| Status | Meaning |
| --- | --- |
| `PENDING` | The QR code / link was created. The user hasn't accepted the request yet. |
| `INITIATING` | The user accepted the request in CorePass. The on-chain *initiate* transaction is being submitted. |
| `INITIATED` | The initiate transaction succeeded. The user's app is sending the data. |
| `CONFIRMING` | The Connector received and checked the data, and the on-chain *confirm* transaction (which settles the payment to the user) is being submitted. The `data.transferred` webhook is sent at this point. |
| `CONFIRMED` | The confirm transaction succeeded. The order is complete. |
| `FAILED` | The order failed. See `failureReason`. |

```text
PENDING ──▶ INITIATING ──▶ INITIATED ──▶ CONFIRMING ──▶ CONFIRMED
                 │               │              │
                 └───────────────┴──────────────┴──▶ FAILED
```

## Failure reasons

When the status is `FAILED`, the status endpoints return one of these in `failureReason`:

| `failureReason` | Meaning |
| --- | --- |
| `INVALID_CONFIRM_DATA` | The data received from the user's app didn't match what is recorded on-chain. |
| `FAILED_TO_MINED` | An on-chain transaction for the order failed. |
| `PENDING_FOR_LONG_TIME` | The order stayed in a pending state for too long. |
| `UNKNOWN` | Any other failure. |

:::tip
Base your business logic on the `data.transferred` webhook and on the terminal statuses `CONFIRMED` / `FAILED`. Use the intermediate statuses for progress indicators and troubleshooting.
:::
