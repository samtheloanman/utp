require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Offline/sandboxed compile: set SOLC_JS_PATH to a solc 0.8.24 soljson.js
// (e.g. from `npm i solc@0.8.24` in a scratch dir) to skip downloading the compiler.
if (process.env.SOLC_JS_PATH) {
    const { subtask } = require("hardhat/config");
    const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");
    subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
        if (args.solcVersion !== "0.8.24") return runSuper();
        return { compilerPath: process.env.SOLC_JS_PATH, isSolcJs: true, version: "0.8.24", longVersion: "0.8.24" };
    });
}

function resolveGasPrice(raw) {
    if (raw === undefined || raw === null) return "auto";
    const trimmed = String(raw).trim();
    if (!trimmed || trimmed.toLowerCase() === "auto") return "auto";
    if (!/^\d+$/.test(trimmed)) {
        throw new Error(`Invalid RSK_TESTNET_GAS_PRICE="${raw}": expected "auto" or a positive integer in wei`);
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid RSK_TESTNET_GAS_PRICE="${raw}": expected a positive safe integer in wei`);
    }
    return parsed;
}

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
    solidity: {
        version: "0.8.24",
        settings: {
            evmVersion: "cancun",
            viaIR: true,
            optimizer: {
                enabled: true,
                runs: 200,
            },
            remappings: [
                "sstore2/=contracts/lib/",
                "forge-std/=node_modules/forge-std/src/",
                "ds-test/=node_modules/ds-test/src/"
            ]
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        rskTestnet: {
            url: process.env.RSK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co",
            chainId: 31,
            gasPrice: resolveGasPrice(process.env.RSK_TESTNET_GAS_PRICE),
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : [],
        },
        rskMainnet: {
            url: process.env.RSK_MAINNET_RPC_URL || "https://public-node.rsk.co",
            chainId: 30,
            gasPrice: 60000000,
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : [],
        },
        utpAlpha: {
            url: process.env.UTP_ALPHA_RPC_URL || "http://127.0.0.1:8545",
            chainId: Number(process.env.UTP_ALPHA_CHAIN_ID || 99931),
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : [],
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache/hardhat",
        artifacts: "./artifacts",
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true",
        currency: "USD",
    },
};

Object.defineProperty(config, "resolveGasPrice", {
    value: resolveGasPrice,
    enumerable: false,
});

module.exports = config;
