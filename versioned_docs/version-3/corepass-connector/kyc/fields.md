---
title: KYC fields
sidebar_label: Field reference & prices
sidebar_position: 5
description: Every personal-identity field you can request with a KYC v3 data request, its kind (value, image or JSON), its price in CHF, and the parent fields.
---

Use these exact names in `fields` / `optionalFields` of a [data request](./api.md#create-a-request-by-coreid) or an [offer](./api.md#create-an-offer-qr-code), and in `fields` of [`/api/v3/kyc/verified`](./api.md#check-which-fields-are-verified). Names are upper case and case-sensitive. Each field's wire **hash** is the lower-case hex `sha3_256` of its name (FIPS SHA3-256, not Keccak); you may send the hash in place of the name.

:::info Prices
Prices are per **released** field, in **CHF**, charged from your organization's prepaid credit ([billing](./overview.md#billing)). The prices below are the launch price list. [`GET /api/v3/kyc/pricing`](./api.md#pricing) is **authoritative** and always current; read prices from it rather than hard-coding this table. A field priced `0` is free.
:::

**Kinds.** `value` fields carry a string in the attestation. `json` fields carry a JSON document encoded as a string. `image` fields carry a `url` that you [fetch with your API key](./api.md#fetch-a-document-image) while the release is retained.

:::info Native language vs. English
Fields with the `_EN` suffix are in English (Latin script). Their counterparts without `_EN` are in the document's own language. Request both if you need both.
:::

## Identity documents

Each document type offers the same 16 fields. Replace `<DOC>` with `IDCARD`, `PASSPORT`, `RESIDENCE_PERMIT` or `DRIVER_LICENSE`, for example `PASSPORT_DOB`.

| Field | Kind | Price (CHF) | Content |
| --- | --- | ---: | --- |
| `<DOC>_NAME` | value | 0.20 | Full name as on the document |
| `<DOC>_NAME_EN` | value | 0.20 | Full name in Latin script |
| `<DOC>_DOB` | value | 0.20 | Date of birth (`YYYY-MM-DD`) |
| `<DOC>_PLACE_OF_BIRTH` | value | 0.09 | Place of birth |
| `<DOC>_NATIONALITY` | value | 0.09 | Nationality |
| `<DOC>_SEX` | value | 0.11 | Sex |
| `<DOC>_COUNTRY` | value | 0.09 | Issuing country |
| `<DOC>_DOCUMENT_NUMBER` | value | 0.11 | Document number |
| `<DOC>_ISSUE_DATE` | value | 0.01 | Issue date |
| `<DOC>_EXPIRY_DATE` | value | 0.02 | Expiry date |
| `<DOC>_DOCUMENT_IMAGE` | image | 1.70 | Front of the document |
| `<DOC>_FACE_IMAGE` | image | 1.10 | Selfie taken during verification |
| `<DOC>_ADDITIONAL_IMAGE` | image | 1.12 | Back of the document, when there is one |
| `<DOC>_AML_CHECK` | value | 0.03 | `true` when the anti-money-laundering screening passed |
| `<DOC>_AML_DETAIL` | json | 1.00 | The AML screening result |
| `<DOC>_NOTE` | value | 0.03 | Reviewer note |

All 64 names:

| ID card | Passport | Residence permit | Driver license |
| --- | --- | --- | --- |
| `IDCARD_NAME` | `PASSPORT_NAME` | `RESIDENCE_PERMIT_NAME` | `DRIVER_LICENSE_NAME` |
| `IDCARD_NAME_EN` | `PASSPORT_NAME_EN` | `RESIDENCE_PERMIT_NAME_EN` | `DRIVER_LICENSE_NAME_EN` |
| `IDCARD_DOB` | `PASSPORT_DOB` | `RESIDENCE_PERMIT_DOB` | `DRIVER_LICENSE_DOB` |
| `IDCARD_PLACE_OF_BIRTH` | `PASSPORT_PLACE_OF_BIRTH` | `RESIDENCE_PERMIT_PLACE_OF_BIRTH` | `DRIVER_LICENSE_PLACE_OF_BIRTH` |
| `IDCARD_NATIONALITY` | `PASSPORT_NATIONALITY` | `RESIDENCE_PERMIT_NATIONALITY` | `DRIVER_LICENSE_NATIONALITY` |
| `IDCARD_SEX` | `PASSPORT_SEX` | `RESIDENCE_PERMIT_SEX` | `DRIVER_LICENSE_SEX` |
| `IDCARD_COUNTRY` | `PASSPORT_COUNTRY` | `RESIDENCE_PERMIT_COUNTRY` | `DRIVER_LICENSE_COUNTRY` |
| `IDCARD_DOCUMENT_NUMBER` | `PASSPORT_DOCUMENT_NUMBER` | `RESIDENCE_PERMIT_DOCUMENT_NUMBER` | `DRIVER_LICENSE_DOCUMENT_NUMBER` |
| `IDCARD_ISSUE_DATE` | `PASSPORT_ISSUE_DATE` | `RESIDENCE_PERMIT_ISSUE_DATE` | `DRIVER_LICENSE_ISSUE_DATE` |
| `IDCARD_EXPIRY_DATE` | `PASSPORT_EXPIRY_DATE` | `RESIDENCE_PERMIT_EXPIRY_DATE` | `DRIVER_LICENSE_EXPIRY_DATE` |
| `IDCARD_DOCUMENT_IMAGE` | `PASSPORT_DOCUMENT_IMAGE` | `RESIDENCE_PERMIT_DOCUMENT_IMAGE` | `DRIVER_LICENSE_DOCUMENT_IMAGE` |
| `IDCARD_FACE_IMAGE` | `PASSPORT_FACE_IMAGE` | `RESIDENCE_PERMIT_FACE_IMAGE` | `DRIVER_LICENSE_FACE_IMAGE` |
| `IDCARD_ADDITIONAL_IMAGE` | `PASSPORT_ADDITIONAL_IMAGE` | `RESIDENCE_PERMIT_ADDITIONAL_IMAGE` | `DRIVER_LICENSE_ADDITIONAL_IMAGE` |
| `IDCARD_AML_CHECK` | `PASSPORT_AML_CHECK` | `RESIDENCE_PERMIT_AML_CHECK` | `DRIVER_LICENSE_AML_CHECK` |
| `IDCARD_AML_DETAIL` | `PASSPORT_AML_DETAIL` | `RESIDENCE_PERMIT_AML_DETAIL` | `DRIVER_LICENSE_AML_DETAIL` |
| `IDCARD_NOTE` | `PASSPORT_NOTE` | `RESIDENCE_PERMIT_NOTE` | `DRIVER_LICENSE_NOTE` |

## Address

From the verified proof of address.

| Field | Kind | Price (CHF) | Content |
| --- | --- | ---: | --- |
| `ADDRESS_NAME`, `ADDRESS_NAME_EN` | value | 0.20 each | Name on the proof of address |
| `ADDRESS_ISSUE_DATE` | value | 0.01 | Issue date of the proof of address |
| `ADDRESS_EXPIRY_DATE` | value | 0.01 | Validity of the proof of address |
| `ADDRESS_STREET`, `ADDRESS_STREET_EN` | value | 0.11 each | Street |
| `ADDRESS_STREET2`, `ADDRESS_STREET2_EN` | value | 0.05 each | Street, second line |
| `ADDRESS_DIVISION`, `ADDRESS_DIVISION_EN` | value | 0.03 each | State, province or division |
| `ADDRESS_CITY`, `ADDRESS_CITY_EN` | value | 0.05 each | City |
| `ADDRESS_ZIP_CODE` | value | 0.07 | Postal code |
| `ADDRESS_COUNTRY` | value | 0.04 | Country |
| `ADDRESS_DOCUMENT_IMAGE` | image | 1.00 | Image of the proof-of-address document |
| `ADDRESS_NOTE` | value | 0.03 | Reviewer note |

## Contact

| Field | Kind | Price (CHF) | Content |
| --- | --- | ---: | --- |
| `EMAIL` | value | 0.03 | Verified email address |
| `PHONE` | value | 0.06 | Verified phone number (E.164) |

## External wallets

Addresses the user proved they control.

| Field | Network | Kind | Price (CHF) |
| --- | --- | --- | ---: |
| `EXTERNAL_WALLET_BTC` | Bitcoin | value | 0.03 |
| `EXTERNAL_WALLET_ETH` | Ethereum | value | 0.03 |
| `EXTERNAL_WALLET_LTC` | Litecoin | value | 0.03 |
| `EXTERNAL_WALLET_BNB` | BNB Chain | value | 0.03 |
| `EXTERNAL_WALLET_POL` | Polygon | value | 0.03 |
| `EXTERNAL_WALLET_SOL` | Solana | value | 0.03 |

## Parent fields {#parent-fields}

A parent field stands for the same attribute on **any** document. CorePass resolves it to one field the user holds verified. The request view shows the choice as `resolvedName`, and the attestation names the concrete field, for example `PASSPORT_DOB`. A parent field costs what its resolved field costs.

| Parent field | Resolves to one of |
| --- | --- |
| `NAME_PARENT_FIELD` | `IDCARD_NAME`, `PASSPORT_NAME`, `RESIDENCE_PERMIT_NAME`, `DRIVER_LICENSE_NAME`, `ADDRESS_NAME` |
| `NAME_EN_PARENT_FIELD` | `IDCARD_NAME_EN`, `PASSPORT_NAME_EN`, `RESIDENCE_PERMIT_NAME_EN`, `DRIVER_LICENSE_NAME_EN`, `ADDRESS_NAME_EN` |
| `DOB_PARENT_FIELD` | `IDCARD_DOB`, `PASSPORT_DOB`, `RESIDENCE_PERMIT_DOB`, `DRIVER_LICENSE_DOB` |
| `SEX_PARENT_FIELD` | `IDCARD_SEX`, `PASSPORT_SEX`, `RESIDENCE_PERMIT_SEX`, `DRIVER_LICENSE_SEX` |
| `FACE_IMAGE_PARENT_FIELD` | `IDCARD_FACE_IMAGE`, `PASSPORT_FACE_IMAGE`, `RESIDENCE_PERMIT_FACE_IMAGE`, `DRIVER_LICENSE_FACE_IMAGE` |

:::tip Don't care which document?
Ask for `DOB_PARENT_FIELD` rather than four separate `*_DOB` fields. You get exactly one date of birth and pay for one field.
:::

## Not accepted

`BUSINESS_*` names belong to [KYB](../kyb/fields.md) and are refused on the KYC API with `422 unknown_field`.
