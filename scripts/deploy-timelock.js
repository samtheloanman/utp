const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying TimelockController with the account:", deployer.address);

  const TimelockController = await ethers.getContractFactory("TimelockController");
  // 1 hour delay, deployer is proposer and executor
  const timelock = await TimelockController.deploy(deployer.address, deployer.address, deployer.address);

  console.log("TimelockController deployed to:", await timelock.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
