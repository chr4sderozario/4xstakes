import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CrashGameState, CrashBet, User } from '../types.js';
import { socket } from '../lib/socket.js';
import { sounds } from '../lib/sound.js';
import {
  Zap,
  Crown,
  Trophy,
  History,
  Shield,
  Crosshair,
  Flame,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface SkyHighBlackGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: () => void;
}

interface HighRollerLeader {
  name: string;
  avatar: string;
  rank: 'TITAN' | 'WHALE' | 'LEGEND' | 'COMMANDER';
  biggestWin: number;
  multiplier: number;
}

const VIP_LEADERBOARD: HighRollerLeader[] = [
  { name: 'ShadowWhale_X', avatar: '🏴‍☠️', rank: 'TITAN', biggestWin: 485000, multiplier: 48.5 },
  { name: 'LordCommander', avatar: '🎖️', rank: 'LEGEND', biggestWin: 280000, multiplier: 28.0 },
  { name: 'StealthViper', avatar: '🐍', rank: 'WHALE', biggestWin: 195000, multiplier: 19.5 },
  { name: 'BillionaireX', avatar: '💰', rank: 'COMMANDER', biggestWin: 140000, multiplier: 14.0 },
  { name: 'BlackFalcon_9', avatar: '🦅', rank: 'COMMANDER', biggestWin: 98000, multiplier: 9.8 },
];

