import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CrashGameState, CrashBet, User } from '../types.js';
import { socket } from '../lib/socket.js';
import { sounds } from '../lib/sound.js';
import {
  Plane,
  TrendingUp,
  History,
  Users,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface SkyHighGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: () => void;
}

export const SkyHighGame: React.FC<SkyHighGameProps> = ({ user, onOpenDeposit, onRequireAuth }) => {
  const [gameState, setGameState] = useState<CrashGameState>({
    gameId: 'sky-high',
    status: 'BETTING',
    roundId: 1,
    currentMultiplier: 1.0,
    crashMultiplier: 2.0,
    elapsedTime: 0,
    countdown: 5,
    history: [1.84, 3.12, 1.25, 6.72, 1.15, 2.04, 14.85, 1.45, 4.3],
    bets: [],
  });

  const [betAmount, setBetAmount] = useState<number>(50);
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sideTab, setSideTab] = useState<'all' | 'my'>('all');
  const [myBetsHistory, setMyBetsHistory] = useState<CrashBet[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const starsRef = useRef<Array<{ x: number; y: number; s: number; speed: number }>>([]);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>>([]);

  // Check if current user has an active bet in this round
  const userBet = gameState.bets.find((b) => b.userId === user?.id);

  // Initialize stars once
  useEffect(() => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 500,
      s: Math.random() * 2 + 0.5,
      speed: Math.random() * 1.5 + 0.5,
    }));
  }, []);

  // Listen to Socket.IO events for Sky High
  useEffect(() => {
    const handleState = (state: CrashGameState) => {
      if (state.gameId === 'sky-high') {
        setGameState(state);
      }
    };

    const handleCountdown = (data: { gameId: string; countdown: number }) => {
      if (data.gameId === 'sky-high') {
        setGameState((prev) => ({ ...prev, countdown: data.countdown, status: 'BETTING' }));
        sounds.playTick();
      }
    };

    const handleFlightStart = (data: { gameId: string; roundId: number }) => {
      if (data.gameId === 'sky-high') {
        setGameState((prev) => ({
          ...prev,
          status: 'FLYING',
          currentMultiplier: 1.0,
          elapsedTime: 0,
        }));
      }
    };

    const handleTick = (data: { gameId: string; multiplier: number; elapsedTime: number }) => {
      if (data.gameId === 'sky-high') {
        setGameState((prev) => ({
          ...prev,
          currentMultiplier: data.multiplier,
          elapsedTime: data.elapsedTime,
          status: 'FLYING',
        }));
      }
    };

    const handleCrashed = (data: { gameId: string; crashMultiplier: number; history: number[] }) => {
      if (data.gameId === 'sky-high') {
        sounds.playCrash();
        setGameState((prev) => {
          // Record to my history if I bet
          const myBetInRound = prev.bets.find((b) => b.userId === user?.id);
          if (myBetInRound) {
            setMyBetsHistory((old) => [myBetInRound, ...old]);
          }

          return {
            ...prev,
            status: 'CRASHED',
            currentMultiplier: data.crashMultiplier,
            history: data.history,
          };
        });
      }
    };

    const handleBetPlaced = (data: { gameId: string; bet: CrashBet }) => {
      if (data.gameId === 'sky-high') {
        setGameState((prev) => ({
          ...prev,
          bets: [...prev.bets.filter((b) => b.userId !== data.bet.userId), data.bet],
        }));
      }
    };

    const handlePlayerCashedOut = (data: { gameId: string; bet: CrashBet }) => {
      if (data.gameId === 'sky-high') {
        setGameState((prev) => ({
          ...prev,
          bets: prev.bets.map((b) => (b.userId === data.bet.userId ? data.bet : b)),
        }));

        if (data.bet.userId === user?.id) {
          sounds.playCashout();
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
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

  // Canvas render loop
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

      // 1. Clear background
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw stars & subtle movement
      ctx.fillStyle = '#ffffff';
      for (const star of starsRef.current) {
        if (gameState.status === 'FLYING') {
          star.x -= star.speed * (1 + gameState.currentMultiplier * 0.2);
          star.y += star.speed * 0.4;
          if (star.x < 0) star.x = width;
          if (star.y > height) star.y = 0;
        }
        ctx.globalAlpha = 0.35 + Math.sin(star.x * 0.05) * 0.25;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 3. Draw grid lines
      ctx.strokeStyle = '#1e293b44';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 4. Coordinates origin: bottom-left
      const startX = 50;
      const startY = height - 50;

      // Calculate plane position based on multiplier and elapsed time
      const maxFlightTime = 15;
      const progress = Math.min(1, gameState.elapsedTime / maxFlightTime);

      // Curve end point
      const endX = startX + (width - 150) * Math.min(0.9, 0.15 + progress * 0.85);
      const endY = startY - (height - 120) * Math.min(0.85, 0.05 + Math.pow(progress, 0.7) * 0.8);

      if (gameState.status === 'FLYING' || gameState.status === 'CRASHED') {
        // Draw glow trajectory curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);

        // Control point for smooth exponential curve
        const cpX = startX + (endX - startX) * 0.65;
        const cpY = startY;
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);

        // Gradient under curve
        const grad = ctx.createLinearGradient(0, endY, 0, startY);
        if (gameState.status === 'CRASHED') {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
          ctx.strokeStyle = '#ef4444';
        } else {
          grad.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
          grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
          ctx.strokeStyle = '#3b82f6';
        }

        ctx.lineWidth = 4;
        ctx.shadowColor = gameState.status === 'CRASHED' ? '#ef4444' : '#3b82f6';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Fill area under curve
        ctx.lineTo(endX, startY);
        ctx.lineTo(startX, startY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // 5. Plane / Rocket Exhaust Particles
        if (gameState.status === 'FLYING') {
          for (let i = 0; i < 3; i++) {
            particlesRef.current.push({
              x: endX - 10,
              y: endY + 8,
              vx: -Math.random() * 3 - 2,
              vy: Math.random() * 2 - 1,
              life: 1.0,
              color: Math.random() > 0.4 ? '#38bdf8' : '#f59e0b',
            });
          }
        }

        // Draw & update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.04;
          if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.life * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // 6. Draw Jet Craft / Rocket
        ctx.save();
        ctx.translate(endX, endY);
        // Angle of flight
        const angle = -Math.PI / 6;
        ctx.rotate(angle);

        if (gameState.status === 'CRASHED') {
          // Explosion burst
          ctx.fillStyle = '#ef4444';
          ctx.font = '28px sans-serif';
          ctx.fillText('💥', -14, 10);
        } else {
          // Sleek Cyan/Blue Jet Plane silhouette
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.moveTo(18, 0); // nose
          ctx.lineTo(-12, -10); // wing tip top
          ctx.lineTo(-6, -2);
          ctx.lineTo(-16, -2); // tail top
          ctx.lineTo(-18, 0); // thruster
          ctx.lineTo(-16, 2); // tail bottom
          ctx.lineTo(-6, 2);
          ctx.lineTo(-12, 10); // wing tip bottom
          ctx.closePath();
          ctx.fill();

          // Canopy
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.ellipse(2, 0, 5, 2, 0, 0, Math.PI * 2);
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
      setErrorMessage('Please enter a valid bet amount.');
      return;
    }
    if (user.balance < betAmount) {
      setErrorMessage('Insufficient wallet balance. Please make a deposit!');
      return;
    }

    const targetMultiplier = autoCashoutEnabled ? Number(autoCashout) : undefined;

    socket.emit(
      'crash:place_bet',
      {
        gameId: 'sky-high',
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
        gameId: 'sky-high',
        userId: user.id,
      },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Cashout failed');
        }
      }
    );
  };

  const adjustBet = (multiplier: number) => {
    sounds.playClick();
    setBetAmount((prev) => Math.max(10, Math.floor(prev * multiplier)));
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Multiplier History Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider pr-2 border-r border-slate-800">
          <History className="w-3.5 h-3.5 text-blue-400" />
          <span>History:</span>
        </div>
        <div className="flex items-center gap-2">
          {gameState.history.map((mult, idx) => {
            const isHigh = mult >= 10.0;
            const isMid = mult >= 2.0;
            return (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-lg text-xs font-['Orbitron'] font-black whitespace-nowrap transition-transform hover:scale-105 ${
                  isHigh
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                    : isMid
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-blue-950/40 text-blue-400 border border-blue-900/40'
                }`}
              >
                {mult.toFixed(2)}x
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Game Arena: Canvas + Controls + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 Columns: Arena & Control Deck */}
        <div className="lg:col-span-3 space-y-4">
          {/* Dynamic Flight Canvas Box with Screen Shake Animation on Crash */}
          <div
            className={`relative aspect-[16/9] sm:aspect-[21/10] bg-[#090d16] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl flex items-center justify-center transition-all ${
              gameState.status === 'CRASHED' ? 'animate-screen-shake border-red-500/60 shadow-red-950/50' : ''
            }`}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={450}
              className="w-full h-full object-cover block"
            />

            {/* Overlaid Multiplier Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              {gameState.status === 'BETTING' && (
                <div className="text-center animate-pulse">
                  <div className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-1">
                    Next Flight Starting In
                  </div>
                  <div className="font-['Orbitron'] font-black text-4xl sm:text-6xl text-white tracking-tight drop-shadow-lg">
                    {gameState.countdown}s
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Place your bets now</div>
                </div>
              )}

              {gameState.status === 'FLYING' && (
                <div className="text-center">
                  <div className="font-['Orbitron'] font-black text-5xl sm:text-7xl md:text-8xl text-white tracking-tight drop-shadow-[0_0_35px_rgba(56,189,248,0.6)] animate-pulse">
                    {gameState.currentMultiplier.toFixed(2)}
                    <span className="text-blue-400 text-3xl sm:text-5xl ml-1">x</span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mt-2 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    {gameState.currentMultiplier >= 3.0
                      ? 'Orbit Altitude Reached'
                      : gameState.currentMultiplier >= 1.5
                      ? 'Stratosphere Crossing'
                      : 'Ascending in Flight'}
                  </div>
                </div>
              )}

              {gameState.status === 'CRASHED' && (
                <div className="text-center animate-milestone">
                  <div className="text-xs sm:text-sm uppercase tracking-widest text-red-400 font-black mb-1">
                    FLEW AWAY @
                  </div>
                  <div className="font-['Orbitron'] font-black text-5xl sm:text-7xl text-red-500 tracking-tight drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                    {gameState.currentMultiplier.toFixed(2)}x
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Round Concluded</div>
                </div>
              )}
            </div>

            {/* Top Info Tag */}
            <div className="absolute top-3 left-4 flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-mono text-slate-300">
                <Plane className="w-3.5 h-3.5 text-blue-400" />
                Round #{gameState.roundId}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Provably Fair
              </span>
            </div>
          </div>

          {/* Betting Dashboard / Cockpit Controls */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111724] border border-slate-800 shadow-xl space-y-4">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-red-400 hover:text-white text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Bet Amount Input & Quick Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Bet Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                    disabled={Boolean(userBet && !userBet.cashedOut)}
                    className="w-full bg-[#161f30] border border-slate-700/80 rounded-xl py-2.5 pl-8 pr-3 font-['Orbitron'] font-bold text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                {/* Quick Bet Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 50, 100, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBetAmount(val)}
                      disabled={Boolean(userBet && !userBet.cashedOut)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        betAmount === val
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-[#182133] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => adjustBet(0.5)}
                    className="px-2 py-1 rounded-lg text-xs font-bold bg-[#182133] border border-slate-800 text-slate-400 hover:text-white"
                  >
                    /2
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustBet(2)}
                    className="px-2 py-1 rounded-lg text-xs font-bold bg-[#182133] border border-slate-800 text-slate-400 hover:text-white"
                  >
                    2X
                  </button>
                </div>
              </div>

              {/* Auto Cashout Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Auto Cashout Target
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase transition-colors ${
                      autoCashoutEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {autoCashoutEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1.1"
                    value={autoCashout}
                    onChange={(e) => setAutoCashout(e.target.value)}
                    disabled={!autoCashoutEnabled || Boolean(userBet && !userBet.cashedOut)}
                    className={`w-full bg-[#161f30] border rounded-xl py-2.5 pl-3 pr-8 font-['Orbitron'] font-bold text-white text-sm focus:outline-none ${
                      autoCashoutEnabled
                        ? 'border-emerald-500/80 text-emerald-300'
                        : 'border-slate-800 opacity-60'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    x
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {['1.50', '2.00', '5.00', '10.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAutoCashout(preset);
                        setAutoCashoutEnabled(true);
                      }}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-[#182133] border border-slate-800 text-slate-400 hover:text-white"
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Action Button */}
              <div className="pt-2 md:pt-0">
                {/* State A: User is in flight and has not cashed out */}
                {gameState.status === 'FLYING' && userBet && !userBet.cashedOut ? (
                  <button
                    onClick={handleCashout}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-black font-['Orbitron'] font-black text-base uppercase tracking-wider shadow-2xl shadow-amber-500/50 transition-all cursor-pointer animate-glow-gold animate-shimmer"
                  >
                    <div className="leading-tight">CASHOUT</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      ₹{Math.floor(userBet.amount * gameState.currentMultiplier).toLocaleString('en-IN')}{' '}
                      ({gameState.currentMultiplier.toFixed(2)}x)
                    </div>
                  </button>
                ) : userBet && userBet.cashedOut ? (
                  /* State B: User cashed out */
                  <div className="w-full py-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-center font-['Orbitron'] font-black animate-milestone">
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 text-emerald-300">
                      <CheckCircle className="w-4 h-4" /> Cashed Out
                    </div>
                    <div className="text-xl text-white mt-0.5">
                      +₹{userBet.winAmount?.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-normal">
                      @ {userBet.cashoutMultiplier?.toFixed(2)}x multiplier
                    </div>
                  </div>
                ) : userBet && gameState.status === 'CRASHED' ? (
                  /* State C: Crashed and lost */
                  <div className="w-full py-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-400 text-center font-['Orbitron'] font-black">
                    <div className="text-xs uppercase">Flight Crashed</div>
                    <div className="text-sm text-slate-400 font-normal mt-0.5">
                      Better luck next round!
                    </div>
                  </div>
                ) : gameState.status === 'BETTING' ? (
                  /* State D: Betting open */
                  userBet ? (
                    <div className="w-full py-4 rounded-2xl bg-blue-950/60 border border-blue-600/60 text-blue-400 text-center font-['Orbitron'] font-bold">
                      <div className="text-xs uppercase">Bet Placed (₹{userBet.amount})</div>
                      <div className="text-xs text-slate-400 font-normal mt-0.5">
                        Flight launching in {gameState.countdown}s...
                      </div>
                    </div>
                  ) : !user ? (
                    <button
                      onClick={onRequireAuth}
                      className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-black font-['Orbitron'] font-black text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all cursor-pointer animate-shimmer"
                    >
                      <div className="leading-tight">LOGIN TO BET</div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">Account Required</div>
                    </button>
                  ) : (
                    <button
                      onClick={handlePlaceBet}
                      className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-['Orbitron'] font-black text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-blue-600/30 transition-all cursor-pointer"
                    >
                      <div className="leading-tight">PLACE BET</div>
                      <div className="text-xs font-bold text-blue-200 mt-0.5">₹{betAmount}</div>
                    </button>
                  )
                ) : (
                  /* State E: Flight in progress, user watching */
                  <button
                    disabled
                    className="w-full py-4 sm:py-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-400 font-['Orbitron'] font-bold text-xs uppercase tracking-wider cursor-not-allowed"
                  >
                    <div>Flight in Progress</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Wait for next betting window
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Simulated & Real Player Bets Side Panel */}
        <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[520px]">
          {/* Header & Tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="font-['Orbitron'] font-bold text-xs text-white uppercase tracking-wider">
                Live Players ({gameState.bets.length})
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                onClick={() => setSideTab('all')}
                className={`px-2 py-0.5 rounded-md ${
                  sideTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSideTab('my')}
                className={`px-2 py-0.5 rounded-md ${
                  sideTab === 'my' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                My History
              </button>
            </div>
          </div>

          {/* Bets List */}
          <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
            {sideTab === 'all' ? (
              gameState.bets.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  Waiting for players to place bets...
                </div>
              ) : (
                gameState.bets.map((bet, idx) => (
                  <div
                    key={`${bet.userId}_${idx}`}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      bet.cashedOut
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-[#151c2a] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{bet.avatar || '👤'}</span>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1">
                          <span>{bet.userName}</span>
                          {bet.userId === user?.id && (
                            <span className="text-[9px] bg-blue-500 text-white px-1 rounded font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="font-['Orbitron'] text-slate-400 text-[11px]">
                          ₹{bet.amount}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {bet.cashedOut ? (
                        <div>
                          <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                            {bet.cashoutMultiplier?.toFixed(2)}x
                          </span>
                          <div className="font-['Orbitron'] font-bold text-emerald-400 text-xs mt-0.5">
                            +₹{bet.winAmount?.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ) : gameState.status === 'CRASHED' ? (
                        <span className="text-[10px] font-bold text-red-400">Lost</span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-400 animate-pulse">
                          In Flight
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : myBetsHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No past bets recorded in this session.
              </div>
            ) : (
              myBetsHistory.map((bet, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#151c2a] border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-['Orbitron'] font-bold text-white text-xs">
                      ₹{bet.amount}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {bet.cashedOut
                        ? `Cashed out @ ${bet.cashoutMultiplier?.toFixed(2)}x`
                        : 'Crashed'}
                    </div>
                  </div>
                  <div
                    className={`font-['Orbitron'] font-black text-xs ${
                      bet.cashedOut ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {bet.cashedOut ? `+₹${bet.winAmount}` : `-₹${bet.amount}`}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Wallet Deposit Hint */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Wallet Balance:</span>
            <button
              onClick={onOpenDeposit}
              className="text-emerald-400 font-bold hover:underline"
            >
              + Deposit Funds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
