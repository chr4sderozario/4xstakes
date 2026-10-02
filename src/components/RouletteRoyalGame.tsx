import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types.js';
import {
  Zap,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertTriangle,
  History,
  ShieldCheck,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface RouletteRoyalGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: (msg?: string) => void;
}

// European Roulette Numbers (0-36)
const ROULETTE_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const CHIPS = [50, 100, 250, 500, 1000];

type OutsideBetType = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3';

export const RouletteRoyalGame: React.FC<RouletteRoyalGameProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [numberBets, setNumberBets] = useState<Record<number, number>>({});
  const [outsideBets, setOutsideBets] = useState<Record<OutsideBetType, number>>({
    red: 0,
    black: 0,
    even: 0,
    odd: 0,
    low: 0,
    high: 0,
    dozen1: 0,
    dozen2: 0,
    dozen3: 0,
  });

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [lightningNumbers, setLightningNumbers] = useState<Array<{ num: number; mult: number }>>([]);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [recentHistory, setRecentHistory] = useState<number[]>([17, 32, 0, 7, 24, 11, 36, 19]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const totalBet =
    Object.values(numberBets).reduce((a, b) => a + b, 0) +
    Object.values(outsideBets).reduce((a, b) => a + b, 0);

  const handleAddNumberBet = (num: number) => {
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
    setNumberBets((prev) => ({
      ...prev,
      [num]: (prev[num] || 0) + selectedChip,
    }));
  };

  const handleAddOutsideBet = (type: OutsideBetType) => {
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
    setOutsideBets((prev) => ({
      ...prev,
      [type]: prev[type] + selectedChip,
    }));
  };

  const handleClearBets = () => {
    if (isSpinning) return;
    sounds.playClick();
    setNumberBets({});
    setOutsideBets({
      red: 0,
      black: 0,
      even: 0,
      odd: 0,
      low: 0,
      high: 0,
      dozen1: 0,
      dozen2: 0,
      dozen3: 0,
    });
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
          gameId: 'roulette',
          gameName: 'Roulette Royal Lightning',
          stake: totalBet,
          details: `Total Bet ₹${totalBet}`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Failed to place bet');
        setIsProcessing(false);
        return;
      }

      setIsSpinning(true);
      sounds.playRouletteSpin();

      // Generate 2 Lightning numbers with 50x-500x
      const rand1 = Math.floor(Math.random() * 37);
      let rand2 = Math.floor(Math.random() * 37);
      if (rand2 === rand1) rand2 = (rand1 + 5) % 37;
      const mults = [50, 100, 200, 500];
      const lightnings = [
        { num: rand1, mult: mults[Math.floor(Math.random() * mults.length)] },
        { num: rand2, mult: mults[Math.floor(Math.random() * mults.length)] },
      ];
      setLightningNumbers(lightnings);

      // Determine winning number
      const pickedNumber = Math.floor(Math.random() * 37);
      const pickedIdx = ROULETTE_ORDER.indexOf(pickedNumber);

      // Rotate wheel
      const segmentAngle = 360 / 37;
      const targetRotation = wheelRotation + 1440 + (37 - pickedIdx) * segmentAngle;
      setWheelRotation(targetRotation);

      setTimeout(async () => {
        setWinningNumber(pickedNumber);
        setRecentHistory((prev) => [pickedNumber, ...prev.slice(0, 9)]);

        // Calculate payout
        let won = 0;

        // Straight up
        if (numberBets[pickedNumber]) {
          const lMatch = lightnings.find((l) => l.num === pickedNumber);
          const mult = lMatch ? lMatch.mult : 36;
          won += numberBets[pickedNumber] * mult;
        }

        if (pickedNumber !== 0) {
          const isRed = RED_NUMBERS.has(pickedNumber);
          const isEven = pickedNumber % 2 === 0;

          if (isRed && outsideBets.red > 0) won += outsideBets.red * 2;
          if (!isRed && outsideBets.black > 0) won += outsideBets.black * 2;
          if (isEven && outsideBets.even > 0) won += outsideBets.even * 2;
          if (!isEven && outsideBets.odd > 0) won += outsideBets.odd * 2;
          if (pickedNumber <= 18 && outsideBets.low > 0) won += outsideBets.low * 2;
          if (pickedNumber >= 19 && outsideBets.high > 0) won += outsideBets.high * 2;

          if (pickedNumber <= 12 && outsideBets.dozen1 > 0) won += outsideBets.dozen1 * 3;
          if (pickedNumber >= 13 && pickedNumber <= 24 && outsideBets.dozen2 > 0) won += outsideBets.dozen2 * 3;
          if (pickedNumber >= 25 && outsideBets.dozen3 > 0) won += outsideBets.dozen3 * 3;
        }

        setWinAmount(won);

        await fetch('/api/game/settle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            betId: data.betId,
            status: won > 0 ? 'WON' : 'LOST',
            multiplier: won > 0 ? Number((won / totalBet).toFixed(2)) : 0,
            winAmount: won,
            details: `Winning number: ${pickedNumber} (${RED_NUMBERS.has(pickedNumber) ? 'Red' : pickedNumber === 0 ? 'Green' : 'Black'})`,
          }),
        });

        if (won > 0) {
          sounds.playCashout();
        } else {
          sounds.playCrash();
        }

        setIsSpinning(false);
        setIsProcessing(false);
      }, 4000);
    } catch {
      setErrorMessage('Network error');
      setIsSpinning(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#111622] to-yellow-950/30 border border-yellow-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-yellow-500/30">
            🎡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-['Orbitron'] font-black text-white">
                ROULETTE ROYAL
              </h1>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>500x Lightning Edition</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              European 37-Pocket Single Zero Roulette with Supercharged Lightning Multipliers!
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

      {/* Main Table Felt & Wheel Container */}
      <div className="bg-[#0b101b] border border-slate-800 rounded-3xl p-4 sm:p-7 space-y-6 shadow-2xl">
        {/* Wheel Display & Lightning Banner */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-slate-800">
          {/* Wheel Graphic */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-yellow-600/60 shadow-2xl shadow-yellow-500/20 flex items-center justify-center p-2 bg-[#080d16] shrink-0">
            <div
              className="w-full h-full rounded-full border-2 border-yellow-500/40 flex items-center justify-center transition-transform duration-[4000ms] ease-out"
              style={{ transform: `rotate(${wheelRotation}deg)` }}
            >
              <div className="w-3/4 h-3/4 rounded-full bg-gradient-to-br from-yellow-700 via-amber-900 to-yellow-800 flex items-center justify-center border border-yellow-400/50 shadow-inner">
                <div className="w-1/2 h-1/2 rounded-full bg-[#0a0f18] flex items-center justify-center border border-yellow-500/60">
                  <span className="font-['Orbitron'] font-black text-yellow-400 text-xs sm:text-sm">
                    {winningNumber !== null ? winningNumber : '36x'}
                  </span>
                </div>
              </div>
            </div>
            {/* Top Indicator Needle */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-5 bg-gradient-to-b from-yellow-400 to-amber-600 clip-triangle shadow-lg z-10"></div>
          </div>

          {/* Lightning Multipliers Banner */}
          <div className="flex-1 space-y-3 w-full">
            <div className="text-xs font-['Orbitron'] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span>SUPERCHARGED LIGHTNING NUMBERS (UP TO 500X)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {lightningNumbers.length > 0 ? (
                lightningNumbers.map((l, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-gradient-to-r from-yellow-950/60 to-amber-950/40 border border-yellow-500/60 flex items-center justify-between shadow-lg shadow-yellow-500/10 animate-bounce"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-500 text-black font-black flex items-center justify-center font-mono text-sm">
                        {l.num}
                      </div>
                      <span className="text-xs font-bold text-white">Lucky #{l.num}</span>
                    </div>
                    <div className="font-['Orbitron'] font-black text-yellow-400 text-base">
                      {l.mult}x
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 text-center">
                  Spin to strike random Lightning Multipliers on up to 5 numbers!
                </div>
              )}
            </div>

            {/* Recent Numbers Streak */}
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Recent:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {recentHistory.map((num, i) => (
                  <span
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                      num === 0
                        ? 'bg-emerald-600 text-white'
                        : RED_NUMBERS.has(num)
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-900 text-white border border-slate-700'
                    }`}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Win Banner */}
        {winningNumber !== null && !isSpinning && (
          <div className="p-4 rounded-2xl bg-[#080d16] border border-yellow-500/60 text-center animate-milestone">
            <div className="text-xs uppercase font-bold text-yellow-400">
              RESULT: #{winningNumber} ({RED_NUMBERS.has(winningNumber) ? 'RED' : winningNumber === 0 ? 'GREEN ZERO' : 'BLACK'})
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

        {/* Interactive Roulette Felt Grid */}
        <div className="space-y-3 overflow-x-auto pb-2">
          {/* 0 (Single Zero) + Numbers 1 to 36 */}
          <div className="flex min-w-[620px]">
            {/* Green 0 */}
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddNumberBet(0)}
              className={`w-14 rounded-l-2xl border-2 border-r-0 flex flex-col items-center justify-center font-mono font-black text-sm transition-all cursor-pointer ${
                numberBets[0]
                  ? 'bg-emerald-600 text-white border-white'
                  : 'bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 border-emerald-500/60'
              }`}
            >
              <span>0</span>
              {numberBets[0] && (
                <span className="text-[10px] bg-black/60 px-1 rounded mt-1">₹{numberBets[0]}</span>
              )}
            </button>

            {/* 36 Number Matrix */}
            <div className="grid grid-rows-3 grid-flow-col gap-1 flex-1 bg-[#070b13] p-1 border-2 border-slate-700 rounded-r-2xl">
              {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                const isRed = RED_NUMBERS.has(num);
                const hasBet = numberBets[num] > 0;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isSpinning}
                    onClick={() => handleAddNumberBet(num)}
                    className={`h-11 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs transition-transform active:scale-95 cursor-pointer ${
                      hasBet
                        ? 'ring-2 ring-yellow-400 text-white font-black z-10'
                        : ''
                    } ${
                      isRed
                        ? 'bg-red-700 hover:bg-red-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{num}</span>
                    {hasBet && (
                      <span className="text-[9px] bg-black/80 text-yellow-300 px-1 rounded leading-none">
                        ₹{numberBets[num]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outside Bets Ribbon (1st 12, 2nd 12, 3rd 12) */}
          <div className="grid grid-cols-3 gap-2 min-w-[620px]">
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('dozen1')}
              className={`py-2.5 rounded-xl border text-xs font-bold font-['Orbitron'] transition-colors cursor-pointer ${
                outsideBets.dozen1 > 0
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              1st 12 (3x) {outsideBets.dozen1 > 0 && `• ₹${outsideBets.dozen1}`}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('dozen2')}
              className={`py-2.5 rounded-xl border text-xs font-bold font-['Orbitron'] transition-colors cursor-pointer ${
                outsideBets.dozen2 > 0
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              2nd 12 (3x) {outsideBets.dozen2 > 0 && `• ₹${outsideBets.dozen2}`}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('dozen3')}
              className={`py-2.5 rounded-xl border text-xs font-bold font-['Orbitron'] transition-colors cursor-pointer ${
                outsideBets.dozen3 > 0
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              3rd 12 (3x) {outsideBets.dozen3 > 0 && `• ₹${outsideBets.dozen3}`}
            </button>
          </div>

          {/* Even Money Bets (1-18, Even, Red, Black, Odd, 19-36) */}
          <div className="grid grid-cols-6 gap-2 min-w-[620px]">
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('low')}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                outsideBets.low > 0
                  ? 'bg-yellow-500 text-black border-yellow-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              1-18 (2x) {outsideBets.low > 0 && `(₹${outsideBets.low})`}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('even')}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                outsideBets.even > 0
                  ? 'bg-yellow-500 text-black border-yellow-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              EVEN (2x) {outsideBets.even > 0 && `(₹${outsideBets.even})`}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('red')}
              className={`py-2.5 rounded-xl border text-xs font-black transition-colors cursor-pointer ${
                outsideBets.red > 0
                  ? 'bg-red-600 text-white border-white shadow-lg'
                  : 'bg-red-800/80 hover:bg-red-700 text-white border-red-600/60'
              }`}
            >
              RED (2x) {outsideBets.red > 0 && `(₹${outsideBets.red})`}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('black')}
              className={`py-2.5 rounded-xl border text-xs font-black transition-colors cursor-pointer ${
                outsideBets.black > 0
                  ? 'bg-slate-900 text-yellow-300 border-white shadow-lg'
                  : 'bg-black hover:bg-slate-900 text-white border-slate-700'
              }`}
            >
              BLACK (2x) {outsideBets.black > 0 && `(₹${outsideBets.black})`}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('odd')}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                outsideBets.odd > 0
                  ? 'bg-yellow-500 text-black border-yellow-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              ODD (2x) {outsideBets.odd > 0 && `(₹${outsideBets.odd})`}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleAddOutsideBet('high')}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                outsideBets.high > 0
                  ? 'bg-yellow-500 text-black border-yellow-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              19-36 (2x) {outsideBets.high > 0 && `(₹${outsideBets.high})`}
            </button>
          </div>
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
                    ? 'border-white scale-110 shadow-yellow-500/40 bg-gradient-to-br from-yellow-400 to-amber-600 text-black ring-2 ring-yellow-400'
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
                  ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 hover:from-yellow-300 hover:to-amber-400 text-black shadow-lg shadow-yellow-500/25 active:scale-95 animate-shimmer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isSpinning
                ? 'Wheel Spinning...'
                : totalBet > 0
                ? `Spin Roulette (₹${totalBet})`
                : 'Place Bets on Table'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
