# SimpleEscrow — Practice Project Spec
**Solidity Practice | Pre-Buildathon | May 2026**

---

## What You're Building

A basic escrow contract where:
- A client deposits ETH
- Funds are locked until the client approves
- On approval, funds release to the freelancer
- On dispute, client can cancel and get a refund

No Flutter. No frontend. Just Solidity + Hardhat scripts. The goal is to get comfortable writing, deploying, and interacting with a contract before May 25.

---

## Contract: SimpleEscrow.sol

### State Variables
```solidity
address public client       // person depositing funds
address public freelancer   // person receiving funds
uint256 public amount       // locked ETH amount
bool public isFunded        // has client deposited?
bool public isComplete      // has work been approved?
bool public isCancelled     // has escrow been cancelled?
```

### Functions

| Function | Who Calls It | What It Does |
|---|---|---|
| `fund()` | Client | Deposits ETH, locks it in contract |
| `approve()` | Client | Releases funds to freelancer |
| `cancel()` | Client | Cancels escrow, refunds client |
| `getBalance()` | Anyone | Returns current contract balance |
| `getStatus()` | Anyone | Returns current escrow state |

### Rules to Enforce
- Only client can call `approve()` and `cancel()`
- Cannot fund twice
- Cannot approve if not funded
- Cannot cancel after already approved
- Cannot approve after already cancelled

### Events
```solidity
Funded(address client, uint256 amount)
Approved(address freelancer, uint256 amount)
Cancelled(address client, uint256 amount)
```

---

## Full Contract Code (Starting Point)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleEscrow {
    address public client;
    address public freelancer;
    uint256 public amount;
    bool public isFunded;
    bool public isComplete;
    bool public isCancelled;

    event Funded(address client, uint256 amount);
    event Approved(address freelancer, uint256 amount);
    event Cancelled(address client, uint256 amount);

    constructor(address _freelancer) {
        client = msg.sender;
        freelancer = _freelancer;
    }

    function fund() public payable {
        require(msg.sender == client, "Only client can fund");
        require(!isFunded, "Already funded");
        require(msg.value > 0, "Must send ETH");
        amount = msg.value;
        isFunded = true;
        emit Funded(client, amount);
    }

    function approve() public {
        require(msg.sender == client, "Only client can approve");
        require(isFunded, "Not funded yet");
        require(!isCancelled, "Already cancelled");
        require(!isComplete, "Already complete");
        isComplete = true;
        payable(freelancer).transfer(amount);
        emit Approved(freelancer, amount);
    }

    function cancel() public {
        require(msg.sender == client, "Only client can cancel");
        require(isFunded, "Not funded yet");
        require(!isComplete, "Already approved");
        require(!isCancelled, "Already cancelled");
        isCancelled = true;
        payable(client).transfer(amount);
        emit Cancelled(client, amount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getStatus() public view returns (
        bool funded,
        bool complete,
        bool cancelled
    ) {
        return (isFunded, isComplete, isCancelled);
    }
}
```

---

## Project Structure

```
simple-escrow/
├── contracts/
│   └── SimpleEscrow.sol
├── scripts/
│   ├── deploy.js
│   └── interact.js
├── test/
│   └── escrow.test.js
├── hardhat.config.js
└── README.md
```

---

## Setup Steps

```bash
mkdir simple-escrow
cd simple-escrow
npx hardhat init
# choose: Create a JavaScript project
npm install --save-dev @nomicfoundation/hardhat-toolbox
```

---

## Deploy Script (scripts/deploy.js)

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [client, freelancer] = await ethers.getSigners();

  console.log("Deploying with client:", client.address);
  console.log("Freelancer address:", freelancer.address);

  const Escrow = await ethers.getContractFactory("SimpleEscrow");
  const escrow = await Escrow.deploy(freelancer.address);
  await escrow.waitForDeployment();

  console.log("SimpleEscrow deployed to:", await escrow.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

---

## Interact Script (scripts/interact.js)

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [client, freelancer] = await ethers.getSigners();
  const escrowAddress = "YOUR_DEPLOYED_ADDRESS_HERE";

  const escrow = await ethers.getContractAt("SimpleEscrow", escrowAddress);

  // Step 1: Fund the escrow
  console.log("Funding escrow...");
  const fundTx = await escrow.connect(client).fund({
    value: ethers.parseEther("0.01")
  });
  await fundTx.wait();
  console.log("Funded. Balance:", ethers.formatEther(await escrow.getBalance()), "ETH");

  // Step 2: Check status
  const status = await escrow.getStatus();
  console.log("Status — Funded:", status.funded, "| Complete:", status.complete, "| Cancelled:", status.cancelled);

  // Step 3: Approve and release funds
  console.log("Approving...");
  const approveTx = await escrow.connect(client).approve();
  await approveTx.wait();
  console.log("Approved. Balance now:", ethers.formatEther(await escrow.getBalance()), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

---

## Tests to Write (test/escrow.test.js)

Write a test for each of these scenarios. Each one should either pass or revert as expected:

```
✅ Client can fund the escrow
✅ Balance updates after funding
✅ Client can approve and freelancer receives funds
✅ Client can cancel and gets refund
❌ Freelancer cannot call approve()
❌ Cannot fund twice
❌ Cannot approve if not funded
❌ Cannot cancel after approved
❌ Cannot approve after cancelled
❌ Random address cannot call cancel()
```

The ❌ ones should all revert — that's your contract enforcing rules. If they don't revert, your contract has a bug.

---

## Running Everything

```bash
# Run local hardhat network
npx hardhat node

# Deploy (in new terminal)
npx hardhat run scripts/deploy.js --network localhost

# Interact
npx hardhat run scripts/interact.js --network localhost

# Run tests
npx hardhat test
```

---

## What This Teaches You

| Concept | Where You'll See It |
|---|---|
| `msg.sender` | Every require() check |
| `msg.value` | fund() function |
| `require()` | All access control |
| `payable` | approve() and cancel() transfers |
| Events | Funded, Approved, Cancelled |
| Contract state | isFunded, isComplete, isCancelled |
| Hardhat deploy | deploy.js |
| Hardhat interact | interact.js |
| Writing tests | escrow.test.js |

All of these appear directly in TakturnsGroup.sol. Nothing you learn here is wasted.

---

## After You Finish

Once all 10 tests pass and the interact script runs cleanly, you're ready for Takturns. The jump from this to TakturnsGroup.sol is just adding:
- Multiple members instead of two parties
- USDC token transfers instead of raw ETH
- Rotation logic instead of single approval
- Cycle tracking instead of one-time escrow

Same fundamentals, more moving parts.

---

*Finish this before May 25. Everything after is just scale.*
