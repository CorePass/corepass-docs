---
title: Deployment information
sidebar_position: 4
---

Here is the information and environment variables you need to deploy CorePass Connector instance.

## Blockchain registry address

| Environment | Network | Network ID |                    Address                     |                                          Explore                                          |
| ----------- | :-----: | :--------: | :--------------------------------------------: | :---------------------------------------------------------------------------------------: |
| DEVELOP     | testnet |     3      | 0xab37b84aa383a120ea3059777e8375b51b71d4362e2b | [Link](https://devin.blockindex.net/address/ab37b84aa383a120ea3059777e8375b51b71d4362e2b) |
| STAGING     | testnet |     3      | 0xab5562c2fb3003ffcb529c2e89c469d66ffc50fb2373 | [Link](https://devin.blockindex.net/address/ab5562c2fb3003ffcb529c2e89c469d66ffc50fb2373) |
| TESTNET     | testnet |     3      | 0xab88340527ee0fad6a742f3ae24db896dcc5c4697ba4 | [Link](https://devin.blockindex.net/address/ab88340527ee0fad6a742f3ae24db896dcc5c4697ba4) |
| PRODUCTION  | mainnet |     1      |                  Comming soon                  |                                         [Link](#)                                          |

## Dependencies

| Dependency | Supported version |
| :--------: | :---------------: |
| PostgreSQL |       +14.6       |
|    NATS    |      +2.9.X       |
|   Redis    |      +7.0.X       |

## Helm packages list

| Name                            | Application Version | Package Version |
| ------------------------------- | :-----------------: | :-------------: |
| connector-blockchain-migrations |        1.4.1        |      1.0.3      |
| connector-blockchain-service    |        1.4.1        |      1.0.6      |
| connector-callback-service      |        1.2.1        |      1.0.3      |
| connector-gateway-service       |        1.4.0        |      1.1.2      |
| connector-kyc-migrations        |        1.4.1        |      1.0.4      |
| connector-kyc-service           |        1.4.1        |      1.0.6      |
| connector-login-service         |        1.2.0        |      1.0.4      |
| hydra-core                      |       1.11.10       |      1.0.2      |
| hydra-migration                 |       1.11.10       |      1.0.1      |

## Environment variables

### Connector Blockchain Migrations

| Key                    | Value             | Description                          |
| :--------------------- | :-----------------| ------------------------------------ |
| changeLogFile          | changelog.xml     | Default path of migrations changelog |
| databaseHost           | DATABASE_ADDRESS  | Database FQDN or IP                  |
| databaseName           | DATABASE_DB_NAME  | Database db name                     |
| databasePassword       | DATABASE_PASSWORD | Database password                    |
| databasePort           | DATABASE_PORT     | Database port                        |
| databaseUsername       | DATABASE_USERNAME | Database username                    |

### Connector Blockchain Service

| Key                               | Value                                                 | Description                                  |
| :-------------------------------- | :---------------------------------------------------- | -------------------------------------------- |
| KYC_SERVICE_NAME                  | connector-kyc-service                                 | Connector KYC service name                   |
| KYC_SERVICE_URL                   | connector-kyc-service:9090                            | Connector KYC GRPC address                   |
| NATS_BATCH_INTERVAL               | 60                                                    | Batch transaction interval in seconds        |
| NATS_BATCH_MAX_TX                 | 60                                                    | Max transaction for batching transaction     |
| NATS_CONFIRM_TOPIC                | blockchain-confirm                                    | NATS stream name for blockchain confirmation |
| NATS_INIT_TOPIC                   | blockchain-init                                       | NATS stream name for blockchain init         |
| NATS_NKEY                         | PRIVATE_KEY                                           | NATS nKey for authentication                 |
| NATS_URL                          | nats://NATS_ADDRESS:4222                              | NATS connection URL                          |
| POSTGRES_URL                      | postgres://USERNAME:PASSWORD@DB_ADDRESS:5432/DATABASE | PostgreSQL database URL                      |
| PRIVATE_KEY_BACKUP                | PRIVATE_KEY                                           |                                              |
| PRIVATE_KEY_CONFIRM               | PRIVATE_KEY                                           |                                              |
| PRIVATE_KEY_INIT                  | PRIVATE_KEY                                           |                                              |
| PROVIDER_URL                      | https://xcbapi.corecoin.cc                            | Core Blockchain RPC address                  |
| REDIS_MASTER_NAME                 | null                                                  | Redis Sentinel master name (Optional)        |
| REDIS_URI                         | redis://:PASSWORD@redis:6379/0                        | Redis URI (Universal Client)                 |
| REGISTRY_CONTRACT_ADDRESS         | REGISTRY_ADDRESS                                      | KYC registry address of core blockchain      |
| RETRY_COUNT                       | 3                                                     | Number of retry in confirm and initiate      |
| SENTRY_ATTACH_STACKTRACE          | false                                                 |                                              |
| SENTRY_DEBUG                      | false                                                 |                                              |
| SENTRY_DSN                        | https://SECRET@sentry.corepassdev.eu/6                | Sentry DSN for sending debug data            |
| SENTRY_ENABLE_TRACING             | false                                                 |                                              |
| SENTRY_SEND_DEFAULT_PII           | false                                                 |                                              |
| SENTRY_TRACES_SAMPLE_RATE_PERCENT | 0                                                     |                                              |
| SERVER_GRPC_ADDRESS               | 0.0.0.0:9090                                          | Service GRPC address bind                    |
| SERVER_HTTP_ADDRESS               | 0.0.0.0:8080                                          | Service HTTP address bind                    |
| ZAP_LOG_LEVEL                     | 1                                                     | Zap log level                                |

### Connector Callback Service

| Key                               | Value                                      | Description                          |
| :---------------------------------| :------------------------------------------| ------------------------------------ |
| NATS_CALLBACK_DURATION            | Minute                                     |                                      |
| NATS_CALLBACK_FAILURE             | failure                                    |                                      |
| NATS_CALLBACK_FINAL               | final                                      |                                      |
| NATS_CALLBACK_PREFIX              | CALLBACKS                                  |                                      |
| NATS_CALLBACK_SUCCEED             | succeed                                    |                                      |
| NATS_CALLBACK_TOPICS              | "1,5,10,60,120"                            |                                      |
| NATS_NKEY                         | PRIVATE_KEY                                | NATS nKey for authentication         |
| NATS_URL                          | nats://FQDN:4222                           | NATS connection URL                  |
| SENTRY_ATTACH_STACKTRACE          | false                                      |                                      |
| SENTRY_DEBUG                      | false                                      |                                      |
| SENTRY_DSN                        | https://SECRET@sentry.corepassdev.eu/6     | Sentry DSN for sending debug data    |
| SENTRY_ENABLE_TRACING             | false                                      |                                      |
| SENTRY_SEND_DEFAULT_PII           | false                                      |                                      |
| SENTRY_TRACES_SAMPLE_RATE_PERCENT | 0                                          |                                      |
| SERVER_HTTP_ADDRESS               | 0.0.0.0:8080                               | Service HTTP address bind            |

### Connector Gateway Service

| Key                                 | Value                                  | Description                             |
| :-----------------------------------| :------------------------------------- | --------------------------------------- |
| BLOCKCHAIN_SERVICE_NAME             | connector-blockchain-service           | Connector blockchain service name       |
| BLOCKCHAIN_SERVICE_URL              | connector-blockchain-service:9090      | Connector blockchain GRPC address       |
| HYDRA_PUBLIC_URL                    | http://hydra-core:4444                 | Ory Hydra public interface              |
| KYC_SERVICE_NAME                    | connector-kyc-service                  | Connector KYC service name              |
| KYC_SERVICE_URL                     | connector-kyc-service:9090             | Connector KYC GRPC address              |
| LOGIN_SERVICE_NAME                  | connector-login-service                | Connector login service name            |
| LOGIN_SERVICE_URL                   | connector-login-service:9090           | Connector login GRPC address            |
| NETWORK_ID                          | 3                                      | Core Blockchain network ID              |
| PRIVATE_SERVER_HTTP_ADDRESS         | 0.0.0.0:8081                           | Private interface for internal services |
| SENTRY_ATTACH_STACKTRACE            | false                                  |                                         |
| SENTRY_DEBUG                        | false                                  |                                         |
| SENTRY_DSN                          | https://SECRET@sentry.corepassdev.eu/6 | Sentry DSN for sending debug data       |
| SENTRY_ENABLE_TRACING               | false                                  |                                         |
| SENTRY_SEND_DEFAULT_PII             | false                                  |                                         |
| SENTRY_TRACES_SAMPLE_RATE_PERCENT   | 0                                      |                                         |
| SERVER_HTTP_ADDRESS                 | 0.0.0.0:8080                           | Public interface for clients            |

### Connector KYC Migrations

| Key                    | Value             | Description                          |
| :--------------------- | :-----------------| ------------------------------------ |
| changeLogFile          | changelog.xml     | Default path of migrations changelog |
| databaseHost           | DATABASE_ADDRESS  | Database FQDN or IP                  |
| databaseName           | DATABASE_DB_NAME  | Database db name                     |
| databasePassword       | DATABASE_PASSWORD | Database password                    |
| databasePort           | DATABASE_PORT     | Database port                        |
| databaseUsername       | DATABASE_USERNAME | Database username                    |

### Connector KYC Service

| Key                                  | Value                                                 | Description                                  |
| :------------------------------------| :---------------------------------------------------- | -------------------------------------------- |
| BLOCKCHAIN_REQUESTER_ADDRESS         | WALLET_ADDRESS                                        |                                              |
| BLOCKCHAIN_SERVICE_NAME              | connector-blockchain-service                          | Connector blockchain service name            |
| BLOCKCHAIN_SERVICE_URL               | connector-blockchain-service:9090                     | Connector blockchain GRPC address            |
| GATEWAY_PUBLIC_ADDRESS               | https://auth.example.com                              | CorePass connector public FQDN               |
| NATS_CALLBACK_FAILURE                | failure                                               |                                              |
| NATS_CALLBACK_FINAL                  | final                                                 |                                              |
| NATS_CALLBACK_PREFIX                 | CALLBACKS                                             |                                              |
| NATS_CALLBACK_RETRY                  | 1Minute                                               |                                              |
| NATS_CALLBACK_SUCCEED                | succeed                                               |                                              |
| NATS_CONFIRM_TOPIC                   | blockchain-confirm                                    | NATS stream name for blockchain confirmation |
| NATS_INIT_TOPIC                      | blockchain-init                                       | NATS stream name for blockchain init         |
| NATS_NKEY                            | PRIVATE_KEY                                           | NATS nKey for authentication                 |
| NATS_URL                             | nats://FQDN:4222                                      | NATS connection URL                          |
| NETWORK_ID                           | 3                                                     | Core Blockchain network ID                   |
| POSTGRES_URL                         | postgres://USERNAME:PASSWORD@DB_ADDRESS:5432/DATABASE | PostgreSQL database URL                      |
| PRIVATE_KEY_SIGNATURE                | PRIVATE_KEY                                           |                                              |
| REDIS_MASTER_NAME                    | null                                                  | Redis Sentinel master name (Optional)        |
| REDIS_URI                            | redis://:PASSWORD@redis:6379/0                        | Redis URI (Universal Client)                 |
| SENTRY_ATTACH_STACKTRACE             | false                                                 |                                              |
| SENTRY_DEBUG                         | false                                                 |                                              |
| SENTRY_DSN                           | https://SECRET@sentry.corepassdev.eu/6                | Sentry DSN for sending debug data            |
| SENTRY_ENABLE_TRACING                | false                                                 |                                              |
| SENTRY_SEND_DEFAULT_PII              | false                                                 |                                              |
| SENTRY_TRACES_SAMPLE_RATE_PERCENT    | 0                                                     |                                              |
| SERVER_GRPC_ADDRESS                  | 0.0.0.0:9090                                          | Service GRPC address bind                    |
| SERVER_HTTP_ADDRESS                  | 0.0.0.0:8080                                          | Service HTTP address bind                    |
| ZAP_LOG_LEVEL                        | 1                                                     | Zap log level                                |

### Connector Login Service

| Key                               | Value                                  | Description                            |
| :---------------------------------| :------------------------------------- | -------------------------------------- |
| GATEWAY_PUBLIC_ADDRESS            | https://auth.example.com               | CorePass connector public FQDN         |
| HYDRA_ADMIN_URL                   | http://hydra-core:4445                 | Ory Hydra admin interface              |
| NETWORK_ID                        | 3                                      | Core Blockchain network ID             |
| REDIS_MASTER_NAME                 | null                                   | Redis Sentinel master name (Optional)  |
| REDIS_URI                         | redis://:PASSWORD@redis:6379/0         | Redis URI (Universal Client)           |
| SALT                              | SECRET                                 | Random string                          |
| SENTRY_ATTACH_STACKTRACE          | false                                  |                                        |
| SENTRY_DEBUG                      | false                                  |                                        |
| SENTRY_DSN                        | https://SECRET@sentry.corepassdev.eu/6 | Sentry DSN for sending debug data      |
| SENTRY_ENABLE_TRACING             | false                                  |                                        |
| SENTRY_SEND_DEFAULT_PII           | false                                  |                                        |
| SENTRY_TRACES_SAMPLE_RATE_PERCENT | 0                                      |                                        |
| SERVER_GRPC_ADDRESS               | 0.0.0.0:9090                           | Service GRPC address bind              |
| SERVER_HTTP_ADDRESS               | 0.0.0.0:8080                           | Service HTTP address bind              |
| ZAP_LOG_LEVEL                     | 1                                      | Zap log level                          |
