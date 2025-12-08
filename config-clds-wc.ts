const BIP_8D = 10000n; // 1 basis point in 8 decimal format
const BIP_8D_5 = BIP_8D * 5n; // 5 basis points in 8 decimal format
const BIP_8D_10 = BIP_8D * 10n; // 10 basis points in 8 decimal format
const BIP_8D_25 = BIP_8D * 25n; // 25 basis points in 8 decimal format
const BIP_8D_50 = BIP_8D * 50n; // 50 basis points in 8 decimal format

const STD_WRITE_DELAY = 6_000; // Workers incrementally push updates with higher gas prices at 6-second intervals (3 blocks)

const workerIndex = parseInt(process.env.ADRASTIA_WORKER_INDEX ?? "1");
const instance = process.env.ADRASTIA_INSTANCE || "local";

const WORLDCHAIN_UPTIME_WEBHOOK_URL = process.env.WORLDCHAIN_UPTIME_WEBHOOK_URL;

const config: RegistryConfigChainlinkDataStreamsEvm = {
    address: "world_foundation",
    type: "chainlink-data-streams-evm",
    network: {
        type: "evm",
        chainId: 480,
        name: "worldChain",
        shortname: "wc",
        blockTime: 2000, // 2000ms
    },
    reportingOverride: {
        customerId: "worldchain",
    },
    clockSkewConfig: {
        minRecords: 3, // at least 3 records for clock skew estimation
        maxRecords: 11, // up to 11 records for clock skew estimation
        maxAge: 2 * 60 * 1000, // Only measure clock skew with records that are less than 2 minutes old
    },
    pollingInterval: 100, // 100ms
    onchainCacheTtl: workerIndex <= 2 ? 500 : workerIndex === 3 ? 1000 : 2000,
    instance: instance,
    updateDelay: STD_WRITE_DELAY * (workerIndex - 1),
    txConfig: {
        transactionTimeout: STD_WRITE_DELAY * 2,
        // Check for tx confirmations every 500ms on the primary and 1s on the others
        confirmationPollingInterval: workerIndex === 1 ? 500 : 1_000,
        // Wait up to 6 seconds for tx confirmations
        transactionConfirmationTimeout: 6_000,
        // Wait for 1 confirmation
        waitForConfirmations: 1,
        // Compute units budget
        gasLimit: 1_000_000n,
        txType: 2,
        eip1559: {
            // Gas prices are based on the 75th percentile
            percentile: 75,
            historicalBlocks: 4, // 8 seconds of blocks
            // Base fee multiplier of 1.25
            baseFeeMultiplierDividend: 125n,
            baseFeeMultiplierDivisor: 100n,
            // Priority fee is incrementally scaled based on worker index
            priorityFeeMultiplierDividend: 150n + BigInt(workerIndex - 1) * 50n,
            priorityFeeMultiplierDivisor: 100n,
            // Min priority fee (wei)
            minPriorityFee: 250n,
        },
        opGasPriceOracle: "0x420000000000000000000000000000000000000F", // Used for L1 fee calculation
    },
    multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11",
    chainlinkDataStreams: {
        endpoint: {
            hostname: process.env.CHAINLINK_DATASTREAMS_MAINNET_REST_HOSTNAME,
            wsHostname: process.env.CHAINLINK_DATASTREAMS_MAINNET_WS_HOSTNAME,
            clientId: process.env.CHAINLINK_DATASTREAMS_MAINNET_CLIENT_ID,
            clientSecret: process.env.CHAINLINK_DATASTREAMS_MAINNET_CLIENT_SECRET,
        },
    },
    uptime: {
        chainReadUptimeWebhookUrl: WORLDCHAIN_UPTIME_WEBHOOK_URL,
    },
    pools: {
        world_foundation: {
            "0-chainlink-data-streams": {
                workDefinition: {
                    checkParams: {
                        target: "0xe92ea17a074643326c8B5F11f579997eABfcD428", // AdrastiaWorldChainDataStreamsUpdater
                        executionDelay: 0,
                        feeds: [
                            {
                                feedId: "0x000362205e10b3a147d02792eccee483dca6c7b44ecce7012cb8c6e0b68b3ae9",
                                desc: "ETH/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x00039d9e45394f473ab1f050a1b963e6b05351e52d71e507509ada0c95ed75b8",
                                desc: "BTC/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x000365f820b0633946b78232bb91a97cf48100c426518e732465c3a050edb9f1",
                                desc: "WLD/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x00021f1c95b33f5e56fa5c07968c566586d0e6cea93c9fb79127915892de430d",
                                desc: "ezETH/ETH",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x0003b778d3f6b2ac4991302b89cb313f99a42467d6c9c5f96f57c29c0d2bc24f",
                                desc: "SOL/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x0003c16c6aed42294f5cb4741f6e59ba2d728f0eae2eb9e6d3f555808c59fc45",
                                desc: "XRP/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x0003b8b3f33c4c06a7947e86c5b4db4ef0991637d9821b9cdf897c0b5d488468",
                                desc: "XAUT/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x0007c129e624689953a2636c014531b2f0bd0c15f9a22211f53023354f309fa6",
                                desc: "WSRUSD/RUSD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x0003a7897feec498d6476f464a165ef4012fdfbba740115381e0761b45ee9e7c",
                                desc: "deUSD/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x000848d3adb3429cb99a6392b6679fc45852536a17f3353356825c4eb282c765",
                                desc: "ARS/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                            {
                                feedId: "0x0008b943a6e94c024eb38a19e31802180d12aa0cac4c7fd857c3112378f591aa",
                                desc: "EUR/USD",
                                heartbeat: 60, // 60 seconds
                                updateThreshold: BIP_8D,
                                earlyHeartbeat: 60 - 8, // Up to 8 seconds early; enough time to ensure the primary handles the majority of updates
                                earlyUpdateThreshold: (BIP_8D * 8n) / 10n,
                            },
                        ],
                    },
                    executionParams: {
                        target: "0xe92ea17a074643326c8B5F11f579997eABfcD428", // AdrastiaWorldChainDataStreamsUpdater
                        selector: "0x4585e33b", // performUpkeep(bytes)
                        flags: 1, // Active
                        minBatchSize: 1,
                        maxBatchSize: 100,
                    },
                },
            },
        },
    },
};

export default config;
