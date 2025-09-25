import { AdrastiaConfig, BatchConfig } from "../../src/config/adrastia-config";

const BIP_8D = 10000n; // 1 basis point in 8 decimal format
const BIP_8D_5 = BIP_8D * 5n; // 5 basis points in 8 decimal format
const BIP_8D_10 = BIP_8D * 10n; // 10 basis points in 8 decimal format
const BIP_8D_25 = BIP_8D * 25n; // 25 basis points in 8 decimal format
const BIP_8D_50 = BIP_8D * 50n; // 50 basis points in 8 decimal format

const STD_WRITE_DELAY = 6_000; // Workers incrementally push updates with higher gas prices at 6-second intervals (3 blocks)

const workerIndex = parseInt(process.env.ADRASTIA_WORKER_INDEX ?? "1");

const WORLDCHAIN_UPTIME_WEBHOOK_URL = process.env.WORLDCHAIN_UPTIME_WEBHOOK_URL;

const STANDARD_BATCH_CONFIG: BatchConfig = {
    // Every node polls every 100ms
    pollingInterval: 100,
    writeDelay: STD_WRITE_DELAY * (workerIndex - 1),
    logging: [
        process.env.DD_AGENT_LOGGING_ENABLED === "true"
            ? {
                  // Default to datadog-agent logging if enabled (faster and more reliable)
                  type: "datadog-agent",
                  level: "notice",
              }
            : process.env.DATADOG_API_KEY
              ? {
                    type: "datadog",
                    sourceToken: process.env.DATADOG_API_KEY,
                    region: process.env.DATADOG_REGION,
                    level: "notice",
                }
              : undefined,
        process.env.ADRASTIA_LOGTAIL_TOKEN
            ? {
                  type: "logtail",
                  sourceToken: process.env.ADRASTIA_LOGTAIL_TOKEN,
                  level: "info",
              }
            : undefined,
    ],
    customerId: "worldchain",
    type: "chainlink-data-streams",
};

const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const config: AdrastiaConfig = {
    httpCacheSeconds: 0, // Unused
    chains: {
        worldChain: {
            blockTime: 2_000,
            txConfig: {
                transactionTimeout: STD_WRITE_DELAY * 2,
                txType: 2,
                eip1559: {
                    // Gas prices are based on the 75th percentile
                    percentile: 75,
                    historicalBlocks: 4, // 8 seconds of blocks
                    // Base fee multiplier of 1.25
                    baseFeeMultiplierDividend: 125n,
                    baseFeeMultiplierDivisor: 100n,
                    // Minimum priority fee of 250 wei
                    minPriorityFee: 250n,
                    // Priority fee is incrementally scaled based on worker index
                    priorityFeeMultiplierDividend: 150n + BigInt(workerIndex - 1) * 50n,
                    priorityFeeMultiplierDivisor: 100n,
                },
                // Check for tx confirmations every 500ms on the primary and 1s on the others
                confirmationPollingInterval: workerIndex === 1 ? 500 : 1_000,
                // Wait up to 6 seconds for tx confirmations
                transactionConfirmationTimeout: 6_000,
                // Wait for 1 confirmation for the primary, and 2 for the others
                waitForConfirmations: workerIndex === 1 ? 1 : 2,
                // Gas limit is hardcoded
                gasLimit: 1_000_000n,
                opGasPriceOracle: "0x420000000000000000000000000000000000000F", // Used for L1 fee calculation
            },
            multicall2Address: MULTICALL3_ADDRESS,
            chainlinkDataStreams: {
                endpoint: {
                    hostname: process.env.CHAINLINK_DATASTREAMS_MAINNET_REST_HOSTNAME,
                    wsHostname: process.env.CHAINLINK_DATASTREAMS_MAINNET_WS_HOSTNAME,
                    clientId: process.env.CHAINLINK_DATASTREAMS_MAINNET_CLIENT_ID,
                    clientSecret: process.env.CHAINLINK_DATASTREAMS_MAINNET_CLIENT_SECRET,
                },
                // Cache onchain data for 500ms to reduce load on the RPC (also invalidates after updates)
                // Primary and secondary cache for 500ms, tertiary caches for 1 second, others cache for 2 seconds
                onchainCacheTtl: workerIndex <= 2 ? 500 : workerIndex === 3 ? 1000 : 2000,
            },
            uptimeWebhookUrl: WORLDCHAIN_UPTIME_WEBHOOK_URL,
            batches: {
                0: {
                    ...STANDARD_BATCH_CONFIG,
                    batchId: "0-chainlink-data-streams",
                    clockSkew: {
                        minRecords: 3, // at least 3 records for clock skew estimation
                        maxRecords: 11, // up to 11 records for clock skew estimation
                        maxAge: 2 * 60 * 1000, // Only measure clock skew with records that are less than 2 minutes old
                    },
                },
            },
            oracles: [
                {
                    type: "chainlink-data-streams",
                    address: "0xe92ea17a074643326c8B5F11f579997eABfcD428", // AdrastiaWorldChainDataStreamsUpdater
                    tokens: [
                        {
                            address: "0x000362205e10b3a147d02792eccee483dca6c7b44ecce7012cb8c6e0b68b3ae9",
                            batch: 0,
                            extra: {
                                desc: "ETH/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x00039d9e45394f473ab1f050a1b963e6b05351e52d71e507509ada0c95ed75b8",
                            batch: 0,
                            extra: {
                                desc: "BTC/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x000365f820b0633946b78232bb91a97cf48100c426518e732465c3a050edb9f1",
                            batch: 0,
                            extra: {
                                desc: "WLD/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x00021f1c95b33f5e56fa5c07968c566586d0e6cea93c9fb79127915892de430d",
                            batch: 0,
                            extra: {
                                desc: "ezETH/ETH",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x0003b778d3f6b2ac4991302b89cb313f99a42467d6c9c5f96f57c29c0d2bc24f",
                            batch: 0,
                            extra: {
                                desc: "SOL/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x0003c16c6aed42294f5cb4741f6e59ba2d728f0eae2eb9e6d3f555808c59fc45",
                            batch: 0,
                            extra: {
                                desc: "XRP/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x0003b8b3f33c4c06a7947e86c5b4db4ef0991637d9821b9cdf897c0b5d488468",
                            batch: 0,
                            extra: {
                                desc: "XAUT/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x0007c129e624689953a2636c014531b2f0bd0c15f9a22211f53023354f309fa6",
                            batch: 0,
                            extra: {
                                desc: "WSRUSD/RUSD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        },
                        {
                            address: "0x0003a7897feec498d6476f464a165ef4012fdfbba740115381e0761b45ee9e7c",
                            batch: 0,
                            extra: {
                                desc: "deUSD/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D_10,
                                earlyUpdateTime: 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D_10 * 8n) / 10n,
                            },
                        },
                    ],
                },
            ],
        },
    },
};

export default config;
