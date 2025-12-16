# Vault + EIP-2612 Permit Integration Guide

## Overview

This guide covers the improved UX flow for placing orders on the Espotz prediction market. The new architecture keeps the vault pattern but adds helper functions to reduce transaction count.

## Architecture

```
OLD FLOW (3 transactions):
User → approve(vault) → deposit(amount) → placeOrder(...)

NEW FLOW A (2 transactions):
User → approve(vault) → depositAndPlaceOrder(amount, ...)

NEW FLOW B (1 transaction - gasless):
User → signPermit(off-chain) → depositWithPermitAndPlaceOrder(amount, ..., v, r, s)
```

## Why Keep the Vault?

The vault pattern provides:
1. **Single approval** - Approve once, trade on ALL markets
2. **Separation of concerns** - Vault handles money, Market handles trading logic
3. **Smaller attack surface** - 7KB vault is easier to audit than 38KB monolith
4. **Trading balance visibility** - Users see "in-game" vs "wallet" funds

---

## Contract Functions

### PredictionMarket.sol

#### depositAndPlaceOrder
Deposit to vault and place order in a single transaction.

```solidity
function depositAndPlaceOrder(
    uint256 depositAmount,    // Amount to deposit (0 if sufficient balance)
    bytes32 marketId,
    OrderSide side,           // 0 = BUY, 1 = SELL
    Outcome outcome,          // 0 = YES, 1 = NO
    uint256 price,            // Basis points (1-9999)
    uint256 quantity,         // Number of shares
    uint256 expireTime        // Order expiration timestamp
) external returns (bytes32 orderId)
```

#### depositWithPermitAndPlaceOrder
Gasless deposit + order using EIP-2612 permit signature.

```solidity
function depositWithPermitAndPlaceOrder(
    uint256 depositAmount,
    bytes32 marketId,
    OrderSide side,
    Outcome outcome,
    uint256 price,
    uint256 quantity,
    uint256 expireTime,
    uint256 deadline,         // Permit deadline
    uint8 v,                  // Signature v
    bytes32 r,                // Signature r
    bytes32 s                 // Signature s
) external returns (bytes32 orderId)
```

#### Helper View Functions

```solidity
// Calculate collateral needed for order
function calculateCollateralRequired(
    OrderSide side,
    uint256 price,
    uint256 quantity
) external pure returns (uint256)

// Calculate how much user needs to deposit (returns 0 if sufficient)
function calculateDepositNeeded(
    address user,
    OrderSide side,
    uint256 price,
    uint256 quantity
) external view returns (uint256)
```

### CollateralVault.sol

```solidity
// Direct deposit with permit (gasless)
function depositWithPermit(
    uint256 amount,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external

// Deposit on behalf of user (market contracts only)
function depositFor(address user, uint256 amount) external

// Deposit for user with permit (market contracts only)
function depositForWithPermit(
    address user,
    uint256 amount,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external

// Check if token supports permit
function supportsPermit() external view returns (bool)
```

### MockUSDT.sol

Now implements ERC20Permit (EIP-2612):
- `permit(owner, spender, value, deadline, v, r, s)`
- `nonces(owner)` - Get current nonce for permit
- `DOMAIN_SEPARATOR()` - EIP-712 domain separator

---

## Frontend Integration

### 1. Calculate Deposit Needed

```typescript
import { useReadContract } from 'wagmi';

function useDepositNeeded(user: Address, side: number, price: number, quantity: bigint) {
  return useReadContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: predictionMarketAbi,
    functionName: 'calculateDepositNeeded',
    args: [user, side, BigInt(price), quantity],
  });
}
```

### 2. Place Order with Auto-Deposit

```typescript
import { useWriteContract } from 'wagmi';

function usePlaceOrderWithDeposit() {
  const { writeContract } = useWriteContract();

  const placeOrder = async (params: {
    depositAmount: bigint;
    marketId: `0x${string}`;
    side: 0 | 1;
    outcome: 0 | 1;
    price: number;
    quantity: bigint;
    expireTime: number;
  }) => {
    await writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'depositAndPlaceOrder',
      args: [
        params.depositAmount,
        params.marketId,
        params.side,
        params.outcome,
        BigInt(params.price),
        params.quantity,
        BigInt(params.expireTime),
      ],
    });
  };

  return { placeOrder };
}
```

### 3. Gasless Order with Permit

