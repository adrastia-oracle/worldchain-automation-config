import { AdrastiaConfig, BatchConfig } from "../../src/config/adrastia-config";

const BIP_8D = 10000n; // 1 basis point in 8 decimal format

const STD_WRITE_DELAY = 4_000; // Workers incrementally push updates with higher gas prices at 4-second intervals (2 blocks)

const workerIndex = parseInt(process.env.ADRASTIA_WORKER_INDEX ?? "1");

const WORLDCHAIN_UPTIME_WEBHOOK_URL = process.env.WORLDCHAIN_UPTIME_WEBHOOK_URL;

const STANDARD_BATCH_CONFIG: BatchConfig = {
    // Every node polls every 10ms
    pollingInterval: 10,
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
                },
                // Gas prices are incrementally scaled based on worker index
                gasPriceMultiplierDividend: 200n + BigInt(workerIndex - 1) * 50n,
                gasPriceMultiplierDivisor: 100n,
                // Check for tx confirmations every 500ms on the primary and 1s on the others
                confirmationPollingInterval: workerIndex === 1 ? 500 : 1_000,
                // Wait up to 6 seconds for tx confirmations
                transactionConfirmationTimeout: 6_000,
                // Wait for 1 confirmation for the primary, and 2 for the others
                waitForConfirmations: workerIndex === 1 ? 1 : 2,
                // Gas limit is hardcoded
                gasLimit: 1_000_000n,
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
                },
            },
            oracles: [
                {
                    type: "chainlink-data-streams",
                    address: "0x4dd2886836eB5966dd2F5a223182E7889CD7F8a6", // AdrastiaWorldChainDataStreamsUpdater
                    tokens: [
                        {
                            address: "0x000362205e10b3a147d02792eccee483dca6c7b44ecce7012cb8c6e0b68b3ae9",
                            batch: 0,
                            extra: {
                                desc: "ETH/USD",
                                heartbeat: 30, // 30 seconds
                                updateThreshold: BIP_8D / 10n, // 0.1 bips, 0.001%
                                earlyUpdateTime: 15, // 15 seconds
                                earlyUpdateThreshold: BIP_8D / 20n, // 0.05 bips, 0.0005%
                            },
                        },
                        {
                            address: "0x00039d9e45394f473ab1f050a1b963e6b05351e52d71e507509ada0c95ed75b8",
                            batch: 0,
                            extra: {
                                desc: "BTC/USD",
                                heartbeat: 30, // 30 seconds
                                updateThreshold: BIP_8D / 10n, // 0.1 bips, 0.001%
                                earlyUpdateTime: 15, // 15 seconds
                                earlyUpdateThreshold: BIP_8D / 20n, // 0.05 bips, 0.0005%
                            },
                        },
                        {
                            address: "0x000365f820b0633946b78232bb91a97cf48100c426518e732465c3a050edb9f1",
                            batch: 0,
                            extra: {
                                desc: "WLD/USD",
                                heartbeat: 30, // 30 seconds
                                updateThreshold: BIP_8D / 10n, // 0.1 bips, 0.001%
                                earlyUpdateTime: 15, // 15 seconds
                                earlyUpdateThreshold: BIP_8D / 20n, // 0.05 bips, 0.0005%
                            },
                        },
                    ],
                },
            ],
        },
    },
};

export default config;
