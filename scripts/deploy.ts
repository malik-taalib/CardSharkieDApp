import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // The deployer is also the oracle for testnet (you'll change this for mainnet)
  const oracleAddress = deployer.address;
  const feeBps = 500; // 5% platform fee

  const CardSharkieEscrow = await ethers.getContractFactory("CardSharkieEscrow");
  const escrow = await CardSharkieEscrow.deploy(oracleAddress, feeBps);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("CardSharkieEscrow deployed to:", address);
  console.log("Oracle:", oracleAddress);
  console.log("Fee:", feeBps, "bps (5%)");
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network baseSepolia ${address} ${oracleAddress} ${feeBps}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
