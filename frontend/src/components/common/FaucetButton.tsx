'use client';

import { useState, useRef, useEffect } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { ESPOTZ_CONTRACTS } from '@/contracts/addresses';

// MockUSDT mint ABI (only the mint function we need)
const MOCK_USDT_MINT_ABI = [
  {
    name: 'mint',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

const FAUCET_AMOUNT = parseUnits('1000', 6); // 1000 USDT (6 decimals)

const BNB_FAUCETS = [
  {
    name: 'BNB Chain Official',
    url: 'https://www.bnbchain.org/en/testnet-faucet',
    description: 'Official faucet - requires Discord/Twitter'
  },
  {
    name: 'QuickNode',
    url: 'https://faucet.quicknode.com/binance-smart-chain/bnb-testnet',
    description: 'Quick and easy - just wallet address'
  }
];

interface FaucetButtonProps {
  variant?: 'primary' | 'secondary' | 'compact';
  showBalance?: boolean;
}

export function FaucetButton({ variant = 'primary', showBalance = false }: FaucetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Get BNB balance
  const { data: bnbBalance } = useBalance({
    address,
    chainId: bscTestnet.id,
  });

  // Get USDT balance
  const { data: usdtBalance, refetch: refetchUsdt } = useBalance({
    address,
    token: ESPOTZ_CONTRACTS.addresses.USDT,
    chainId: bscTestnet.id,
  });

  // Mint USDT
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refetch USDT balance after successful mint
  useEffect(() => {
    if (isSuccess) {
      refetchUsdt();
      // Close dropdown after 2 seconds
      setTimeout(() => setIsOpen(false), 2000);
    }
  }, [isSuccess, refetchUsdt]);

  const isWrongNetwork = chainId !== bscTestnet.id;
  const hasBnbForGas = bnbBalance && bnbBalance.value > parseUnits('0.001', 18);

  const handleMintUsdt = () => {
    if (!address) return;

    if (isWrongNetwork) {
      switchChain({ chainId: bscTestnet.id });
      return;
    }

    writeContract({
      address: ESPOTZ_CONTRACTS.addresses.USDT,
      abi: MOCK_USDT_MINT_ABI,
      functionName: 'mint',
      args: [address, FAUCET_AMOUNT],
    } as any);
  };

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (isSwitching) return 'Switching...';
    if (isWrongNetwork) return 'Switch to BSC Testnet';
    if (isPending) return 'Confirm in Wallet...';
    if (isConfirming) return 'Minting...';
    if (isSuccess) return 'Minted 1000 USDT!';
    return 'Claim 1000 USDT';
  };

  const buttonClasses = {
    primary: 'btn-warning flex items-center gap-2',
    secondary: 'btn-secondary flex items-center gap-2',
    compact: 'px-3 py-1.5 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition flex items-center gap-1.5'
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses[variant]}
      >
        <span>🚰</span>
        <span>{variant === 'compact' ? 'Faucet' : 'Testnet Faucet'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-espotz-dark-gray border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-espotz-mid-gray border-b border-gray-700">
            <h3 className="font-bold text-lg">Testnet Faucet</h3>
            <p className="text-sm text-gray-400">Get test tokens for BSC Testnet</p>
          </div>

          {/* Balances */}
          {isConnected && showBalance && (
            <div className="px-4 py-3 border-b border-gray-700 bg-espotz-black/50">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">BNB Balance:</span>
                  <p className="font-mono font-semibold">
                    {bnbBalance ? Number(formatUnits(bnbBalance.value, 18)).toFixed(4) : '0.0000'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">USDT Balance:</span>
                  <p className="font-mono font-semibold">
                    {usdtBalance ? Number(formatUnits(usdtBalance.value, 6)).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BNB Faucet Section */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⛽</span>
              <h4 className="font-semibold">BNB (Gas)</h4>
              {!hasBnbForGas && isConnected && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Needed First!</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3">
              You need BNB to pay for transaction fees. Get some from these faucets:
            </p>
            <div className="space-y-2">
              {BNB_FAUCETS.map((faucet) => (
                <a
                  key={faucet.name}
                  href={faucet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-espotz-black rounded-lg hover:bg-espotz-mid-gray transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium group-hover:text-cyan-400 transition">{faucet.name}</span>
                    <span className="text-gray-500 group-hover:text-cyan-400 transition">↗</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{faucet.description}</p>
                </a>
              ))}
            </div>
          </div>

          {/* USDT Faucet Section */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💵</span>
              <h4 className="font-semibold">Mock USDT</h4>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Mint 1,000 USDT directly to your wallet for trading.
            </p>

            {!isConnected ? (
              <div className="text-center p-3 bg-espotz-black rounded-lg text-gray-400">
                Connect your wallet to mint USDT
              </div>
            ) : (
              <>
                {!hasBnbForGas && (
                  <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                    ⚠️ Get BNB first to pay for gas fees
                  </div>
                )}
                <button
                  onClick={handleMintUsdt}
                  disabled={isPending || isConfirming || (!hasBnbForGas && !isWrongNetwork)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    isSuccess
                      ? 'bg-green-500 text-white'
                      : isWrongNetwork
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-white disabled:bg-gray-600 disabled:cursor-not-allowed'
                  }`}
                >
                  {getButtonText()}
                </button>
                {error && (
                  <p className="mt-2 text-xs text-red-400 break-all">
                    Error: {error.message.slice(0, 100)}...
                  </p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-espotz-black/50 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              BSC Testnet (Chain ID: 97)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
