const { ethers } = require("hardhat");

async function main() {
  // ethers.getSigners() returns the accounts configured in hardhat.config.js
  // By default on Hardhat Network, you get 20 test accounts each with 10,000 ETH
  const [client, freelancer] = await ethers.getSigners();

  console.log("──────────────────────────────────────");
  console.log("Deploying SimpleEscrow...");
  console.log("──────────────────────────────────────");
  console.log("Client (deployer):", client.address);
  console.log("Freelancer:       ", freelancer.address);

  // getContractFactory loads the compiled contract ABI + bytecode
  const Escrow = await ethers.getContractFactory("SimpleEscrow");

  // .deploy() sends a transaction that creates the contract on-chain
  // The constructor argument is the freelancer's address
  const escrow = await Escrow.deploy(freelancer.address, 0, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

  // Wait for the deployment transaction to be mined
  await escrow.waitForDeployment();

  const deployedAddress = await escrow.getAddress();
  console.log("──────────────────────────────────────");
  console.log("✅ SimpleEscrow deployed to:", deployedAddress);
  console.log("──────────────────────────────────────");
  console.log("\nCopy this address into scripts/interact.js to interact with it.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
