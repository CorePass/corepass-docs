---
title: KYC API
sidebar_label: KYC API
sidebar_position: 2
description: Endpoints to check verified fields, create a KYC request (QR code / deep link), poll its status and re-validate stored data.
---

All endpoints are on `https://auth.corepass.net` and require your API key:

```http
Authorization: <YOUR_API_KEY>
```

Successful responses use a standard envelope:

```json
{ "data": { }, "message": "…", "success": true }
```

Errors use the same HTTP status code in the body:

```json
{ "success": false, "error": { "code": 422, "message": "there is already an ongoing request" } }
```

## Check which fields are verified

`GET /api/v1/blockchain/verified`

Pass the user's CoreID and the fields as query parameters. Repeat `items` once per field.

```bash title="Request"
curl -G "https://auth.corepass.net/api/v1/blockchain/verified" \
  -H "Authorization: <YOUR_API_KEY>" \
  --data-urlencode "user=ab22b1671b4f7ccc0b16a87514adde84513b6348232e" \
  --data-urlencode "items=IDCARD_DOB" \
  --data-urlencode "items=DRIVER_LICENSE_DOCUMENT_NUMBER" \
  --data-urlencode "items=EMAIL"
```

```json title="Response"
{
  "data": {
    "verifiedItems": ["EMAIL"],
    "unVerifiedItems": ["IDCARD_DOB", "DRIVER_LICENSE_DOCUMENT_NUMBER"]
  },
  "message": "Items were successfully checked.",
  "success": true
}
```

Either list is omitted when it is empty. If a field you need is in `unVerifiedItems`, ask the user to complete that verification in the CorePass app first. Otherwise the next call fails with `422 unverified fields`.

## Generate a KYC QR code

`POST /api/v2/kyc/qrcode`

Creates the data-transfer order and returns a QR code and a deep link for the user.

```bash title="Request"
curl -X POST https://auth.corepass.net/api/v2/kyc/qrcode \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "ab72a31c718d343b45e558099ec503087f734433785d",
    "sourceKey": "<YOUR_SOURCE_KEY>",
    "callback": "https://api.example.com/corepass/callback",
    "expiration": 1748000000
  }'
```

