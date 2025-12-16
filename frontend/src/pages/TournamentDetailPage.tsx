import { useParams, Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTournament, useTournamentMarkets, useIsParticipant, useIsOperator } from '@/hooks/useTournament';
import { RegisterButton } from '@/components/tournament/RegisterButton';
import { StartTournamentButton } from '@/components/tournament/StartTournamentButton';
import { CompleteTournamentButton } from '@/components/tournament/CompleteTournamentButton';
import { CancelTournamentButton } from '@/components/tournament/CancelTournamentButton';
import { UpdateEntryFeeButton } from '@/components/tournament/UpdateEntryFeeButton';
import { WithdrawFeesButton } from '@/components/tournament/WithdrawFeesButton';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { formatUnits } from 'viem';
import { format } from 'date-fns';

// Tournament struct type from contract
interface Tournament {
  tournamentId: `0x${string}`;
  name: string;
  entryFee: bigint;
  prizePool: bigint;
  participantCount: bigint;
  maxParticipants: bigint;
  status: number;
  startTime: bigint;
  endTime: bigint;
  createdAt: bigint;
  operator: `0x${string}`;
}

// Market card for tournament markets
function TournamentMarketCard({ marketId }: { marketId: `0x${string}` }) {
  return (
    <Link
      to={`/markets/${marketId}`}
      className="block bg-espotz-black rounded-lg p-4 hover:bg-gray-800 transition"
    >
      <p className="text-sm text-gray-400">Market ID</p>
      <p className="font-mono text-xs break-all">{marketId}</p>
    </Link>
  );
}

export default function TournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { address, isConnected } = useAccount();
  const { data: tournament, isLoading, error } = useTournament(tournamentId as `0x${string}`);
  const { data: tournamentMarkets } = useTournamentMarkets(tournamentId as `0x${string}`);
  const { data: isParticipant } = useIsParticipant(tournamentId as `0x${string}`, address);
  const { data: isOperator } = useIsOperator(address);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-espotz-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-gray-400">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-espotz-black">
        <Navigation currentPage="tournaments" />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Tournament Not Found</h1>
          <p className="text-gray-400 mb-8">This tournament does not exist or could not be loaded.</p>
          <Link to="/tournaments" className="btn-primary">Back to Tournaments</Link>
        </div>
      </div>
    );
  }

  const tournamentData = tournament as Tournament;

  const {
    name,
    entryFee,
    prizePool,
    participantCount,
    maxParticipants,
    status,
    startTime,
    endTime,
    operator,
  } = tournamentData;

  const entryFeeFormatted = Number(formatUnits(entryFee, 6));
  const prizePoolFormatted = Number(formatUnits(prizePool, 6));
  const startDate = new Date(Number(startTime) * 1000);
  const endDate = new Date(Number(endTime) * 1000);

  // TournamentStatus: 0=Open, 1=Active, 2=Completed, 3=Cancelled
  let statusColor = 'bg-blue-500/20 text-blue-400';
  let statusText = 'Open';

  if (status === 1) {
    statusColor = 'bg-green-500/20 text-green-400';
    statusText = 'Active';
  } else if (status === 2) {
    statusColor = 'bg-purple-500/20 text-purple-400';
    statusText = 'Completed';
  } else if (status === 3) {
    statusColor = 'bg-red-500/20 text-red-400';
    statusText = 'Cancelled';
  }

  const marketIds = (tournamentMarkets as `0x${string}`[]) || [];
  const isUserOperator = Boolean(isOperator);
  const isUserParticipant = Boolean(isParticipant);

  return (
    <div className="min-h-screen bg-espotz-black">
      <Navigation currentPage="tournaments" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/tournaments" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2">
            ← Back to Tournaments
          </Link>
        </div>

        {/* Tournament Header */}
        <div className="bg-espotz-dark-gray rounded-xl p-6 mb-8 border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>ID: {tournamentId?.slice(0, 10)}...{tournamentId?.slice(-8)}</span>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full font-semibold ${statusColor}`}>
              {statusText}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Entry Fee</p>
              <p className="text-2xl font-bold">{entryFeeFormatted.toFixed(2)} USDT</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Prize Pool</p>
              <p className="text-2xl font-bold text-green-400">{prizePoolFormatted.toFixed(2)} USDT</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Participants</p>
              <p className="text-2xl font-bold">
                {participantCount.toString()} / {maxParticipants.toString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Duration</p>
              <p className="text-lg font-semibold">{format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd')}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Tournament Markets */}
            <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800 mb-8">
              <h3 className="text-xl font-bold mb-4">Tournament Markets</h3>
              {marketIds.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No markets created for this tournament yet.</p>
              ) : (
                <div className="space-y-3">
                  {marketIds.map((marketId) => (
                    <TournamentMarketCard key={marketId} marketId={marketId} />
                  ))}
                </div>
              )}
            </div>

            {/* Participation Status */}
            {isConnected && (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Your Status</h3>
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-full font-semibold ${
                    isUserParticipant
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {isUserParticipant ? 'Registered' : 'Not Registered'}
                  </span>
                  {isUserOperator && (
                    <span className="px-4 py-2 rounded-full font-semibold bg-purple-500/20 text-purple-400">
                      Operator
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Actions */}
            {!isConnected ? (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800 text-center">
                <h3 className="text-xl font-bold mb-4">Connect to Participate</h3>
                <p className="text-gray-400 mb-6">Connect your wallet to register for this tournament</p>
                <ConnectButton />
              </div>
            ) : status === 0 && !isUserParticipant ? (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Register</h3>
                <p className="text-gray-400 mb-4">Entry fee: {entryFeeFormatted.toFixed(2)} USDT</p>
                <RegisterButton tournamentId={tournamentId as `0x${string}`} entryFee={entryFee} />
              </div>
            ) : status === 0 && isUserParticipant ? (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Registered</h3>
                <p className="text-gray-400">You are registered for this tournament. Wait for it to start.</p>
              </div>
            ) : status === 1 ? (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Tournament Active</h3>
                <p className="text-gray-400">
                  {isUserParticipant
                    ? 'Trade on tournament markets to earn points!'
                    : 'This tournament is in progress. Registration is closed.'}
                </p>
              </div>
            ) : (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Tournament Ended</h3>
                <p className="text-gray-400">This tournament has ended.</p>
              </div>
            )}

            {/* Operator Controls */}
            {isConnected && isUserOperator && (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Operator Controls</h3>
                <div className="space-y-3">
                  {status === 0 && (
                    <>
                      <StartTournamentButton tournamentId={tournamentId as `0x${string}`} />
                      <UpdateEntryFeeButton tournamentId={tournamentId as `0x${string}`} />
                      <CancelTournamentButton tournamentId={tournamentId as `0x${string}`} />
                    </>
                  )}
                  {status === 1 && (
                    <CompleteTournamentButton tournamentId={tournamentId as `0x${string}`} />
                  )}
                  {status === 2 && (
                    <WithdrawFeesButton tournamentId={tournamentId as `0x${string}`} />
                  )}
                </div>
              </div>
            )}

            {/* Tournament Information */}
            <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold mb-4">Tournament Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400">Operator</p>
                  <p className="font-mono text-xs break-all">{operator}</p>
                </div>
                <div>
                  <p className="text-gray-400">Tournament ID</p>
                  <p className="font-mono text-xs break-all">{tournamentId}</p>
                </div>
                <div>
                  <p className="text-gray-400">Start Time</p>
                  <p className="font-semibold">{format(startDate, 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-gray-400">End Time</p>
                  <p className="font-semibold">{format(endDate, 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
