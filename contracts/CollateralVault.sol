// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CollateralVault
 * @notice Manages USDT collateral deposits and withdrawals for prediction markets
 * @dev Uses SafeERC20 for secure token transfers, ReentrancyGuard for protection,
 *      and supports EIP-2612 permit for gasless approvals
 */
contract CollateralVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice The USDT token contract
    IERC20 public immutable collateralToken;

    /// @notice User collateral balances
    mapping(address => uint256) public balances;

    /// @notice Locked collateral per user (in active orders/positions)
    mapping(address => uint256) public lockedBalances;

    /// @notice Authorized market contracts that can lock/unlock collateral
    mapping(address => bool) public authorizedMarkets;

    /// @notice Total collateral deposited in the vault
    uint256 public totalDeposited;

    /// @notice Total collateral currently locked
    uint256 public totalLocked;

    // ============ Events ============

    event Deposited(address indexed user, uint256 amount);
    event DepositedFor(address indexed depositor, address indexed recipient, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event CollateralLocked(address indexed user, uint256 amount, address indexed market);
    event CollateralUnlocked(address indexed user, uint256 amount, address indexed market);
    event CollateralTransferred(
        address indexed from,
        address indexed to,
        uint256 amount,
        address indexed market
    );
    event MarketAuthorized(address indexed market);
    event MarketDeauthorized(address indexed market);

    // ============ Errors ============

    error InsufficientBalance();
    error InsufficientUnlockedBalance();
    error UnauthorizedMarket();
    error ZeroAmount();
    error ZeroAddress();
    error PermitFailed();

    // ============ Modifiers ============

    modifier onlyAuthorizedMarket() {
        if (!authorizedMarkets[msg.sender]) revert UnauthorizedMarket();
        _;
    }

    modifier nonZeroAmount(uint256 amount) {
        if (amount == 0) revert ZeroAmount();
        _;
    }

    modifier nonZeroAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initializes the vault with the collateral token
     * @param _collateralToken Address of the USDT token contract
     */
    constructor(address _collateralToken) Ownable(msg.sender) {
        if (_collateralToken == address(0)) revert ZeroAddress();
        collateralToken = IERC20(_collateralToken);
    }

    // ============ External Functions ============

    /**
     * @notice Deposit USDT into the vault
     * @param amount Amount of USDT to deposit
     */
    function deposit(uint256 amount) external nonReentrant nonZeroAmount(amount) {
        // Effects
        balances[msg.sender] += amount;
        totalDeposited += amount;

        // Interactions
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Deposit USDT into the vault on behalf of another user
     * @dev Can only be called by authorized market contracts
     * @param user Address to credit the deposit to
     * @param amount Amount of USDT to deposit
     */
    function depositFor(
        address user,
        uint256 amount
    ) external onlyAuthorizedMarket nonReentrant nonZeroAmount(amount) nonZeroAddress(user) {
        // Effects
        balances[user] += amount;
        totalDeposited += amount;

        // Interactions - transfer from the user (not msg.sender which is the market contract)
        collateralToken.safeTransferFrom(user, address(this), amount);

        emit DepositedFor(user, user, amount);
    }

    /**
     * @notice Deposit USDT using EIP-2612 permit (gasless approval)
     * @param amount Amount of USDT to deposit
     * @param deadline Permit deadline timestamp
     * @param v ECDSA signature v parameter
     * @param r ECDSA signature r parameter
     * @param s ECDSA signature s parameter
     */
    function depositWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant nonZeroAmount(amount) {
        // Execute permit to approve vault
        try IERC20Permit(address(collateralToken)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        ) {} catch {
            // Permit may have already been used or is invalid
            // Check if we already have sufficient allowance
            uint256 currentAllowance = collateralToken.allowance(msg.sender, address(this));
            if (currentAllowance < amount) revert PermitFailed();
        }

        // Effects
        balances[msg.sender] += amount;
        totalDeposited += amount;

        // Interactions
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Deposit USDT for another user using EIP-2612 permit
     * @dev Can only be called by authorized market contracts
     * @param user Address to credit the deposit to
     * @param amount Amount of USDT to deposit
     * @param deadline Permit deadline timestamp
     * @param v ECDSA signature v parameter
     * @param r ECDSA signature r parameter
     * @param s ECDSA signature s parameter
     */
    function depositForWithPermit(
        address user,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyAuthorizedMarket nonReentrant nonZeroAmount(amount) nonZeroAddress(user) {
        // Execute permit - user permits the vault to spend their tokens
        try IERC20Permit(address(collateralToken)).permit(
            user,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        ) {} catch {
            // Permit may have already been used or is invalid
            // Check if we already have sufficient allowance
            uint256 currentAllowance = collateralToken.allowance(user, address(this));
            if (currentAllowance < amount) revert PermitFailed();
        }

        // Effects
        balances[user] += amount;
        totalDeposited += amount;

        // Interactions - transfer from the user
        collateralToken.safeTransferFrom(user, address(this), amount);

        emit DepositedFor(user, user, amount);
    }

    /**
     * @notice Withdraw unlocked USDT from the vault
     * @param amount Amount of USDT to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant nonZeroAmount(amount) {
        uint256 unlockedBalance = balances[msg.sender] - lockedBalances[msg.sender];
        if (amount > unlockedBalance) revert InsufficientUnlockedBalance();

        // Effects
        balances[msg.sender] -= amount;
        totalDeposited -= amount;

        // Interactions
        collateralToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Lock collateral for an order or position (called by authorized markets)
     * @param user Address of the user
     * @param amount Amount to lock
     */
    function lockCollateral(
        address user,
        uint256 amount
    ) external onlyAuthorizedMarket nonZeroAmount(amount) nonZeroAddress(user) {
        uint256 unlockedBalance = balances[user] - lockedBalances[user];
        if (amount > unlockedBalance) revert InsufficientUnlockedBalance();

        lockedBalances[user] += amount;
        totalLocked += amount;

        emit CollateralLocked(user, amount, msg.sender);
    }

    /**
     * @notice Unlock collateral when order is cancelled or position is closed
     * @param user Address of the user
     * @param amount Amount to unlock
     */
    function unlockCollateral(
        address user,
        uint256 amount
    ) external onlyAuthorizedMarket nonZeroAmount(amount) nonZeroAddress(user) {
        if (amount > lockedBalances[user]) revert InsufficientBalance();

        lockedBalances[user] -= amount;
        totalLocked -= amount;

        emit CollateralUnlocked(user, amount, msg.sender);
    }

    /**
     * @notice Transfer locked collateral between users (for order matching)
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount to transfer
     */
    function transferLockedCollateral(
        address from,
        address to,
        uint256 amount
    )
        external
        onlyAuthorizedMarket
        nonZeroAmount(amount)
        nonZeroAddress(from)
        nonZeroAddress(to)
    {
        if (amount > lockedBalances[from]) revert InsufficientBalance();

        // Effects - transfer from locked to recipient's balance
        lockedBalances[from] -= amount;
        balances[from] -= amount;
        balances[to] += amount;

        emit CollateralTransferred(from, to, amount, msg.sender);
    }

    // ============ Admin Functions ============

    /**
     * @notice Authorize a market contract to manage collateral
     * @param market Address of the market contract
     */
    function authorizeMarket(address market) external onlyOwner nonZeroAddress(market) {
        authorizedMarkets[market] = true;
        emit MarketAuthorized(market);
    }

    /**
     * @notice Deauthorize a market contract
     * @param market Address of the market contract
     */
    function deauthorizeMarket(address market) external onlyOwner nonZeroAddress(market) {
        authorizedMarkets[market] = false;
        emit MarketDeauthorized(market);
    }

    // ============ View Functions ============

    /**
     * @notice Get the available (unlocked) balance for a user
     * @param user Address of the user
     * @return Available balance
     */
    function getAvailableBalance(address user) external view returns (uint256) {
        return balances[user] - lockedBalances[user];
    }

    /**
     * @notice Get the locked balance for a user
     * @param user Address of the user
     * @return Locked balance
     */
    function getLockedBalance(address user) external view returns (uint256) {
        return lockedBalances[user];
    }

    /**
     * @notice Check if a token supports EIP-2612 permit
     * @return True if permit is supported
     */
    function supportsPermit() external view returns (bool) {
        try IERC20Permit(address(collateralToken)).DOMAIN_SEPARATOR() returns (bytes32) {
            return true;
        } catch {
            return false;
        }
    }
}
