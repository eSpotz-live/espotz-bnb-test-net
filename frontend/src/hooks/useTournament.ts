import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';
import { TOURNAMENT_ABI } from '@/contracts/abis';

export function useTournament(tournamentId: `0x${string}`) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.Tournament,
    abi: TOURNAMENT_ABI,
    functionName: 'getTournament',
    args: [tournamentId],
  });
}

export function useTournamentIds() {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.Tournament,
    abi: TOURNAMENT_ABI,
    functionName: 'getTournamentIds',
  });
}

export function useTournamentMarkets(tournamentId: `0x${string}`) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.Tournament,
    abi: TOURNAMENT_ABI,
    functionName: 'getTournamentMarkets',
    args: [tournamentId],
  });
}

export function useIsOperator(address: `0x${string}` | undefined) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.Tournament,
    abi: TOURNAMENT_ABI,
    functionName: 'isTournamentOperator',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
}

export function useRegisterTournament() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useStartTournament() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useIsParticipant(tournamentId: `0x${string}`, address: `0x${string}` | undefined) {
  return useReadContract({
    address: ESPOTZ_CONTRACTS.addresses.Tournament,
    abi: TOURNAMENT_ABI,
    functionName: 'isParticipant',
    args: address ? [tournamentId, address] : undefined,
    query: { enabled: !!address },
  });
}

export function useCancelTournament() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useUpdateEntryFee() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}

export function useCreateMarketForTournament() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isSuccess, error };
}
