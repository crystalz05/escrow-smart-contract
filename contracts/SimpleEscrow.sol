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

    //2% platform fee
    uint256 public constant FEE_PERCENT = 2;
    address public platform;

    //adding enum
    enum State{Created, Funded, Complete, Cancelled}
    State public state;

    //deadline
    uint256 public deadline;

    /// @notice The address that will receive funds on approval
    address public freelancer;

    /// @notice The amount of ETH locked in escrow (in wei)
    uint256 public amount;

    // /// @notice Whether the client has already deposited funds
    // bool public isFunded;

    // /// @notice Whether the client has approved and funds have been released
    // bool public isComplete;

    // /// @notice Whether the escrow has been cancelled and funds refunded
    // bool public isCancelled;

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
    constructor(address _freelancer, uint256 _durationDays, address _platform) {
        require(_freelancer != address(0), "Freelancer cannot be zero address");
        require(_freelancer != msg.sender, "Freelancer cannot be client");
        deadline = block.timestamp + (_durationDays * 1 days);
        client = msg.sender;
        freelancer = _freelancer;
        platform = _platform;
        state = State.Created;
    }

    // ──────────────────────────────────────────────
    // Core Functions
    // ──────────────────────────────────────────────

    /// @notice Client deposits ETH into the escrow. Can only be called once.
    /// @dev msg.value is stored in `amount` and the contract holds the ETH.
    function fund() public payable {
        require(msg.sender == client, "Only client can fund");
        require(state == State.Created || state == State.Cancelled, "Escrow already funded");
        require(msg.value > 0.01 ether, "Minimum 0.01 ETH");

        amount = msg.value;
        state = State.Funded;

        emit Funded(client, amount);
    }

    /// @notice Client approves the work — funds are transferred to the freelancer.
    /// @dev Uses .transfer() which forwards 2300 gas (safe for EOA recipients).
    function approve() public onlyClient {
        require(msg.sender == client, "Only client can approve");
        require(state == State.Funded, "Not Funded");

        state = State.Complete;
        uint256 fee = (amount * FEE_PERCENT)/100;
        payable(platform).transfer(fee);
        payable(freelancer).transfer(amount-fee);

        emit Approved(freelancer, amount-fee);
    }

    /// @notice Client cancels the escrow — funds are refunded to the client.
    function cancel() public onlyClient {
        require(msg.sender == client || msg.sender == freelancer, "Only client or freelancer can cancel");
        require(state == State.Created || state == State.Funded, "Already approved");
        require(block.timestamp > deadline, "Cannot cancel before deadline");

        state = State.Cancelled;
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
    /// @return state  Whether client has deposited
    function getStatus() public view returns (State)
    {
        return state;
    }

    modifier onlyClient(){
        require(msg.sender == client, "Only Client");
        _;
    }
}
