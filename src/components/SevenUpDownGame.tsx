import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { SevenUpDownState, SevenUpDownChoice, SevenBet, User } from '../types.js';
import { socket } from '../lib/socket.js';
import { sounds } from '../lib/sound.js';
import {
  Dices,
  Clock,
  Trophy,
  History,
  TrendingDown,
  TrendingUp,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Coins,
} from 'lucide-react';

interface SevenUpDownGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: () => void;
}

const CHIP_VALUES = [20, 50, 100, 500, 1000];

// 3D Cube Dice Face Renderer
const renderFacePips = (faceNum: number) => {
  const pipPositions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const activePips = pipPositions[faceNum] || [4];

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-full h-full p-2.5">
      {Array.from({ length: 9 }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-center">
          {activePips.includes(idx) && (
            <span
              className={`w-3 h-3 rounded-full shadow-inner ${
                faceNum === 1 || faceNum === 4 ? 'bg-red-600' : 'bg-slate-900'
              }`}
            ></span>
          )}
        </div>
      ))}
    </div>
  );
};

// True 3D Cube Component
const ThreeDDice: React.FC<{ value: number; isRolling: boolean }> = ({ value, isRolling }) => {
  const getRotation = (val: number) => {
    switch (val) {
      case 1:
        return 'rotateX(0deg) rotateY(0deg)';
      case 2:
        return 'rotateX(90deg) rotateY(0deg)';
      case 3:
        return 'rotateY(-90deg) rotateX(0deg)';
      case 4:
        return 'rotateY(90deg) rotateX(0deg)';
      case 5:
        return 'rotateX(-90deg) rotateY(0deg)';
      case 6:
        return 'rotateX(180deg) rotateY(0deg)';
      default:
        return 'rotateX(0deg) rotateY(0deg)';
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className="dice-scene">
        <div
          className={`dice-cube ${isRolling ? 'animate-dice-tumbling' : ''}`}
          style={{ transform: !isRolling ? getRotation(value) : undefined }}
        >
          <div className="dice-face dice-face-1">{renderFacePips(1)}</div>
          <div className="dice-face dice-face-2">{renderFacePips(2)}</div>
          <div className="dice-face dice-face-3">{renderFacePips(3)}</div>
          <div className="dice-face dice-face-4">{renderFacePips(4)}</div>
          <div className="dice-face dice-face-5">{renderFacePips(5)}</div>
          <div className="dice-face dice-face-6">{renderFacePips(6)}</div>
        </div>
      </div>
      {/* Dynamic 3D Ground Shadow */}
      <div
        className={`w-16 h-3 rounded-full bg-black/60 blur-[3px] mt-4 transition-all duration-300 ${
          isRolling ? 'scale-75 opacity-30 animate-pulse' : 'scale-100 opacity-60'
        }`}
      ></div>
    </div>
  );
};

export const SevenUpDownGame: React.FC<SevenUpDownGameProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [state, setState] = useState<SevenUpDownState>({
    status: 'BETTING',
    roundId: 301,
    countdown: 30,
    dice1: 3,
    dice2: 4,
    total: 7,
    winningChoice: 'seven',
    history: [
      { roundId: 297, dice1: 2, dice2: 3, total: 5, choice: 'down' },
      { roundId: 298, dice1: 4, dice2: 5, total: 9, choice: 'up' },
      { roundId: 299, dice1: 6, dice2: 6, total: 12, choice: 'up' },
      { roundId: 300, dice1: 3, dice2: 4, total: 7, choice: 'seven' },
    ],
    bets: [],
  });

  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [isRollingAnimation, setIsRollingAnimation] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recentWinAnnouncement, setRecentWinAnnouncement] = useState<string | null>(null);
  const [chipPlacedTarget, setChipPlacedTarget] = useState<SevenUpDownChoice | null>(null);

  // My bets in the current round
  const myBets = state.bets.filter((b) => b.userId === user?.id);
  const myDownBet = myBets.filter((b) => b.choice === 'down').reduce((acc, c) => acc + c.amount, 0);
  const mySevenBet = myBets.filter((b) => b.choice === 'seven').reduce((acc, c) => acc + c.amount, 0);
  const myUpBet = myBets.filter((b) => b.choice === 'up').reduce((acc, c) => acc + c.amount, 0);

  // Community total pools
  const poolDown = state.bets.filter((b) => b.choice === 'down').reduce((acc, c) => acc + c.amount, 0);
  const poolSeven = state.bets.filter((b) => b.choice === 'seven').reduce((acc, c) => acc + c.amount, 0);
  const poolUp = state.bets.filter((b) => b.choice === 'up').reduce((acc, c) => acc + c.amount, 0);

  useEffect(() => {
    const handleState = (s: SevenUpDownState) => {
      setState(s);
    };

    const handleCountdown = (data: { countdown: number }) => {
      setState((prev) => ({ ...prev, countdown: data.countdown }));
      if (data.countdown <= 5 && data.countdown > 0) {
        setIsRollingAnimation(true);
        sounds.playDiceRoll();
      } else {
        setIsRollingAnimation(false);
      }
    };

    const handleRolling = () => {
      setIsRollingAnimation(true);
      sounds.playDiceRoll();
    };

    const handleResolved = (data: {
      dice1: number;
      dice2: number;
      total: number;
      winningChoice: SevenUpDownChoice;
      payoutMultiplier: number;
      bets: SevenBet[];
      history: SevenUpDownState['history'];
    }) => {
      setIsRollingAnimation(false);
      setState((prev) => ({
        ...prev,
        status: 'RESOLVED',
        dice1: data.dice1,
        dice2: data.dice2,
        total: data.total,
        winningChoice: data.winningChoice,
        history: data.history,
        bets: data.bets,
      }));

      // Check if user won
      const userWinBet = data.bets.find((b) => b.userId === user?.id && b.won);
      if (userWinBet) {
        sounds.playDiceWin();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });
        setRecentWinAnnouncement(
          `🎉 WINNER! You won ₹${userWinBet.winAmount?.toLocaleString('en-IN')} on ${
            data.winningChoice === 'seven' ? 'Lucky 7 (5X)!' : data.winningChoice.toUpperCase() + ' (2X)!'
          }`
        );
        setTimeout(() => setRecentWinAnnouncement(null), 5000);
      }
    };

    const handleBetPlaced = (data: { bet: SevenBet }) => {
      setState((prev) => ({
        ...prev,
        bets: [...prev.bets, data.bet],
      }));
    };

    socket.on('seven:state', handleState);
    socket.on('seven:countdown', handleCountdown);
    socket.on('seven:rolling', handleRolling);
    socket.on('seven:resolved', handleResolved);
    socket.on('seven:bet_placed', handleBetPlaced);

    return () => {
      socket.off('seven:state', handleState);
      socket.off('seven:countdown', handleCountdown);
      socket.off('seven:rolling', handleRolling);
      socket.off('seven:resolved', handleResolved);
      socket.off('seven:bet_placed', handleBetPlaced);
    };
  }, [user?.id]);

  const handlePlaceBet = (choice: SevenUpDownChoice) => {
    sounds.playChipClink();
    setErrorMessage('');

    if (!user) {
      onRequireAuth();
      return;
    }
    if (state.status !== 'BETTING' || state.countdown <= 5) {
      setErrorMessage('Betting is locked! The dice are rolling.');
      return;
    }
    if (user.balance < selectedChip) {
      setErrorMessage('Insufficient wallet balance. Please deposit funds!');
      return;
    }

    setChipPlacedTarget(choice);
    setTimeout(() => setChipPlacedTarget(null), 700);

    socket.emit(
      'seven:place_bet',
      {
        userId: user.id,
        choice,
        amount: selectedChip,
      },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to place bet');
        }
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Animated Win Banner */}
      {recentWinAnnouncement && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-['Orbitron'] font-black text-xs sm:text-sm text-center shadow-xl shadow-amber-500/30 animate-milestone flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 flex-shrink-0 animate-spin" />
          <span>{recentWinAnnouncement}</span>
        </div>
      )}

      {/* Header & 30-Second Countdown Timer Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#151a26] to-[#0f141f] border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-['Orbitron'] font-black text-lg sm:text-xl text-white flex items-center gap-2">
                <span>7 UP 7 DOWN</span>
                <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-extrabold uppercase">
                  30s Turbo Round
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Predict the sum of two dice. 2X payout for Up/Down, 5X for Lucky 7!
              </p>
            </div>
          </div>
        </div>

        {/* 30-second Timer Status */}
        <div className="flex items-center gap-3">
          <div className="w-48 sm:w-60 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-1000 ${
                state.countdown <= 5
                  ? 'bg-red-500 animate-pulse'
                  : state.countdown <= 12
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${(state.countdown / 30) * 100}%` }}
            ></div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-mono font-bold text-sm text-white">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="tabular-nums">{state.countdown}s</span>
          </div>
        </div>
      </div>

      {/* Main 3D Dice Rolling Arena */}
      <div className="relative p-6 sm:p-10 rounded-2xl bg-gradient-to-b from-[#101726] to-[#0a0e17] border border-slate-800 shadow-2xl flex flex-col items-center justify-center min-h-[280px] overflow-hidden">
        {/* Animated Radial Pulse Backdrop */}
        <div className="absolute w-[450px] h-[450px] rounded-full border border-amber-500/10 pointer-events-none animate-float-slow"></div>

        {/* Phase State Badge */}
        <div className="mb-5 z-10">
          {state.status === 'ROLLING' || isRollingAnimation ? (
            <div className="px-5 py-2 rounded-full bg-red-600/30 border border-red-500 text-red-200 text-xs font-black uppercase tracking-widest animate-pulse flex items-center gap-2 shadow-lg shadow-red-600/30">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              Dice Tumbling in Real-Time...
            </div>
          ) : state.status === 'RESOLVED' ? (
            <div className="px-5 py-2 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 animate-milestone">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Round #{state.roundId} Resolved (Score {state.total})
            </div>
          ) : (
            <div className="px-5 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-black uppercase tracking-widest">
              Place Bets • Rolling in {state.countdown}s
            </div>
          )}
        </div>

        {/* 3D Double Dice Pair */}
        <div className="flex items-center gap-10 sm:gap-14 my-3 z-10">
          <ThreeDDice value={state.dice1} isRolling={isRollingAnimation} />
          <div className="font-['Orbitron'] font-black text-3xl sm:text-4xl text-slate-500/80 select-none">
            +
          </div>
          <ThreeDDice value={state.dice2} isRolling={isRollingAnimation} />
        </div>

        {/* Total Outcome Display */}
        <div className="mt-3 text-center z-10 min-h-[50px]">
          {state.status === 'RESOLVED' && (
            <div className="animate-milestone">
              <div className="font-['Orbitron'] font-black text-4xl sm:text-5xl text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                {state.total}
              </div>
              <div className="text-xs font-extrabold text-emerald-400 mt-0.5 uppercase tracking-wider">
                Winner: {state.winningChoice === 'seven' ? '⭐ Lucky 7 (5X Jackpot)' : state.winningChoice?.toUpperCase() + ' (2X)'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Interactive Betting Zones with Floating Chip Animations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Zone 1: 7 DOWN (2-6) - 2X */}
        <button
          onClick={() => handlePlaceBet('down')}
          disabled={state.status !== 'BETTING' || state.countdown <= 5}
          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer active:scale-98 ${
            state.status === 'RESOLVED' && state.winningChoice === 'down'
              ? 'bg-blue-950/80 border-blue-400 shadow-2xl shadow-blue-500/50 scale-102 ring-4 ring-blue-500/40 animate-glow-gold'
              : 'bg-[#111724] border-blue-600/40 hover:border-blue-500 hover:bg-[#151c2e]'
          }`}
        >
          {/* Animated Chip Burst Indicator on Bet */}
          {chipPlacedTarget === 'down' && (
            <div className="absolute top-3 right-3 text-xs font-['Orbitron'] font-black text-blue-300 animate-milestone flex items-center gap-1 bg-blue-500/30 px-2 py-0.5 rounded-full">
              <Coins className="w-3.5 h-3.5" />
              <span>+₹{selectedChip}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black uppercase">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>2X Payout</span>
            </div>
            <span className="text-xs text-slate-400 font-bold">2, 3, 4, 5, 6</span>
          </div>

          <div className="my-3">
            <h2 className="font-['Orbitron'] font-black text-2xl sm:text-3xl text-white group-hover:text-blue-400 transition-colors">
              7 DOWN
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Sum of dice is strictly less than 7</p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">Total Pool:</span>
              <span className="text-white font-bold ml-1">₹{poolDown.toLocaleString('en-IN')}</span>
            </div>
            {myDownBet > 0 && (
              <div className="bg-blue-500 text-black px-2 py-0.5 rounded font-black text-[11px] animate-pulse">
                Your Bet: ₹{myDownBet}
              </div>
            )}
          </div>
        </button>

        {/* Zone 2: LUCKY 7 (7) - 5X (VIP GOLD HIGHLIGHT) */}
        <button
          onClick={() => handlePlaceBet('seven')}
          disabled={state.status !== 'BETTING' || state.countdown <= 5}
          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer active:scale-98 animate-shimmer ${
            state.status === 'RESOLVED' && state.winningChoice === 'seven'
              ? 'bg-amber-950/90 border-amber-400 shadow-2xl shadow-amber-500/60 scale-102 ring-4 ring-amber-500/50 animate-glow-gold'
              : 'bg-gradient-to-b from-[#1b1510] to-[#120f0d] border-amber-500/60 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/30'
          }`}
        >
          {chipPlacedTarget === 'seven' && (
            <div className="absolute top-3 right-3 text-xs font-['Orbitron'] font-black text-amber-300 animate-milestone flex items-center gap-1 bg-amber-500/30 px-2 py-0.5 rounded-full">
              <Coins className="w-3.5 h-3.5" />
              <span>+₹{selectedChip}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-black uppercase shadow-md shadow-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>5X JACKPOT</span>
            </div>
            <span className="text-xs text-amber-300 font-bold">Exactly 7</span>
          </div>

          <div className="my-3">
            <h2 className="font-['Orbitron'] font-black text-2xl sm:text-3xl text-amber-400 group-hover:text-yellow-300 transition-colors">
              LUCKY 7
            </h2>
            <p className="text-xs text-amber-200/80 mt-0.5">Sum of dice is exactly 7</p>
          </div>

          <div className="pt-3 border-t border-amber-900/40 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">Total Pool:</span>
              <span className="text-amber-300 font-bold ml-1">₹{poolSeven.toLocaleString('en-IN')}</span>
            </div>
            {mySevenBet > 0 && (
              <div className="bg-amber-400 text-black px-2 py-0.5 rounded font-black text-[11px] animate-pulse">
                Your Bet: ₹{mySevenBet}
              </div>
            )}
          </div>
        </button>

        {/* Zone 3: 7 UP (8-12) - 2X */}
        <button
          onClick={() => handlePlaceBet('up')}
          disabled={state.status !== 'BETTING' || state.countdown <= 5}
          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer active:scale-98 ${
            state.status === 'RESOLVED' && state.winningChoice === 'up'
              ? 'bg-rose-950/80 border-rose-400 shadow-2xl shadow-rose-500/50 scale-102 ring-4 ring-rose-500/40 animate-glow-red'
              : 'bg-[#111724] border-rose-600/40 hover:border-rose-500 hover:bg-[#151c2e]'
          }`}
        >
          {chipPlacedTarget === 'up' && (
            <div className="absolute top-3 right-3 text-xs font-['Orbitron'] font-black text-rose-300 animate-milestone flex items-center gap-1 bg-rose-500/30 px-2 py-0.5 rounded-full">
              <Coins className="w-3.5 h-3.5" />
              <span>+₹{selectedChip}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-black uppercase">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>2X Payout</span>
            </div>
            <span className="text-xs text-slate-400 font-bold">8, 9, 10, 11, 12</span>
          </div>

          <div className="my-3">
            <h2 className="font-['Orbitron'] font-black text-2xl sm:text-3xl text-white group-hover:text-rose-400 transition-colors">
              7 UP
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Sum of dice is strictly greater than 7</p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">Total Pool:</span>
              <span className="text-white font-bold ml-1">₹{poolUp.toLocaleString('en-IN')}</span>
            </div>
            {myUpBet > 0 && (
              <div className="bg-rose-500 text-white px-2 py-0.5 rounded font-black text-[11px] animate-pulse">
                Your Bet: ₹{myUpBet}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Chip Selector & Controls */}
      <div className="p-4 rounded-2xl bg-[#111724] border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">
                Select Chip:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {CHIP_VALUES.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      sounds.playChipClink();
                      setSelectedChip(val);
                    }}
                    className={`w-11 h-11 rounded-full font-['Orbitron'] font-black text-xs border-2 flex items-center justify-center transition-all cursor-pointer ${
                      selectedChip === val
                        ? 'bg-amber-500 text-black border-yellow-300 scale-110 shadow-lg shadow-amber-500/40 animate-glow-gold'
                        : 'bg-[#182133] text-slate-300 border-slate-700 hover:border-slate-500 hover:scale-105'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {errorMessage && (
                <div className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Click any zone to place</div>
                <div className="text-xs text-emerald-400 font-bold">Selected: ₹{selectedChip} per click</div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              <span className="font-bold text-white">Login required to play:</span> You must register or log in before placing bets.
            </div>
            <button
              onClick={onRequireAuth}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-black font-['Orbitron'] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 cursor-pointer animate-shimmer"
            >
              Login / Register to Play
            </button>
          </div>
        )}
      </div>

      {/* Past Rolls History Ribbon */}
      <div className="p-4 rounded-2xl bg-[#111724] border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
          <div className="flex items-center gap-1.5 uppercase">
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Roll History</span>
          </div>
          <span>Last {state.history.length} Rolls</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {state.history.map((h, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-xl border flex flex-col items-center min-w-[70px] transition-transform hover:scale-105 ${
                h.choice === 'seven'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : h.choice === 'down'
                  ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <span className="font-['Orbitron'] font-black text-sm">{h.total}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {h.dice1}+{h.dice2}
              </span>
              <span className="text-[9px] uppercase font-bold mt-0.5">
                {h.choice === 'seven' ? 'Lucky 7' : h.choice.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