export const SkyHighBlackGame: React.FC<SkyHighBlackGameProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [gameState, setGameState] = useState<CrashGameState>({
    gameId: 'sky-high-black',
    status: 'BETTING',
    roundId: 501,
    currentMultiplier: 1.0,
    crashMultiplier: 3.8,
    elapsedTime: 0,
    countdown: 5,
    history: [4.2, 1.35, 12.4, 2.15, 1.08, 28.5, 3.4, 1.62, 8.9],
    bets: [],
  });

  const [betAmount, setBetAmount] = useState<number>(200);
  const [autoCashout, setAutoCashout] = useState<string>('3.00');
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [panelTab, setPanelTab] = useState<'leaderboard' | 'bets'>('leaderboard');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);
  const radarAngleRef = useRef<number>(0);

  const userBet = gameState.bets.find((b) => b.userId === user?.id);

  useEffect(() => {
    const handleState = (state: CrashGameState) => {
      if (state.gameId === 'sky-high-black') {
        setGameState(state);
      }
    };

    const handleCountdown = (data: { gameId: string; countdown: number }) => {
      if (data.gameId === 'sky-high-black') {
        setGameState((prev) => ({ ...prev, countdown: data.countdown, status: 'BETTING' }));
        sounds.playTick();
      }
    };

    const handleFlightStart = (data: { gameId: string; roundId: number }) => {
      if (data.gameId === 'sky-high-black') {
        setGameState((prev) => ({
          ...prev,
          status: 'FLYING',
          currentMultiplier: 1.0,
          elapsedTime: 0,
        }));
      }
    };

    const handleTick = (data: { gameId: string; multiplier: number; elapsedTime: number }) => {
      if (data.gameId === 'sky-high-black') {
        setGameState((prev) => ({
          ...prev,
          currentMultiplier: data.multiplier,
          elapsedTime: data.elapsedTime,
          status: 'FLYING',
        }));
      }
    };

    const handleCrashed = (data: { gameId: string; crashMultiplier: number; history: number[] }) => {
      if (data.gameId === 'sky-high-black') {
        sounds.playCrash();
        setGameState((prev) => ({
          ...prev,
          status: 'CRASHED',
          currentMultiplier: data.crashMultiplier,
          history: data.history,
        }));
      }
    };

    const handleBetPlaced = (data: { gameId: string; bet: CrashBet }) => {
      if (data.gameId === 'sky-high-black') {
        setGameState((prev) => ({
          ...prev,
          bets: [...prev.bets.filter((b) => b.userId !== data.bet.userId), data.bet],
        }));
      }
    };

    const handlePlayerCashedOut = (data: { gameId: string; bet: CrashBet }) => {
      if (data.gameId === 'sky-high-black') {
        setGameState((prev) => ({
          ...prev,
          bets: prev.bets.map((b) => (b.userId === data.bet.userId ? data.bet : b)),
        }));

        if (data.bet.userId === user?.id) {
          sounds.playCashout();
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#f59e0b', '#dc2626'],
          });
        }
      }
    };

    socket.on('crash:state', handleState);
    socket.on('crash:countdown', handleCountdown);
    socket.on('crash:flight_start', handleFlightStart);
    socket.on('crash:tick', handleTick);
    socket.on('crash:crashed', handleCrashed);
    socket.on('crash:bet_placed', handleBetPlaced);
    socket.on('crash:player_cashed_out', handlePlayerCashedOut);

    return () => {
      socket.off('crash:state', handleState);
      socket.off('crash:countdown', handleCountdown);
      socket.off('crash:flight_start', handleFlightStart);
      socket.off('crash:tick', handleTick);
      socket.off('crash:crashed', handleCrashed);
      socket.off('crash:bet_placed', handleBetPlaced);
      socket.off('crash:player_cashed_out', handlePlayerCashedOut);
    };
  }, [user?.id]);

  // Canvas render loop for VIP Stealth Black
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;

      // Pitch black background
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, width, height);

      // Radar rings & sweep line
      radarAngleRef.current += 0.02;
      const centerX = width * 0.5;
      const centerY = height * 0.5;

      ctx.save();
      ctx.strokeStyle = '#450a0a33';
      ctx.lineWidth = 1;
      for (let r = 80; r < width * 0.6; r += 70) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Radar sweep
      const sweepX = centerX + Math.cos(radarAngleRef.current) * (width * 0.5);
      const sweepY = centerY + Math.sin(radarAngleRef.current) * (width * 0.5);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();
      ctx.restore();

      // Stealth hex grid lines
      ctx.strokeStyle = '#27080822';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const startX = 60;
      const startY = height - 50;
      const maxFlightTime = 16;
      const progress = Math.min(1, gameState.elapsedTime / maxFlightTime);

      const endX = startX + (width - 160) * Math.min(0.92, 0.15 + progress * 0.85);
      const endY = startY - (height - 120) * Math.min(0.85, 0.05 + Math.pow(progress, 0.72) * 0.8);

      if (gameState.status === 'FLYING' || gameState.status === 'CRASHED') {
        // Draw neon-red trajectory curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        const cpX = startX + (endX - startX) * 0.7;
        const cpY = startY;
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);

        const grad = ctx.createLinearGradient(0, endY, 0, startY);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.stroke();

        ctx.lineTo(endX, startY);
        ctx.lineTo(startX, startY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // Neon-red particle trail
        if (gameState.status === 'FLYING') {
          for (let i = 0; i < 4; i++) {
            particlesRef.current.push({
              x: endX - 12,
              y: endY + 4,
              vx: -Math.random() * 4 - 2,
              vy: Math.random() * 2 - 1,
              life: 1.0,
            });
          }
        }

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.045;
          if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.life * 4, 0, Math.PI * 2);
          ctx.fillStyle = p.life > 0.5 ? '#ef4444' : '#7f1d1d';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.globalAlpha = p.life;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // Draw Stealth Bomber Craft (B-2 silhouette)
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(-Math.PI / 7);

        if (gameState.status === 'CRASHED') {
          ctx.fillStyle = '#ef4444';
          ctx.font = '32px sans-serif';
          ctx.fillText('💥', -16, 12);
        } else {
          // Sharp matte-black stealth delta wing
          ctx.fillStyle = '#1c1917';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.moveTo(22, 0); // nose tip
          ctx.lineTo(-14, -18); // left wing tip
          ctx.lineTo(-8, -8);
          ctx.lineTo(-14, 0); // center tail notch
          ctx.lineTo(-8, 8);
          ctx.lineTo(-14, 18); // right wing tip
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Afterburner red glow
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(-14, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.status, gameState.currentMultiplier, gameState.elapsedTime]);

  const handlePlaceBet = () => {
    sounds.playClick();
    setErrorMessage('');

    if (!user) {
      onRequireAuth();
      return;
    }
    if (betAmount <= 0) {
      setErrorMessage('Enter valid bet.');
      return;
    }
    if (user.balance < betAmount) {
      setErrorMessage('Insufficient wallet balance. Please deposit funds!');
      return;
    }

    const targetMultiplier = autoCashoutEnabled ? Number(autoCashout) : undefined;

    socket.emit(
      'crash:place_bet',
      {
        gameId: 'sky-high-black',
        userId: user.id,
        amount: betAmount,
        targetMultiplier,
      },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to place bet');
        }
      }
    );
  };

  const handleCashout = () => {
    sounds.playClick();
    if (!user) return;

    socket.emit(
      'crash:cashout',
      {
        gameId: 'sky-high-black',
        userId: user.id,
      },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Cashout failed');
        }
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top VIP Banner & History */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/60 via-[#12080a] to-[#0c0d12] border border-red-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-['Orbitron'] font-black text-sm text-white">
              <span>SKY HIGH BLACK</span>
              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-extrabold tracking-wider uppercase">
                VIP High Roller
              </span>
            </div>
            <div className="text-[11px] text-red-300/80">
              Stealth Bomber edition • Extreme Multipliers up to 150x
            </div>
          </div>
        </div>

        {/* History Ribbons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <History className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          {gameState.history.map((mult, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-[11px] font-['Orbitron'] font-black whitespace-nowrap ${
                mult >= 10.0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : mult >= 3.0
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-stone-900 text-slate-400 border border-stone-800'
              }`}
            >
              {mult.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* Main Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas & Cockpit */}
        <div className="lg:col-span-3 space-y-4">
          <div
            className={`relative aspect-[16/9] sm:aspect-[21/10] bg-[#030407] rounded-2xl border border-red-950/80 overflow-hidden shadow-2xl flex items-center justify-center transition-all ${
              gameState.status === 'CRASHED' ? 'animate-screen-shake border-red-600 shadow-red-950/80' : ''
            }`}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={450}
              className="w-full h-full object-cover block"
            />

            {/* Overlaid Stealth Multiplier */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              {gameState.status === 'BETTING' && (
                <div className="text-center animate-pulse">
                  <div className="text-xs uppercase tracking-widest text-red-400 font-bold mb-1 flex items-center justify-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-red-400" />
                    Stealth Launch In
                  </div>
                  <div className="font-['Orbitron'] font-black text-5xl sm:text-7xl text-white tracking-tight">
                    {gameState.countdown}s
                  </div>
                  <div className="text-xs text-red-400/80 mt-1">High-Stakes VIP Window Open</div>
                </div>
              )}

              {gameState.status === 'FLYING' && (
                <div className="text-center">
                  <div className="font-['Orbitron'] font-black text-6xl sm:text-8xl text-white tracking-tight drop-shadow-[0_0_40px_rgba(239,68,68,0.7)]">
                    {gameState.currentMultiplier.toFixed(2)}
                    <span className="text-red-500 text-4xl sm:text-6xl ml-1">x</span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-red-400 mt-2 flex items-center justify-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                    B-2 Stealth Bomber Climbing
                  </div>
                </div>
              )}

              {gameState.status === 'CRASHED' && (
                <div className="text-center">
                  <div className="text-xs sm:text-sm uppercase tracking-widest text-red-500 font-black mb-1">
                    TARGET LOST @
                  </div>
                  <div className="font-['Orbitron'] font-black text-5xl sm:text-7xl text-red-600 tracking-tight drop-shadow-[0_0_35px_rgba(220,38,38,0.9)]">
                    {gameState.currentMultiplier.toFixed(2)}x
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls Deck */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0a0d] border border-red-950/80 shadow-2xl space-y-4">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-red-400 hover:text-white font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Bet Amount */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-red-400">
                  VIP Stake Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
                    disabled={Boolean(userBet && !userBet.cashedOut)}
                    className="w-full bg-[#180f12] border border-red-900/60 rounded-xl py-2.5 pl-8 pr-3 font-['Orbitron'] font-bold text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                {/* Higher Stakes VIP Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[100, 500, 1000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBetAmount(val)}
                      disabled={Boolean(userBet && !userBet.cashedOut)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        betAmount === val
                          ? 'bg-red-600/30 border-red-500 text-red-300'
                          : 'bg-[#1e1115] border-red-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBetAmount((p) => p * 2)}
                    className="px-2 py-1 rounded-lg text-xs font-bold bg-[#1e1115] border border-red-950 text-red-400 hover:text-white"
                  >
                    2X
                  </button>
                </div>
              </div>

              {/* Auto Cashout */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-red-400">
                    Auto-Lock Target
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase transition-colors ${
                      autoCashoutEnabled
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-stone-800 text-slate-400'
                    }`}
                  >
                    {autoCashoutEnabled ? 'Active' : 'Off'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="1.2"
                    value={autoCashout}
                    onChange={(e) => setAutoCashout(e.target.value)}
                    disabled={!autoCashoutEnabled || Boolean(userBet && !userBet.cashedOut)}
                    className="w-full bg-[#180f12] border border-red-900/60 rounded-xl py-2.5 pl-3 pr-8 font-['Orbitron'] font-bold text-white text-sm focus:outline-none focus:border-red-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 font-bold text-sm">
                    x
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {['2.00', '5.00', '10.00', '25.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAutoCashout(preset);
                        setAutoCashoutEnabled(true);
                      }}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-[#1e1115] border border-red-950 text-slate-400 hover:text-white"
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 md:pt-0">
                {gameState.status === 'FLYING' && userBet && !userBet.cashedOut ? (
                  <button
                    onClick={handleCashout}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-['Orbitron'] font-black text-base uppercase tracking-wider shadow-2xl shadow-red-600/50 transition-all cursor-pointer animate-glow-red animate-shimmer"
                  >
                    <div>LOCK CASHOUT</div>
                    <div className="text-xs font-bold text-white/90 mt-0.5">
                      ₹{Math.floor(userBet.amount * gameState.currentMultiplier).toLocaleString('en-IN')}{' '}
                      ({gameState.currentMultiplier.toFixed(2)}x)
                    </div>
                  </button>
                ) : userBet && userBet.cashedOut ? (
                  <div className="w-full py-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-center font-['Orbitron'] font-black animate-milestone">
                    <div className="text-xs flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" /> CASHOUT CONFIRMED
                    </div>
                    <div className="text-xl text-white mt-0.5">
                      +₹{userBet.winAmount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                ) : gameState.status === 'BETTING' ? (
                  userBet ? (
                    <div className="w-full py-4 rounded-2xl bg-red-950/60 border border-red-700/60 text-red-300 text-center font-['Orbitron'] font-bold">
                      <div className="text-xs">VIP BET ENGAGED (₹{userBet.amount})</div>
                      <div className="text-xs text-red-400/80 mt-0.5">
                        Launching in {gameState.countdown}s...
                      </div>
                    </div>
                  ) : !user ? (
                    <button
                      onClick={onRequireAuth}
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 active:scale-95 text-white font-['Orbitron'] font-black text-base uppercase tracking-wider shadow-xl shadow-red-600/30 transition-all cursor-pointer animate-shimmer"
                    >
                      <div>LOGIN FOR VIP BET</div>
                      <div className="text-xs text-red-200 mt-0.5">Account Required</div>
                    </button>
                  ) : (
                    <button
                      onClick={handlePlaceBet}
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 active:scale-95 text-white font-['Orbitron'] font-black text-base uppercase tracking-wider shadow-xl shadow-red-600/30 transition-all cursor-pointer"
                    >
                      <div>DEPLOY VIP BET</div>
                      <div className="text-xs text-red-200 mt-0.5">₹{betAmount}</div>
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full py-5 rounded-2xl bg-stone-900 border border-stone-800 text-stone-500 font-['Orbitron'] font-bold text-xs uppercase cursor-not-allowed"
                  >
                    Stealth Sortie Underway
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* VIP High-Rollers Live Leaderboard Side Panel */}
        <div className="bg-[#0e0a0d] border border-red-950/80 rounded-2xl p-4 shadow-2xl flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-red-950">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="font-['Orbitron'] font-bold text-xs text-white uppercase tracking-wider">
                VIP High-Rollers
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                onClick={() => setPanelTab('leaderboard')}
                className={`px-2 py-0.5 rounded-md ${
                  panelTab === 'leaderboard'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hall of Fame
              </button>
              <button
                onClick={() => setPanelTab('bets')}
                className={`px-2 py-0.5 rounded-md ${
                  panelTab === 'bets'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 text-xs">
            {panelTab === 'leaderboard' ? (
              VIP_LEADERBOARD.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#150d11] border border-red-950/80 flex items-center justify-between hover:border-red-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-sm font-bold text-amber-400">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 rounded font-black">
                          {item.rank}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-400 font-['Orbitron'] mt-0.5">
                        {item.multiplier}x Multiplier
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-['Orbitron'] font-black text-emerald-400 text-xs">
                      ₹{item.biggestWin.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500">Biggest Payout</div>
                  </div>
                </div>
              ))
            ) : (
              gameState.bets.map((bet, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#150d11] border border-red-950 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{bet.avatar || '👤'}</span>
                    <div>
                      <div className="font-bold text-white text-xs">{bet.userName}</div>
                      <div className="font-['Orbitron'] text-red-400 text-[11px]">
                        ₹{bet.amount}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {bet.cashedOut ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        +{bet.cashoutMultiplier}x
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-400 animate-pulse font-bold">
                        Flying
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-red-950 flex items-center justify-between text-xs">
            <span className="text-slate-400">VIP Wallet:</span>
            <button
              onClick={onOpenDeposit}
              className="text-red-400 font-bold hover:underline"
            >
              + Quick Recharge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
