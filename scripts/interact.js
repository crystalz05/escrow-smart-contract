const { ethers } = require("hardhat");

async function main() {
  const [client, freelancer] = await ethers.getSigners();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⚠️ REPLACE THIS with the actual deployed address from deploy.js output
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const escrowAddress = "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f";

  if (escrowAddress === "d") {
    console.error("❌ You need to paste your deployed contract address into this script first!");
    console.error("   Run: npx hardhat run scripts/deploy.js --network localhost");
    console.error("   Then copy the deployed address here.");
    process.exit(1);
  }

  // Attach to the already-deployed contract (doesn't deploy a new one)
  const escrow = await ethers.getContractAt("SimpleEscrow", escrowAddress);

  console.log("══════════════════════════════════════");
  console.log(" SimpleEscrow Interaction Script");
  console.log("══════════════════════════════════════\n");


  // ── Step 1: Fund the escrow ───────────────────
  console.log("Step 1: Funding escrow with 0.02 ETH...");
  const fundTx = await escrow.connect(client).fund({
    value: ethers.parseEther("0.02"),
  });
  await fundTx.wait();
  console.log("   ✅ Funded!");
  console.log(
    "   Contract balance:",
    ethers.formatEther(await escrow.getBalance()),
    "ETH"
  );

      // Cancelling test
  console.log("Testing cancelling order");
  const cancelledOrder = await escrow.connect(freelancer).cancel();
  await cancelledOrder.wait();

    // ── Step 1: Fund the escrow ───────────────────
  console.log("Step 1: Funding escrow Second Time with 0.02 ETH...");
  const fundTx2 = await escrow.connect(client).fund({
    value: ethers.parseEther("0.03"),
  });
  await fundTx2.wait();
  console.log("   ✅ Funded!");
  console.log(
    "   Contract balance:",
    ethers.formatEther(await escrow.getBalance()),
    "ETH"
  );


  // ── Step 2: Check status ──────────────────────
  const status = await escrow.getStatus();
  console.log(
    "\nStep 2: Status check →",
    `Status: ${status}`
  );
  

  // ── Step 3: Approve and release funds ─────────
  console.log("\nStep 3: Approving work — releasing funds to freelancer...");
  const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

  const approveTx = await escrow.connect(client).approve();
  await approveTx.wait();

  const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
  console.log("   ✅ Approved!");
  console.log(
    "   Contract balance:",
    ethers.formatEther(await escrow.getBalance()),
    "ETH"
  );
  console.log(
    "   Freelancer received:",
    ethers.formatEther(freelancerBalanceAfter - freelancerBalanceBefore),
    "ETH"
  );

  // ── Final status ──────────────────────────────
  const state = await escrow.getStatus();
  console.log(
    "\nFinal status →",
    `state: ${state}`
  );
  console.log("\n══════════════════════════════════════");
  console.log(" Done! Escrow lifecycle complete.");
  console.log("══════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
