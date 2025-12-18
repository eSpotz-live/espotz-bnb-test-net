import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { PREDICTION_MARKET_ABI } from '@/contracts/abis';

// Refresh interval for live data (5 seconds)
const REFRESH_INTERVAL = 5000;

export function useMarket(marketId: `0x${string}`) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: [marketId],
    query: { refetchInterval: REFRESH_INTERVAL },
  });
}

export function useMarketIds() {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarketIds',
    query: { refetchInterval: REFRESH_INTERVAL },
  });
}

export function useOrderBook(marketId: `0x${string}`, outcome: number, side: number) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOrderBook',
    args: [marketId, outcome, side],
    query: { refetchInterval: REFRESH_INTERVAL },
  });
}

export function useOrder(orderId: `0x${string}` | undefined) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getOrder',
    args: orderId ? [orderId] : undefined,
    query: {
      enabled: !!orderId,
      refetchInterval: REFRESH_INTERVAL,
    },
  });
}

export function useUserOrders(address: `0x${string}` | undefined) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getUserOrders',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: REFRESH_INTERVAL,
    }
  });
}

export function usePlaceOrder() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useCancelOrder() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimWinnings() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimRefund() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}
