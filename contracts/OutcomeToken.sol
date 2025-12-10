// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OutcomeToken
 * @notice ERC20 token representing a position in a prediction market outcome (YES or NO)
 * @dev Only the owning PredictionMarket contract can mint and burn tokens
 */
contract OutcomeToken is ERC20, Ownable {
    // ============ State Variables ============

    /// @notice The market ID this token belongs to
    bytes32 public immutable marketId;

    /// @notice Whether this is a YES (true) or NO (false) token
    bool public immutable isYesToken;

    // ============ Errors ============

    error ZeroAmount();
    error ZeroAddress();

    // ============ Constructor ============

    /**
     * @notice Creates a new outcome token
     * @param _name Token name (e.g., "Market-123-YES")
     * @param _symbol Token symbol (e.g., "M123Y")
     * @param _marketId The market ID this token belongs to
     * @param _isYesToken True if this is a YES token, false for NO
     * @param _market The PredictionMarket contract that owns this token
     */
    constructor(
        string memory _name,
        string memory _symbol,
        bytes32 _marketId,
        bool _isYesToken,
        address _market
    ) ERC20(_name, _symbol) Ownable(_market) {
        marketId = _marketId;
        isYesToken = _isYesToken;
    }

    // ============ External Functions ============

    /**
     * @notice Mint tokens to an address (only callable by PredictionMarket)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address (only callable by PredictionMarket)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _burn(from, amount);
    }

    /**
     * @notice Override decimals to match USDT (6 decimals)
     * @return Number of decimals (6)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
