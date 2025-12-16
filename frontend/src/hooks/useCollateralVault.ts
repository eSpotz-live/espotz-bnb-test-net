import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { COLLATERAL_VAULT_ABI, ERC20_ABI } from '@/contracts/abis';
import { maxUint256 } from 'viem';

export function useVaultBalance(address: `0x${string}` | undefined) {
  const { data: totalBalance, refetch: refetchTotal } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
    abi: COLLATERAL_VAULT_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchOnWindowFocus: true,
      staleTime: 5000  // Consider data stale after 5 seconds
    }
  });

  const { data: lockedBalance, refetch: refetchLocked } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
    abi: COLLATERAL_VAULT_ABI,
    functionName: 'lockedBalances',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchOnWindowFocus: true,
      staleTime: 5000
    }
  });

  // Check for undefined explicitly since 0n is falsy in JavaScript
  const availableBalance = totalBalance !== undefined && lockedBalance !== undefined
    ? (totalBalance as bigint) - (lockedBalance as bigint)
    : 0n;

  const refetch = () => {
    refetchTotal();
    refetchLocked();
  };

  return {
    totalBalance: totalBalance as bigint | undefined,
    lockedBalance: lockedBalance as bigint | undefined,
    availableBalance,
    refetch
  };
}

export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useUSDTAllowance(address: `0x${string}` | undefined) {
  const { data: allowance, refetch } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.USDT,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ESPOTZ_CONTRACTS.addresses.CollateralVault] : undefined,
    query: { enabled: !!address }
  });

  const hasAllowance = allowance ? (allowance as bigint) > 0n : false;

  return {
    allowance: allowance as bigint | undefined,
    hasAllowance,
    refetch
  };
}

export function useApproveUSDT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.USDT,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ESPOTZ_CONTRACTS.addresses.CollateralVault, maxUint256],
    } as any);
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}
