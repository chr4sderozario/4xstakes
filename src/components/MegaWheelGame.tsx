import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types.js';
import {
  Sparkles,
  Trophy,
  AlertTriangle,
  RotateCcw,
  Zap,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface MegaWheelGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: (msg?: string) => void;
}

type WheelOption = 1 | 2 | 5 | 10 | 20 | 40;

const SEGMENTS: Array<{ mult: WheelOption; color: string; textColor: string }> = [
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 2, color: '#10b981', textColor: '#ffffff' },
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 5, color: '#8b5cf6', textColor: '#ffffff' },
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 2, color: '#10b981', textColor: '#ffffff' },
  { mult: 10, color: '#ec4899', textColor: '#ffffff' },
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 2, color: '#10b981', textColor: '#ffffff' },
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 20, color: '#f59e0b', textColor: '#000000' },
  { mult: 2, color: '#10b981', textColor: '#ffffff' },
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 5, color: '#8b5cf6', textColor: '#ffffff' },
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 40, color: '#ef4444', textColor: '#ffffff' },
  { mult: 2, color: '#10b981', textColor: '#ffffff' },
  { mult: 1, color: '#3b82f6', textColor: '#ffffff' },
  { mult: 5, color: '#8b5cf6', textColor: '#ffffff' },
  { mult: 2, color: '#10b981', textColor: '#ffffff' },
];

const CHIPS = [50, 100, 250, 500, 1000];