```typescript
import { useSignTypedData, useWriteContract } from 'wagmi';
import { parseSignature } from 'viem';

function useGaslessOrder() {
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContract } = useWriteContract();

  const placeGaslessOrder = async (params: {
    amount: bigint;
    marketId: `0x${string}`;
    side: 0 | 1;
    outcome: 0 | 1;
    price: number;
    quantity: bigint;
    expireTime: number;
    userAddress: Address;
  }) => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

    // Get current nonce
    const nonce = await readContract({
      address: USDT_ADDRESS,
      abi: erc20PermitAbi,
      functionName: 'nonces',
      args: [params.userAddress],
    });

    // Sign permit message (off-chain, no gas)
    const signature = await signTypedDataAsync({
      domain: {
        name: 'Mock USDT',
        version: '1',
        chainId: 97, // BSC Testnet
        verifyingContract: USDT_ADDRESS,
      },
      types: {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Permit',
      message: {
        owner: params.userAddress,
        spender: VAULT_ADDRESS,
        value: params.amount,
        nonce,
        deadline,
      },
    });

    const { r, s, v } = parseSignature(signature);

    // Execute gasless order (single transaction)
    await writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: predictionMarketAbi,
      functionName: 'depositWithPermitAndPlaceOrder',
      args: [
        params.amount,
        params.marketId,
        params.side,
        params.outcome,
        BigInt(params.price),
        params.quantity,
        BigInt(params.expireTime),
        deadline,
        Number(v),
        r,
        s,
      ],
    });
  };

  return { placeGaslessOrder };
}
```

---

## Decision Tree: Which Flow to Use

```
User wants to place order
          │
          ▼
    Has vault balance?
        /     \
      YES      NO
       │        │
       ▼        ▼
  placeOrder()  Has USDT approved to vault?
                    /          \
                  YES           NO
                   │             │
                   ▼             ▼
      depositAndPlaceOrder()   Want gasless?
                                /      \
                              YES       NO
                               │         │
                               ▼         ▼
          depositWithPermitAndPlaceOrder()  approve() then
                                            depositAndPlaceOrder()
```

### Recommended Frontend Logic

```typescript
async function determineBestFlow(user: Address, side: number, price: number, qty: bigint) {
  const vaultBalance = await vault.getAvailableBalance(user);
  const allowance = await usdt.allowance(user, vaultAddress);
  const supportsPermit = await vault.supportsPermit();
  const depositNeeded = await market.calculateDepositNeeded(user, side, price, qty);

  if (depositNeeded === 0n) {
    return 'placeOrder';  // User has enough in vault
  } else if (supportsPermit) {
    return 'depositWithPermitAndPlaceOrder';  // Best UX: single tx
  } else if (allowance >= depositNeeded) {
    return 'depositAndPlaceOrder';  // Already approved
  } else {
    return 'approve_then_depositAndPlaceOrder';  // Need approval first
  }
}
```

### UI Button States

| State | Button Text | Action |
|-------|-------------|--------|
| Sufficient vault balance | "Place Order" | `placeOrder()` |
| Need deposit, permit supported | "Place Order" | `depositWithPermitAndPlaceOrder()` |
| Need deposit, approved | "Deposit & Place Order" | `depositAndPlaceOrder()` |
| Need approval | "Approve USDT" → "Place Order" | `approve()` → `depositAndPlaceOrder()` |

---

## Gas Cost Comparison (BSC Testnet)

| Flow | Transactions | Est. Gas |
|------|--------------|----------|
| Traditional (approve→deposit→order) | 3 | ~400k total |
| With helper (approve→depositAndOrder) | 2 | ~400k total |
| With permit (sign→depositWithPermitAndOrder) | 1 | ~280k total |

**Permit flow saves ~30% gas** by eliminating the approve transaction.

---

## Contract Addresses (BSC Testnet)

```typescript
const CONTRACTS = {
  Tournament: '0xaE855c89c23544129f9d0B8E414aCbc9B221dc59',
  MockUSDT: '0x9a4A325c2Ff2aCA74246ef031C8891b2d1096113',
  ChainId: 97,
};
```

---

## Security Considerations

1. **Permit Replay Protection**: Each permit uses a nonce that increments after use
2. **Deadline**: Always set a reasonable deadline (1 hour recommended)
3. **Signature Validation**: The contract validates signatures on-chain
4. **Fallback**: If permit fails (already used), contract checks existing allowance
