import React, { useState, useEffect } from 'react';
import { User } from '../types.js';
import {
  Flame,
  ShieldCheck,
  RotateCcw,
  Clock,
  Sparkles,
  Trophy,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface DragonTigerGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: (msg?: string) => void;
}

type BetChoice = 'dragon' | 'tiger' | 'tie' | 'suited-tie';

interface Card {
  rank: number;
  suit: '♠' | '♥' | '♣' | '♦';
  label: string;
  isRed: boolean;
}

const SUITS: Array<{ symbol: '♠' | '♥' | '♣' | '♦'; isRed: boolean }> = [
  { symbol: '♠', isRed: false },
  { symbol: '♥', isRed: true },
  { symbol: '♣', isRed: false },
  { symbol: '♦', isRed: true },
];

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

const getRandomCard = (): Card => {
  const rank = Math.floor(Math.random() * 13) + 1;
  const suitObj = SUITS[Math.floor(Math.random() * SUITS.length)];
  return {
    rank,
    suit: suitObj.symbol,
    label: RANK_LABELS[rank],
    isRed: suitObj.isRed,
  };
};

const CHIPS = [50, 100, 250, 500, 1000, 5000];

export const DragonTigerGame: React.FC<DragonTigerGameProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [bets, setBets] = useState<Record<BetChoice, number>>({
    dragon: 0,
    tiger: 0,
    tie: 0,
    'suited-tie': 0,
  });

  const [phase, setPhase] = useState<'betting' | 'dealing' | 'result'>('betting');
  const [dragonCard, setDragonCard] = useState<Card | null>(null);
  const [tigerCard, setTigerCard] = useState<Card | null>(null);
  const [winner, setWinner] = useState<BetChoice | null>(null);
  const [roundWinAmount, setRoundWinAmount] = useState<number>(0);
  const [roadHistory, setRoadHistory] = useState<Array<'D' | 'T' | 'Tie'>>([
    'D', 'D', 'T', 'D', 'T', 'T', 'T', 'Tie', 'D', 'T', 'D', 'D', 'T', 'D', 'T',
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  const handleAddBet = (choice: BetChoice) => {
    if (phase !== 'betting') return;
    if (!user) {
      onRequireAuth('Please login or register to play Dragon Tiger.');
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
      [choice]: prev[choice] + selectedChip,
    }));
  };

  const handleClearBets = () => {
    if (phase !== 'betting') return;
    sounds.playClick();
    setBets({ dragon: 0, tiger: 0, tie: 0, 'suited-tie': 0 });
  };

  const handleDealRound = async () => {
    if (phase !== 'betting' || totalBet === 0 || isProcessing) return;
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
          gameId: 'dragon-tiger',
          gameName: 'Dragon Tiger Live',
          stake: totalBet,
          details: `Bets: D:₹${bets.dragon}, T:₹${bets.tiger}, Tie:₹${bets.tie}`,
        }),
      });

      const betData = await res.json();
      if (!betData.success) {
        setErrorMessage(betData.error || 'Failed to place bets');
        setIsProcessing(false);
        return;
      }

      setPhase('dealing');
      sounds.playCardFlip();

      const dCard = getRandomCard();
      const tCard = getRandomCard();

      setTimeout(() => {
        setDragonCard(dCard);
        sounds.playCardFlip();
      }, 600);

      setTimeout(async () => {
        setTigerCard(tCard);
        sounds.playCardFlip();

        let roundWinner: BetChoice;
        if (dCard.rank > tCard.rank) {
          roundWinner = 'dragon';
        } else if (tCard.rank > dCard.rank) {
          roundWinner = 'tiger';
        } else {
          if (dCard.suit === tCard.suit) {
            roundWinner = 'suited-tie';
          } else {
            roundWinner = 'tie';
          }
        }

        setWinner(roundWinner);
        setRoadHistory((prev) => [
          ...prev.slice(1),
          roundWinner === 'dragon' ? 'D' : roundWinner === 'tiger' ? 'T' : 'Tie',
        ]);

        let totalWin = 0;
        if (roundWinner === 'dragon' && bets.dragon > 0) {
          totalWin += bets.dragon * 2;
        } else if (roundWinner === 'tiger' && bets.tiger > 0) {
          totalWin += bets.tiger * 2;
        } else if (roundWinner === 'tie') {
          if (bets.tie > 0) totalWin += bets.tie * 11;
          totalWin += Math.floor(bets.dragon * 0.5) + Math.floor(bets.tiger * 0.5);
        } else if (roundWinner === 'suited-tie') {
          if (bets['suited-tie'] > 0) totalWin += bets['suited-tie'] * 50;
          if (bets.tie > 0) totalWin += bets.tie * 11;
          totalWin += Math.floor(bets.dragon * 0.5) + Math.floor(bets.tiger * 0.5);
        }

        setRoundWinAmount(totalWin);
        setPhase('result');

        await fetch('/api/game/settle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            betId: betData.betId,
            status: totalWin > 0 ? 'WON' : 'LOST',
            multiplier: totalWin > 0 ? Number((totalWin / totalBet).toFixed(2)) : 0,
            winAmount: totalWin,
            details: `Dragon: ${dCard.label}${dCard.suit} vs Tiger: ${tCard.label}${tCard.suit} -> ${roundWinner.toUpperCase()}`,
          }),
        });

        if (totalWin > 0) {
          sounds.playCashout();
        } else {
          sounds.playCrash();
        }

        setTimeout(() => {
          setPhase('betting');
          setWinner(null);
          setIsProcessing(false);
        }, 3000);
      }, 1400);
    } catch {
      setErrorMessage('Network connection error.');
      setIsProcessing(false);
      setPhase('betting');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="p-3 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#111624] to-amber-950/40 border border-amber-500/30 shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-md font-black text-lg shrink-0">
            🐉
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-xl font-['Orbitron'] font-black text-white leading-tight">
                DRAGON TIGER
              </h1>
              <span className="text-[8px] sm:text-[9px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded font-black uppercase">
                Live Clash
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
              Highest card wins: Dragon (2x), Tiger (2x), Tie (11x), Suited Tie (50x).
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

      {/* Main Arena Table */}
      <div className="bg-[#0b101b] border border-amber-500/30 rounded-2xl p-3.5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
        {/* Clash Cards Area */}
        <div className="grid grid-cols-2 gap-3 sm:gap-8 max-w-xl mx-auto py-1 sm:py-3">
          {/* DRAGON */}
          <div
            className={`p-3 sm:p-4 rounded-2xl border text-center transition-all duration-300 ${
              winner === 'dragon'
                ? 'bg-red-950/60 border-red-500 shadow-xl shadow-red-500/30 scale-102'
                : 'bg-[#101625] border-red-900/40'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-red-400 font-['Orbitron'] font-black text-xs uppercase tracking-wider mb-2">
              <span>🐉 DRAGON</span>
            </div>

            <div className="w-20 sm:w-28 h-28 sm:h-40 mx-auto rounded-xl border-2 flex flex-col justify-between p-2 shadow-lg bg-white border-slate-300">
              {dragonCard ? (
                <>
                  <div className={`text-left font-bold text-xs sm:text-base leading-none ${dragonCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                    <div>{dragonCard.label}</div>
                    <div className="text-[10px] sm:text-xs">{dragonCard.suit}</div>
                  </div>
                  <div className={`text-2xl sm:text-4xl self-center font-bold ${dragonCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                    {dragonCard.suit}
                  </div>
                  <div className={`text-right font-bold text-xs sm:text-base leading-none rotate-180 ${dragonCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                    <div>{dragonCard.label}</div>
                    <div className="text-[10px] sm:text-xs">{dragonCard.suit}</div>
                  </div>
                </>
              ) : (
                <div className="h-full rounded-lg bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center text-white/50 font-['Orbitron'] font-black text-[10px]">
                  DRAGON
                </div>
              )}
            </div>
          </div>

          {/* TIGER */}
          <div
            className={`p-3 sm:p-4 rounded-2xl border text-center transition-all duration-300 ${
              winner === 'tiger'
                ? 'bg-amber-950/60 border-amber-500 shadow-xl shadow-amber-500/30 scale-102'
                : 'bg-[#101625] border-amber-900/40'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-amber-400 font-['Orbitron'] font-black text-xs uppercase tracking-wider mb-2">
              <span>🐅 TIGER</span>
            </div>

            <div className="w-20 sm:w-28 h-28 sm:h-40 mx-auto rounded-xl border-2 flex flex-col justify-between p-2 shadow-lg bg-white border-slate-300">
              {tigerCard ? (
                <>
                  <div className={`text-left font-bold text-xs sm:text-base leading-none ${tigerCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                    <div>{tigerCard.label}</div>
                    <div className="text-[10px] sm:text-xs">{tigerCard.suit}</div>
                  </div>
                  <div className={`text-2xl sm:text-4xl self-center font-bold ${tigerCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                    {tigerCard.suit}
                  </div>
                  <div className={`text-right font-bold text-xs sm:text-base leading-none rotate-180 ${tigerCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                    <div>{tigerCard.label}</div>
                    <div className="text-[10px] sm:text-xs">{tigerCard.suit}</div>
                  </div>
                </>
              ) : (
                <div className="h-full rounded-lg bg-gradient-to-br from-amber-800 to-amber-950 flex items-center justify-center text-white/50 font-['Orbitron'] font-black text-[10px]">
                  TIGER
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Win Banner */}
        {phase === 'result' && (
          <div className="p-3 rounded-xl bg-[#090d16] border border-amber-500/60 text-center animate-milestone max-w-sm mx-auto">
            <div className="text-[10px] uppercase font-bold text-amber-400">
              {winner === 'dragon' ? '🐉 DRAGON WINS!' : winner === 'tiger' ? '🐅 TIGER WINS!' : '🤝 TIE GAME!'}
            </div>
            {roundWinAmount > 0 && (
              <div className="text-xl font-['Orbitron'] font-black text-emerald-400">
                +₹{roundWinAmount.toLocaleString('en-IN')} WON!
              </div>
            )}
          </div>
        )}

        {/* Betting Felt Board (2x2 on Mobile, 4-Col on Desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto">
          <button
            type="button"
            disabled={phase !== 'betting'}
            onClick={() => handleAddBet('dragon')}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
              bets.dragon > 0
                ? 'bg-red-950/80 border-red-500 shadow-md'
                : 'bg-[#101625] hover:bg-red-950/40 border-red-900/40'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-red-400">DRAGON</div>
            <div className="text-base font-['Orbitron'] font-black text-white mt-0.5">2.0×</div>
            {bets.dragon > 0 && (
              <div className="mt-1 py-0.5 px-2 rounded-full bg-red-600 text-white font-mono font-bold text-[10px] inline-block">
                ₹{bets.dragon}
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={phase !== 'betting'}
            onClick={() => handleAddBet('tie')}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
              bets.tie > 0
                ? 'bg-emerald-950/80 border-emerald-500 shadow-md'
                : 'bg-[#101625] hover:bg-emerald-950/40 border-emerald-900/40'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-emerald-400">TIE</div>
            <div className="text-base font-['Orbitron'] font-black text-white mt-0.5">11.0×</div>
            {bets.tie > 0 && (
              <div className="mt-1 py-0.5 px-2 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] inline-block">
                ₹{bets.tie}
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={phase !== 'betting'}
            onClick={() => handleAddBet('suited-tie')}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
              bets['suited-tie'] > 0
                ? 'bg-purple-950/80 border-purple-500 shadow-md'
                : 'bg-[#101625] hover:bg-purple-950/40 border-purple-900/40'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-purple-400">SUITED TIE</div>
            <div className="text-base font-['Orbitron'] font-black text-white mt-0.5">50.0×</div>
            {bets['suited-tie'] > 0 && (
              <div className="mt-1 py-0.5 px-2 rounded-full bg-purple-600 text-white font-mono font-bold text-[10px] inline-block">
                ₹{bets['suited-tie']}
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={phase !== 'betting'}
            onClick={() => handleAddBet('tiger')}
            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
              bets.tiger > 0
                ? 'bg-amber-950/80 border-amber-500 shadow-md'
                : 'bg-[#101625] hover:bg-amber-950/40 border-amber-900/40'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-amber-400">TIGER</div>
            <div className="text-base font-['Orbitron'] font-black text-white mt-0.5">2.0×</div>
            {bets.tiger > 0 && (
              <div className="mt-1 py-0.5 px-2 rounded-full bg-amber-600 text-black font-mono font-black text-[10px] inline-block">
                ₹{bets.tiger}
              </div>
            )}
          </button>
        </div>

        {/* Chip Controls & Action Footer */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  sounds.playChipClink();
                  setSelectedChip(chip);
                }}
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center font-mono font-black text-[11px] cursor-pointer shrink-0 ${
                  selectedChip === chip
                    ? 'border-white shadow-amber-500/40 bg-gradient-to-br from-amber-400 to-amber-600 text-black ring-1 ring-amber-400 scale-105'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                ₹{chip >= 1000 ? `${chip / 1000}k` : chip}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={totalBet === 0 || phase !== 'betting'}
              onClick={handleClearBets}
              className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer disabled:opacity-40"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={totalBet === 0 || phase !== 'betting' || isProcessing}
              onClick={handleDealRound}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-['Orbitron'] font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                totalBet > 0 && phase === 'betting'
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 text-black shadow-md active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isProcessing
                ? 'Dealing...'
                : totalBet > 0
                ? `Deal (₹${totalBet})`
                : 'Select Chips to Bet'}
            </button>
          </div>
        </div>

        {/* Bead Road */}
        <div className="p-2 bg-[#080c14] rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <span className="font-['Orbitron'] font-bold text-[9px] text-slate-400 uppercase tracking-wider">
            Road:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {roadHistory.map((res, i) => (
              <span
                key={i}
                className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] ${
                  res === 'D'
                    ? 'bg-red-600 text-white'
                    : res === 'T'
                    ? 'bg-amber-500 text-black'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {res}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
