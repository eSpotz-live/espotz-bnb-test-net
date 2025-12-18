'use client';

import { useReadContract } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';
import { useOrder } from './usePredictionMarket';

// Order struct from contract
interface Order {
  orderId: `0x${string}`;
  marketId: `0x${string}`;
  trader: `0x${string}`;
  side: number; // 0=BUY, 1=SELL
  outcome: number; // 0=YES, 1=NO
  price: bigint; // basis points (1-9999)
  quantity: bigint;
  filled: bigint;
  collateralLocked: bigint;
  status: number; // 0=Open, 1=Filled, 2=Cancelled
  createdAt: bigint;
  expireTime: bigint;
}

interface MarketPrices {
  yesBid: number | null; // Best bid for YES (highest buy price)
  yesAsk: number | null; // Best ask for YES (lowest sell price)
  yesMid: number | null; // Mid price for YES
  noBid: number | null;  // Best bid for NO
  noAsk: number | null;  // Best ask for NO
  noMid: number | null;  // Mid price for NO
  yesPrice: number;      // Display price for YES in cents (0-100)
  noPrice: number;       // Display price for NO in cents (0-100)
  isLoading: boolean;
  refetch: () => void;
}

// Convert basis points to cents (5000 bp = 50 cents)
function bpToCents(bp: number): number {
  return bp / 100;
}

// Get best price from first order in list (simplified - assumes sorted)
function useBestPriceFromFirstOrder(
  orderIds: `0x${string}`[] | undefined,
): { price: number | null; isLoading: boolean } {
  const firstOrderId = orderIds && orderIds.length > 0 ? orderIds[0] : undefined;
  const { data: order, isLoading } = useOrder(firstOrderId);

  if (!order) {
    return { price: null, isLoading };
  }

  const orderData = order as Order;

  // Skip non-open orders
  if (orderData.status !== 0) {
    return { price: null, isLoading };
  }

  // Skip fully filled orders
  const remaining = Number(orderData.quantity) - Number(orderData.filled);
  if (remaining <= 0) {
    return { price: null, isLoading };
  }

  return { price: Number(orderData.price), isLoading };
}

export function useMarketPrice(marketId: `0x${string}`): MarketPrices {
  // Fetch order book IDs for all combinations
  const { data: yesBuyIds, isLoading: l1, refetch: r1 } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOrderBook',
    args: [marketId, 0, 0], // YES, BUY
    query: { refetchInterval: 5000 },
  });

  const { data: yesSellIds, isLoading: l2, refetch: r2 } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOrderBook',
    args: [marketId, 0, 1], // YES, SELL
    query: { refetchInterval: 5000 },
  });

  const { data: noBuyIds, isLoading: l3, refetch: r3 } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOrderBook',
    args: [marketId, 1, 0], // NO, BUY
    query: { refetchInterval: 5000 },
  });

  const { data: noSellIds, isLoading: l4, refetch: r4 } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOrderBook',
    args: [marketId, 1, 1], // NO, SELL
    query: { refetchInterval: 5000 },
  });

  // Get best prices from first orders (simplified)
  const { price: yesBidBp, isLoading: l5 } = useBestPriceFromFirstOrder(yesBuyIds as `0x${string}`[]);
  const { price: yesAskBp, isLoading: l6 } = useBestPriceFromFirstOrder(yesSellIds as `0x${string}`[]);
  const { price: noBidBp, isLoading: l7 } = useBestPriceFromFirstOrder(noBuyIds as `0x${string}`[]);
  const { price: noAskBp, isLoading: l8 } = useBestPriceFromFirstOrder(noSellIds as `0x${string}`[]);

  // Convert to cents
  const yesBid = yesBidBp !== null ? bpToCents(yesBidBp) : null;
  const yesAsk = yesAskBp !== null ? bpToCents(yesAskBp) : null;
  const noBid = noBidBp !== null ? bpToCents(noBidBp) : null;
  const noAsk = noAskBp !== null ? bpToCents(noAskBp) : null;

  // Calculate mid prices
  const yesMid = yesBid !== null && yesAsk !== null
    ? (yesBid + yesAsk) / 2
    : yesBid ?? yesAsk;

  const noMid = noBid !== null && noAsk !== null
    ? (noBid + noAsk) / 2
    : noBid ?? noAsk;

  // Determine display prices (in cents)
  // If we have a mid price, use it; otherwise use 50 cents (50%)
  let yesPrice = yesMid ?? 50;
  let noPrice = noMid ?? 50;

  // Ensure prices sum to 100 cents if we have data for both
  if (yesMid !== null || noMid !== null) {
    if (yesMid !== null && noMid === null) {
      noPrice = 100 - yesPrice;
    } else if (noMid !== null && yesMid === null) {
      yesPrice = 100 - noPrice;
    }
  }

  const refetch = () => {
    r1();
    r2();
    r3();
    r4();
  };

  return {
    yesBid,
    yesAsk,
    yesMid,
    noBid,
    noAsk,
    noMid,
    yesPrice: Math.round(yesPrice),
    noPrice: Math.round(noPrice),
    isLoading: l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8,
    refetch,
  };
}

// Simple hook to get just the display prices for cards
export function useMarketDisplayPrice(marketId: `0x${string}`): {
  yesPrice: number;
  noPrice: number;
  isLoading: boolean;
} {
  const { yesPrice, noPrice, isLoading } = useMarketPrice(marketId);
  return { yesPrice, noPrice, isLoading };
}
