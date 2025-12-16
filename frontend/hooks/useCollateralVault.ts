import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { COLLATERAL_VAULT_ABI } from '@/contracts/abis';

export function useVaultBalance(address: `0x${string}` | undefined) {
  const { data: totalBalance } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
    abi: COLLATERAL_VAULT_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: lockedBalance } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
    abi: COLLATERAL_VAULT_ABI,
    functionName: 'lockedBalances',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const availableBalance = totalBalance && lockedBalance
    ? (totalBalance as bigint) - (lockedBalance as bigint)
    : 0n;

  return {
    totalBalance: totalBalance as bigint | undefined,
    lockedBalance: lockedBalance as bigint | undefined,
    availableBalance
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
