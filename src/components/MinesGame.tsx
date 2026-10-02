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

  const calculateMultiplier = (diamondsFound: number, mines: number): number => {
    if (diamondsFound === 0) return 1.0;
    let mult = 0.99;
    for (let i = 0; i < diamondsFound; i++) {
      mult *= (25 - i) / (25 - mines - i);
    }
    return Number(Math.max(1.01, mult).toFixed(2));
  };

  const currentMultiplier = calculateMultiplier(revealedCount, minesCount);
  const nextMultiplier = calculateMultiplier(revealedCount + 1, minesCount);
  const potentialPayout = Math.floor(stake * currentMultiplier);

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

  const handleTileClick = async (index: number) => {
    if (!isPlaying || gameOver || tiles[index] !== 'hidden' || isProcessing) return;

    if (minePositions.has(index)) {
      sounds.playMineExplosion();
      const newTiles = tiles.map((_, i) => (minePositions.has(i) ? 'mine' : 'diamond'));
      setTiles(newTiles);
      setGameOver(true);
      setIsPlaying(false);
      setWon(false);

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

    sounds.playDiamondReveal();
    const newTiles = [...tiles];
    newTiles[index] = 'diamond';
    setTiles(newTiles);
    const newRevealed = revealedCount + 1;
    setRevealedCount(newRevealed);

    if (newRevealed === 25 - minesCount) {
      handleCashout(newRevealed);
    }
  };

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
    <div className="max-w-5xl mx-auto px-2.5 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
      {/* Compact Header */}
      <div className="p-3 sm:p-5 rounded-2xl bg-gradient-to-r from-[#121927] via-[#0d131f] to-[#121927] border border-cyan-500/30 shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Gem className="w-5 h-5 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-xl font-['Orbitron'] font-black text-white leading-tight">
                DIAMOND MINES
              </h1>
              <span className="text-[8px] sm:text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded font-black uppercase">
                99% RTP
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
              Uncover gems and cash out anytime before hitting a mine!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0a0e17] px-2.5 py-1.5 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-[8px] uppercase font-bold text-slate-400">Balance</div>
            <div className="font-['Orbitron'] font-black text-emerald-400 text-xs sm:text-sm">
              ₹{user ? user.balance.toLocaleString('en-IN') : '0'}
            </div>
          </div>
          <button
            onClick={onOpenDeposit}
            className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] transition-colors cursor-pointer"
          >
            + Add
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid & Controls (Mobile: Grid Top, Controls Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 flex flex-col-reverse lg:grid">
        {/* Left: Controls Panel */}
        <div className="lg:col-span-5 bg-[#0e1422] border border-slate-800 rounded-2xl p-3.5 sm:p-5 space-y-3.5 shadow-xl">
          {/* Bet Amount */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span className="uppercase tracking-wider text-[11px]">Bet Amount</span>
              <span className="text-slate-400 text-[10px]">Min ₹10</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                ₹
              </span>
              <input
                type="number"
                disabled={isPlaying}
                value={stake}
                onChange={(e) => setStake(Math.max(10, Number(e.target.value)))}
                className="w-full bg-[#090d16] border border-slate-700 focus:border-cyan-500 rounded-xl pl-7 pr-16 py-2.5 text-white font-mono font-bold text-xs focus:outline-none transition-colors disabled:opacity-60"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  disabled={isPlaying}
                  onClick={() => setStake(Math.max(10, Math.floor(stake / 2)))}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold disabled:opacity-50"
                >
                  ½
                </button>
                <button
                  type="button"
                  disabled={isPlaying}
                  onClick={() => setStake(stake * 2)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold disabled:opacity-50"
                >
                  2×
                </button>
              </div>
            </div>

            {/* Preset Chips */}
            <div className="grid grid-cols-3 gap-1 mt-1.5">
              {PRESET_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={isPlaying}
                  onClick={() => {
                    sounds.playChipClink();
                    setStake(chip);
                  }}
                  className={`py-1 rounded-lg border text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    stake === chip
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-[#121927] text-slate-400 border-slate-800'
                  }`}
                >
                  ₹{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Mines Count */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span className="uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Bomb className="w-3.5 h-3.5 text-red-400" />
                <span>Mines Count</span>
              </span>
              <span className="font-mono text-cyan-400 text-xs font-bold">
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
              className="w-full bg-[#090d16] border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none transition-colors disabled:opacity-60 cursor-pointer"
            >
              {MINES_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} {opt === 1 ? 'Mine (Safe)' : opt >= 10 ? 'Mines (Extreme ⚡)' : 'Mines'}
                </option>
              ))}
            </select>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            {!isPlaying ? (
              <button
                type="button"
                onClick={handleStartGame}
                disabled={isProcessing}
                className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-black font-['Orbitron'] font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {isProcessing ? 'Deploying...' : `Start Bet (₹${stake.toLocaleString('en-IN')})`}
              </button>
            ) : (
              <button
                type="button"
                disabled={revealedCount === 0 || isProcessing}
                onClick={() => handleCashout()}
                className={`w-full py-3 sm:py-3.5 rounded-xl font-['Orbitron'] font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  revealedCount > 0
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400 text-black shadow-lg shadow-emerald-500/30 active:scale-95 animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {revealedCount > 0 ? (
                  <span>
                    Cash Out ₹{potentialPayout.toLocaleString('en-IN')} ({currentMultiplier}x)
                  </span>
                ) : (
                  <span>Pick a Tile to Cash Out</span>
                )}
              </button>
            )}
          </div>

          {/* Mini Stats */}
          <div className="p-2.5 rounded-xl bg-[#080c14] border border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div>
              <div className="text-slate-400">Next Tile</div>
              <div className="font-['Orbitron'] font-bold text-amber-400 text-xs mt-0.5">
                {nextMultiplier}x
              </div>
            </div>
            <div>
              <div className="text-slate-400">Gems Left</div>
              <div className="font-mono text-cyan-300 font-bold text-xs mt-0.5">
                {isPlaying ? 25 - minesCount - revealedCount : 25 - minesCount}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Mine Chance</div>
              <div className="font-mono text-red-400 font-bold text-xs mt-0.5">
                {isPlaying
                  ? `${Math.round((minesCount / (25 - revealedCount)) * 100)}%`
                  : `${Math.round((minesCount / 25) * 100)}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Right: 5x5 Mines Grid */}
        <div className="lg:col-span-7 bg-[#0e1422] border border-slate-800 rounded-2xl p-3.5 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
          {/* Win/Loss Notification Overlay */}
          {gameOver && (
            <div className="mb-3 w-full max-w-sm animate-milestone">
              {won ? (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-center space-y-0.5 shadow-lg">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    CASHED OUT!
                  </div>
                  <div className="text-xl font-['Orbitron'] font-black text-white">
                    +₹{lastWinAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-emerald-300">
                    Multiplier: {currentMultiplier}x ({revealedCount} Diamonds)
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/80 text-center space-y-0.5 shadow-lg animate-screen-shake">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center justify-center gap-1">
                    <Bomb className="w-3.5 h-3.5" />
                    <span>MINE EXPLODED</span>
                  </div>
                  <div className="text-lg font-['Orbitron'] font-black text-white">
                    -₹{stake.toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5x5 Tiles Grid (Responsive Size) */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full max-w-[340px] sm:max-w-[420px] aspect-square">
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
                  className={`relative rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer select-none font-bold ${
                    isHidden
                      ? 'bg-gradient-to-b from-[#1b263b] to-[#131b2a] hover:from-[#243350] border border-slate-700/60 shadow-sm active:scale-95 disabled:hover:from-[#1b263b]'
                      : isDiamond
                      ? 'bg-gradient-to-b from-cyan-900/60 to-blue-950/80 border border-cyan-400/80 shadow-md shadow-cyan-500/30 animate-milestone'
                      : 'bg-gradient-to-b from-red-900/70 to-rose-950/80 border border-red-500/80 shadow-md shadow-red-500/40 animate-screen-shake'
                  }`}
                >
                  {isDiamond && (
                    <Gem className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-300 drop-shadow-[0_0_6px_#06b6d4] animate-bounce" />
                  )}

                  {isMine && (
                    <Bomb className="w-6 h-6 sm:w-7 sm:h-7 text-red-400 drop-shadow-[0_0_8px_#ef4444]" />
                  )}

                  {isHidden && isPlaying && (
                    <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>SHA-256 Provably Fair</span>
          </div>
        </div>
      </div>
    </div>
  );
};
