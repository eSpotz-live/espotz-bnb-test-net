'use client';

import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';
import { usePlaceOrder } from '@/hooks/usePredictionMarket';

enum OrderSide { BUY = 0, SELL = 1 }
enum Outcome { YES = 0, NO = 1 }

interface PlaceOrderProps {
  marketId: `0x${string}`;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  price: string;      // In basis points (e.g., "6000" for 60%)
  quantity: string;   // Number of tokens
  expireTime: number; // Unix timestamp
  disabled?: boolean; // External disable flag
}

export function PlaceOrderButton({ marketId, side, outcome, price, quantity, expireTime, disabled }: PlaceOrderProps) {
  const { writeContract, isPending, isConfirming, isSuccess, error } = usePlaceOrder();

  const handlePlaceOrder = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'placeOrder',
      args: [
        marketId,
        side === 'BUY' ? OrderSide.BUY : OrderSide.SELL,
        outcome === 'YES' ? Outcome.YES : Outcome.NO,
        BigInt(price),                    // Price in basis points
        parseUnits(quantity, 6),          // Quantity with 6 decimals
        BigInt(expireTime)                // Expiration timestamp
      ],
    } as any);
  };

  const buttonText = `${side} ${outcome}`;
  const buttonClass = outcome === 'YES' ? 'btn-success w-full' : 'btn-danger w-full';

  return (
    <button
      onClick={handlePlaceOrder}
      disabled={isPending || isConfirming || !price || !quantity || disabled}
      className={buttonClass}
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Placing Order...' : isSuccess ? 'Order Placed!' : buttonText}
    </button>
  );
}
