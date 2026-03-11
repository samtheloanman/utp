import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PluginRegistry", function () {
  let dao, pluginRegistry;
  let owner, plugin1, plugin2, unauthorized;

  beforeEach(async function () {
    [owner, plugin1, plugin2, unauthorized] = await ethers.getSigners();

    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy();

    // Deploy PluginRegistry
    const PluginRegistry = await ethers.getContractFactory("PluginRegistry");
    pluginRegistry = await PluginRegistry.deploy(await dao.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct DAO address", async function () {
      expect(await pluginRegistry.dao()).to.equal(await dao.getAddress());
    });

    it("Should start with zero plugins", async function () {
      expect(await pluginRegistry.pluginCount()).to.equal(0);
    });
  });

  describe("Installing Plugins", function () {
    it("Should allow ROOT_PERMISSION holders to install plugins", async function () {
      await pluginRegistry.installPlugin(plugin1.address);

      const plugin = await pluginRegistry.plugins(plugin1.address);
      expect(plugin.active).to.be.true;
      expect(plugin.index).to.equal(0);
      expect(await pluginRegistry.pluginCount()).to.equal(1);
    });

    it("Should prevent unauthorized users from installing plugins", async function () {
      await expect(
        pluginRegistry.connect(unauthorized).installPlugin(plugin1.address)
      ).to.be.revertedWithCustomError(pluginRegistry, "Unauthorized");
    });

    it("Should prevent installing the same plugin twice", async function () {
      await pluginRegistry.installPlugin(plugin1.address);

      await expect(
        pluginRegistry.installPlugin(plugin1.address)
      ).to.be.revertedWithCustomError(pluginRegistry, "PluginAlreadyInstalled");
    });

    it("Should emit PluginInstalled event", async function () {
      await expect(pluginRegistry.installPlugin(plugin1.address))
        .to.emit(pluginRegistry, "PluginInstalled")
        .withArgs(plugin1.address);
    });

    it("Should track multiple plugins correctly", async function () {
      await pluginRegistry.installPlugin(plugin1.address);
      await pluginRegistry.installPlugin(plugin2.address);

      expect(await pluginRegistry.pluginCount()).to.equal(2);

      const plugin1Data = await pluginRegistry.plugins(plugin1.address);
      const plugin2Data = await pluginRegistry.plugins(plugin2.address);

      expect(plugin1Data.active).to.be.true;
      expect(plugin1Data.index).to.equal(0);

      expect(plugin2Data.active).to.be.true;
      expect(plugin2Data.index).to.equal(1);

      expect(await pluginRegistry.pluginList(0)).to.equal(plugin1.address);
      expect(await pluginRegistry.pluginList(1)).to.equal(plugin2.address);
    });
  });

  describe("Uninstalling Plugins", function () {
    beforeEach(async function () {
      await pluginRegistry.installPlugin(plugin1.address);
      await pluginRegistry.installPlugin(plugin2.address);
    });

    it("Should allow ROOT_PERMISSION holders to uninstall plugins", async function () {
      await pluginRegistry.uninstallPlugin(plugin1.address);

      const plugin = await pluginRegistry.plugins(plugin1.address);
      expect(plugin.active).to.be.false;
      expect(await pluginRegistry.pluginCount()).to.equal(1);
    });

    it("Should prevent unauthorized users from uninstalling plugins", async function () {
      await expect(
        pluginRegistry.connect(unauthorized).uninstallPlugin(plugin1.address)
      ).to.be.revertedWithCustomError(pluginRegistry, "Unauthorized");
    });

    it("Should prevent uninstalling a plugin that is not installed", async function () {
      const nonInstalledPlugin = unauthorized.address;

      await expect(
        pluginRegistry.uninstallPlugin(nonInstalledPlugin)
      ).to.be.revertedWithCustomError(pluginRegistry, "PluginNotInstalled");
    });

    it("Should emit PluginUninstalled event", async function () {
      await expect(pluginRegistry.uninstallPlugin(plugin1.address))
        .to.emit(pluginRegistry, "PluginUninstalled")
        .withArgs(plugin1.address);
    });

    it("Should correctly reorganize plugin list after uninstall", async function () {
      // Get additional signers not already used as plugins
      const signers = await ethers.getSigners();
      const p3 = signers[4];

      await pluginRegistry.installPlugin(p3.address);

      expect(await pluginRegistry.pluginCount()).to.equal(3);

      // Uninstall the first one (plugin1)
      await pluginRegistry.uninstallPlugin(plugin1.address);

      // The last plugin (p3) should now be at plugin1's old index (0)
      expect(await pluginRegistry.pluginList(0)).to.equal(p3.address);
      expect(await pluginRegistry.pluginList(1)).to.equal(plugin2.address);
      expect(await pluginRegistry.pluginCount()).to.equal(2);

      // p3's index should be updated
      const p3Data = await pluginRegistry.plugins(p3.address);
      expect(p3Data.index).to.equal(0);
    });

    it("Should handle uninstalling all plugins", async function () {
      await pluginRegistry.uninstallPlugin(plugin1.address);
      await pluginRegistry.uninstallPlugin(plugin2.address);

      expect(await pluginRegistry.pluginCount()).to.equal(0);
    });

    it("Should allow reinstalling a previously uninstalled plugin", async function () {
      await pluginRegistry.uninstallPlugin(plugin1.address);
      await pluginRegistry.installPlugin(plugin1.address);

      const plugin = await pluginRegistry.plugins(plugin1.address);
      expect(plugin.active).to.be.true;
      expect(await pluginRegistry.pluginCount()).to.equal(2);
    });
  });

  describe("Plugin Queries", function () {
    beforeEach(async function () {
      await pluginRegistry.installPlugin(plugin1.address);
      await pluginRegistry.installPlugin(plugin2.address);
    });

    it("Should return correct plugin count", async function () {
      expect(await pluginRegistry.pluginCount()).to.equal(2);
    });

    it("Should return plugin by index", async function () {
      expect(await pluginRegistry.pluginList(0)).to.equal(plugin1.address);
      expect(await pluginRegistry.pluginList(1)).to.equal(plugin2.address);
    });

    it("Should return plugin metadata", async function () {
      const plugin1Data = await pluginRegistry.plugins(plugin1.address);
      expect(plugin1Data.active).to.be.true;
      expect(plugin1Data.index).to.equal(0);
    });
  });
});
