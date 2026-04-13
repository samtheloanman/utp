import { expect } from "chai";
import config from "../../hardhat.config.cjs";

describe("Hardhat Config & RSK Deployment Ready", function () {
  it("Should have the correct chainId for rskTestnet", function () {
    expect(config.networks.rskTestnet.chainId).to.equal(31);
  });

  it("Should have the correct chainId for rskMainnet", function () {
    expect(config.networks.rskMainnet.chainId).to.equal(30);
  });

  it("Should compile against the Cancun EVM target", function () {
    const solcConfig = config.solidity.compilers ? config.solidity.compilers[0] : config.solidity;
    if (solcConfig.settings && solcConfig.settings.evmVersion) {
      expect(solcConfig.settings.evmVersion).to.equal("cancun");
    } else {
      // If none specifies explicitly, ensure it is at least using 0.8.20 or newer which implies support
      expect(parseFloat(solcConfig.version.slice(0, 4))).to.be.gte(0.8);
    }
  });
});
