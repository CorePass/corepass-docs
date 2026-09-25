---
title: CorePass Protocol
sidebar_position: 1
---

## Definition

A URI for CorePass follows the general structure of URIs as defined in RFC 3986.

CorePass URI Scheme Diagram:

```txt
        action  coreId      parameters
         ┌─┴─┐  ┌─┴─┐ ┌─────────┴─────────┐
corepass:action/cb00…?attr=full-name,email
└───┬──┘ └────┬─────┘└──────────┬─────────┘
scheme       path             query
```

- Scheme: Always "corepass"
- Path: Specified by `[action][/][coreId]`
- Query: Specified by `[?parameter=value]`

Parameters are joined by the '&' character. All parameter values must be encoded with `encodeURIComponent`.

All items in the URI follow kebab case, meaning they are lowercase with words separated by hyphens ("-").

## Data Transfer - Request

Format: `corepass:[coreId]?attr=[attributes]&type=[qr|nfc|text|p2p]&exp=[expiration]`

Path:

- coreId (optional): The coreId (if not present, the user will be prompted to select a coreId)

Parameters:

- attr (optional): The list of the requested attributes. Multiple items should be separated by a comma.
- type (optional): The type of the data transfer. Can be either qr, nfc or text or p2p. Default is P2P.
- exp (optional): The expiration for the request, is an integer in minutes. Default is 10 minutes. The minimum is 5 minutes and the maximum is 60 minutes.

Example:
`corepass:cb00…?attr=full-name,email&type=qr&exp=30`
Example Use Case:
When a content creator wants to provide option of requesting his email address and full name to his audience. Then he puts this protocol like `corepass:cb00…?attr=full-name,email&type=qr&exp=30` on a button on his website.

## Login Request

Format: `corepass:login/[coreId]?sess=[session]&conn=[gateway]&type=[qr|p2p|nfc|callback|app-link]`

Path:

- action (required): Always "login"
- coreId (optional): The coreId (if not present, the user will be prompted to select a coreId)

Parameters:

