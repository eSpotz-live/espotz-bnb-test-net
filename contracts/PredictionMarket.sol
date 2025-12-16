// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CollateralVault.sol";
import "./OutcomeToken.sol";

/**
 * @title PredictionMarket
 * @notice Central Limit Order Book (CLOB) prediction market for esports events
 * @dev Implements order matching with DIRECT, MINT, and BURN match types
 *      Golden Rule: YES price + NO price = 10000 basis points (100%)
 */
contract PredictionMarket is ReentrancyGuard, AccessControl {
    // ============ Constants ============

    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BASIS_POINTS = 10000;

    /// @notice Role for tournament operators
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ============ Configurable Parameters ============

    /// @notice Minimum order size in collateral units (default: 100 = 0.0001 USDT with 6 decimals)
    uint256 public minOrderSize = 100;

    // ============ Enums ============

    enum MarketStatus {
        Active,    // Trading enabled
        Paused,    // Trading temporarily disabled
        Resolved,  // Outcome determined, claims available
        Cancelled  // Market cancelled, refunds available
    }

    enum Outcome {
        YES,
        NO,
        INVALID
    }

    enum OrderSide {
        BUY,
        SELL
    }

    enum OrderStatus {
        Open,
        PartiallyFilled,
        Filled,
        Cancelled,
        Expired
    }

    enum MatchType {
        DIRECT,  // Same outcome: BUY matched with SELL
        MINT,    // BUY YES + BUY NO = mint pair
        BURN     // SELL YES + SELL NO = burn pair
    }

    // ============ Structs ============

    struct Market {
        bytes32 marketId;
        string question;
        address yesToken;
        address noToken;
        uint256 yesSupply;
        uint256 noSupply;
        uint256 totalCollateral;
        MarketStatus status;
        Outcome winningOutcome;
        uint256 expireTime;
        uint256 createdAt;
        address tournamentOperator;
    }

    struct Order {
        bytes32 orderId;
        bytes32 marketId;
        address trader;
        OrderSide side;
        Outcome outcome;
        uint256 price;        // Price in basis points (0-10000)
        uint256 quantity;     // Total quantity in shares
        uint256 filled;       // Amount already filled
        uint256 collateralLocked;
        OrderStatus status;
        uint256 createdAt;
        uint256 expireTime;
    }

    struct Fill {
        bytes32 fillId;
        bytes32 makerOrderId;
        bytes32 takerOrderId;
        MatchType matchType;
        uint256 quantity;
        uint256 price;
        uint256 timestamp;
    }

    // ============ State Variables ============

    /// @notice The collateral vault contract
    CollateralVault public immutable vault;

    /// @notice Counter for generating unique order IDs
    uint256 private orderNonce;

    /// @notice Counter for generating unique fill IDs
    uint256 private fillNonce;

    /// @notice All markets by ID
    mapping(bytes32 => Market) public markets;

    /// @notice All orders by ID
    mapping(bytes32 => Order) public orders;

    /// @notice Order book: marketId => outcome => side => ordered list of order IDs
    /// @dev Orders are sorted by price (best price first)
    mapping(bytes32 => mapping(Outcome => mapping(OrderSide => bytes32[]))) public orderBook;

    /// @notice User's active orders
    mapping(address => bytes32[]) public userOrders;

    /// @notice User's claimed status for markets
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    /// @notice Array of all market IDs
    bytes32[] public marketIds;

    // ============ Events ============

    event MarketCreated(
        bytes32 indexed marketId,
        string question,
        address yesToken,
        address noToken,
        address indexed operator,
        uint256 expireTime
    );

    event MarketStatusChanged(
        bytes32 indexed marketId,
        MarketStatus oldStatus,
        MarketStatus newStatus
    );

    event MarketResolved(
        bytes32 indexed marketId,
        Outcome winningOutcome,
        address indexed resolver
    );

    event OrderPlaced(
        bytes32 indexed orderId,
        bytes32 indexed marketId,
        address indexed trader,
        OrderSide side,
        Outcome outcome,
        uint256 price,
        uint256 quantity
    );

    event OrderFilled(
        bytes32 indexed orderId,
        uint256 filledQuantity,
        uint256 remainingQuantity
    );

    event OrderCancelled(bytes32 indexed orderId, address indexed trader);

    event Trade(
        bytes32 indexed fillId,
        bytes32 indexed marketId,
        bytes32 makerOrderId,
        bytes32 takerOrderId,
        MatchType matchType,
        uint256 quantity,
        uint256 price
    );

    event SharesMinted(
        bytes32 indexed marketId,
        address indexed recipient,
        uint256 yesAmount,
        uint256 noAmount
    );

    event SharesBurned(
        bytes32 indexed marketId,
        address indexed holder,
        uint256 yesAmount,
        uint256 noAmount
    );

    event WinningsClaimed(
        bytes32 indexed marketId,
        address indexed user,
        uint256 amount,
        Outcome outcome
    );

    event RefundClaimed(
        bytes32 indexed marketId,
        address indexed user,
        uint256 amount
    );

    event MinOrderSizeUpdated(uint256 oldSize, uint256 newSize);

    // ============ Errors ============

    error MarketNotActive();
    error MarketNotResolved();
    error MarketNotCancelled();
    error MarketAlreadyExists();
    error MarketDoesNotExist();
    error InvalidPrice();
    error InvalidQuantity();
    error OrderDoesNotExist();
    error NotOrderOwner();
    error OrderNotOpen();
    error InsufficientBalance();
    error AlreadyClaimed();
    error NoWinnings();
    error UnauthorizedOperator();
    error InvalidOutcome();
    error OrderExpired();
    error ZeroAddress();

    // ============ Constructor ============

    /**
     * @notice Initializes the prediction market
     * @param _vault Address of the CollateralVault contract
     */
    constructor(address _vault) {
        if (_vault == address(0)) revert ZeroAddress();
        vault = CollateralVault(_vault);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ============ Market Management ============

    /**
     * @notice Create a new prediction market
     * @param marketId Unique identifier for the market
     * @param question The question being predicted
     * @param expireTime Timestamp when market expires
     * @param operator Address of the tournament operator
     */
    function createMarket(
        bytes32 marketId,
        string calldata question,
        uint256 expireTime,
        address operator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (markets[marketId].createdAt != 0) revert MarketAlreadyExists();
        if (operator == address(0)) revert ZeroAddress();

        // Create outcome tokens
        string memory yesName = string(abi.encodePacked("YES-", _bytes32ToString(marketId)));
        string memory noName = string(abi.encodePacked("NO-", _bytes32ToString(marketId)));

        OutcomeToken yesToken = new OutcomeToken(yesName, "YES", marketId, true, address(this));
        OutcomeToken noToken = new OutcomeToken(noName, "NO", marketId, false, address(this));

        markets[marketId] = Market({
            marketId: marketId,
            question: question,
            yesToken: address(yesToken),
            noToken: address(noToken),
            yesSupply: 0,
            noSupply: 0,
            totalCollateral: 0,
            status: MarketStatus.Active,
            winningOutcome: Outcome.INVALID,
            expireTime: expireTime,
            createdAt: block.timestamp,
            tournamentOperator: operator
        });

        marketIds.push(marketId);

        // Grant operator role
        _grantRole(OPERATOR_ROLE, operator);

        emit MarketCreated(
            marketId,
            question,
            address(yesToken),
            address(noToken),
            operator,
            expireTime
        );
    }

    /**
     * @notice Pause trading on a market
     * @param marketId The market to pause
     */
    function pauseMarket(bytes32 marketId) external {
        Market storage market = markets[marketId];
        _checkOperator(market);
        if (market.status != MarketStatus.Active) revert MarketNotActive();

        MarketStatus oldStatus = market.status;
        market.status = MarketStatus.Paused;

        emit MarketStatusChanged(marketId, oldStatus, MarketStatus.Paused);
    }

    /**
     * @notice Resume trading on a paused market
     * @param marketId The market to resume
     */
    function resumeMarket(bytes32 marketId) external {
        Market storage market = markets[marketId];
        _checkOperator(market);
        if (market.status != MarketStatus.Paused) revert MarketNotActive();

        market.status = MarketStatus.Active;

        emit MarketStatusChanged(marketId, MarketStatus.Paused, MarketStatus.Active);
    }

    /**
     * @notice Resolve a market with the winning outcome
     * @param marketId The market to resolve
     * @param winningOutcome The winning outcome (YES, NO, or INVALID for refund)
     */
    function resolveMarket(bytes32 marketId, Outcome winningOutcome) external {
        Market storage market = markets[marketId];
        _checkOperator(market);
        if (market.status != MarketStatus.Active && market.status != MarketStatus.Paused) {
            revert MarketNotActive();
        }

        MarketStatus oldStatus = market.status;
        market.status = MarketStatus.Resolved;
        market.winningOutcome = winningOutcome;

        emit MarketStatusChanged(marketId, oldStatus, MarketStatus.Resolved);
        emit MarketResolved(marketId, winningOutcome, msg.sender);
    }

    /**
     * @notice Cancel a market (refunds all participants)
     * @param marketId The market to cancel
     */
    function cancelMarket(bytes32 marketId) external {
        Market storage market = markets[marketId];
        _checkOperator(market);

        MarketStatus oldStatus = market.status;
        market.status = MarketStatus.Cancelled;

        emit MarketStatusChanged(marketId, oldStatus, MarketStatus.Cancelled);
    }

    // ============ Order Management ============

    /**
     * @notice Place a limit order
     * @param marketId The market to trade on
     * @param side BUY or SELL
     * @param outcome YES or NO
     * @param price Price in basis points (0-10000)
     * @param quantity Number of shares
     * @param expireTime Order expiration timestamp
     * @return orderId The ID of the placed order
     */
    function placeOrder(
        bytes32 marketId,
        OrderSide side,
        Outcome outcome,
        uint256 price,
        uint256 quantity,
        uint256 expireTime
    ) external nonReentrant returns (bytes32 orderId) {
        return _placeOrderInternal(marketId, side, outcome, price, quantity, expireTime);
    }

    /**
     * @notice Internal function to place a limit order
     * @dev Called by placeOrder, depositAndPlaceOrder, and depositWithPermitAndPlaceOrder
     */
    function _placeOrderInternal(
        bytes32 marketId,
        OrderSide side,
        Outcome outcome,
        uint256 price,
        uint256 quantity,
        uint256 expireTime
    ) internal returns (bytes32 orderId) {
        Market storage market = markets[marketId];
        if (market.status != MarketStatus.Active) revert MarketNotActive();
        if (price == 0 || price >= BASIS_POINTS) revert InvalidPrice();
        if (outcome == Outcome.INVALID) revert InvalidOutcome();
        if (quantity == 0) revert InvalidQuantity();

        // Verify seller has tokens to sell
        if (side == OrderSide.SELL) {
            address tokenAddress = outcome == Outcome.YES ? market.yesToken : market.noToken;
            if (OutcomeToken(tokenAddress).balanceOf(msg.sender) < quantity) {
                revert InsufficientBalance();
            }
        }

        // Calculate collateral required
        uint256 collateralRequired = _calculateCollateral(side, price, quantity);
        if (collateralRequired < minOrderSize) revert InvalidQuantity();

        // Generate order ID
        orderId = keccak256(abi.encodePacked(msg.sender, orderNonce++, block.timestamp));

        // Lock collateral
        vault.lockCollateral(msg.sender, collateralRequired);

        // Create order
        orders[orderId] = Order({
            orderId: orderId,
            marketId: marketId,
            trader: msg.sender,
            side: side,
            outcome: outcome,
            price: price,
            quantity: quantity,
            filled: 0,
            collateralLocked: collateralRequired,
            status: OrderStatus.Open,
            createdAt: block.timestamp,
            expireTime: expireTime
        });

        // Add to order book and user orders
        orderBook[marketId][outcome][side].push(orderId);
        userOrders[msg.sender].push(orderId);

        emit OrderPlaced(orderId, marketId, msg.sender, side, outcome, price, quantity);

        // Try to match the order
        _matchOrder(orderId);

        return orderId;
    }

    /**
     * @notice Deposit to vault and place order in a single transaction
     * @dev Auto-deposits required amount if vault balance is insufficient
     * @param depositAmount Amount to deposit (0 if user already has sufficient balance)
     * @param marketId The market to trade on
     * @param side BUY or SELL
     * @param outcome YES or NO
     * @param price Price in basis points (0-10000)
     * @param quantity Number of shares
     * @param expireTime Order expiration timestamp
     * @return orderId The ID of the placed order
     */
    function depositAndPlaceOrder(
        uint256 depositAmount,
        bytes32 marketId,
        OrderSide side,
        Outcome outcome,
        uint256 price,
        uint256 quantity,
        uint256 expireTime
    ) external nonReentrant returns (bytes32 orderId) {
        // Auto-deposit if amount provided
        if (depositAmount > 0) {
            vault.depositFor(msg.sender, depositAmount);
        }

        // Place order (reusing internal logic)
        return _placeOrderInternal(marketId, side, outcome, price, quantity, expireTime);
    }

    /**
     * @notice Deposit with permit and place order in a single transaction (gasless approval)
     * @dev Uses EIP-2612 permit for gasless token approval
     * @param depositAmount Amount to deposit
     * @param marketId The market to trade on
     * @param side BUY or SELL
     * @param outcome YES or NO
     * @param price Price in basis points (0-10000)
     * @param quantity Number of shares
     * @param expireTime Order expiration timestamp
     * @param deadline Permit deadline timestamp
     * @param v ECDSA signature v parameter
     * @param r ECDSA signature r parameter
     * @param s ECDSA signature s parameter
     * @return orderId The ID of the placed order
     */
    function depositWithPermitAndPlaceOrder(
        uint256 depositAmount,
        bytes32 marketId,
        OrderSide side,
        Outcome outcome,
        uint256 price,
        uint256 quantity,
        uint256 expireTime,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (bytes32 orderId) {
        // Deposit with permit if amount provided
        if (depositAmount > 0) {
            vault.depositForWithPermit(msg.sender, depositAmount, deadline, v, r, s);
        }

        // Place order (reusing internal logic)
        return _placeOrderInternal(marketId, side, outcome, price, quantity, expireTime);
    }

    /**
     * @notice Cancel an open order
     * @param orderId The order to cancel
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        if (order.trader != msg.sender) revert NotOrderOwner();
        if (order.status != OrderStatus.Open && order.status != OrderStatus.PartiallyFilled) {
            revert OrderNotOpen();
        }

        // Calculate remaining collateral to unlock
        uint256 remainingQuantity = order.quantity - order.filled;
        uint256 collateralToUnlock = (order.collateralLocked * remainingQuantity) / order.quantity;

        // Update order status
        order.status = OrderStatus.Cancelled;

        // Unlock remaining collateral
        if (collateralToUnlock > 0) {
            vault.unlockCollateral(order.trader, collateralToUnlock);
        }

        // Remove from order book
        _removeFromOrderBook(order.marketId, order.outcome, order.side, orderId);

        emit OrderCancelled(orderId, msg.sender);
    }

    // ============ Settlement ============

    /**
     * @notice Claim winnings from a resolved market
     * @param marketId The resolved market
     */
    function claimWinnings(bytes32 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        if (market.status != MarketStatus.Resolved) revert MarketNotResolved();
        if (hasClaimed[marketId][msg.sender]) revert AlreadyClaimed();

        Outcome winningOutcome = market.winningOutcome;
        address tokenAddress;
        uint256 winningBalance;

        if (winningOutcome == Outcome.YES) {
            tokenAddress = market.yesToken;
        } else if (winningOutcome == Outcome.NO) {
            tokenAddress = market.noToken;
        } else {
            // INVALID outcome - use refund instead
            revert InvalidOutcome();
        }

        winningBalance = OutcomeToken(tokenAddress).balanceOf(msg.sender);
        if (winningBalance == 0) revert NoWinnings();

        // Mark as claimed
        hasClaimed[marketId][msg.sender] = true;

        // Burn winning tokens
        OutcomeToken(tokenAddress).burn(msg.sender, winningBalance);

        // Calculate payout (1 share = 1 USDT at settlement)
        uint256 payout = winningBalance;

        // Transfer payout through vault
        // The vault needs to unlock and transfer to the user
        // For simplicity, we'll have the market transfer directly from vault's holdings
        vault.unlockCollateral(address(this), payout);
        vault.collateralToken().transfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout, winningOutcome);
    }

    /**
     * @notice Claim refund from a cancelled market
     * @param marketId The cancelled market
     */
    function claimRefund(bytes32 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        if (market.status != MarketStatus.Cancelled) revert MarketNotCancelled();
        if (hasClaimed[marketId][msg.sender]) revert AlreadyClaimed();

        uint256 yesBalance = OutcomeToken(market.yesToken).balanceOf(msg.sender);
        uint256 noBalance = OutcomeToken(market.noToken).balanceOf(msg.sender);

        if (yesBalance == 0 && noBalance == 0) revert NoWinnings();

        // Mark as claimed
        hasClaimed[marketId][msg.sender] = true;

        // Burn all tokens
        if (yesBalance > 0) {
            OutcomeToken(market.yesToken).burn(msg.sender, yesBalance);
        }
        if (noBalance > 0) {
            OutcomeToken(market.noToken).burn(msg.sender, noBalance);
        }

        // Calculate refund based on equal share pairs
        uint256 pairs = yesBalance < noBalance ? yesBalance : noBalance;
        uint256 refund = pairs; // Each pair was backed by 1 USDT

        if (refund > 0) {
            vault.unlockCollateral(address(this), refund);
            vault.collateralToken().transfer(msg.sender, refund);
        }

        emit RefundClaimed(marketId, msg.sender, refund);
    }

    // ============ Internal Functions ============

    /**
     * @notice Match an order against the order book
     * @param orderId The order to match
     */
    function _matchOrder(bytes32 orderId) internal {
        Order storage takerOrder = orders[orderId];
        Market storage market = markets[takerOrder.marketId];

        // Try direct matching first (same outcome, opposite side)
        OrderSide oppositeSide = takerOrder.side == OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
        bytes32[] storage directBook = orderBook[takerOrder.marketId][takerOrder.outcome][oppositeSide];

        for (uint256 i = 0; i < directBook.length && takerOrder.filled < takerOrder.quantity; ) {
            bytes32 makerOrderId = directBook[i];
            Order storage makerOrder = orders[makerOrderId];

            // Skip if order is not matchable
            if (!_isMatchable(makerOrder)) {
                unchecked { ++i; }
                continue;
            }

            // Check price compatibility
            bool priceMatch = takerOrder.side == OrderSide.BUY
                ? takerOrder.price >= makerOrder.price
                : takerOrder.price <= makerOrder.price;

            if (!priceMatch) {
                unchecked { ++i; }
                continue;
            }

            // Execute direct match
            _executeTrade(
                makerOrderId,
                orderId,
                MatchType.DIRECT,
                takerOrder.marketId,
                market
            );

            unchecked { ++i; }
        }

        // Try MINT matching (BUY YES + BUY NO)
        if (takerOrder.side == OrderSide.BUY && takerOrder.filled < takerOrder.quantity) {
            Outcome oppositeOutcome = takerOrder.outcome == Outcome.YES ? Outcome.NO : Outcome.YES;
            bytes32[] storage mintBook = orderBook[takerOrder.marketId][oppositeOutcome][OrderSide.BUY];

            for (uint256 i = 0; i < mintBook.length && takerOrder.filled < takerOrder.quantity; ) {
                bytes32 makerOrderId = mintBook[i];
                Order storage makerOrder = orders[makerOrderId];

                if (!_isMatchable(makerOrder)) {
                    unchecked { ++i; }
                    continue;
                }

                // Golden Rule: prices must sum to 10000 basis points
                if (takerOrder.price + makerOrder.price >= BASIS_POINTS) {
                    _executeTrade(
                        makerOrderId,
                        orderId,
                        MatchType.MINT,
                        takerOrder.marketId,
                        market
                    );
                }

                unchecked { ++i; }
            }
        }

        // Try BURN matching (SELL YES + SELL NO)
        if (takerOrder.side == OrderSide.SELL && takerOrder.filled < takerOrder.quantity) {
            Outcome oppositeOutcome = takerOrder.outcome == Outcome.YES ? Outcome.NO : Outcome.YES;
            bytes32[] storage burnBook = orderBook[takerOrder.marketId][oppositeOutcome][OrderSide.SELL];

            for (uint256 i = 0; i < burnBook.length && takerOrder.filled < takerOrder.quantity; ) {
                bytes32 makerOrderId = burnBook[i];
                Order storage makerOrder = orders[makerOrderId];

                if (!_isMatchable(makerOrder)) {
                    unchecked { ++i; }
                    continue;
                }

                // Both sellers together return collateral
                if (takerOrder.price + makerOrder.price <= BASIS_POINTS) {
                    _executeTrade(
                        makerOrderId,
                        orderId,
                        MatchType.BURN,
                        takerOrder.marketId,
                        market
                    );
                }

                unchecked { ++i; }
            }
        }

        // Update taker order status
        if (takerOrder.filled == takerOrder.quantity) {
            takerOrder.status = OrderStatus.Filled;
            _removeFromOrderBook(takerOrder.marketId, takerOrder.outcome, takerOrder.side, orderId);
        } else if (takerOrder.filled > 0) {
            takerOrder.status = OrderStatus.PartiallyFilled;
        }
    }

    /**
     * @notice Execute a trade between two orders
     */
    function _executeTrade(
        bytes32 makerOrderId,
        bytes32 takerOrderId,
        MatchType matchType,
        bytes32 marketId,
        Market storage market
    ) internal {
        Order storage makerOrder = orders[makerOrderId];
        Order storage takerOrder = orders[takerOrderId];

        // Calculate fill quantity
        uint256 makerRemaining = makerOrder.quantity - makerOrder.filled;
        uint256 takerRemaining = takerOrder.quantity - takerOrder.filled;
        uint256 fillQuantity = makerRemaining < takerRemaining ? makerRemaining : takerRemaining;

        // Use maker's price (price improvement for taker)
        uint256 tradePrice = makerOrder.price;

        // Generate fill ID
        bytes32 fillId = keccak256(abi.encodePacked(fillNonce++, block.timestamp));

        // Update filled amounts
        makerOrder.filled += fillQuantity;
        takerOrder.filled += fillQuantity;

        // Execute based on match type
        if (matchType == MatchType.DIRECT) {
            _executeDirectMatch(makerOrder, takerOrder, fillQuantity, tradePrice, market);
        } else if (matchType == MatchType.MINT) {
            _executeMintMatch(makerOrder, takerOrder, fillQuantity, market);
        } else if (matchType == MatchType.BURN) {
            _executeBurnMatch(makerOrder, takerOrder, fillQuantity, market);
        }

        // Update maker order status
        if (makerOrder.filled == makerOrder.quantity) {
            makerOrder.status = OrderStatus.Filled;
            _removeFromOrderBook(marketId, makerOrder.outcome, makerOrder.side, makerOrderId);
        } else {
            makerOrder.status = OrderStatus.PartiallyFilled;
        }

        emit Trade(fillId, marketId, makerOrderId, takerOrderId, matchType, fillQuantity, tradePrice);
        emit OrderFilled(makerOrderId, fillQuantity, makerOrder.quantity - makerOrder.filled);
        emit OrderFilled(takerOrderId, fillQuantity, takerOrder.quantity - takerOrder.filled);
    }

    /**
     * @notice Execute a direct match (BUY meets SELL for same outcome)
     */
    function _executeDirectMatch(
        Order storage makerOrder,
        Order storage takerOrder,
        uint256 quantity,
        uint256 price,
        Market storage market
    ) internal {
        // Determine buyer and seller
        Order storage buyer = makerOrder.side == OrderSide.BUY ? makerOrder : takerOrder;
        Order storage seller = makerOrder.side == OrderSide.SELL ? makerOrder : takerOrder;

        // Calculate collateral transfer
        uint256 collateralAmount = (quantity * price) / BASIS_POINTS;

        // Transfer collateral from buyer to seller
        vault.transferLockedCollateral(buyer.trader, seller.trader, collateralAmount);

        // Transfer outcome tokens from seller to buyer
        address tokenAddress = buyer.outcome == Outcome.YES ? market.yesToken : market.noToken;
        OutcomeToken token = OutcomeToken(tokenAddress);

        // Seller must have tokens - transfer them
        token.burn(seller.trader, quantity);
        token.mint(buyer.trader, quantity);
    }

    /**
     * @notice Execute a mint match (BUY YES + BUY NO = new tokens minted)
     */
    function _executeMintMatch(
        Order storage makerOrder,
        Order storage takerOrder,
        uint256 quantity,
        Market storage market
    ) internal {
        // Both are buyers - one for YES, one for NO
        Order storage yesBuyer = makerOrder.outcome == Outcome.YES ? makerOrder : takerOrder;
        Order storage noBuyer = makerOrder.outcome == Outcome.NO ? makerOrder : takerOrder;

        // Total collateral for pair = 1 (10000 basis points)
        uint256 totalCollateral = quantity; // 1 USDT per pair

        // Lock collateral for market
        uint256 yesContribution = (quantity * yesBuyer.price) / BASIS_POINTS;
        uint256 noContribution = totalCollateral - yesContribution;

        // Transfer collateral to market
        vault.transferLockedCollateral(yesBuyer.trader, address(this), yesContribution);
        vault.transferLockedCollateral(noBuyer.trader, address(this), noContribution);

        // Mint new tokens
        OutcomeToken(market.yesToken).mint(yesBuyer.trader, quantity);
        OutcomeToken(market.noToken).mint(noBuyer.trader, quantity);

        // Update market state
        market.yesSupply += quantity;
        market.noSupply += quantity;
        market.totalCollateral += totalCollateral;

        emit SharesMinted(market.marketId, yesBuyer.trader, quantity, 0);
        emit SharesMinted(market.marketId, noBuyer.trader, 0, quantity);
    }

    /**
     * @notice Execute a burn match (SELL YES + SELL NO = tokens burned, collateral returned)
     */
    function _executeBurnMatch(
        Order storage makerOrder,
        Order storage takerOrder,
        uint256 quantity,
        Market storage market
    ) internal {
        // Both are sellers - one for YES, one for NO
        Order storage yesSeller = makerOrder.outcome == Outcome.YES ? makerOrder : takerOrder;
        Order storage noSeller = makerOrder.outcome == Outcome.NO ? makerOrder : takerOrder;

        // Burn tokens
        OutcomeToken(market.yesToken).burn(yesSeller.trader, quantity);
        OutcomeToken(market.noToken).burn(noSeller.trader, quantity);

        // Return collateral (1 USDT per pair)
        uint256 totalCollateral = quantity;
        uint256 yesShare = (quantity * yesSeller.price) / BASIS_POINTS;
        uint256 noShare = totalCollateral - yesShare;

        // Unlock and transfer collateral back
        vault.unlockCollateral(address(this), totalCollateral);
        vault.collateralToken().transfer(yesSeller.trader, yesShare);
        vault.collateralToken().transfer(noSeller.trader, noShare);

        // Update market state
        market.yesSupply -= quantity;
        market.noSupply -= quantity;
        market.totalCollateral -= totalCollateral;

        emit SharesBurned(market.marketId, yesSeller.trader, quantity, 0);
        emit SharesBurned(market.marketId, noSeller.trader, 0, quantity);
    }

    /**
     * @notice Check if an order is matchable
     */
    function _isMatchable(Order storage order) internal view returns (bool) {
        if (order.status != OrderStatus.Open && order.status != OrderStatus.PartiallyFilled) {
            return false;
        }
        if (order.expireTime != 0 && block.timestamp > order.expireTime) {
            return false;
        }
        return order.filled < order.quantity;
    }

    /**
     * @notice Calculate collateral required for an order
     */
    function _calculateCollateral(
        OrderSide side,
        uint256 price,
        uint256 quantity
    ) internal pure returns (uint256) {
        if (side == OrderSide.BUY) {
            // Buyer pays price * quantity
            return (quantity * price) / BASIS_POINTS;
        } else {
            // Seller needs to have tokens (no additional collateral for sells)
            return 0;
        }
    }

    /**
     * @notice Remove an order from the order book
     */
    function _removeFromOrderBook(
        bytes32 marketId,
        Outcome outcome,
        OrderSide side,
        bytes32 orderId
    ) internal {
        bytes32[] storage book = orderBook[marketId][outcome][side];
        for (uint256 i = 0; i < book.length; i++) {
            if (book[i] == orderId) {
                book[i] = book[book.length - 1];
                book.pop();
                break;
            }
        }
    }

    /**
     * @notice Check if caller is the market operator
     */
    function _checkOperator(Market storage market) internal view {
        if (market.createdAt == 0) revert MarketDoesNotExist();
        if (msg.sender != market.tournamentOperator && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedOperator();
        }
    }

    /**
     * @notice Convert bytes32 to string for token naming
     */
    function _bytes32ToString(bytes32 _bytes) internal pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (uint8 j = 0; j < i; j++) {
            bytesArray[j] = _bytes[j];
        }
        return string(bytesArray);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the minimum order size
     * @param newMinOrderSize New minimum order size in collateral units
     */
    function setMinOrderSize(uint256 newMinOrderSize) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldSize = minOrderSize;
        minOrderSize = newMinOrderSize;
        emit MinOrderSizeUpdated(oldSize, newMinOrderSize);
    }

    // ============ View Functions ============

    /**
     * @notice Get market details
     */
    function getMarket(bytes32 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @notice Get order details
     */
    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /**
     * @notice Get all market IDs
     */
    function getMarketIds() external view returns (bytes32[] memory) {
        return marketIds;
    }

    /**
     * @notice Get user's active orders
     */
    function getUserOrders(address user) external view returns (bytes32[] memory) {
        return userOrders[user];
    }

    /**
     * @notice Get order book for a market/outcome/side
     */
    function getOrderBook(
        bytes32 marketId,
        Outcome outcome,
        OrderSide side
    ) external view returns (bytes32[] memory) {
        return orderBook[marketId][outcome][side];
    }

    /**
     * @notice Calculate collateral required for an order (public view for frontend)
     * @param side BUY or SELL
     * @param price Price in basis points (0-10000)
     * @param quantity Number of shares
     * @return collateralRequired Amount of collateral needed
     */
    function calculateCollateralRequired(
        OrderSide side,
        uint256 price,
        uint256 quantity
    ) external pure returns (uint256) {
        return _calculateCollateral(side, price, quantity);
    }

    /**
     * @notice Calculate deposit amount needed for an order
     * @dev Returns 0 if user has sufficient balance, otherwise returns the shortfall
     * @param user Address of the user
     * @param side BUY or SELL
     * @param price Price in basis points (0-10000)
     * @param quantity Number of shares
     * @return depositNeeded Amount user needs to deposit (0 if sufficient)
     */
    function calculateDepositNeeded(
        address user,
        OrderSide side,
        uint256 price,
        uint256 quantity
    ) external view returns (uint256) {
        uint256 collateralRequired = _calculateCollateral(side, price, quantity);
        uint256 availableBalance = vault.getAvailableBalance(user);

        if (availableBalance >= collateralRequired) {
            return 0;
        }
        return collateralRequired - availableBalance;
    }
}
