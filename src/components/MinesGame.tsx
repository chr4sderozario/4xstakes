import React, { useState } from 'react';
import { User } from '../types.js';
import {
  Bomb,
  Gem,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Coins,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface MinesGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: (msg?: string) => void;
}

type TileState = 'hidden' | 'diamond' | 'mine';

const PRESET_CHIPS = [50, 100, 250, 500, 1000, 2500];
const MINES_OPTIONS = [1, 2, 3, 5, 8, 10, 15, 20, 24];

export const MinesGame: React.FC<MinesGameProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [minesCount, setMinesCount] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [tiles, setTiles] = useState<TileState[]>(Array(25).fill('hidden'));
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [activeBetId, setActiveBetId] = useState<string | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Calculate next multiplier based on combinations
  const calculateMultiplier = (diamondsFound: number, mines: number): number => {
    if (diamondsFound === 0) return 1.0;
    let mult = 0.99; // 1% house edge
    for (let i = 0; i < diamondsFound; i++) {
      mult *= (25 - i) / (25 - mines - i);
    }
    return Number(Math.max(1.01, mult).toFixed(2));
  };

  const currentMultiplier = calculateMultiplier(revealedCount, minesCount);
  const nextMultiplier = calculateMultiplier(revealedCount + 1, minesCount);
  const potentialPayout = Math.floor(stake * currentMultiplier);

  // Start new round
  const handleStartGame = async () => {
    setErrorMessage('');
    if (!user) {
      onRequireAuth('Please login or register to play Diamond Mines.');
      return;
    }
    if (user.balance < stake) {
      setErrorMessage('Insufficient balance. Please deposit funds!');
      onOpenDeposit();
      return;
    }

    setIsProcessing(true);
    sounds.playClick();

    try {
      // Place bet on server
      const res = await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gameId: 'mines',
          gameName: 'Diamond Mines',
          stake,
          details: `${minesCount} Mines Mode`,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Failed to place bet');
        setIsProcessing(false);
        return;
      }

      // Generate random mines positions
      const positions = new Set<number>();
      while (positions.size < minesCount) {
        positions.add(Math.floor(Math.random() * 25));
      }

      setMinePositions(positions);
      setTiles(Array(25).fill('hidden'));
      setRevealedCount(0);
      setGameOver(false);
      setWon(false);
      setActiveBetId(data.betId);
      setIsPlaying(true);
      setLastWinAmount(0);
    } catch {
      setErrorMessage('Network connection error.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Click a tile
  const handleTileClick = async (index: number) => {
    if (!isPlaying || gameOver || tiles[index] !== 'hidden' || isProcessing) return;

    // Check if it's a mine
    if (minePositions.has(index)) {
      sounds.playMineExplosion();
      // Reveal all tiles
      const newTiles = tiles.map((_, i) => (minePositions.has(i) ? 'mine' : 'diamond'));
      setTiles(newTiles);
      setGameOver(true);
      setIsPlaying(false);
      setWon(false);

      // Settle bet as lost
      if (user && activeBetId) {
        await fetch('/api/game/settle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            betId: activeBetId,
            status: 'LOST',
            multiplier: 0,
            winAmount: 0,
            details: `Hit a mine on tile #${index + 1}`,
          }),
        });
      }
      return;
    }

    // It's a diamond!
    sounds.playDiamondReveal();
    const newTiles = [...tiles];
    newTiles[index] = 'diamond';
    setTiles(newTiles);
    const newRevealed = revealedCount + 1;
    setRevealedCount(newRevealed);

    // If all non-mine tiles revealed, auto cashout
    if (newRevealed === 25 - minesCount) {
      handleCashout(newRevealed);
    }
  };

  // Cashout winnings
  const handleCashout = async (countOverride?: number) => {
    if (!isPlaying || gameOver || isProcessing || !user || !activeBetId) return;
    setIsProcessing(true);
    sounds.playCashout();

    const count = countOverride ?? revealedCount;
    const finalMult = calculateMultiplier(count, minesCount);
    const winAmount = Math.floor(stake * finalMult);

    try {
      await fetch('/api/game/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          betId: activeBetId,
          status: 'WON',
          multiplier: finalMult,
          winAmount,
          details: `Cashed out ${finalMult}x with ${count} diamonds found!`,
        }),
      });

      // Reveal all remaining
      const finalTiles = tiles.map((t, i) =>
        t === 'diamond' ? 'diamond' : minePositions.has(i) ? 'mine' : 'diamond'
      );
      setTiles(finalTiles);
      setWon(true);
      setGameOver(true);
      setIsPlaying(false);
      setLastWinAmount(winAmount);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#121927] via-[#0d131f] to-[#121927] border border-cyan-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Gem className="w-7 h-7 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-['Orbitron'] font-black text-white">
                DIAMOND MINES
              </h1>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-black uppercase">
                99% RTP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Uncover diamonds, dodge hidden mines, and cash out your multiplier anytime!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#0a0e17] px-4 py-2 rounded-2xl border border-slate-800">
          <div className="text-right">
            <div className="text-[9px] uppercase font-bold text-slate-400">Wallet Balance</div>
            <div className="font-['Orbitron'] font-black text-emerald-400 text-sm sm:text-base">
              ₹{user ? user.balance.toLocaleString('en-IN') : '0'}
            </div>
          </div>
          <button
            onClick={onOpenDeposit}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
          >
            + Deposit
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2 animate-screen-shake">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Game Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Controls Panel */}
        <div className="lg:col-span-4 bg-[#0e1422] border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
          {/* Bet Amount Input */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
              <span className="uppercase tracking-wider">Bet Amount (₹)</span>
              <span className="text-slate-400">Min: ₹10 • Max: ₹50,000</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                ₹
              </span>
              <input
                type="number"
                disabled={isPlaying}
                value={stake}
                onChange={(e) => setStake(Math.max(10, Number(e.target.value)))}
                className="w-full bg-[#090d16] border border-slate-700 focus:border-cyan-500 rounded-2xl pl-8 pr-20 py-3 text-white font-mono font-bold text-sm focus:outline-none transition-colors disabled:opacity-60"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  disabled={isPlaying}
                  onClick={() => setStake(Math.max(10, Math.floor(stake / 2)))}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  ½
                </button>
                <button
                  type="button"
                  disabled={isPlaying}
                  onClick={() => setStake(stake * 2)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  2×
                </button>
              </div>
            </div>

            {/* Preset Chip Buttons */}
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {PRESET_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={isPlaying}
                  onClick={() => {
                    sounds.playChipClink();
                    setStake(chip);
                  }}
                  className={`py-1.5 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                    stake === chip
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-[#121927] text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  ₹{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Mines Count Selector */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
              <span className="uppercase tracking-wider flex items-center gap-1.5">
                <Bomb className="w-3.5 h-3.5 text-red-400" />
                <span>Mines Count</span>
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {minesCount} Mines / {25 - minesCount} Gems
              </span>
            </div>
            <select
              disabled={isPlaying}
              value={minesCount}
              onChange={(e) => {
                sounds.playClick();
                setMinesCount(Number(e.target.value));
              }}
              className="w-full bg-[#090d16] border border-slate-700 focus:border-cyan-500 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors disabled:opacity-60 cursor-pointer"
            >
              {MINES_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} {opt === 1 ? 'Mine (Safest • Lower Mult)' : opt >= 10 ? 'Mines (EXTREME HIGH MULTIPLIER 🔥)' : 'Mines'}
                </option>
              ))}
            </select>
          </div>

          {/* Game Action Button: Start or Cashout */}
          <div className="pt-2">
            {!isPlaying ? (
              <button
                type="button"
                onClick={handleStartGame}
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 hover:to-teal-300 text-black font-['Orbitron'] font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer animate-shimmer"
              >
                {isProcessing ? 'Deploying Grid...' : `Start Bet (₹${stake.toLocaleString('en-IN')})`}
              </button>
            ) : (
              <button
                type="button"
                disabled={revealedCount === 0 || isProcessing}
                onClick={() => handleCashout()}
                className={`w-full py-4 rounded-2xl font-['Orbitron'] font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
                  revealedCount > 0
                    ? 'bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 hover:from-emerald-400 hover:to-green-300 text-black shadow-lg shadow-emerald-500/30 active:scale-95 animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {revealedCount > 0 ? (
                  <span>
                    Cash Out ₹{potentialPayout.toLocaleString('en-IN')} ({currentMultiplier}x)
                  </span>
                ) : (
                  <span>Pick a Tile to Unlock Cashout</span>
                )}
              </button>
            )}
          </div>

          {/* Multiplier Progression Table Preview */}
          <div className="p-3.5 rounded-2xl bg-[#080c14] border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Next Tile Value</span>
              <span className="font-['Orbitron'] font-bold text-amber-400">
                {nextMultiplier}x (+₹{Math.floor(stake * nextMultiplier) - potentialPayout})
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Gems Remaining</span>
              <span className="font-mono text-cyan-300 font-bold">
                {isPlaying ? 25 - minesCount - revealedCount : 25 - minesCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Mine Probability</span>
              <span className="font-mono text-red-400 font-bold">
                {isPlaying
                  ? `${Math.round((minesCount / (25 - revealedCount)) * 100)}%`
                  : `${Math.round((minesCount / 25) * 100)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Right: 5x5 Mines Grid */}
        <div className="lg:col-span-8 bg-[#0e1422] border border-slate-800 rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          {/* Win/Loss Notification Overlay */}
          {gameOver && (
            <div className="mb-4 w-full max-w-md animate-milestone">
              {won ? (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/80 text-center space-y-1 shadow-xl shadow-emerald-950/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    CASHED OUT SUCCESSFULLY!
                  </div>
                  <div className="text-2xl font-['Orbitron'] font-black text-white">
                    +₹{lastWinAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-emerald-300 font-bold">
                    Multiplier: {currentMultiplier}x ({revealedCount} Diamonds Uncovered)
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/80 text-center space-y-1 shadow-xl shadow-red-950/50 animate-screen-shake">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center justify-center gap-1.5">
                    <Bomb className="w-4 h-4" />
                    <span>BOOM! MINE EXPLODED</span>
                  </div>
                  <div className="text-xl font-['Orbitron'] font-black text-white">
                    -₹{stake.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-red-300">
                    Try again with a new configuration or cash out earlier!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5x5 Tiles Grid */}
          <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 w-full max-w-[460px] aspect-square">
            {tiles.map((state, idx) => {
              const isHidden = state === 'hidden';
              const isDiamond = state === 'diamond';
              const isMine = state === 'mine';

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isPlaying || !isHidden || isProcessing}
                  onClick={() => handleTileClick(idx)}
                  className={`relative rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer select-none font-bold ${
                    isHidden
                      ? 'bg-gradient-to-b from-[#1b263b] to-[#131b2a] hover:from-[#243350] hover:to-[#172236] border border-slate-700/60 shadow-md hover:shadow-cyan-500/20 active:scale-95 disabled:hover:from-[#1b263b] disabled:hover:to-[#131b2a] disabled:cursor-not-allowed'
                      : isDiamond
                      ? 'bg-gradient-to-b from-cyan-900/60 to-blue-950/80 border border-cyan-400/80 shadow-lg shadow-cyan-500/30 scale-100 animate-milestone'
                      : 'bg-gradient-to-b from-red-900/70 to-rose-950/80 border border-red-500/80 shadow-lg shadow-red-500/40 animate-screen-shake'
                  }`}
                >
                  {isDiamond && (
                    <div className="flex flex-col items-center justify-center animate-bounce">
                      <Gem className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-300 drop-shadow-[0_0_8px_#06b6d4]" />
                    </div>
                  )}

                  {isMine && (
                    <div className="flex flex-col items-center justify-center">
                      <Bomb className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 drop-shadow-[0_0_10px_#ef4444] animate-pulse" />
                    </div>
                  )}

                  {isHidden && isPlaying && (
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600/60 group-hover:bg-cyan-400 transition-colors"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Provably Fair Tag */}
          <div className="mt-5 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SHA-256 Provably Fair • Instant Random Seed Generator</span>
          </div>
        </div>
      </div>
    </div>
  );
};
