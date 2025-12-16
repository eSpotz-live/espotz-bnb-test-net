import { Link } from 'react-router-dom';
import { useTournament, useTournamentMarkets } from '@/hooks/useTournament';
import { formatUnits } from 'viem';
import { format } from 'date-fns';

interface TournamentCardProps {
  tournamentId: `0x${string}`;
}

// Game name to image mapping
const GAME_IMAGES: Record<string, string> = {
  'COD Mobile': '/games/COD2.png',
  'PUBG Mobile': '/games/pubg.png',
  'FreeFire': '/games/FF.png',
  'Fortnite': '/games/fortnite.png',
  'CS': '/games/CS.png',
  'League of Legends': '/games/LOL.png',
  'Valorant': '/games/valorant.png',
};

// Parse game from description field
// New format: "GameName|MAX_PLAYERS:100|DESC:description"
// Old format: "GAME:GameName|MAX_PLAYERS:100|DESC:description"
function parseGameFromDescription(description: string): { game: string; actualDescription: string; maxPlayers: string } | null {
  // Try new format first (game name is at the start)
  const newFormatMatch = description.match(/^([^|]+)\|MAX_PLAYERS:([^|]+)\|DESC:(.+)/);
  if (newFormatMatch) {
    return {
      game: newFormatMatch[1].trim(),
      maxPlayers: newFormatMatch[2].trim(),
      actualDescription: newFormatMatch[3].trim()
    };
  }

  // Try old format with GAME: prefix
  const gameMatch = description.match(/GAME:([^|]+)/);
  const maxPlayersMatch = description.match(/MAX_PLAYERS:([^|]+)/);
  const descMatch = description.match(/DESC:(.+)/);

  if (gameMatch) {
    return {
      game: gameMatch[1].trim(),
      actualDescription: descMatch ? descMatch[1].trim() : description,
      maxPlayers: maxPlayersMatch ? maxPlayersMatch[1].trim() : '0'
    };
  }

  return null;
}

export function TournamentCard({ tournamentId }: TournamentCardProps) {
  const { data: tournament, isLoading, error } = useTournament(tournamentId);
  const { data: markets } = useTournamentMarkets(tournamentId);

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return null;
  }

  // Contract returns TournamentInfo struct as an object
  const tournamentData = tournament as {
    tournamentId: `0x${string}`;
    name: string;
    game: string;
    operator: `0x${string}`;
    status: number;
    startTime: bigint;
    endTime: bigint;
    createdAt: bigint;
    marketIds: `0x${string}`[];
    entryFee: bigint;
    totalEntryFees: bigint;
    participantCount: bigint;
  };

  const {
    name,
    game: description, // 'game' field contains our encoded game/description
    status,
    startTime,
    endTime,
    entryFee,
    totalEntryFees: totalPrizePool,
    participantCount: totalParticipants,
  } = tournamentData;

  const startDate = new Date(Number(startTime) * 1000);
  const endDate = new Date(Number(endTime) * 1000);

  // Parse game info from game/description field
  const gameInfo = parseGameFromDescription(description);
  const gameImage = gameInfo ? GAME_IMAGES[gameInfo.game] : null;
  const displayDescription = gameInfo ? gameInfo.actualDescription : description;

  // Determine tournament status
  let statusColor = 'bg-gray-500/20 text-gray-400';
  let statusText = 'Not Started';

  if (status === 0) {
    statusColor = 'bg-blue-500/20 text-blue-400';
    statusText = 'Registration Open';
  } else if (status === 1) {
    statusColor = 'bg-green-500/20 text-green-400';
    statusText = 'Active';
  } else if (status === 2) {
    statusColor = 'bg-purple-500/20 text-purple-400';
    statusText = 'Completed';
  } else if (status === 3) {
    statusColor = 'bg-red-500/20 text-red-400';
    statusText = 'Cancelled';
  }

  const marketCount = markets ? (markets as any[]).length : 0;

  return (
    <Link to={`/tournaments/${tournamentId}`} className="card p-0 hover:shadow-lg transition-shadow overflow-hidden block">
      {/* Game Image Header */}
      {gameImage && (
        <div className="relative w-full h-32 bg-gradient-to-r from-cyan-900/30 to-purple-900/30">
          <img
            src={gameImage}
            alt={gameInfo?.game || 'Game'}
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold">{name}</h3>
              {gameInfo && (
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {gameInfo.game}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 line-clamp-2">{displayDescription}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor} ml-2`}>
            {statusText}
          </span>
        </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Entry Fee</p>
          <p className="text-lg font-bold">{formatUnits(entryFee, 6)} USDT</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Prize Pool</p>
          <p className="text-lg font-bold text-green-400">{formatUnits(totalPrizePool, 6)} USDT</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Participants</p>
          <p className="text-sm font-semibold">
            {Number(totalParticipants)}
            {gameInfo && gameInfo.maxPlayers !== '0' && (
              <span className="text-gray-500"> / {gameInfo.maxPlayers}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Markets</p>
          <p className="text-sm font-semibold">{marketCount}</p>
        </div>
      </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-gray-400">Starts</p>
              <p className="font-semibold">{format(startDate, 'MMM dd, HH:mm')}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400">Ends</p>
              <p className="font-semibold">{format(endDate, 'MMM dd, HH:mm')}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
