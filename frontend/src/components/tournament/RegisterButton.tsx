'use client';

import { useEffect } from 'react';
import { formatUnits, maxUint256 } from 'viem';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI, ERC20_ABI } from '@/contracts/abis';

export function RegisterButton({ tournamentId, entryFee }: { tournamentId: `0x${string}`; entryFee: bigint }) {
  const { address } = useAccount();

  // Check USDT allowance for Tournament contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.USDT,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ESPOTZ_CONTRACTS.addresses.Tournament] : undefined,
    query: { enabled: !!address },
  });

  // Approval transaction
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
  } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Registration transaction
  const {
    writeContract: writeRegister,
    data: registerHash,
    isPending: isRegisterPending,
  } = useWriteContract();
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });

  // Refetch allowance after approval succeeds
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  const needsApproval = !allowance || allowance < entryFee;

  const handleApprove = () => {
    writeApprove({
      address: ESPOTZ_CONTRACTS.addresses.USDT,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ESPOTZ_CONTRACTS.addresses.Tournament, maxUint256],
    } as any);
  };

  const handleRegister = () => {
    writeRegister({
      address: ESPOTZ_CONTRACTS.addresses.Tournament,
      abi: TOURNAMENT_ABI,
      functionName: 'registerForTournament',
      args: [tournamentId],
    } as any);
  };

  // Show approval button if needed
  if (needsApproval && !isApproveSuccess) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 text-center">
          First, approve the Tournament contract to spend your USDT
        </p>
        <button
          onClick={handleApprove}
          disabled={isApprovePending || isApproveConfirming}
          className="btn-warning w-full"
        >
          {isApprovePending ? 'Confirm in wallet...' : isApproveConfirming ? 'Approving...' : 'Approve USDT'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleRegister}
      disabled={isRegisterPending || isRegisterConfirming}
      className="btn-primary btn-lg w-full"
    >
      {isRegisterPending ? 'Confirm in wallet...' : isRegisterConfirming ? 'Registering...' : isRegisterSuccess ? 'Registered!' :
        `Join Tournament (${formatUnits(entryFee, 6)} USDT)`}
    </button>
  );
}
