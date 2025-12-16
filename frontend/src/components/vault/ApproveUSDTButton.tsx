'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ERC20_ABI } from '@/contracts/abis';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { maxUint256 } from 'viem';

export function ApproveUSDTButton() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleApprove = () => {
    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.USDT,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [
        ESPOTZ_CONTRACTS.addresses.CollateralVault,
        maxUint256  // Infinite approval
      ],
    } as any);
  };

  return (
    <button
      onClick={handleApprove}
      disabled={isPending || isConfirming}
      className="btn-warning w-full"
    >
      {isPending ? 'Confirming...' : isConfirming ? 'Approving...' : isSuccess ? 'Approved!' : 'Approve USDT'}
    </button>
  );
}
