import React, { useState, useEffect } from 'react';
import { User, BetTransaction } from '../types.js';
import {
  History,
  X,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Rocket,
  Dice5,
  Shield,
  Coins,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface BetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onRequireAuth: (msg?: string) => void;
  onOpenDeposit: () => void;
}

export const BetHistoryModal: React.FC<BetHistoryModalProps> = ({
  isOpen,
  onClose,
  user,
  onRequireAuth,
  onOpenDeposit,
}) => {
  const [bets, setBets] = useState<BetTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchBetHistory = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/user/${user.id}/bets?limit=10`);
      const data = await res.json();
      if (data.success && data.bets) {
        setBets(data.bets);
      } else {
        setError(data.error || 'Failed to fetch bet history.');
      }
    } catch {
      setError('Unable to load bet transactions. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchBetHistory();
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Compute metrics from current 10 transactions
  const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);
  const totalWon = bets.reduce((sum, b) => sum + (b.winAmount || 0), 0);
  const netProfit = totalWon - totalStaked;
  const winsCount = bets.filter((b) => b.status === 'WON').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0f141f] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-milestone flex flex-col max-h-[90vh]">
        {/* Top Accent Line */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0b0e17]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Orbitron'] font-black text-base sm:text-lg text-white">
                  Player Bet History
                </h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                  Last 10 Bets
                </span>
              </div>
              <p className="text-xs text-slate-400">
                User: <span className="text-white font-bold">{user?.name}</span> ({user?.avatar}) •
                Wallet: <span className="text-emerald-400 font-bold font-mono">₹{user?.balance.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                fetchBetHistory();
              }}
              title="Refresh Bet History"
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-[#121927] border-b border-slate-800/80 text-xs">
          <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Staked</div>
            <div className="font-['Orbitron'] font-black text-white text-sm mt-0.5">
              ₹{totalStaked.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Won</div>
            <div className="font-['Orbitron'] font-black text-emerald-400 text-sm mt-0.5">
              ₹{totalWon.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Net Return</div>
            <div
              className={`font-['Orbitron'] font-black text-sm mt-0.5 flex items-center gap-1 ${
                netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {netProfit >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{netProfit >= 0 ? `+₹${netProfit}` : `-₹${Math.abs(netProfit)}`}</span>
            </div>
          </div>

          <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Win Rate</div>
            <div className="font-['Orbitron'] font-black text-amber-400 text-sm mt-0.5">
              {bets.length > 0 ? `${Math.round((winsCount / bets.length) * 100)}%` : '0%'}
              <span className="text-[10px] text-slate-400 font-normal ml-1">
                ({winsCount}/{bets.length})
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs">
              {error}
            </div>
          )}

          {isLoading && bets.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span>Fetching your recent betting transactions...</span>
            </div>
          ) : bets.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h3 className="font-['Orbitron'] font-bold text-sm text-white">No Bets Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You haven't placed any bets yet. Choose a game to start playing!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bets.map((bet, index) => {
                const isWon = bet.status === 'WON';
                const isPending = bet.status === 'PENDING';
                const isLost = bet.status === 'LOST';

                // Game styling icons
                const isSkyHigh = bet.gameId === 'sky-high';
                const isSkyBlack = bet.gameId === 'sky-high-black';
                const isSeven = bet.gameId === 'seven-up-down';

                return (
                  <div
                    key={bet.id || index}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isWon
                        ? 'bg-gradient-to-r from-emerald-950/30 via-[#111925] to-[#111925] border-emerald-500/30 hover:border-emerald-500/60'
                        : isLost
                        ? 'bg-gradient-to-r from-red-950/20 via-[#111925] to-[#111925] border-red-500/20 hover:border-red-500/40'
                        : 'bg-[#111925] border-slate-700/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Left: Game & Time */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                            isSkyBlack
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : isSkyHigh
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {isSkyBlack ? (
                            <Rocket className="w-5 h-5 text-red-400" />
                          ) : isSkyHigh ? (
                            <Rocket className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Dice5 className="w-5 h-5 text-amber-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-['Orbitron'] font-bold text-xs sm:text-sm text-white">
                              {bet.gameName}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                isSkyBlack
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : isSkyHigh
                                  ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {bet.gameId}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>
                              {new Date(bet.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            {bet.details && (
                              <>
                                <span>•</span>
                                <span className="text-slate-300 font-mono text-[10px]">
                                  {bet.details}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Stake, Multiplier & Result */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                        {/* Stake */}
                        <div className="text-left sm:text-right">
                          <div className="text-[9px] text-slate-400 uppercase font-bold">Stake</div>
                          <div className="font-mono font-bold text-white text-xs sm:text-sm">
                            ₹{bet.stake.toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Multiplier */}
                        <div className="text-left sm:text-right">
                          <div className="text-[9px] text-slate-400 uppercase font-bold">Multiplier</div>
                          <div
                            className={`font-['Orbitron'] font-black text-xs sm:text-sm ${
                              bet.multiplier > 0 ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          >
                            {bet.multiplier > 0 ? `${bet.multiplier.toFixed(2)}x` : '—'}
                          </div>
                        </div>

                        {/* Result Status Badge & Win/Loss Amount */}
                        <div className="text-right min-w-[90px]">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isWon
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : isLost
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                            }`}
                          >
                            {bet.status}
                          </span>

                          <div
                            className={`font-['Orbitron'] font-black text-xs sm:text-sm mt-0.5 ${
                              isWon
                                ? 'text-emerald-400'
                                : isLost
                                ? 'text-red-400/80'
                                : 'text-slate-400'
                            }`}
                          >
                            {isWon
                              ? `+₹${bet.winAmount.toLocaleString('en-IN')}`
                              : isLost
                              ? `-₹${bet.stake.toLocaleString('en-IN')}`
                              : 'In Play'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0b0e17] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Provably Fair & Real-Time Verified</span>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