| Field | Required | Description |
| --- | :---: | --- |
| `user` | yes | The user's CoreID (hex, from the JWT `sub` claim without the `coreid:` prefix). |
| `sourceKey` | yes | The Source Key of one of your packages, from the dashboard's **Packages** page. It identifies your client, the package to bill, and the webhook signing key. |
| `callback` | yes | HTTPS URL that receives **all** webhooks for this order: status updates and the delivered data. See [Webhooks](./webhooks.md). |
| `expiration` | yes | Unix time in **seconds**, **5–15 minutes** in the future. This is how long the user has to accept. Any other value returns `400`. |
| `fields` | no | The fields to request. Only for packages without a fixed field set; see [Choosing fields](./overview.md#choosing-fields). |
| `optionalFields` | no | Fields the user may choose to share or not. Same rule as `fields`. |
| `statusCallback` | no | Accepted for compatibility. Status updates are delivered to `callback`. |
| `withoutQRCode` | no | Accepted for compatibility. |

```json title="Response"
{
  "data": {
    "qrcode": "<BASE64 PNG>",
    "link": "<deep link for a mobile button>",
    "expiration": 1748000000,
    "referenceKey": "<REFERENCE_KEY>"
  },
  "message": "QRCode has been successfully generated",
  "success": true
}
```

Show `qrcode` to desktop users and `link` to mobile users:

```html title="Rendering the request"
<!-- Desktop: scan with the CorePass app -->
<img alt="Scan with CorePass" src="data:image/png;base64,{{qrcode}}" />

<!-- Mobile: open the CorePass app directly -->
<a class="button" href="{{link}}">Share with CorePass</a>
```

:::info Save the `referenceKey`
You need it to query the order's status. It is derived from the Source Key, the user and the requested fields, so the same request always gets the same `referenceKey`.
:::

**Repeated calls.** If you call again with the same user, Source Key and fields while the order is still `PENDING`, you get a fresh QR code for the same order with `"alreadySent": true`. While the order is being processed (`INITIATING`, `INITIATED` or `CONFIRMING`), the call fails with `422`.

**Errors**

| Status | `error.message` | Cause |
| --- | --- | --- |
| `400` | `Invalid Request: …` | A required field is missing or malformed. |
| `400` | `expiration time is not in valid range` | `expiration` is not Unix seconds 5–15 minutes in the future. |
| `400` | `no fields provided` | Neither the package nor the request names any fields. |
| `400` | `user fields (…) are invalid fields` | A name in `fields` / `optionalFields` isn't a [KYC field](./fields.md). |
| `400` | `sourcekey does not support dynamic fields` | You sent `fields` / `optionalFields` for a package that has a fixed field set. |
| `404` | `source key not found` | Unknown `sourceKey`. |
| `422` | `unverified fields` | At least one requested field isn't verified in the user's CorePass app. |
| `422` | `there is already an ongoing request` | An order for the same user, package and fields is being processed. |

## Poll the latest status

`GET /api/v2/kyc/status?referenceKey=…`

```bash title="Request"
curl "https://auth.corepass.net/api/v2/kyc/status?referenceKey=<REFERENCE_KEY>" \
  -H "Authorization: <YOUR_API_KEY>"
```

```json title="Response"
{
  "data": {
    "status": "CONFIRMING",
    "createdAt": 1677255348,
    "initiatedTxHash": "0xd90eb185877e47238380f613e3ac77f4cdb6a293ae21019fea7ac1b9ce12a94e"
  },
  "message": "status has been sent successfully",
  "success": true
}
```

| Field | Meaning |
| --- | --- |
| `status` | One of the [status values](./statuses.md). |
| `createdAt` | When the order reached this status (Unix seconds). |
| `initiatedTxHash` | Hash of the on-chain initiate transaction, once it exists. |
| `confirmTxHash` | Hash of the on-chain confirm transaction, once it exists. |
| `failureReason` | Present when `status` is `FAILED`. See [Failure reasons](./statuses.md#failure-reasons). |

Empty fields are omitted. An unknown `referenceKey` returns `404 order not found`.

## Fetch the full status history

`GET /api/v2/kyc/all-statuses?referenceKey=…`

```bash title="Request"
curl "https://auth.corepass.net/api/v2/kyc/all-statuses?referenceKey=<REFERENCE_KEY>" \
  -H "Authorization: <YOUR_API_KEY>"
```

```json title="Response"
{
  "data": {
    "allStatuses": [
      { "status": "PENDING", "createdAt": 1677255257 },
      { "status": "INITIATING", "createdAt": 1677255317 },
      { "status": "INITIATED", "createdAt": 1677255329, "initiatedTxHash": "0xd90e…" }
    ]
  },
  "message": "all statuses has sent successfully",
  "success": true
}
```

Each entry has the same fields as the latest-status response.

## Check that stored data is still valid

`POST /api/v1/blockchain/valid`

KYC data can expire or be revoked, for example after fraud or when the user updates their documents. Check a stored value before you rely on it.

```bash title="Request"
curl -X POST https://auth.corepass.net/api/v1/blockchain/valid \
  -H "Authorization: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "ab701b918efb6289a5077f6510740b4bca7f707dbad7",
    "infos": [
      { "field": "ADDRESS_CITY",    "data": "Zurich", "pepper": "72b69fbed02d5acbe4aa58d38be4e32283952edc56e9338c4db57bc0ea9b8d4a" },
      { "field": "ADDRESS_COUNTRY", "data": "CHE",    "pepper": "47aa3e25b647f47488d429d4cf3cd21d927f89d7e9f25c060c7d915d3c901123" }
    ]
  }'
```

| Field | Value |
| --- | --- |
| `field` | The field name. |
| `data` | The field value as text, i.e. the Base64-**decoded** `data` from the [webhook](./webhooks.md#data-delivered). |
| `pepper` | The pepper as a **hex** string: Base64-decode `pepper` from the webhook, then hex-encode the bytes. |

```json title="Response"
{
  "data": { "valids": ["ADDRESS_COUNTRY"], "unValids": ["ADDRESS_CITY"] },
  "message": "user was successfully checked.",
  "success": true
}
```
