// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @notice Mock USDT token for testing purposes
 */
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    /**
     * @notice Mint tokens to an address (for testing)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Override decimals to match USDT (6 decimals)
     * @return Number of decimals
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
