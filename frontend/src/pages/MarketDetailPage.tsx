import { useParams, Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useMarket, useUserOrders, useOrder } from '@/hooks/usePredictionMarket';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { OrderBook } from '@/components/market/OrderBook';
import { TradingInterface } from '@/components/market/TradingInterface';
import { CancelOrderButton } from '@/components/trading/CancelOrderButton';
import { ClaimWinningsButton } from '@/components/trading/ClaimWinningsButton';
import { ClaimRefundButton } from '@/components/trading/ClaimRefundButton';
import { Navigation } from '@/components/layout/Navigation';
import { formatUnits } from 'viem';
import { format } from 'date-fns';

// Order struct type from contract
interface Order {
  orderId: `0x${string}`;
  marketId: `0x${string}`;
  trader: `0x${string}`;
  side: number;
  outcome: number;
  price: bigint;
  quantity: bigint;
  filled: bigint;
  collateralLocked: bigint;
  status: number;
  createdAt: bigint;
  expireTime: bigint;
}

// Component to display a single user order (fetches its own data)
function UserOrderRow({ orderId, marketId }: { orderId: `0x${string}`; marketId: string }) {
  const { data: order } = useOrder(orderId);

  if (!order) return null;

  const orderData = order as Order;

  // Only show orders for this market
  if (orderData.marketId !== marketId) return null;

  const { side, outcome, price, quantity, filled, status } = orderData;

  // OrderStatus: 0=Open, 1=Filled, 2=Cancelled - only show open orders
  if (status !== 0) return null;

  // Convert to numbers for safe math
  const priceNum = Number(price);
  const quantityNum = Number(quantity);
  const filledNum = Number(filled);
  const remainingNum = quantityNum - filledNum;

  // Don't show fully filled orders
  if (remainingNum <= 0) return null;

  return (
    <div className="bg-espotz-black rounded-lg p-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
        <div>
          <p className="text-xs text-gray-400">Type</p>
          <p className="font-semibold">
            {side === 0 ? 'BUY' : 'SELL'} {outcome === 0 ? 'YES' : 'NO'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Price</p>
          <p className="font-semibold">{(priceNum / 100).toFixed(0)}¢</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Shares</p>
          <p className="font-semibold">{formatUnits(BigInt(Math.floor(quantityNum)), 6)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Remaining</p>
          <p className="font-semibold">{formatUnits(BigInt(Math.floor(remainingNum)), 6)}</p>
        </div>
        <div>
          <CancelOrderButton orderId={orderId} />
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const { address, isConnected } = useAccount();
  const { data: market, isLoading, error } = useMarket(marketId as `0x${string}`);
  const { data: userOrders } = useUserOrders(address);
  const { yesPrice, noPrice, yesBid, yesAsk, noBid, noAsk } = useMarketPrice(marketId as `0x${string}`);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-espotz-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-gray-400">Loading market...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-espotz-black">
        <Navigation currentPage="markets" />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Market Not Found</h1>
          <p className="text-gray-400 mb-8">This market does not exist or could not be loaded.</p>
          <Link to="/markets" className="btn-primary">Back to Markets</Link>
        </div>
      </div>
    );
  }

  // Contract returns Market struct as an object
  const marketData = market as {
    marketId: `0x${string}`;
    question: string;
    yesToken: `0x${string}`;
    noToken: `0x${string}`;
    yesSupply: bigint;
    noSupply: bigint;
    totalCollateral: bigint;
    status: number;
    winningOutcome: number;
    expireTime: bigint;
    createdAt: bigint;
    tournamentOperator: `0x${string}`;
  };

  const {
    question,
    yesSupply,
    noSupply,
    totalCollateral,
    status,
    winningOutcome,
    expireTime,
    tournamentOperator,
  } = marketData;

  const totalVolume = Number(formatUnits(totalCollateral, 6));
  const expiryDate = new Date(Number(expireTime) * 1000);
  const isExpired = expiryDate < new Date();

  let statusColor = 'bg-green-500/20 text-green-400';
  let statusText = 'Active';

  if (status === 3) {
    statusColor = 'bg-red-500/20 text-red-400';
    statusText = 'Cancelled';
  } else if (status === 2) {
    statusColor = 'bg-blue-500/20 text-blue-400';
    statusText = winningOutcome === 0 ? 'Resolved: YES' : 'Resolved: NO';
  } else if (status === 1) {
    statusColor = 'bg-yellow-500/20 text-yellow-400';
    statusText = 'Paused';
  } else if (isExpired) {
    statusColor = 'bg-orange-500/20 text-orange-400';
    statusText = 'Expired';
  }

  const userOrderIds = userOrders as `0x${string}`[] || [];

  return (
    <div className="min-h-screen bg-espotz-black">
      <Navigation currentPage="markets" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/markets" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2">
            ← Back to Markets
          </Link>
        </div>

        {/* Market Header */}
        <div className="bg-espotz-dark-gray rounded-xl p-6 mb-8 border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{question}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Market ID: {marketId?.slice(0, 10)}...{marketId?.slice(-8)}</span>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full font-semibold ${statusColor}`}>
              {statusText}
            </span>
          </div>

          {/* Price Display - Polymarket Style */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-300">Yes</span>
                <span className="text-3xl font-bold text-green-400">{yesPrice}¢</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bid: {yesBid !== null ? `${yesBid}¢` : '-'}</span>
                <span className="text-gray-500">Ask: {yesAsk !== null ? `${yesAsk}¢` : '-'}</span>
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-300">No</span>
                <span className="text-3xl font-bold text-red-400">{noPrice}¢</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bid: {noBid !== null ? `${noBid}¢` : '-'}</span>
                <span className="text-gray-500">Ask: {noAsk !== null ? `${noAsk}¢` : '-'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Volume</p>
              <p className="text-xl font-bold">${totalVolume.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">YES Supply</p>
              <p className="text-xl font-bold text-green-400">{formatUnits(yesSupply, 6)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">NO Supply</p>
              <p className="text-xl font-bold text-red-400">{formatUnits(noSupply, 6)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Expiry</p>
              <p className="text-lg font-semibold">{format(expiryDate, 'MMM dd, yyyy')}</p>
              <p className="text-sm text-gray-500">{format(expiryDate, 'HH:mm')}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <OrderBook marketId={marketId as `0x${string}`} />

            {isConnected && userOrderIds.length > 0 && (
              <div className="mt-8 bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Your Orders</h3>
                <div className="space-y-3">
                  {userOrderIds.map((orderId) => (
                    <UserOrderRow key={orderId} orderId={orderId} marketId={marketId!} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {!isConnected ? (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800 text-center">
                <h3 className="text-xl font-bold mb-4">Connect to Trade</h3>
                <p className="text-gray-400 mb-6">Connect your wallet to place orders on this market</p>
                <ConnectButton />
              </div>
            ) : status !== 0 ? (
              <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Market Status</h3>
                <p className="text-gray-400 mb-6">This market is not accepting new orders.</p>
                {status === 2 && (
                  <div className="space-y-3">
                    <ClaimWinningsButton marketId={marketId as `0x${string}`} />
                  </div>
                )}
                {status === 3 && (
                  <div className="space-y-3">
                    <ClaimRefundButton marketId={marketId as `0x${string}`} />
                  </div>
                )}
              </div>
            ) : (
              <TradingInterface marketId={marketId as `0x${string}`} />
            )}

            <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold mb-4">Market Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400">Tournament Operator</p>
                  <p className="font-mono text-xs break-all">{tournamentOperator}</p>
                </div>
                <div>
                  <p className="text-gray-400">Market ID</p>
                  <p className="font-mono text-xs break-all">{marketId}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Collateral</p>
                  <p className="font-semibold">{formatUnits(totalCollateral, 6)} USDT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
