---
title: KYC fields
sidebar_label: Field reference
sidebar_position: 4
description: Every personal-identity field you can request through CorePass KYC transfer, plus parent fields.
---

Use these exact names in the `items` of [`/api/v1/blockchain/verified`](./api.md#check-which-fields-are-verified), in `fields` / `optionalFields` of [`/api/v2/kyc/qrcode`](./api.md#generate-a-kyc-qr-code), and when you select fields for a package. Names are upper case and case-sensitive.

:::info Native language vs. English
Fields with the `_EN` suffix are in English. Their counterparts without `_EN` are in the user's native language. Request both if you need both. For users whose native language is English, the two are identical.
:::

## Identity documents

Each document type offers the same set of fields:

| Field | ID card | Passport | Residence permit | Driver license |
| --- | --- | --- | --- | --- |
| Name | `IDCARD_NAME` | `PASSPORT_NAME` | `RESIDENCE_PERMIT_NAME` | `DRIVER_LICENSE_NAME` |
| Name (English) | `IDCARD_NAME_EN` | `PASSPORT_NAME_EN` | `RESIDENCE_PERMIT_NAME_EN` | `DRIVER_LICENSE_NAME_EN` |
| Date of birth | `IDCARD_DOB` | `PASSPORT_DOB` | `RESIDENCE_PERMIT_DOB` | `DRIVER_LICENSE_DOB` |
| Place of birth | `IDCARD_PLACE_OF_BIRTH` | `PASSPORT_PLACE_OF_BIRTH` | `RESIDENCE_PERMIT_PLACE_OF_BIRTH` | `DRIVER_LICENSE_PLACE_OF_BIRTH` |
| Nationality | `IDCARD_NATIONALITY` | `PASSPORT_NATIONALITY` | `RESIDENCE_PERMIT_NATIONALITY` | `DRIVER_LICENSE_NATIONALITY` |
| Sex | `IDCARD_SEX` | `PASSPORT_SEX` | `RESIDENCE_PERMIT_SEX` | `DRIVER_LICENSE_SEX` |
| Country | `IDCARD_COUNTRY` | `PASSPORT_COUNTRY` | `RESIDENCE_PERMIT_COUNTRY` | `DRIVER_LICENSE_COUNTRY` |
| Document number | `IDCARD_DOCUMENT_NUMBER` | `PASSPORT_DOCUMENT_NUMBER` | `RESIDENCE_PERMIT_DOCUMENT_NUMBER` | `DRIVER_LICENSE_DOCUMENT_NUMBER` |
| Issue date | `IDCARD_ISSUE_DATE` | `PASSPORT_ISSUE_DATE` | `RESIDENCE_PERMIT_ISSUE_DATE` | `DRIVER_LICENSE_ISSUE_DATE` |
| Expiry date | `IDCARD_EXPIRY_DATE` | `PASSPORT_EXPIRY_DATE` | `RESIDENCE_PERMIT_EXPIRY_DATE` | `DRIVER_LICENSE_EXPIRY_DATE` |
| Document image | `IDCARD_DOCUMENT_IMAGE` | `PASSPORT_DOCUMENT_IMAGE` | `RESIDENCE_PERMIT_DOCUMENT_IMAGE` | `DRIVER_LICENSE_DOCUMENT_IMAGE` |
| Face image | `IDCARD_FACE_IMAGE` | `PASSPORT_FACE_IMAGE` | `RESIDENCE_PERMIT_FACE_IMAGE` | `DRIVER_LICENSE_FACE_IMAGE` |
| Additional image | `IDCARD_ADDITIONAL_IMAGE` | `PASSPORT_ADDITIONAL_IMAGE` | `RESIDENCE_PERMIT_ADDITIONAL_IMAGE` | `DRIVER_LICENSE_ADDITIONAL_IMAGE` |
| AML check | `IDCARD_AML_CHECK` | `PASSPORT_AML_CHECK` | `RESIDENCE_PERMIT_AML_CHECK` | `DRIVER_LICENSE_AML_CHECK` |
| AML detail | `IDCARD_AML_DETAIL` | `PASSPORT_AML_DETAIL` | `RESIDENCE_PERMIT_AML_DETAIL` | `DRIVER_LICENSE_AML_DETAIL` |
| Note | `IDCARD_NOTE` | `PASSPORT_NOTE` | `RESIDENCE_PERMIT_NOTE` | `DRIVER_LICENSE_NOTE` |

## Address

| Field | Description |
| --- | --- |
| `ADDRESS_NAME`, `ADDRESS_NAME_EN` | Name on the proof of address |
| `ADDRESS_ISSUE_DATE`, `ADDRESS_EXPIRY_DATE` | Validity of the proof of address |
| `ADDRESS_STREET`, `ADDRESS_STREET_EN` | Street |
| `ADDRESS_STREET2`, `ADDRESS_STREET2_EN` | Street, second line |
| `ADDRESS_DIVISION`, `ADDRESS_DIVISION_EN` | State / province / division |
| `ADDRESS_CITY`, `ADDRESS_CITY_EN` | City |
| `ADDRESS_ZIP_CODE` | Postal code |
| `ADDRESS_COUNTRY` | Country |
| `ADDRESS_DOCUMENT_IMAGE` | Image of the proof-of-address document |
| `ADDRESS_NOTE` | Note |

## Contact

| Field | Description |
| --- | --- |
| `EMAIL` | Verified email address |
| `PHONE` | Verified phone number |

## External wallets

| Field | Network |
| --- | --- |
| `EXTERNAL_WALLET_BTC` | Bitcoin |
| `EXTERNAL_WALLET_ETH` | Ethereum |
| `EXTERNAL_WALLET_LTC` | Litecoin |
| `EXTERNAL_WALLET_BNB` | BNB Chain |
| `EXTERNAL_WALLET_POL` | Polygon |
| `EXTERNAL_WALLET_SOL` | Solana |

## Parent fields {#parent-fields}

A parent field stands for the same attribute on any document. The order accepts whichever of the listed fields the user has verified.

| Parent field | Resolves to one of |
| --- | --- |
| `NAME_PARENT_FIELD` | `IDCARD_NAME`, `PASSPORT_NAME`, `RESIDENCE_PERMIT_NAME`, `DRIVER_LICENSE_NAME`, `ADDRESS_NAME` |
| `NAME_EN_PARENT_FIELD` | `IDCARD_NAME_EN`, `PASSPORT_NAME_EN`, `RESIDENCE_PERMIT_NAME_EN`, `DRIVER_LICENSE_NAME_EN`, `ADDRESS_NAME_EN` |
| `DOB_PARENT_FIELD` | `IDCARD_DOB`, `PASSPORT_DOB`, `RESIDENCE_PERMIT_DOB`, `DRIVER_LICENSE_DOB` |
| `SEX_PARENT_FIELD` | `IDCARD_SEX`, `PASSPORT_SEX`, `RESIDENCE_PERMIT_SEX`, `DRIVER_LICENSE_SEX` |
| `FACE_IMAGE_PARENT_FIELD` | `IDCARD_FACE_IMAGE`, `PASSPORT_FACE_IMAGE`, `RESIDENCE_PERMIT_FACE_IMAGE`, `DRIVER_LICENSE_FACE_IMAGE` |

The delivered data names the concrete field that was used, for example `PASSPORT_DOB`.
