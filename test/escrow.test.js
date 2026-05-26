const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleEscrow", function () {
  // ─────────────────────────────────────────────────────
  // Shared setup: deploy a fresh contract before each test
  // ─────────────────────────────────────────────────────

  let escrow;        // the deployed contract instance
  let client;        // account[0] — the deployer / client
  let freelancer;    // account[1] — the freelancer
  let randomUser;    // account[2] — an unrelated address

  const ONE_ETH = ethers.parseEther("1.0");

  beforeEach(async function () {
    // Get test accounts from Hardhat's local node
    [client, freelancer, randomUser] = await ethers.getSigners();

    // Deploy a fresh SimpleEscrow before every single test
    // This ensures each test starts from a clean state
    const Escrow = await ethers.getContractFactory("SimpleEscrow");
    escrow = await Escrow.deploy(freelancer.address);
    await escrow.waitForDeployment();
  });

  // ═══════════════════════════════════════════════════════
  // ✅ HAPPY PATH TESTS — Things that SHOULD work
  // ═══════════════════════════════════════════════════════

  describe("Happy Path", function () {
    it("✅ Client can fund the escrow", async function () {
      // client calls fund() and sends 1 ETH along with the transaction
      await escrow.connect(client).fund({ value: ONE_ETH });

      // After funding, isFunded should be true
      expect(await escrow.isFunded()).to.be.true;

      // The stored amount should match what was sent
      expect(await escrow.amount()).to.equal(ONE_ETH);
    });

    it("✅ Balance updates after funding", async function () {
      // Before funding, contract balance is 0
      expect(await escrow.getBalance()).to.equal(0);

      await escrow.connect(client).fund({ value: ONE_ETH });

      // After funding, contract balance should be 1 ETH
      expect(await escrow.getBalance()).to.equal(ONE_ETH);
    });

    it("✅ Client can approve and freelancer receives funds", async function () {
      // First fund the escrow
      await escrow.connect(client).fund({ value: ONE_ETH });

      // Record freelancer's balance before approval
      const balanceBefore = await ethers.provider.getBalance(freelancer.address);

      // Client approves — this transfers funds to freelancer
      await escrow.connect(client).approve();

      // Check state changed
      expect(await escrow.isComplete()).to.be.true;

      // Check contract balance is now 0
      expect(await escrow.getBalance()).to.equal(0);

      // Check freelancer actually received the ETH
      const balanceAfter = await ethers.provider.getBalance(freelancer.address);
      expect(balanceAfter - balanceBefore).to.equal(ONE_ETH);
    });

    it("✅ Client can cancel and gets refund", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });

      // Record client's balance before cancellation
      const balanceBefore = await ethers.provider.getBalance(client.address);

      // Client cancels — this refunds the ETH back to client
      const tx = await escrow.connect(client).cancel();
      const receipt = await tx.wait();

      // Calculate gas cost so we can verify the exact refund
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      expect(await escrow.isCancelled()).to.be.true;
      expect(await escrow.getBalance()).to.equal(0);

      // Client should have received: previous balance + 1 ETH - gas
      const balanceAfter = await ethers.provider.getBalance(client.address);
      expect(balanceAfter).to.equal(balanceBefore + ONE_ETH - gasCost);
    });

    it("✅ Funded event is emitted on fund()", async function () {
      await expect(escrow.connect(client).fund({ value: ONE_ETH }))
        .to.emit(escrow, "Funded")
        .withArgs(client.address, ONE_ETH);
    });

    it("✅ Approved event is emitted on approve()", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });

      await expect(escrow.connect(client).approve())
        .to.emit(escrow, "Approved")
        .withArgs(freelancer.address, ONE_ETH);
    });

    it("✅ Cancelled event is emitted on cancel()", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });

      await expect(escrow.connect(client).cancel())
        .to.emit(escrow, "Cancelled")
        .withArgs(client.address, ONE_ETH);
    });

    it("✅ getStatus() returns correct state after each action", async function () {
      // Initial state: nothing has happened
      let [funded, complete, cancelled] = await escrow.getStatus();
      expect(funded).to.be.false;
      expect(complete).to.be.false;
      expect(cancelled).to.be.false;

      // After funding
      await escrow.connect(client).fund({ value: ONE_ETH });
      [funded, complete, cancelled] = await escrow.getStatus();
      expect(funded).to.be.true;
      expect(complete).to.be.false;
      expect(cancelled).to.be.false;

      // After approval
      await escrow.connect(client).approve();
      [funded, complete, cancelled] = await escrow.getStatus();
      expect(funded).to.be.true;
      expect(complete).to.be.true;
      expect(cancelled).to.be.false;
    });
  });

  // ═══════════════════════════════════════════════════════
  // ❌ REVERT TESTS — Things that SHOULD fail
  // ═══════════════════════════════════════════════════════

  describe("Access Control & Guards", function () {
    it("❌ Freelancer cannot call approve()", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });

      // freelancer tries to approve — should revert
      await expect(
        escrow.connect(freelancer).approve()
      ).to.be.revertedWith("Only client can approve");
    });

    it("❌ Cannot fund twice", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });

      // Trying to fund again should revert
      await expect(
        escrow.connect(client).fund({ value: ONE_ETH })
      ).to.be.revertedWith("Already funded");
    });

    it("❌ Cannot approve if not funded", async function () {
      // Trying to approve before any deposit
      await expect(
        escrow.connect(client).approve()
      ).to.be.revertedWith("Not funded yet");
    });

    it("❌ Cannot cancel after approved", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });
      await escrow.connect(client).approve();

      // Trying to cancel after approval — should revert
      await expect(
        escrow.connect(client).cancel()
      ).to.be.revertedWith("Already approved");
    });

    it("❌ Cannot approve after cancelled", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });
      await escrow.connect(client).cancel();

      // Trying to approve after cancellation — should revert
      await expect(
        escrow.connect(client).approve()
      ).to.be.revertedWith("Already cancelled");
    });

    it("❌ Random address cannot call cancel()", async function () {
      await escrow.connect(client).fund({ value: ONE_ETH });

      // A random address tries to cancel — should revert
      await expect(
        escrow.connect(randomUser).cancel()
      ).to.be.revertedWith("Only client can cancel");
    });

    it("❌ Random address cannot call fund()", async function () {
      // Someone other than the client tries to fund
      await expect(
        escrow.connect(randomUser).fund({ value: ONE_ETH })
      ).to.be.revertedWith("Only client can fund");
    });

    it("❌ Cannot fund with 0 ETH", async function () {
      await expect(
        escrow.connect(client).fund({ value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });
  });

  // ═══════════════════════════════════════════════════════
  // 🔍 CONSTRUCTOR TESTS
  // ═══════════════════════════════════════════════════════

  describe("Constructor", function () {
    it("Sets client and freelancer correctly", async function () {
      expect(await escrow.client()).to.equal(client.address);
      expect(await escrow.freelancer()).to.equal(freelancer.address);
    });

    it("❌ Cannot deploy with zero address as freelancer", async function () {
      const Escrow = await ethers.getContractFactory("SimpleEscrow");
      await expect(
        Escrow.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Freelancer cannot be zero address");
    });

    it("❌ Cannot deploy with client as freelancer", async function () {
      const Escrow = await ethers.getContractFactory("SimpleEscrow");
      await expect(
        Escrow.deploy(client.address)
      ).to.be.revertedWith("Freelancer cannot be client");
    });
  });
});