export const MegaWheelGame: React.FC<MegaWheelGameProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [bets, setBets] = useState<Record<WheelOption, number>>({
    1: 0,
    2: 0,
    5: 0,
    10: 0,
    20: 0,
    40: 0,
  });

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [winningMult, setWinningMult] = useState<WheelOption | null>(null);
  const [megaRushMultiplier, setMegaRushMultiplier] = useState<{ mult: WheelOption; boost: number } | null>(null);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [spinHistory, setSpinHistory] = useState<WheelOption[]>([1, 2, 5, 1, 20, 2, 10, 1]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    const radius = center - 8;
    const numSegments = SEGMENTS.length;
    const anglePerSeg = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);

    for (let i = 0; i < numSegments; i++) {
      const seg = SEGMENTS[i];
      const startAngle = i * anglePerSeg;
      const endAngle = startAngle + anglePerSeg;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#0a0d14';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw segment text
      ctx.save();
      ctx.rotate(startAngle + anglePerSeg / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText(`${seg.mult}X`, radius - 15, 6);
      ctx.restore();
    }

    ctx.restore();

    // Outer luxury gold bezel
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(center, center, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA', center, center + 4);
  }, [rotation]);

  const handleAddBet = (mult: WheelOption) => {
    if (isSpinning) return;
    if (!user) {
      onRequireAuth('Please login or register to place bets.');
      return;
    }
    if (user.balance < totalBet + selectedChip) {
      setErrorMessage('Insufficient wallet balance!');
      onOpenDeposit();
      return;
    }

    sounds.playChipClink();
    setErrorMessage('');
    setBets((prev) => ({
      ...prev,
      [mult]: prev[mult] + selectedChip,
    }));
  };

  const handleClearBets = () => {
    if (isSpinning) return;
    sounds.playClick();
    setBets({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 40: 0 });
  };

  const handleSpin = async () => {
    if (isSpinning || totalBet === 0 || isProcessing) return;
    if (!user) {
      onRequireAuth();
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    sounds.playClick();

    try {
      const res = await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gameId: 'mega-wheel',
          gameName: 'Mega Wheel Carnival',
          stake: totalBet,
          details: `Bets: 1x(₹${bets[1]}), 2x(₹${bets[2]}), 5x(₹${bets[5]}), 10x(₹${bets[10]}), 20x(₹${bets[20]}), 40x(₹${bets[40]})`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Failed to place bets');
        setIsProcessing(false);
        return;
      }

      setIsSpinning(true);

      // Mega Multiplier Rush feature: 20% chance of random segment boost
      if (Math.random() < 0.4) {
        const boostOptions: WheelOption[] = [5, 10, 20, 40];
        const boostTarget = boostOptions[Math.floor(Math.random() * boostOptions.length)];
        const boostMultiplier = boostTarget * [2, 3, 5][Math.floor(Math.random() * 3)];
        setMegaRushMultiplier({ mult: boostTarget, boost: boostMultiplier });
      } else {
        setMegaRushMultiplier(null);
      }

      // Pick winning segment
      const winningSegIdx = Math.floor(Math.random() * SEGMENTS.length);
      const pickedSeg = SEGMENTS[winningSegIdx];

      const numSegments = SEGMENTS.length;
      const anglePerSeg = 360 / numSegments;
      // Top pointer is at 270 degrees
      const targetAngle = 270 - (winningSegIdx * anglePerSeg + anglePerSeg / 2);
      const totalSpins = 6;
      const finalRotation = rotation + totalSpins * 360 + ((targetAngle - (rotation % 360) + 360) % 360);

      // Animate rotation with clicks
      const startTime = performance.now();
      const duration = 4000;
      const startRot = rotation;

      let lastTickAngle = startRot;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentRot = startRot + (finalRotation - startRot) * ease;

        setRotation(currentRot);

        // Sound tick on each segment passed
        if (Math.abs(currentRot - lastTickAngle) >= anglePerSeg) {
          sounds.playWheelTick();
          lastTickAngle = currentRot;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Finished spin
          finishRound(pickedSeg.mult, data.betId);
        }
      };

      requestAnimationFrame(animate);
    } catch {
      setErrorMessage('Network connection error.');
      setIsSpinning(false);
      setIsProcessing(false);
    }
  };

  const finishRound = async (resultMult: WheelOption, betId: string) => {
    setWinningMult(resultMult);
    setSpinHistory((prev) => [resultMult, ...prev.slice(0, 9)]);

    let multiplier = resultMult;
    if (megaRushMultiplier && megaRushMultiplier.mult === resultMult) {
      multiplier = megaRushMultiplier.boost as unknown as WheelOption;
    }

    const won = (bets[resultMult] || 0) * (multiplier + 1);
    setWinAmount(won);

    if (won > 0) {
      sounds.playCashout();
    } else {
      sounds.playCrash();
    }

    // Settle backend
    if (user) {
      await fetch('/api/game/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          betId,
          status: won > 0 ? 'WON' : 'LOST',
          multiplier: won > 0 ? multiplier : 0,
          winAmount: won,
          details: `Landed on ${resultMult}x ${megaRushMultiplier ? `(Boosted to ${multiplier}x)` : ''}`,
        }),
      });
    }

    setIsSpinning(false);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#111624] to-pink-950/40 border border-purple-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-purple-500/30">
            🎡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-['Orbitron'] font-black text-white">
                MEGA WHEEL CARNIVAL
              </h1>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/40 px-2 py-0.5 rounded-full font-black uppercase">
                Up to 250x Mega Rush
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pick your multiplier, spin the giant carnival wheel, and trigger Supercharged Mega Boosts!
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
        <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Wheel Arena */}
      <div className="bg-[#0b101b] border border-purple-500/30 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
        {/* Canvas Wheel with Indicator */}
        <div className="relative flex flex-col items-center justify-center py-4">
          {/* Top Indicator Arrow */}
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 z-10 drop-shadow-[0_4px_8px_rgba(245,158,11,0.6)] animate-bounce"></div>

          {/* Canvas Wheel */}
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            className="rounded-full shadow-2xl shadow-purple-500/20 max-w-[280px] sm:max-w-[340px]"
          />

          {/* Mega Multiplier Rush Banner */}
          {megaRushMultiplier && (
            <div className="mt-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-['Orbitron'] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-pink-500/30 animate-pulse">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>MEGA RUSH: {megaRushMultiplier.mult}X BOOSTED TO {megaRushMultiplier.boost}X!</span>
            </div>
          )}
        </div>

        {/* Win/Result Notification */}
        {winningMult !== null && !isSpinning && (
          <div className="p-4 rounded-2xl bg-[#080d16] border border-purple-500/60 text-center animate-milestone max-w-md mx-auto">
            <div className="text-xs uppercase font-bold text-purple-400">
              WHEEL STOPPED ON: {winningMult}X MULTIPLIER
            </div>
            {winAmount > 0 ? (
              <div className="text-2xl font-['Orbitron'] font-black text-emerald-400 mt-0.5">
                +₹{winAmount.toLocaleString('en-IN')} WON!
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-400 mt-0.5">No Winning Bets on Round</div>
            )}
          </div>
        )}

        {/* Multiplier Betting Felt Grid (1x, 2x, 5x, 10x, 20x, 40x) */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 max-w-4xl mx-auto">
          {([1, 2, 5, 10, 20, 40] as WheelOption[]).map((mult) => {
            const hasBet = bets[mult] > 0;
            const isWinner = winningMult === mult && !isSpinning;

            return (
              <button
                key={mult}
                type="button"
                disabled={isSpinning}
                onClick={() => handleAddBet(mult)}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-between transition-all cursor-pointer relative overflow-hidden group ${
                  isWinner
                    ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-400 shadow-xl'
                    : hasBet
                    ? 'bg-purple-950/80 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-[#101625] hover:bg-purple-950/40 border-slate-700 hover:border-purple-500/50'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400">PAYS {mult}:1</div>
                <div className="text-2xl font-['Orbitron'] font-black text-white my-1">{mult}X</div>
                {hasBet ? (
                  <div className="py-1 px-2.5 rounded-full bg-purple-600 text-white font-mono font-bold text-xs inline-block shadow-md">
                    ₹{bets[mult]}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 group-hover:text-purple-300">Tap to Bet</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Chip Controls & Action Footer */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Chip Selector */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  sounds.playChipClink();
                  setSelectedChip(chip);
                }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center font-mono font-black text-xs cursor-pointer shadow-lg transition-transform active:scale-95 shrink-0 ${
                  selectedChip === chip
                    ? 'border-white scale-110 shadow-purple-500/40 bg-gradient-to-br from-purple-500 to-pink-600 text-white ring-2 ring-purple-400'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                }`}
              >
                ₹{chip >= 1000 ? `${chip / 1000}k` : chip}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={totalBet === 0 || isSpinning}
              onClick={handleClearBets}
              className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={totalBet === 0 || isSpinning || isProcessing}
              onClick={handleSpin}
              className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl font-['Orbitron'] font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                totalBet > 0 && !isSpinning
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/30 active:scale-95 animate-shimmer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isSpinning
                ? 'Wheel Spinning...'
                : totalBet > 0
                ? `Spin Mega Wheel (₹${totalBet})`
                : 'Select Chips to Bet'}
            </button>
          </div>
        </div>

        {/* Spin Multiplier History Ribbon */}
        <div className="p-3 bg-[#080c14] rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
          <span className="font-['Orbitron'] font-bold text-[10px] text-slate-400 uppercase tracking-wider">
            Previous Spins:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto">
            {spinHistory.map((m, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-800 text-purple-300 border border-slate-700"
              >
                {m}x
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
