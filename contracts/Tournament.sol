// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PredictionMarket.sol";

/**
 * @title Tournament
 * @notice Manages esports tournaments and their associated prediction markets
 * @dev Tournament Operators (TOs) control market creation and resolution within their tournaments
 */
contract Tournament is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice Role for tournament operators
    bytes32 public constant TOURNAMENT_OPERATOR_ROLE = keccak256("TOURNAMENT_OPERATOR_ROLE");

    // ============ Configurable Parameters ============

    /// @notice Minimum entry fee allowed (default: 100 = 0.0001 USDT with 6 decimals)
    uint256 public minEntryFee = 100;

    // ============ Enums ============

    enum TournamentStatus {
        Upcoming,     // Not yet started
        Active,       // In progress
        Completed,    // Finished
        Cancelled     // Cancelled
    }

    // ============ Structs ============

    struct TournamentInfo {
        bytes32 tournamentId;
        string name;
        string game;           // e.g., "CS2", "Valorant", "League of Legends"
        address operator;      // Tournament Operator address
        TournamentStatus status;
        uint256 startTime;
        uint256 endTime;
        uint256 createdAt;
        bytes32[] marketIds;   // Associated prediction markets
        uint256 entryFee;      // Entry fee in collateral tokens (0 = free)
        uint256 totalEntryFees; // Total collected entry fees
        uint256 participantCount; // Number of registered participants
    }

    // ============ State Variables ============

    /// @notice The prediction market contract
    PredictionMarket public immutable predictionMarket;

    /// @notice The collateral token (USDT)
    IERC20 public immutable collateralToken;

    /// @notice All tournaments by ID
    mapping(bytes32 => TournamentInfo) public tournaments;

    /// @notice Array of all tournament IDs
    bytes32[] public tournamentIds;

    /// @notice Operator's tournaments
    mapping(address => bytes32[]) public operatorTournaments;

    /// @notice Market to tournament mapping
    mapping(bytes32 => bytes32) public marketToTournament;

    /// @notice Tournament participants: tournamentId => participant => registered
    mapping(bytes32 => mapping(address => bool)) public isParticipant;

    /// @notice Counter for generating unique tournament IDs
    uint256 private tournamentNonce;

    // ============ Events ============

    event TournamentCreated(
        bytes32 indexed tournamentId,
        string name,
        string game,
        address indexed operator,
        uint256 startTime,
        uint256 endTime
    );

    event TournamentStatusChanged(
        bytes32 indexed tournamentId,
        TournamentStatus oldStatus,
        TournamentStatus newStatus
    );

    event TournamentOperatorChanged(
        bytes32 indexed tournamentId,
        address indexed oldOperator,
        address indexed newOperator
    );

    event MarketAddedToTournament(
        bytes32 indexed tournamentId,
        bytes32 indexed marketId,
        string question
    );

    event MarketRemovedFromTournament(
        bytes32 indexed tournamentId,
        bytes32 indexed marketId
    );

    event ParticipantRegistered(
        bytes32 indexed tournamentId,
        address indexed participant,
        uint256 entryFee
    );

    event TournamentEntryFeeUpdated(
        bytes32 indexed tournamentId,
        uint256 oldFee,
        uint256 newFee
    );

    event MinEntryFeeUpdated(uint256 oldFee, uint256 newFee);

    event EntryFeesWithdrawn(
        bytes32 indexed tournamentId,
        address indexed recipient,
        uint256 amount
    );

    // ============ Errors ============

    error TournamentDoesNotExist();
    error TournamentAlreadyExists();
    error NotTournamentOperator();
    error TournamentNotActive();
    error InvalidTimeRange();
    error MarketAlreadyInTournament();
    error MarketNotInTournament();
    error ZeroAddress();
    error InvalidStatus();
    error AlreadyRegistered();
    error EntryFeeBelowMinimum();
    error RegistrationClosed();
    error NoFeesToWithdraw();

    // ============ Modifiers ============

    modifier onlyTournamentOperator(bytes32 tournamentId) {
        TournamentInfo storage tournament = tournaments[tournamentId];
        if (tournament.createdAt == 0) revert TournamentDoesNotExist();
        if (msg.sender != tournament.operator && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotTournamentOperator();
        }
        _;
    }

    modifier tournamentExists(bytes32 tournamentId) {
        if (tournaments[tournamentId].createdAt == 0) revert TournamentDoesNotExist();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initializes the tournament contract
     * @param _predictionMarket Address of the PredictionMarket contract
     * @param _collateralToken Address of the collateral token (USDT)
     */
    constructor(address _predictionMarket, address _collateralToken) {
        if (_predictionMarket == address(0)) revert ZeroAddress();
        if (_collateralToken == address(0)) revert ZeroAddress();
        predictionMarket = PredictionMarket(_predictionMarket);
        collateralToken = IERC20(_collateralToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ============ Tournament Management ============

    /**
     * @notice Create a new tournament
     * @param name Tournament name (e.g., "IEM Katowice 2024")
     * @param game Game being played (e.g., "CS2")
     * @param operator Address of the tournament operator
     * @param startTime Tournament start timestamp
     * @param endTime Tournament end timestamp
     * @param entryFee Entry fee in collateral tokens (0 for free entry)
     * @return tournamentId The ID of the created tournament
     */
    function createTournament(
        string calldata name,
        string calldata game,
        address operator,
        uint256 startTime,
        uint256 endTime,
        uint256 entryFee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bytes32 tournamentId) {
        if (operator == address(0)) revert ZeroAddress();
        if (endTime <= startTime) revert InvalidTimeRange();
        if (entryFee > 0 && entryFee < minEntryFee) revert EntryFeeBelowMinimum();

        // Generate tournament ID
        tournamentId = keccak256(abi.encodePacked(name, game, tournamentNonce++, block.timestamp));

        if (tournaments[tournamentId].createdAt != 0) revert TournamentAlreadyExists();

        tournaments[tournamentId] = TournamentInfo({
            tournamentId: tournamentId,
            name: name,
            game: game,
            operator: operator,
            status: TournamentStatus.Upcoming,
            startTime: startTime,
            endTime: endTime,
            createdAt: block.timestamp,
            marketIds: new bytes32[](0),
            entryFee: entryFee,
            totalEntryFees: 0,
            participantCount: 0
        });

        tournamentIds.push(tournamentId);
        operatorTournaments[operator].push(tournamentId);

        // Grant operator role
        _grantRole(TOURNAMENT_OPERATOR_ROLE, operator);

        emit TournamentCreated(tournamentId, name, game, operator, startTime, endTime);

        return tournamentId;
    }

    /**
     * @notice Start a tournament
     * @param tournamentId The tournament to start
     */
    function startTournament(bytes32 tournamentId)
        external
        onlyTournamentOperator(tournamentId)
    {
        TournamentInfo storage tournament = tournaments[tournamentId];
        if (tournament.status != TournamentStatus.Upcoming) revert InvalidStatus();

        TournamentStatus oldStatus = tournament.status;
        tournament.status = TournamentStatus.Active;

        emit TournamentStatusChanged(tournamentId, oldStatus, TournamentStatus.Active);
    }

    /**
     * @notice Complete a tournament
     * @param tournamentId The tournament to complete
     */
    function completeTournament(bytes32 tournamentId)
        external
        onlyTournamentOperator(tournamentId)
    {
        TournamentInfo storage tournament = tournaments[tournamentId];
        if (tournament.status != TournamentStatus.Active) revert InvalidStatus();

        TournamentStatus oldStatus = tournament.status;
        tournament.status = TournamentStatus.Completed;

        emit TournamentStatusChanged(tournamentId, oldStatus, TournamentStatus.Completed);
    }

    /**
     * @notice Cancel a tournament
     * @param tournamentId The tournament to cancel
     */
    function cancelTournament(bytes32 tournamentId)
        external
        onlyTournamentOperator(tournamentId)
    {
        TournamentInfo storage tournament = tournaments[tournamentId];
        if (tournament.status == TournamentStatus.Completed) revert InvalidStatus();

        TournamentStatus oldStatus = tournament.status;
        tournament.status = TournamentStatus.Cancelled;

        // Cancel all associated markets
        for (uint256 i = 0; i < tournament.marketIds.length; i++) {
            try predictionMarket.cancelMarket(tournament.marketIds[i]) {} catch {}
        }

        emit TournamentStatusChanged(tournamentId, oldStatus, TournamentStatus.Cancelled);
    }

    /**
     * @notice Transfer tournament operator to a new address
     * @param tournamentId The tournament
     * @param newOperator The new operator address
     */
    function transferOperator(bytes32 tournamentId, address newOperator)
        external
        onlyTournamentOperator(tournamentId)
    {
        if (newOperator == address(0)) revert ZeroAddress();

        TournamentInfo storage tournament = tournaments[tournamentId];
        address oldOperator = tournament.operator;
        tournament.operator = newOperator;

        // Update operator tournaments mapping
        operatorTournaments[newOperator].push(tournamentId);

        // Grant role to new operator
        _grantRole(TOURNAMENT_OPERATOR_ROLE, newOperator);

        emit TournamentOperatorChanged(tournamentId, oldOperator, newOperator);
    }

    // ============ Market Management ============

    /**
     * @notice Create a prediction market for a tournament match
     * @param tournamentId The tournament this market belongs to
     * @param marketId Unique market identifier
     * @param question The prediction question
     * @param expireTime When the market expires
     * @return The market ID
     */
    function createMarketForTournament(
        bytes32 tournamentId,
        bytes32 marketId,
        string calldata question,
        uint256 expireTime
    ) external onlyTournamentOperator(tournamentId) returns (bytes32) {
        TournamentInfo storage tournament = tournaments[tournamentId];
        if (tournament.status != TournamentStatus.Active && tournament.status != TournamentStatus.Upcoming) {
            revert TournamentNotActive();
        }

        if (marketToTournament[marketId] != bytes32(0)) revert MarketAlreadyInTournament();

        // Create market in PredictionMarket contract
        predictionMarket.createMarket(marketId, question, expireTime, tournament.operator);

        // Link market to tournament
        tournament.marketIds.push(marketId);
        marketToTournament[marketId] = tournamentId;

        emit MarketAddedToTournament(tournamentId, marketId, question);

        return marketId;
    }

    /**
     * @notice Resolve a market within a tournament
     * @param tournamentId The tournament
     * @param marketId The market to resolve
     * @param winningOutcome The winning outcome
     */
    function resolveMarket(
        bytes32 tournamentId,
        bytes32 marketId,
        PredictionMarket.Outcome winningOutcome
    ) external onlyTournamentOperator(tournamentId) {
        if (marketToTournament[marketId] != tournamentId) revert MarketNotInTournament();

        predictionMarket.resolveMarket(marketId, winningOutcome);
    }

    /**
     * @notice Pause a market within a tournament
     * @param tournamentId The tournament
     * @param marketId The market to pause
     */
    function pauseMarket(bytes32 tournamentId, bytes32 marketId)
        external
        onlyTournamentOperator(tournamentId)
    {
        if (marketToTournament[marketId] != tournamentId) revert MarketNotInTournament();

        predictionMarket.pauseMarket(marketId);
    }

    /**
     * @notice Resume a paused market within a tournament
     * @param tournamentId The tournament
     * @param marketId The market to resume
     */
    function resumeMarket(bytes32 tournamentId, bytes32 marketId)
        external
        onlyTournamentOperator(tournamentId)
    {
        if (marketToTournament[marketId] != tournamentId) revert MarketNotInTournament();

        predictionMarket.resumeMarket(marketId);
    }

    /**
     * @notice Cancel a market within a tournament
     * @param tournamentId The tournament
     * @param marketId The market to cancel
     */
    function cancelMarket(bytes32 tournamentId, bytes32 marketId)
        external
        onlyTournamentOperator(tournamentId)
    {
        if (marketToTournament[marketId] != tournamentId) revert MarketNotInTournament();

        predictionMarket.cancelMarket(marketId);
    }

    // ============ Participant Registration ============

    /**
     * @notice Register for a tournament (pays entry fee if required)
     * @param tournamentId The tournament to register for
     */
    function registerForTournament(bytes32 tournamentId)
        external
        nonReentrant
        tournamentExists(tournamentId)
    {
        TournamentInfo storage tournament = tournaments[tournamentId];

        // Can only register for Upcoming or Active tournaments
        if (tournament.status != TournamentStatus.Upcoming && tournament.status != TournamentStatus.Active) {
            revert RegistrationClosed();
        }

        // Check if already registered
        if (isParticipant[tournamentId][msg.sender]) revert AlreadyRegistered();

        // Collect entry fee if required
        if (tournament.entryFee > 0) {
            collateralToken.safeTransferFrom(msg.sender, address(this), tournament.entryFee);
            tournament.totalEntryFees += tournament.entryFee;
        }

        // Register participant
        isParticipant[tournamentId][msg.sender] = true;
        tournament.participantCount++;

        emit ParticipantRegistered(tournamentId, msg.sender, tournament.entryFee);
    }

    /**
     * @notice Update the entry fee for a tournament (only before it starts)
     * @param tournamentId The tournament to update
     * @param newEntryFee The new entry fee
     */
    function updateTournamentEntryFee(bytes32 tournamentId, uint256 newEntryFee)
        external
        onlyTournamentOperator(tournamentId)
    {
        TournamentInfo storage tournament = tournaments[tournamentId];

        // Can only update fee for Upcoming tournaments
        if (tournament.status != TournamentStatus.Upcoming) revert InvalidStatus();
        if (newEntryFee > 0 && newEntryFee < minEntryFee) revert EntryFeeBelowMinimum();

        uint256 oldFee = tournament.entryFee;
        tournament.entryFee = newEntryFee;

        emit TournamentEntryFeeUpdated(tournamentId, oldFee, newEntryFee);
    }

    /**
     * @notice Withdraw collected entry fees (only after tournament is completed)
     * @param tournamentId The tournament to withdraw fees from
     * @param recipient Address to receive the fees
     */
    function withdrawEntryFees(bytes32 tournamentId, address recipient)
        external
        onlyTournamentOperator(tournamentId)
        nonReentrant
    {
        if (recipient == address(0)) revert ZeroAddress();

        TournamentInfo storage tournament = tournaments[tournamentId];

        // Can only withdraw after completion
        if (tournament.status != TournamentStatus.Completed) revert InvalidStatus();

        uint256 amount = tournament.totalEntryFees;
        if (amount == 0) revert NoFeesToWithdraw();

        tournament.totalEntryFees = 0;
        collateralToken.safeTransfer(recipient, amount);

        emit EntryFeesWithdrawn(tournamentId, recipient, amount);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the minimum entry fee allowed
     * @param newMinEntryFee New minimum entry fee
     */
    function setMinEntryFee(uint256 newMinEntryFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldFee = minEntryFee;
        minEntryFee = newMinEntryFee;
        emit MinEntryFeeUpdated(oldFee, newMinEntryFee);
    }

    // ============ View Functions ============

    /**
     * @notice Get tournament details
     * @param tournamentId The tournament ID
     * @return Tournament info struct
     */
    function getTournament(bytes32 tournamentId)
        external
        view
        returns (TournamentInfo memory)
    {
        return tournaments[tournamentId];
    }

    /**
     * @notice Get all tournament IDs
     * @return Array of tournament IDs
     */
    function getTournamentIds() external view returns (bytes32[] memory) {
        return tournamentIds;
    }

    /**
     * @notice Get markets for a tournament
     * @param tournamentId The tournament ID
     * @return Array of market IDs
     */
    function getTournamentMarkets(bytes32 tournamentId)
        external
        view
        returns (bytes32[] memory)
    {
        return tournaments[tournamentId].marketIds;
    }

    /**
     * @notice Get tournaments operated by an address
     * @param operator The operator address
     * @return Array of tournament IDs
     */
    function getOperatorTournaments(address operator)
        external
        view
        returns (bytes32[] memory)
    {
        return operatorTournaments[operator];
    }

    /**
     * @notice Get the tournament a market belongs to
     * @param marketId The market ID
     * @return Tournament ID (bytes32(0) if not in a tournament)
     */
    function getMarketTournament(bytes32 marketId) external view returns (bytes32) {
        return marketToTournament[marketId];
    }

    /**
     * @notice Check if an address is a tournament operator
     * @param account The address to check
     * @return True if the address is a tournament operator
     */
    function isTournamentOperator(address account) external view returns (bool) {
        return hasRole(TOURNAMENT_OPERATOR_ROLE, account);
    }
}
