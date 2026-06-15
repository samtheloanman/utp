const hre = require("hardhat");

async function main() {
  console.log("Deploying UTPPolling...");

  const UTPPolling = await hre.ethers.getContractFactory("UTPPolling");
  const utpPolling = await UTPPolling.deploy();

  await utpPolling.waitForDeployment();
  const address = await utpPolling.getAddress();

  console.log("UTPPolling deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
