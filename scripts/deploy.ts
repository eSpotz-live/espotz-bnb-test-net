import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("Network:", network.name);

  let USDT_ADDRESS: string;

  // Deploy MockUSDT for testnet, use real USDT for mainnet
  if (network.name === "bscTestnet" || network.name === "hardhat") {
    console.log("\n1. Deploying MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUsdt = await MockUSDT.deploy();
    await mockUsdt.waitForDeployment();
    USDT_ADDRESS = await mockUsdt.getAddress();
    console.log("   MockUSDT deployed to:", USDT_ADDRESS);

    // Mint 1,000,000 USDT to deployer (1,000,000 * 10^6 = 1,000,000,000,000)
    const mintAmount = ethers.parseUnits("1000000", 6);
    console.log("\n2. Minting 1,000,000 MockUSDT to deployer...");
    const mintTx = await mockUsdt.mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log("   Minted", ethers.formatUnits(mintAmount, 6), "MockUSDT to", deployer.address);
  } else {
    // Use real USDT address for mainnet
    USDT_ADDRESS = process.env.USDT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955"; // BSC Mainnet USDT
    console.log("\n1. Using existing USDT at:", USDT_ADDRESS);
  }

  // Deploy CollateralVault
  console.log("\n3. Deploying CollateralVault...");
  const CollateralVault = await ethers.getContractFactory("CollateralVault");
  const vault = await CollateralVault.deploy(USDT_ADDRESS);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("   CollateralVault deployed to:", vaultAddress);

  // Deploy PredictionMarket
  console.log("\n4. Deploying PredictionMarket...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(vaultAddress);
  await predictionMarket.waitForDeployment();
  const marketAddress = await predictionMarket.getAddress();
  console.log("   PredictionMarket deployed to:", marketAddress);

  // Authorize PredictionMarket in CollateralVault
  console.log("\n5. Authorizing PredictionMarket in CollateralVault...");
  const authTx = await vault.authorizeMarket(marketAddress);
  await authTx.wait();
  console.log("   PredictionMarket authorized in vault");

  // Deploy Tournament
  console.log("\n6. Deploying Tournament...");
  const Tournament = await ethers.getContractFactory("Tournament");
  const tournament = await Tournament.deploy(marketAddress, USDT_ADDRESS);
  await tournament.waitForDeployment();
  const tournamentAddress = await tournament.getAddress();
  console.log("   Tournament deployed to:", tournamentAddress);

  // Grant admin role to Tournament contract for market creation
  console.log("\n7. Granting admin role to Tournament...");
  const adminRole = await predictionMarket.DEFAULT_ADMIN_ROLE();
  const grantTx = await predictionMarket.grantRole(adminRole, tournamentAddress);
  await grantTx.wait();
  console.log("   Admin role granted to Tournament");

  // Summary
  console.log("\n========================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("----------------------------------------");
  console.log("USDT Token:", USDT_ADDRESS);
  console.log("CollateralVault:", vaultAddress);
  console.log("PredictionMarket:", marketAddress);
  console.log("Tournament:", tournamentAddress);
  console.log("========================================");

  // Verification commands
  console.log("\nVerification commands:");
  if (network.name === "bscTestnet") {
    console.log(`npx hardhat verify --network bscTestnet ${USDT_ADDRESS}`);
  }
  console.log(`npx hardhat verify --network ${network.name} ${vaultAddress} "${USDT_ADDRESS}"`);
  console.log(`npx hardhat verify --network ${network.name} ${marketAddress} "${vaultAddress}"`);
  console.log(`npx hardhat verify --network ${network.name} ${tournamentAddress} "${marketAddress}" "${USDT_ADDRESS}"`);

  // Save deployment addresses to file
  const fs = await import("fs");
  const deploymentInfo = {
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      USDT: USDT_ADDRESS,
      CollateralVault: vaultAddress,
      PredictionMarket: marketAddress,
      Tournament: tournamentAddress,
    },
  };

  const filename = `deployment-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
