// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title SimpleEscrow
/// @notice A basic two-party escrow: client deposits ETH, then either
///         approves (releasing funds to the freelancer) or cancels (refunding themselves).
contract SimpleEscrow {
    // ──────────────────────────────────────────────
    // State Variables
    // ──────────────────────────────────────────────

    /// @notice The address that deployed the contract and deposited funds
    address public client;

    /// @notice The address that will receive funds on approval
    address public freelancer;

    /// @notice The amount of ETH locked in escrow (in wei)
    uint256 public amount;

    /// @notice Whether the client has already deposited funds
    bool public isFunded;

    /// @notice Whether the client has approved and funds have been released
    bool public isComplete;

    /// @notice Whether the escrow has been cancelled and funds refunded
    bool public isCancelled;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when the client deposits ETH into the escrow
    event Funded(address client, uint256 amount);

    /// @notice Emitted when the client approves and funds are sent to the freelancer
    event Approved(address freelancer, uint256 amount);

    /// @notice Emitted when the client cancels and receives a refund
    event Cancelled(address client, uint256 amount);

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────

    /// @notice Sets the client (deployer) and freelancer addresses
    /// @param _freelancer The address that will receive funds if approved
    constructor(address _freelancer) {
        require(_freelancer != address(0), "Freelancer cannot be zero address");
        require(_freelancer != msg.sender, "Freelancer cannot be client");
        client = msg.sender;
        freelancer = _freelancer;
    }

    // ──────────────────────────────────────────────
    // Core Functions
    // ──────────────────────────────────────────────

    /// @notice Client deposits ETH into the escrow. Can only be called once.
    /// @dev msg.value is stored in `amount` and the contract holds the ETH.
    function fund() public payable {
        require(msg.sender == client, "Only client can fund");
        require(!isFunded, "Already funded");
        require(msg.value > 0, "Must send ETH");

        amount = msg.value;
        isFunded = true;

        emit Funded(client, amount);
    }

    /// @notice Client approves the work — funds are transferred to the freelancer.
    /// @dev Uses .transfer() which forwards 2300 gas (safe for EOA recipients).
    function approve() public {
        require(msg.sender == client, "Only client can approve");
        require(isFunded, "Not funded yet");
        require(!isCancelled, "Already cancelled");
        require(!isComplete, "Already complete");

        isComplete = true;
        payable(freelancer).transfer(amount);

        emit Approved(freelancer, amount);
    }

    /// @notice Client cancels the escrow — funds are refunded to the client.
    function cancel() public {
        require(msg.sender == client, "Only client can cancel");
        require(isFunded, "Not funded yet");
        require(!isComplete, "Already approved");
        require(!isCancelled, "Already cancelled");

        isCancelled = true;
        payable(client).transfer(amount);

        emit Cancelled(client, amount);
    }

    // ──────────────────────────────────────────────
    // View Functions
    // ──────────────────────────────────────────────

    /// @notice Returns the current ETH balance held by this contract
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Returns the current state of the escrow as three booleans
    /// @return funded   Whether client has deposited
    /// @return complete Whether work has been approved and paid
    /// @return cancelled Whether escrow has been cancelled and refunded
    function getStatus()
        public
        view
        returns (
            bool funded,
            bool complete,
            bool cancelled
        )
    {
        return (isFunded, isComplete, isCancelled);
    }
}
