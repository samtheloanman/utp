require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.24",
        settings: {
            viaIR: true,
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        rskTestnet: {
            url: process.env.RSK_TESTNET_RPC_URL || "https://public-node.testnet.rsk.co",
            chainId: 31,
            gasPrice: 60000000, // 0.06 gwei
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