- sess (required): Session information
- conn (optional): The endpoint that CorePass will communicate to send the login information (when type is app-link, the link will get launched by CorePass either in the browser or in the requesting app).
- type (optional): The type of the data transfer. Can be either qr, nfc, app-link, p2p or callback. Default is callback. app-link can be used in Frontend web applications (using frontend routes) or mobile applications (using [deeplinks](https://www.adjust.com/glossary/deep-linking/)).

Example:

`corepass:login/cb00…?sess=session1&conn=https%3A%2F%2Fprovider.tld&type=callback`

Example callback call:

```json
Method: POST
body: {
    "signature": signature,
    "session": session,
    "coreID": coreId,
}
```

Example QR code (Stringified JSON):

```json
{
    "signature": signature,
    "session": session,
    "coreID": coreId,
}
```

Example app-link type request:

`corepass:login/cb00…?sess=session1&conn=https%3A%2F%2Fprovider.tld&type=app-link`

Example app-link response (Using query parameters):

```txt
https://provider.tld?signature=signature&session=session&coreID=coreId
```

## Typed Data

Format: `corepass:td/[coreId]?data=[json]&td=[json]&conn=[endpoint]&dl=[deadline]&type=[qr|p2p|nfc|callback|app-link]`

Path:

- action (required): Always "td"
- coreId (optional): The coreId (if not present, the user will be prompted to select a coreId)

Parameters:

- data (required): A JSON that is an EIP712 object
- td (required): A JSON that indicates the structure of the EIP712 object
- conn (optional): The endpoint that CorePass will send the signed EIP712 to (when type is app-link, the link will get launched by CorePass either in the browser or in the requesting app).
- dl (required): The deadline for signing the EIP712 object, which is unix timestamp in seconds.
- type (optional): The type of the data transfer. Can be either qr, nfc, app-link, p2p or callback. Default is callback.

Example:

`corepass:td/cb00…?data={...}&conn=https%3A%2F%2Fprovider.tld&dl=1640995200&type=callback`

Example callback call:

```json
Method: POST
body: {
    "signature": signature,
    "coreID": coreId,
}
```

Example QR code (Stringified JSON):

```json
{
    "signature": signature,
    "coreID": coreId,
}
```

Example app-link type request:

`corepass:td/cb00…?data={...}&conn=https%3A%2F%2Fprovider.tld&dl=1640995200&type=app-link`

Example app-link response (Using query parameters):

```txt
https://provider.tld?signature=signature&coreID=coreId
```

## Data Request

Format: `corepass:request/[coreId]?conn=[endpoint]&from=[coreId]&dl=[deadline]&attr=[attributes]&type=[qr|p2p|nfc|callback|app-link]&id=[id]`

Path:

- action (required): Always "request"
- coreId (optional): The coreId (if not present, the user will be prompted to select a coreId)

Parameters:

- conn (required): The endpoint that CorePass will communicate for the data transfer (when type is app-link, the link will get launched by CorePass either in the browser or in the requesting app).
- from (required): The coreId of the data requestor
- dl (required): The deadline for accepting data request, which is unix timestamp in seconds.
- attr (required): List of the requested items. Multiple items should be separated by a comma.
- type (optional): The type of the data transfer. Can be either qr, nfc, app-link, p2p or callback. Default is callback.
- id (optional): The id of the request.

Example:

`corepass:request/cb00…?conn=https%3A%2F%2Fprovider.tld&from=cb00…&dl=1640995200&attr=full-name,email&type=callback&id=1234`

## Access Request (Entry policy)

Format: `corepass:access/[coreId]?conn=[endpoint]&from=[coreId]&dl=[deadline]&attr=[attributes]&type=[qr|p2p|nfc|callback|app-link]`

Path:

- action (required): Always "access"
- coreId (optional): The coreId (if not present, the user will be prompted to select a coreId)

Parameters:

- conn (required): The endpoint that CorePass will communicate for the data transfer (when type is app-link, the link will get launched by CorePass either in the browser or in the requesting app).
- from (required): The coreId of the data requestor
- dl (required): The deadline for accepting data request, which is unix timestamp in seconds.
- attr (required): List of the requested items. Multiple items should be separated by a comma.
- type (optional): The type of the data transfer. Can be either qr, nfc, app-link, p2p or callback. Default is callback.

Example:

`corepass:access/cb00…?conn=https%3A%2F%2Fprovider.tld&from=cb00…&dl=1640995200&attr=full-name,email&type=callback`

## Request Signature

Format: `corepass:sign/[coreId]?data=[string]&conn=[endpoint]&dl=[deadline]&type=[qr|p2p|nfc|callback|app-link]`

Path:

- action (required): Always "sign"
- coreId (optional): The coreId (if not present, the user will be prompted to select a coreId)

Parameters:

- data (required): Any HEX string that needs to be signed.
- conn (optional): The endpoint that CorePass will send the signed string to (when type is app-link, the link will get launched by CorePass either in the browser or in the requesting app).
- dl (optional): The expiration for the request, which is unix timestamp in seconds.
- type (optional): The type of the data transfer. Can be either qr, nfc, app-link, p2p or callback. Default is callback.

Example:

`corepass:sign/cb00…?data="..."&callback=https%3A%2F%2Fprovider.tld&dl=1640995200&type=callback`

Example callback call:

```json
Method: POST
body: {
    "signature": signature,
    "coreID": coreId,
}
```

Example QR code (Stringified JSON):

```json
{
    "signature": signature,
    "coreID": coreId,
}
```

Example app-link type request:

`corepass:sign/cb00…?data="..."&callback=https%3A%2F%2Fprovider.tld&dl=1640995200&type=app-link`

Example app-link response (Using query parameters):

```txt
https://provider.tld?signature=signature&coreID=coreId
```

JS example of generating the fingerprint:

```js
const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

sha256(text).then(hash => console.log(hash));
```

## Note

In the given examples, ellipsis "…" denotes that the entire string is not shown due to its length. Actual `coreId` values will vary.

URL is using kebab case. For example, `full-name` instead of `fullName`.

Arrays are separated by commas. For example, `full-name,email` instead of `full-name email`.

The action and CoreID segments of the path have been reversed, as requested, to now follow the pattern `[action][/][coreId]`. The CoreID can be optional in some cases, with the slash `/` present when needed.

Importantly, all components of the URI should be encoded using the encodeURIComponent() function. This includes the scheme, path, and query parameters. This encoding helps to ensure that the URI is correctly interpreted by all systems and follows the appropriate standards.

## Request Blockchain Transaction

Format: `corepass:tx/[coreId]?val=[value]&to=[address]&data=[data]&conn=[endpoint]&dl=[deadline]&type=[qr|p2p|nfc|callback|app-link]&ep=[energyPrice]&el=[energyLimit]&nc=[nonce]`

Path:

- action (required): Always "tx"
- coreId (optional): The coreId (if not present, the user will be prompted to select a coreId) of the transaction sender (from in the transaction)

Parameters:

- val (required): The value of the transaction in the smallest unit of the currency (string) (e.g. ore)
- to (required): The address of the transaction receiver (string) (e.g. "cb00…")
- data (optional): The data to be sent with the transaction (string)
- conn (optional): The endpoint that CorePass will send the transaction hash to (after transaction confirmation) (when type is app-link, the link will get launched by CorePass either in the browser or in the requesting app).
- dl (optional): The expiration for the request, which is unix timestamp in seconds.
- type (optional): The type of the data transfer. Can be either qr, nfc, app-link, p2p or callback. Default is callback.
- ep (optional): The energy price of the transaction in the smallest unit of the currency (string) (e.g. ore)
- el (optional): The energy limit of the transaction in integer format (string)
- nc (optional): The nonce of the transaction in integer format (string)

Example:

`corepass:tx/cb00…?val=100&to=cb00…&data=Hello%20World&conn=https%3A%2F%2Fprovider.tld&dl=1640995200&type=callback&ep=1&el=100000&nc=1`

Example callback call:

```json
Method: POST
body: {
    "txHash": txHash,
    "coreID": coreId,
}
```

Example QR code (Stringified JSON):

```json
{
    "txHash": txHash,
    "coreID": coreId,
}
```

Example app-link type request:

`corepass:tx/cb00…?val=100&to=cb00…&data=Hello%20World&conn=https%3A%2F%2Fprovider.tld&dl=1640995200&type=app-link&ep=1&el=100000`

Example app-link response (Using query parameters):

```txt
https://provider.tld?txHash=txHash&coreID=coreId
```
