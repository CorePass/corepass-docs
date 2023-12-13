---
title: Authorization
sidebar_position: 3
---

Authorization in CorePass Connector is done using blockchain cryptography. Users can verify their identity using their blockchain address, then Applications can ask for their KYC information and verify it using blockchain cryptography.

## Authorization (KYC-transfer) flow

CorePass KYC-transfer flow requires:

1. user to have done the kyc verification in CorePass application.
2. your application to implement the KYC-transfer flow.

if a user has done the KYC verification process in CorePass application, the kyc-transfer flow will look like this diagram:
``

### CorePass Flow Diagram

[![Core Blockchain Timeline](/img/docs/corepass-flow.png)](/img/docs/corepass-flow.png)

the purpose of this kyc-transfer flow is to acquire user's kyc data in exchange for some Core Token. the token transfer and blockchain interactions are getting handled by corepass connector for you. you just need to implement the kyc-transfer flow in your application. to do so, first of all you need to determine what data you want to acquire from the user. we have these data available as of now:

- SH_IDCard_FULLNAME
- SH_IDCard_DOB
- SH_IDCard_ExpiryDate
- SH_IDCard_IssueDate
- SH_IDCard_DocumentNumber
- SH_IDCard_Gender
- SH_IDCard_Country
- SH_IDCard_DocumentImage
- SH_IDCard_FaceImage
- SH_IDCard_AML_Check
- SH_IDCard_AML_Detail
- SH_Passport_FULLNAME
- SH_Passport_DOB
- SH_Passport_ExpiryDate
- SH_Passport_IssueDate
- SH_Passport_DocumentNumber
- SH_Passport_Gender
- SH_Passport_Country
- SH_Passport_DocumentImage
- SH_Passport_FaceImage
- SH_Passport_AML_Check
- SH_Passport_AML_Detail
- SH_ResidencePermit_FULLNAME
- SH_ResidencePermit_DOB
- SH_ResidencePermit_ExpiryDate
- SH_ResidencePermit_IssueDate
- SH_ResidencePermit_DocumentNumber
- SH_ResidencePermit_Gender
- SH_ResidencePermit_Country
- SH_ResidencePermit_DocumentImage
- SH_ResidencePermit_FaceImage
- SH_ResidencePermit_AML_Check
- SH_ResidencePermit_AML_Detail
- SH_DriverLicense_FULLNAME
- SH_DriverLicense_DOB
- SH_DriverLicense_ExpiryDate
- SH_DriverLicense_IssueDate
- SH_DriverLicense_DocumentNumber
- SH_DriverLicense_Gender
- SH_DriverLicense_Country
- SH_DriverLicense_DocumentImage
- SH_DriverLicense_FaceImage
- SH_DriverLicense_AML_Check
- SH_DriverLicense_AML_Detail
- SH_EMAIL
- SH_PHONE

the names of the field are self explanatory. so if you want user's passport DOB and passport expiry date, you need to provide these two fields in your request to CorePass.

**Important note:**

