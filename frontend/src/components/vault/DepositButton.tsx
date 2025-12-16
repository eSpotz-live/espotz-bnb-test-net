'use client';

import { parseUnits } from 'viem';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { COLLATERAL_VAULT_ABI } from '@/contracts/abis';
import { useDeposit } from '@/hooks/useCollateralVault';

export function DepositButton({ amount }: { amount: string }) {
  const { writeContract, isPending, isConfirming, isSuccess } = useDeposit();

  const handleDeposit = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.CollateralVault,
      abi: COLLATERAL_VAULT_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)], // USDT has 6 decimals
    } as any);
  };

  return (
    <button
      onClick={handleDeposit}
      disabled={isPending || isConfirming || !amount}
      className="btn-success w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Depositing...' : isSuccess ? 'Deposited!' : 'Deposit USDT'}
    </button>
  );
}
