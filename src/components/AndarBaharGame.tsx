import React, { useState } from 'react';
import { User } from '../types.js';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface AndarBaharGameProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: (msg?: string) => void;
}

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

const getRandomCard = (excludeCard?: Card): Card => {
  let rank = Math.floor(Math.random() * 13) + 1;
  let suitObj = SUITS[Math.floor(Math.random() * SUITS.length)];
  if (excludeCard && excludeCard.rank === rank && excludeCard.suit === suitObj.symbol) {
    rank = (rank % 13) + 1;
  }
  return {
    rank,
    suit: suitObj.symbol,
    label: RANK_LABELS[rank],
    isRed: suitObj.isRed,
  };
};

const CHIPS = [50, 100, 250, 500, 1000, 2500];

export const AndarBaharGame: React.FC<AndarBaharGameProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [andarBet, setAndarBet] = useState<number>(0);
  const [baharBet, setBaharBet] = useState<number>(0);

  const [jokerCard, setJokerCard] = useState<Card | null>(null);
  const [andarCards, setAndarCards] = useState<Card[]>([]);
  const [baharCards, setBaharCards] = useState<Card[]>([]);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [winningSide, setWinningSide] = useState<'andar' | 'bahar' | null>(null);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [history, setHistory] = useState<Array<'A' | 'B'>>(['A', 'B', 'B', 'A', 'B', 'A', 'A', 'B']);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const totalBet = andarBet + baharBet;

  const handleAddBet = (side: 'andar' | 'bahar') => {
    if (isDealing) return;
    if (!user) {
      onRequireAuth('Please login or register to play Andar Bahar.');
      return;
    }
    if (user.balance < totalBet + selectedChip) {
      setErrorMessage('Insufficient wallet balance!');
      onOpenDeposit();
      return;
    }

    sounds.playChipClink();
    setErrorMessage('');
    if (side === 'andar') {
      setAndarBet((prev) => prev + selectedChip);
    } else {
      setBaharBet((prev) => prev + selectedChip);
    }
  };

  const handleClearBets = () => {
    if (isDealing) return;
    sounds.playClick();
    setAndarBet(0);
    setBaharBet(0);
  };

  const handleStartDeal = async () => {
    if (isDealing || totalBet === 0 || isProcessing) return;
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
          gameId: 'andar-bahar',
          gameName: 'Andar Bahar Live',
          stake: totalBet,
          details: `Andar: ₹${andarBet} • Bahar: ₹${baharBet}`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Failed to place bet');
        setIsProcessing(false);
        return;
      }

      setIsDealing(true);
      setWinningSide(null);
      setAndarCards([]);
      setBaharCards([]);

      // Deal Joker card
      const joker = getRandomCard();
      setJokerCard(joker);
      sounds.playCardFlip();

      // Simulate dealing sequence alternately until match rank
      // Max 16 cards deal
      let currentSide: 'andar' | 'bahar' = 'andar';
      let cardsDealt = 0;
      const targetRank = joker.rank;

      const aCards: Card[] = [];
      const bCards: Card[] = [];

      const dealInterval = setInterval(async () => {
        cardsDealt++;
        sounds.playCardFlip();

        // 20% chance on each card to match rank, or force match by card 10
        const isMatch = Math.random() < 0.22 || cardsDealt >= 9;
        const newCard: Card = isMatch
          ? {
              rank: targetRank,
              suit: SUITS[Math.floor(Math.random() * SUITS.length)].symbol,
              label: RANK_LABELS[targetRank],
              isRed: Math.random() > 0.5,
            }
          : getRandomCard(joker);

        if (currentSide === 'andar') {
          aCards.unshift(newCard);
          setAndarCards([...aCards]);
        } else {
          bCards.unshift(newCard);
          setBaharCards([...bCards]);
        }

        if (isMatch) {
          clearInterval(dealInterval);
          const winner = currentSide;
          setWinningSide(winner);
          setHistory((prev) => [winner === 'andar' ? 'A' : 'B', ...prev.slice(0, 9)]);

          // Calculate payout
          let won = 0;
          if (winner === 'andar' && andarBet > 0) won = Math.floor(andarBet * 1.9);
          if (winner === 'bahar' && baharBet > 0) won = Math.floor(baharBet * 2.0);

          setWinAmount(won);

          if (won > 0) {
            sounds.playCashout();
          } else {
            sounds.playCrash();
          }

          // Settle backend
          await fetch('/api/game/settle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              betId: data.betId,
              status: won > 0 ? 'WON' : 'LOST',
              multiplier: won > 0 ? Number((won / totalBet).toFixed(2)) : 0,
              winAmount: won,
              details: `Joker ${joker.label} matched on ${winner.toUpperCase()} after ${cardsDealt} cards!`,
            }),
          });

          setIsDealing(false);
          setIsProcessing(false);
        } else {
          // Switch side
          currentSide = currentSide === 'andar' ? 'bahar' : 'andar';
        }
      }, 700);
    } catch {
      setErrorMessage('Network connection error.');
      setIsDealing(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#111624] to-yellow-950/40 border border-yellow-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-yellow-500/30">
            🎴
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-['Orbitron'] font-black text-white">
                ANDAR BAHAR GOLD
              </h1>
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full font-black uppercase">
                India's #1 Live Card Classic
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Match the center Joker card rank on Andar (1.9x) or Bahar (2.0x)!
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

      {/* Main Table Felt */}
      <div className="bg-[#0b101b] border border-yellow-500/30 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
        {/* Center Joker Pedestal */}
        <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-[#080d16] border border-slate-800 max-w-sm mx-auto shadow-xl">
          <div className="text-xs font-['Orbitron'] font-black text-yellow-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span>JOKER TRUMP CARD</span>
          </div>

          <div className="w-24 h-36 rounded-2xl bg-white border-2 border-yellow-500/80 shadow-2xl flex flex-col justify-between p-2.5">
            {jokerCard ? (
              <>
                <div className={`text-left font-bold text-base leading-none ${jokerCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                  <div>{jokerCard.label}</div>
                  <div className="text-xs">{jokerCard.suit}</div>
                </div>
                <div className={`text-4xl self-center font-bold ${jokerCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                  {jokerCard.suit}
                </div>
                <div className={`text-right font-bold text-base leading-none rotate-180 ${jokerCard.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                  <div>{jokerCard.label}</div>
                  <div className="text-xs">{jokerCard.suit}</div>
                </div>
              </>
            ) : (
              <div className="h-full rounded-xl bg-gradient-to-br from-amber-700 to-yellow-900 flex items-center justify-center text-white/60 font-['Orbitron'] font-black text-xs">
                JOKER
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-2">Target Rank: {jokerCard ? jokerCard.label : 'Waiting Deal'}</div>
        </div>

        {/* Win Notification */}
        {winningSide && !isDealing && (
          <div className="p-4 rounded-2xl bg-[#080d16] border border-yellow-500/60 text-center animate-milestone max-w-md mx-auto">
            <div className="text-xs uppercase font-bold text-yellow-400">
              MATCH FOUND ON {winningSide.toUpperCase()}!
            </div>
            {winAmount > 0 ? (
              <div className="text-2xl font-['Orbitron'] font-black text-emerald-400 mt-0.5">
                +₹{winAmount.toLocaleString('en-IN')} WON!
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-400 mt-0.5">Round Finished</div>
            )}
          </div>
        )}

        {/* Andar vs Bahar Deal Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* ANDAR (INSIDE) */}
          <div
            className={`p-5 rounded-3xl border transition-all duration-300 ${
              winningSide === 'andar'
                ? 'bg-amber-950/60 border-amber-500 shadow-xl shadow-amber-500/25 ring-2 ring-amber-400'
                : 'bg-[#0e1422] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-['Orbitron'] font-black text-amber-400 text-sm tracking-wider">
                ANDAR (अंदर) • 1.9x
              </span>
              <button
                type="button"
                disabled={isDealing}
                onClick={() => handleAddBet('andar')}
                className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer"
              >
                + Bet ₹{selectedChip}
              </button>
            </div>

            <div className="py-2 text-center">
              <span className="text-xs text-slate-400">Current Bet:</span>{' '}
              <strong className="font-mono text-white text-base">₹{andarBet}</strong>
            </div>

            {/* Dealt Cards Stream */}
            <div className="h-28 overflow-x-auto flex items-center gap-2 p-2 bg-[#070b13] rounded-2xl border border-slate-800/80">
              {andarCards.length === 0 ? (
                <div className="w-full text-center text-xs text-slate-500">Cards will land here</div>
              ) : (
                andarCards.map((c, idx) => (
                  <div
                    key={idx}
                    className={`w-14 h-20 rounded-xl bg-white border flex flex-col justify-between p-1 shrink-0 shadow-md ${
                      jokerCard && c.rank === jokerCard.rank ? 'ring-2 ring-yellow-400 scale-105' : ''
                    }`}
                  >
                    <div className={`text-left text-xs font-bold leading-none ${c.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {c.label}
                    </div>
                    <div className={`text-center text-base font-bold ${c.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {c.suit}
                    </div>
                    <div className={`text-right text-xs font-bold leading-none rotate-180 ${c.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {c.label}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* BAHAR (OUTSIDE) */}
          <div
            className={`p-5 rounded-3xl border transition-all duration-300 ${
              winningSide === 'bahar'
                ? 'bg-yellow-950/60 border-yellow-500 shadow-xl shadow-yellow-500/25 ring-2 ring-yellow-400'
                : 'bg-[#0e1422] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-['Orbitron'] font-black text-yellow-400 text-sm tracking-wider">
                BAHAR (बाहर) • 2.0x
              </span>
              <button
                type="button"
                disabled={isDealing}
                onClick={() => handleAddBet('bahar')}
                className="px-3 py-1 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-xs font-bold cursor-pointer"
              >
                + Bet ₹{selectedChip}
              </button>
            </div>

            <div className="py-2 text-center">
              <span className="text-xs text-slate-400">Current Bet:</span>{' '}
              <strong className="font-mono text-white text-base">₹{baharBet}</strong>
            </div>

            {/* Dealt Cards Stream */}
            <div className="h-28 overflow-x-auto flex items-center gap-2 p-2 bg-[#070b13] rounded-2xl border border-slate-800/80">
              {baharCards.length === 0 ? (
                <div className="w-full text-center text-xs text-slate-500">Cards will land here</div>
              ) : (
                baharCards.map((c, idx) => (
                  <div
                    key={idx}
                    className={`w-14 h-20 rounded-xl bg-white border flex flex-col justify-between p-1 shrink-0 shadow-md ${
                      jokerCard && c.rank === jokerCard.rank ? 'ring-2 ring-yellow-400 scale-105' : ''
                    }`}
                  >
                    <div className={`text-left text-xs font-bold leading-none ${c.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {c.label}
                    </div>
                    <div className={`text-center text-base font-bold ${c.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {c.suit}
                    </div>
                    <div className={`text-right text-xs font-bold leading-none rotate-180 ${c.isRed ? 'text-red-600' : 'text-slate-900'}`}>
                      {c.label}
                    </div>
                  </div>
                ))
              )}
            </div>
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
                    ? 'border-white scale-110 shadow-yellow-500/40 bg-gradient-to-br from-amber-400 to-yellow-600 text-black ring-2 ring-yellow-400'
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
              disabled={totalBet === 0 || isDealing}
              onClick={handleClearBets}
              className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={totalBet === 0 || isDealing || isProcessing}
              onClick={handleStartDeal}
              className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl font-['Orbitron'] font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                totalBet > 0 && !isDealing
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black shadow-lg shadow-yellow-500/25 active:scale-95 animate-shimmer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isDealing
                ? 'Dealing Cards...'
                : totalBet > 0
                ? `Deal Andar Bahar (₹${totalBet})`
                : 'Select Chips to Bet'}
            </button>
          </div>
        </div>

        {/* Streak History */}
        <div className="p-3 bg-[#080c14] rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
          <span className="font-['Orbitron'] font-bold text-[10px] text-slate-400 uppercase tracking-wider">
            Match History:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto">
            {history.map((side, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  side === 'A' ? 'bg-amber-500 text-black' : 'bg-yellow-400 text-black'
                }`}
              >
                {side}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
