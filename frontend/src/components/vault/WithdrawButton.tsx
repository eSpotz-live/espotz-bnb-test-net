'use client';

import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { COLLATERAL_VAULT_ABI } from '@/contracts/abis';
import { useWithdraw } from '@/hooks/useCollateralVault';

export function WithdrawButton({ amount }: { amount: string }) {
  const { writeContract, isPending, isConfirming, isSuccess } = useWithdraw();

  const handleWithdraw = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
      abi: COLLATERAL_VAULT_ABI,
      functionName: 'withdraw',
      args: [parseUnits(amount, 6)],
    } as any);
  };

  return (
    <button
      onClick={handleWithdraw}
      disabled={isPending || isConfirming || !amount}
      className="btn-danger w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Withdrawing...' : isSuccess ? 'Withdrawn!' : 'Withdraw USDT'}
    </button>
  );
}
