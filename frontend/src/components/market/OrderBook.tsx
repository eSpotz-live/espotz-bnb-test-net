'use client';

import { useOrderBook, useOrder } from '@/hooks/usePredictionMarket';
import { formatUnits } from 'viem';

interface OrderBookProps {
  marketId: `0x${string}`;
}

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

// Individual order row component that fetches its own data
function OrderRow({ orderId, color }: { orderId: `0x${string}`; color: string }) {
  const { data: order } = useOrder(orderId);

  if (!order) return null;

  const orderData = order as Order;
  const { price, quantity, filled, status } = orderData;

  // OrderStatus: 0=Open, 1=Filled, 2=Cancelled - only show open orders
  if (status !== 0) return null;

  // Convert to numbers for safe math
  const priceNum = Number(price);
  const quantityNum = Number(quantity);
  const filledNum = Number(filled);
  const remainingNum = quantityNum - filledNum;

  if (remainingNum <= 0) return null;

  // Format price from basis points to cents (5000 -> 50¢)
  const priceCents = (priceNum / 100).toFixed(0);
  // Calculate total value
  const totalValue = (remainingNum * priceNum) / 10000;

  return (
    <div className="grid grid-cols-3 gap-2 text-sm py-1 px-2 hover:bg-gray-800/50 rounded">
      <div className={`font-semibold ${color}`}>
        {priceCents}¢
      </div>
      <div className="text-gray-300 text-right">
        {formatUnits(BigInt(Math.floor(remainingNum)), 6)}
      </div>
      <div className="text-gray-500 text-right text-xs">
        ${formatUnits(BigInt(Math.floor(totalValue)), 6)}
      </div>
    </div>
  );
}

function OrderList({ orderIds, color }: { orderIds: `0x${string}`[]; color: string }) {
  if (!orderIds || orderIds.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No orders
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {orderIds.slice(0, 10).map((orderId) => (
        <OrderRow key={orderId} orderId={orderId} color={color} />
      ))}
    </div>
  );
}

export function OrderBook({ marketId }: OrderBookProps) {
  // Fetch order IDs for all combinations
  const { data: yesBuyOrderIds } = useOrderBook(marketId, 0, 0); // YES, BUY
  const { data: yesSellOrderIds } = useOrderBook(marketId, 0, 1); // YES, SELL
  const { data: noBuyOrderIds } = useOrderBook(marketId, 1, 0); // NO, BUY
  const { data: noSellOrderIds } = useOrderBook(marketId, 1, 1); // NO, SELL

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* YES Order Book */}
      <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold mb-4 text-green-400">YES Order Book</h3>

        <div className="space-y-4">
          {/* BUY Orders */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm text-gray-400">Buy Orders</h4>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>Price</div>
                <div className="text-right">Quantity</div>
                <div className="text-right">Total</div>
              </div>
            </div>
            <OrderList orderIds={(yesBuyOrderIds as `0x${string}`[]) || []} color="text-green-400" />
          </div>

          <div className="border-t border-gray-700"></div>

          {/* SELL Orders */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm text-gray-400">Sell Orders</h4>
            </div>
            <OrderList orderIds={(yesSellOrderIds as `0x${string}`[]) || []} color="text-red-400" />
          </div>
        </div>
      </div>

      {/* NO Order Book */}
      <div className="bg-espotz-dark-gray rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold mb-4 text-red-400">NO Order Book</h3>

        <div className="space-y-4">
          {/* BUY Orders */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm text-gray-400">Buy Orders</h4>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div>Price</div>
                <div className="text-right">Quantity</div>
                <div className="text-right">Total</div>
              </div>
            </div>
            <OrderList orderIds={(noBuyOrderIds as `0x${string}`[]) || []} color="text-green-400" />
          </div>

          <div className="border-t border-gray-700"></div>

          {/* SELL Orders */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm text-gray-400">Sell Orders</h4>
            </div>
            <OrderList orderIds={(noSellOrderIds as `0x${string}`[]) || []} color="text-red-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