If you do not care about document type, and you only want DOB of user, you need to check which info user have available (SH_IDCard_DOB, SH_Passport_DOB, SH_ResidencePermit_DOB, SH_DriverLicense_DOB) and ask for the one that is available (DOB was used as an example and any field can be treated in the same manner). if none of them is available, you will get an error (this will make more sense after you read [Authorization (KYC-transfer) implementation section](#authorization-kyc-transfer-implementation)).

After you chose the kyc data that you need from user, you need to implement the kyc-transfer flow in your application :

## Authorization (KYC-transfer) implementation

**This flow assumes you have user's coreid so user needs to have done the login on your platform to be able to start kyc-transfer process.**

**The steps described here make more sense when you look at [flow diagram](#corepass-flow-diagram) above.**

- When you want to initiate a kyc-transfer flow, you first need to see if user have done KYC verification on his CorePass Mobile application or not. So you need to call `/api/v1/blockchain/verified` endpoint of CorePass connector.

Sample request:

```bash
curl --request POST \
    --url CONNECTOR_ADDRESS/api/v1/blockchain/verified \
    --header 'Content-Type: application/json' \
    --data '{
        "user":"ab22b1671b4f7ccc0b16a87514adde84513b6348232e",
        "items": ["SH_IDCard_DOB", "SH_Passport_DocumentNumber","SH_EMAIL"]
    }'
```

Sample response:

```json
{
  "verifiedItems": ["SH_EMAIL"],
  "unVerifiedItems": ["SH_IDCard_DOB", "SH_Passport_DocumentNumber"]
}
```

Another Sample Response for when user does not have any verified items:

```json
{
  "unVerifiedItems": ["SH_IDCard_DOB", "SH_Passport_DocumentNumber", "SH_EMAIL"]
}
```

if user have done the KYC verification process, you will get a list of verified items. if user have not done the KYC process on his CorePass Mobile application, you will get a list of unverified items. so if a field that is necessary for your application is not in the verified items list, you need to inform user that he needs to do the kyc verification on his corepass application and unless he does that, he will not be able to use your application and the Authorization (KYC-transfer) flow cannot be initiated.

- Supposing user has done the kyc verification for all the kyc data that you need, you need to show user a qr code (or a button link for users using mobile browsers) as indicated in the step 2 of [flow diagram](#corepass-flow-diagram) above. to have such qr code, you need to make a request to `api/v1/kyc/qrcode`. this endpoint is the most important endpoint of the Authorization (KYC-transfer) flow. this endpoint will generate a qr code for you that you need to show to user. so you need to make a request to `api/v1/kyc/qrcode` endpoint with the following parameters:
  - `user`: user's coreid
  - `items`: list of kyc data that you need from user. this list should be the same as the list of verified items that you got from `api/v1/blockchain/verified` endpoint.
  - `callback`: this is the url that you want to be called after user has done the kyc transfer process on his CorePass Mobile application (has accepted the data request on his phone and the data is ready for you). this callback will be called either with the user's kyc data or with error. you can use this website to have test callbacks: [webhook.site](https://webhook.site/).
  - `statusCallback`: this callback will be called to inform you about the status of the kyc transfer process (this callback gets called with a POST request and an `application/json` body).(different statuses are explained in the next section). you can use this website to have test callbacks: [webhook.site](https://webhook.site/).
  - `expiration`: this is the expiration time of the qr code. after this time, the qr code will be expired and you will not be able to use it anymore (it is the expiration for the kyc data transfer and indicates the time that user has to accept the kyc data transfer shown to him after scanning qr code). the expiration is a Unix timestamp in seconds and it must be between 5-15 minutes after the current time. if you provide any other value, you will get an error (400 status code). you can use [this website](https://www.epochconverter.com/) for your tests.
  - `withoutQRCode`:  This is an optional parameter and if you only need the `link` and not the base64 encoded QR code, you can set `withoutQRCode` to `true` in the request body. This will return the `link` in the response and not the `qrcode` field.

Sample request:

```bash
curl --request POST \
  --url CONNECTOR_ADDRESS/api/v1/kyc/qrcode \
  --header 'Content-Type: application/json' \
  --data '{
    "user":"ab72a31c718d343b45e558099ec503087f734433785d",
    "items":["SH_DriverLicense_DocumentNumber"],
    "callback":"d291c80a-27e3-4c18-af69-5ecb5014ac3f.webhook.site",
    "statusCallback":"2651b29d-2e7f-4b4c-9a6b-702555089ea9.webhook.site",
    "expiration":1675946886
  }'
```

Sample Response for requesting for a qr code for the first time:

```json
{
  "qrcode": BASE64_ENCODED_QR_CODE,
  "link": "url to be shown on a button for mobile browsers",
  "expiration": 1675946886 // this is the expiration time of the qr code in unix time in seconds, it is the same as the expiration time that you provided in the request
}
```

Sample Response for requesting for a qr code for the second time (and any other time after that) (meaning that you have already requested for a qr code for this user and you are requesting for a qr code again):

```json
{
  "qrcode": same BASE64_ENCODED_QR_CODE that you got in the first response,
  "link": same url that you got in the first response,
  "expiration": same expiration time that you got in the first response,
  "alreadySent": true // this field will be true if you have already requested for a qr code for this user and you are requesting for a qr code again
}
```

Sample Response for invalid expiration:

```txt
status code: 400
body: expiration time is invalid, it should be unix time in seconds and between 5-15 minutes
```

Sample Response for requesting for unverified items:

```txt
status code: 400
body: user does not have the requested items verified
```

Sample response for when there is an ongoing request (ongoing request means a request that was `INITIATE_SUBMITTED`, but is not `FINISH_SUCCESS` or `FINISH_FAILED`):

```txt
status code: 400
body: there is an ongoing request for this user and items
```

### statusCallback call

> How your statusCallback will get called

- If the status does not include a tx Hash (is not one of these statuses: `INITIATE_SUBMITTED`, `VALIDITY_CHECK`, `VALIDITY_SUCCEED`, `CONFIRM_SUBMITTED`, `FINISH_SUCCESS`, `FINISH_FAILED`) then the body of the request will be like this:

```json
{
  "user": "ab148af5f9cdad10beddb05fbec4a3bef02577130e56",
  "fields": [
    "21148787cbc13cfc8acde462c822ff431af96aa2edf714fdc82f90e4c2918824"
  ],
  "status": "ACCEPTED",
  "expiration": 1677255563,
  "deadline": 1677255437,
  "signature": "nNDY/bcxyo744eJVYj2l3vHuntrPwf+clgVhW1oalfBA5fJKCcuEHAnO+vonA8egSgH9dK3T8LUAmdR3obb4DzAoOIOxL/K/dbtTloDNAQ4Njjfvo306GDdEwEI9hv532awZ7VBrYcuoIuqWcyk5cTAA7LznAvTYVI74s/5nLVpY6D4j9V1pqQc5kE5Xk+Mrutqs75GcKE1VXYTpXxHyHaYH5IgNmue2FDmA"
}
```

- If the status includes a tx Hash (is one of these statuses: `INITIATE_SUBMITTED`, `VALIDITY_CHECK`, `VALIDITY_SUCCEED`, `CONFIRM_SUBMITTED`, `FINISH_SUCCESS`, `FINISH_FAILED`) then the body of the request will be like this:

```json
{
  "user": "ab148af5f9cdad10beddb05fbec4a3bef02577130e56",
  "fields": [
    "21148787cbc13cfc8acde462c822ff431af96aa2edf714fdc82f90e4c2918824"
  ],
  "status": "INITIATE_SUBMITTED",
  "expiration": 1677255563,
  "deadline": 1677255497,
  "signature": "LUkjuWEDaLNxY0kbUJ5XkluGnq05OEqPNJi0e3YS8fk5EUW+vwj0ke2y5sPFxJLnGew14hRZ4ziADkeuyaC9QNOYft15uRdA4L/ES+ny+kBOZyN3jAqHsX8thSbs1j8rsu2Qb7HSRpR9SwcJ/eDPkwkA7LznAvTYVI74s/5nLVpY6D4j9V1pqQc5kE5Xk+Mrutqs75GcKE1VXYTpXxHyHaYH5IgNmue2FDmA",
  "tx_hash": "0xd90eb185877e47238380f613e3ac77f4cdb6a293ae21019fea7ac1b9ce12a94e"
}
 ```

- user: user's coreid
- fields: list of kyc data that you requested from user (items)
- status: the latest status of the kyc transfer process. possible values are: `'PENDING','ACCEPTED','INITIATED','INITIATED_FAILED', 'INITIATE_SUBMITTED', 'KYC_RECEIVED','VALIDITY_CHECK','VALIDITY_SUCCEED','VALIDITY_FAILED','CONFIRMED','CONFIRM_FAILED','CONFIRM_SUBMITTED', 'CALLBACK_SUCCEED', 'CALLBACK_FAILED', 'FINISH_SUCCESS', 'FINISH_FAILED'`. (the meaning of each status is explained in the next section)
- expiration: is the expiration that you provided in the `api/v1/kyc/qrcode` request.
- deadline and signature are for you to be sure that your callback is getting called by CorePass connector. so to be sure that it is actually your CorePass Connector that is calling your callback, you need to first check that the deadline is not passed (it has a 3 minutes deadline which is in Unix seconds). then you need to verify the signature by hashing the encoded json of the response and recovering the signature and checking if the publicKey that you recovered is the same as your CorePass Connector's instance.
- tx_hash is the hash of the transaction that was sent to the blockchain to start the data transfer process. this field will only be present if the status is one of these statuses: `INITIATE_SUBMITTED`, `VALIDITY_CHECK`, `VALIDITY_SUCCEED`, `CONFIRM_SUBMITTED`, `CALLBACK_SUCCEED`, `CALLBACK_FAILED`, `FINISH_SUCCESS`, `FINISH_FAILED`. you will receive 2 different hashes: one for the `INITIATE_SUBMITTED`,`VALIDITY_CHECK` and  `VALIDITY_SUCCEED` statuses and one for the  `CONFIRM_SUBMITTED` status. the first hash (`INITIATE_SUBMITTED`,`VALIDITY_CHECK` and  `VALIDITY_SUCCEED`) is the hash of the transaction that was sent to the blockchain to start the data transfer process. the `CONFIRM_SUBMITTED` hash is the hash of the transaction that was sent to the blockchain to finalize the data transfer and pay the fee to the user.

### Statuses and their meanings

> Different statuses and their meanings (in order of their appearance)

- `PENDING` : this state means that the data transfer request qr code or link was generated for user and items and user has not scanned it yet or has scanned it but have not accepted the request yet.
- `ACCEPTED`: this state means that user has scanned the qr code or clicked on the link and has accepted the data transfer request.
- `INITIATE_SUBMITTED`: this state means that the data transfer request has been sent to the blockchain to get started.
- `INITIATED`: this state means that the data transfer request has been successfully sent to the blockchain and the data transfer process has started.
- `INITIATED_FAILED`: this state means that the data transfer request has been sent to the blockchain but it failed to start the data transfer process (you may consider the data transfer flow completely failed in this state as your callback will get called with the reason for the error at this stage).
- `KYC_RECEIVED`: this state means that the user's application was notified by the blockchain about the data transfer, and the raw kyc data of user has been sent to CorePass connector.
- `VALIDITY_CHECK`: this state means that CorePass connector has received user's kyc data and is checking its validity.
- `VALIDITY_SUCCEED`: this state means that CorePass connector has checked user's kyc data and it is valid.
- `VALIDITY_FAILED`: this state means that CorePass connector has checked user's kyc data and it is invalid (you may consider the data transfer flow completely failed in this state as your callback will get called with the reason for the error at this stage).
- `CONFIRM_SUBMITTED`: this state means that after CorePass Connector verified the validity of the data, a confirm transaction have been sent to the blockchain to pay user for the data transfer.'
- `CONFIRMED`: this state means that the confirm transaction have been successfully sent to the blockchain and the data transfer process has been completed (your callback will get called with user's kyc data at this stage).
- `CONFIRM_FAILED`: this state means that the confirm transaction have been sent to the blockchain but it failed to complete the data transfer process (you may consider the data transfer flow completely failed in this state as your callback will get called with the reason for the error at this stage).
- `CALLBACK_SUCCEED`: this state means that your callback has been successfully called with user's kyc data.
- `CALLBACK_FAILED`: this state means that your callback has been called but it failed to process the data (your callback's response was not 200) (it has been explained in the [Callback](#callback) section that you need to return 200 for your callback to be considered successful).
- `FINISH_SUCCESS`: this state means that the data transfer process has been completed successfully and user has been paid for the data transfer.
- `FINISH_FAILED`: this state means that the data transfer process has been completely failed (you may consider the data transfer flow completely failed in this state as your callback will get called with the reason for the error at this stage).

## Callback

## Data transfer process completed

> How will your callback get called when the data transfer process is completed and user's data is available for you?

- important to know that your callback will get called with multipart/form-data content type.
  Sample callback call body:

```json
{
  "user": "ab432e666932c53128d9f73712b058a7a8f7df52f5cb",
  "infos": [
    {
      "fieldID": "SH_DriverLicense_DOB",
      "fieldValue": "1986-09-06",
      "pepper": "374e74264d4b315a3878652576696e5238256947683643632a626d4a4f404846707247796c6a76686c6d675946654a4634ab432e666932c53128d9f73712b058a7a8f7df52f5cb53485f4472697665724c6963656e73655f444f42"
    },
    {
      "fieldID": "SH_DriverLicense_IssueDate",
      "fieldValue": "2020-11-12",
      "pepper": "374e74264d4b315a3878652576696e5238256947683643632a626d4a4f404846707247796c6a76686c6d675946654a4634ab432e666932c53128d9f73712b058a7a8f7df52f5cb53485f4472697665724c6963656e73655f497373756544617465"
    }
  ],
  "deadline": 1667137346,
  "expiration": 1667137346,
  "signature": "eaAF9u+EmoIOVxVU8YdRc00E3ld8pGgAMMXA7dA2IWRTttMfw9jT7dBhUWY7bdxqHrUfp9d0unmAsPzzWJCLbSLuG76P8x28443QeYAroStkUaS5UUnAiicnviAd0WgvNfuFiVXEAbT3bP40fH4NnAUATsWruGzU92jTlN/9XdmiSDy9jN3URHZiy3OjNUR2YPYFZXEN5NFE9dzOVe/94gVwlRxK4hrVP9IA"
}
```

`fieldId` is the id of the requested items, `fieldValue` is the value of that field and `pepper` is the pepper used to fingerprint this field on the blockchain (so pepper can be as sensitive data as the value. also pepper is different for each field of each user), so you need to save all of it on your databases, as each request is costing you CTN.

Signature is the the result of signing response with your CorePass Connector's privateKey, in which response is: Sha256 hash of jsonEncode of the body.

```go
  body := struct {
    User      string `json:"user"`
    Infos     []Info `json:"infos"`
    Deadline  int64  `json:"deadline"`
    Signature []byte `json:"signature,omitempty"`
  }{}
  if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
    w.WriteHeader(http.StatusBadRequest)
    writeError(w, errBadRequest)
    return
  }

  buffer := new(bytes.Buffer)
  json.NewEncoder(buffer).Encode(
    struct {
      User     string
      Infos    []Info
      Deadline int64
      Expiration int64
    }{
      body.User,
      body.Infos,
      body.Deadline,
      body.Expiration,
    },
  )

  dataHash := crypto.SHA3(buffer.Bytes())
  pubKey, err := crypto.Ecrecover(dataHash, body.Signature)
  if err != nil {
    log.Println("err:", err)
  }
  log.Println("pub:", common.Bytes2Hex(pubKey));
```

## Callback not available

> What happens if your callback is not available or not responding?

We expect a 200 response from your callback, if we don't get a 200 response from your callback, we will retry to call your callback in some intervals. these intervals will be determined by you using the `NATS_CALLBACK_TOPICS` in the environment variable and give it any intervals you want. for example if `NATS_CALLBACK_TOPICS = "1,5,10,120,124000"` your callback will get called after 1 minute if the response of the callback is not 200, then again will be called after 5 minutes, then 10 minutes, then 120 minutes and then 124000 minutes (which is 34 days) and then we will stop calling your callback.
when we stop calling your callback, your data will be saved on connectors DB and you need to manually export users data and remove it from the connector.
There is also another environment variable `NATS_CALLBACK_DURATION` that you can set as `Second`||`Minute`||`Hour`||`Day` and it will determine the unit of the intervals you set in `NATS_CALLBACK_TOPICS` environment variable.

**How will your callback get called when the data transfer process is failed?**

In case error happens and the data transfer is failed (`INITIATED_FAILED`, `VALIDITY_FAILED`, `CONFIRMED_FAILED`) your callback will get called with a body like this:

```json
{
  "user": "ab06b37c90098790e90bbcd56a701e50ec8b51b6bd5e",
  "items": ["SH_EMAIL"],
  "error": "INITIATED_FAILED",
  "deadline": 1667161116,
  "expiration": 1667161116,
  "signature": "RrfRSl1djVOj0kIMRkBgDMWsV+7l3E4wDGtb5S+lTQFEA0nvNDtaUdc4aF4Eqn59eDLz5VXb4x4A6YHYZYpHimjDmuN/Q6/gmtnBc8VG+cWMOdHhq9LIJk7tPdQdkEDvaSf4qlcqaEcxu2EGh9RIww8ATsWruGzU92jTlN/9XdmiSDy9jN3URHZiy3OjNUR2YPYFZXEN5NFE9dzOVe/94gVwlRxK4hrVP9IA"
}
```

- There exists a `api/v1/kyc/status` that you can use, which works like the statusCallback and gives the latest status for a user + items, but it's not mandatory to use it (it is a complimentary feature).

Sample Request:

```bash
curl --request POST \
  --url CONNECTOR_ADDRESS/api/v1/kyc/status \
  --header 'Content-Type: application/json' \
  --data '{
    "user":"ab29abcf6455efb099ebe820f50d67b96f540e935fa6",
    "items":["SH_DriverLicense_DocumentNumber"]
  }'
```

Sample Response:

```json
{
  "status": "CONFIRM_SUBMITTED",
  "created_at": 1677255348,
  "tx_hash": "0x1332a0079b54bace370e216f32bb4284adb7a4852c47a71908ec2c6152145114"
}
```

The tx_hash here is again related to the status. and created_at is the time that the status was created in Unix seconds.

**Important note:**

The `api/v1/kyc/status` returns the results for the past 1 month.

- There exists a `api/v1/kyc/all-statuses` that you can use, which works like the `api/v1/kyc/status`, but it gives you all the statuses for a user + items, it is also not mandatory to use (it is a complimentary feature).

Sample Request:

```bash
curl --request POST \
  --url CONNECTOR_ADDRESS/api/v1/kyc/all-statuses \
  --header 'Content-Type: application/json' \
  --data '{
    "user":"ab148af5f9cdad10beddb05fbec4a3bef02577130e56",
    "items":["SH_EMAIL"]
  }'
```

Sample Response:

```json
{
  "AllStatuses": [
    {
      "status": "CONFIRM_SUBMITTED",
      "created_at": 1677255348,
      "tx_hash": "0x1332a0079b54bace370e216f32bb4284adb7a4852c47a71908ec2c6152145114"
    },
    {
      "status": "VALIDITY_SUCCEED",
      "created_at": 1677255329,
      "tx_hash": "0xd90eb185877e47238380f613e3ac77f4cdb6a293ae21019fea7ac1b9ce12a94e"
    },
    {
      "status": "VALIDITY_CHECK",
      "created_at": 1677255329,
      "tx_hash": "0xd90eb185877e47238380f613e3ac77f4cdb6a293ae21019fea7ac1b9ce12a94e"
    },
    {
      "status": "INITIATE_SUBMITTED",
      "created_at": 1677255317,
      "tx_hash": "0xd90eb185877e47238380f613e3ac77f4cdb6a293ae21019fea7ac1b9ce12a94e"
    },
    {
      "status": "ACCEPTED",
      "created_at": 1677255257
    }
  ]
}
```

**Important note:**

The `api/v1/kyc/all-statuses` returns the results for the past 1 month.
