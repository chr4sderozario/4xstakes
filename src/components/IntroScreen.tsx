import React, { useState, useEffect } from 'react';
import { ActiveTab, User } from '../types.js';
import {
  Plane,
  Zap,
  Dices,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  Flame,
  Award,
  Clock,
  Gem,
  Radio,
  Gift,
  Coins,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface IntroScreenProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenDeposit: () => void;
  onRequireAuth: (msg?: string) => void;
  user: User | null;
}

interface GameCardItem {
  id: ActiveTab;
  title: string;
  category: 'crash' | 'table' | 'cards' | 'wheel' | 'casino';
  tag: string;
  tagColor: string;
  multiplier: string;
  rtp: string;
  livePlayers: number;
  description: string;
  iconEmoji: string;
  bgGradient: string;
  borderColor: string;
  comingSoon?: boolean;
}

const ALL_GAMES: GameCardItem[] = [
  {
    id: 'sky-high',
    title: 'Sky High Crash',
    category: 'crash',
    tag: 'HOT 🔥',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    multiplier: '10,000x',
    rtp: '99.0% RTP',
    livePlayers: 2840,
    description: 'Supersonic rocket multiplier ascent.',
    iconEmoji: '🚀',
    bgGradient: 'from-amber-950/60 via-[#131a29] to-[#0c1017]',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'sky-high-black',
    title: 'Sky High VIP Black',
    category: 'crash',
    tag: 'HIGH ROLLER ⚡',
    tagColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    multiplier: '50,000x',
    rtp: '99.2% RTP',
    livePlayers: 1420,
    description: 'Stealth bomber high-stakes sorties.',
    iconEmoji: '🛩️',
    bgGradient: 'from-red-950/60 via-[#181119] to-[#0c1017]',
    borderColor: 'border-red-500/40',
  },
  {
    id: 'mines',
    title: 'Diamond Mines',
    category: 'crash',
    tag: 'NEW 💎',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    multiplier: '100,000x',
    rtp: '99.0% RTP',
    livePlayers: 3190,
    description: '5x5 tile grid gems & instant cashout.',
    iconEmoji: '💎',
    bgGradient: 'from-cyan-950/60 via-[#0f1b29] to-[#0c1017]',
    borderColor: 'border-cyan-500/40',
  },
  {
    id: 'seven-up-down',
    title: '7 Up 7 Down',
    category: 'table',
    tag: 'DICE 🎲',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    multiplier: '5x Jackpot',
    rtp: '98.5% RTP',
    livePlayers: 1980,
    description: 'Fast 30-sec twin dice rolls.',
    iconEmoji: '🎲',
    bgGradient: 'from-emerald-950/60 via-[#0e1c18] to-[#0c1017]',
    borderColor: 'border-emerald-500/40',
  },
  {
    id: 'dragon-tiger',
    title: 'Dragon Tiger Live',
    category: 'cards',
    tag: 'LIVE 🐉',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    multiplier: '50x Suited',
    rtp: '98.8% RTP',
    livePlayers: 2240,
    description: 'High-speed Asian card clash.',
    iconEmoji: '🐉',
    bgGradient: 'from-rose-950/60 via-[#1a111a] to-[#0c1017]',
    borderColor: 'border-rose-500/40',
  },
  {
    id: 'roulette',
    title: 'Roulette Royal',
    category: 'table',
    tag: '500X ⚡',
    tagColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    multiplier: '500x Max',
    rtp: '98.2% RTP',
    livePlayers: 1750,
    description: 'European single-zero with Lightning.',
    iconEmoji: '🎡',
    bgGradient: 'from-yellow-950/60 via-[#1a170d] to-[#0c1017]',
    borderColor: 'border-yellow-500/40',
  },
  {
    id: 'mega-wheel',
    title: 'Mega Wheel',
    category: 'wheel',
    tag: 'CARNIVAL 🎪',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    multiplier: '250x Rush',
    rtp: '97.5% RTP',
    livePlayers: 1210,
    description: '54-segment giant multiplier wheel.',
    iconEmoji: '🎪',
    bgGradient: 'from-purple-950/60 via-[#181024] to-[#0c1017]',
    borderColor: 'border-purple-500/40',
  },
  {
    id: 'andar-bahar',
    title: 'Andar Bahar Live',
    category: 'cards',
    tag: 'GOLD 🎴',
    tagColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    multiplier: '2.0x Even',
    rtp: '98.0% RTP',
    livePlayers: 2650,
    description: "India's favorite matching card game.",
    iconEmoji: '🎴',
    bgGradient: 'from-orange-950/60 via-[#1c140d] to-[#0c1017]',
    borderColor: 'border-orange-500/40',
  },
  {
    id: 'casino',
    title: 'VIP Live Casino',
    category: 'casino',
    tag: 'SOON 👑',
    tagColor: 'bg-amber-400 text-black font-black',
    multiplier: '4K Stream',
    rtp: 'HD Live',
    livePlayers: 0,
    description: 'Blackjack, Baccarat Squeeze, & Live Roulette.',
    iconEmoji: '👑',
    bgGradient: 'from-amber-950/70 via-[#16120b] to-[#0c1017]',
    borderColor: 'border-amber-400/60',
    comingSoon: true,
  },
];

const RECENT_LIVE_BETS = [
  { user: 'Vikram_VIP', game: 'Sky High', bet: '₹2,000', mult: '8.45x', payout: '₹16,900' },
  { user: 'Aarav_07', game: 'Diamond Mines', bet: '₹500', mult: '12.80x', payout: '₹6,400' },
  { user: 'ShadowWhale_X', game: 'Roulette Royal', bet: '₹1,000', mult: '36.00x', payout: '₹36,000' },
  { user: 'Priya_Queen', game: 'Dragon Tiger', bet: '₹3,000', mult: '2.00x', payout: '₹6,000' },
  { user: 'Rohan_Mumbai', game: '7 Up 7 Down', bet: '₹1,500', mult: '5.00x', payout: '₹7,500' },
];

export const IntroScreen: React.FC<IntroScreenProps> = ({
  setActiveTab,
  onOpenDeposit,
  onRequireAuth,
  user,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jackpot, setJackpot] = useState<number>(4892450.8);

  useEffect(() => {
    const timer = setInterval(() => {
      setJackpot((prev) => prev + Math.random() * 1.8 + 0.4);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const handleDepositClick = () => {
    sounds.playClick();
    if (!user) {
      onRequireAuth('Please login or register to deposit funds into your virtual wallet.');
      return;
    }
    onOpenDeposit();
  };

  const filteredGames =
    selectedCategory === 'all'
      ? ALL_GAMES
      : ALL_GAMES.filter((g) => g.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-8">
      {/* Mobile-Optimized Progressive Jackpot Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-[#17120a] via-[#121624] to-[#1a0e14] border border-amber-500/40 p-3 sm:p-5 shadow-xl flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg sm:text-2xl shrink-0 shadow-sm animate-pulse">
            💰
          </div>
          <div>
            <div className="text-[9px] sm:text-xs font-['Orbitron'] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>JACKPOT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div className="text-base sm:text-3xl lg:text-4xl font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200 tracking-tight leading-none mt-0.5">
              ₹{jackpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('sky-high');
          }}
          className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-['Orbitron'] font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          Play Now
        </button>
      </div>

      {/* Hero Banner (Streamlined on Mobile) */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0d121c] border border-slate-800 shadow-xl min-h-[220px] sm:min-h-[340px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/casino_vip_lounge_1790874128834.jpg"
            alt="4X STAKES Luxury Portal"
            className="w-full h-full object-cover object-center filter brightness-[0.3] saturate-[1.3]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#090e18]/85 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-black/30"></div>
        </div>

        <div className="relative z-10 p-4 sm:p-8 space-y-2.5 sm:space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>8 LIVE GAMES • INSTANT UPI</span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-['Orbitron'] font-black tracking-tight text-white leading-tight">
            NEXT-GEN <span className="text-amber-400">iGAMING</span> CASINO
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed hidden sm:block">
            Sky High Crash, Diamond Mines, Dragon Tiger, Roulette Royal 500x, Mega Wheel, and Andar Bahar. Provably fair with sub-second payouts.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('sky-high');
              }}
              className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-['Orbitron'] font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Play Sky High</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDepositClick}
              className="px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl bg-[#141b29]/90 hover:bg-[#1c273b] border border-emerald-500/40 text-emerald-400 font-['Orbitron'] font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Quick Perks (Clean Row on Mobile & Desktop) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0f1422] border border-amber-500/20 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-3">
          <Gift className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-white leading-tight">₹100 Voucher</div>
            <div className="text-[9px] sm:text-[11px] text-slate-400 font-mono mt-0.5 hidden sm:block">Code: 6291923478QRSTB</div>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0f1422] border border-emerald-500/20 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-3">
          <QrCode className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-white leading-tight">UPI 24/7 Pay</div>
            <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 hidden sm:block">0% Fees Instant</div>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0f1422] border border-blue-500/20 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-white leading-tight">Provably Fair</div>
            <div className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 hidden sm:block">SHA-256 Verified</div>
          </div>
        </div>
      </div>

      {/* Curated Games Arena (Native 2-Column Mobile Grid) */}
      <div className="space-y-3 sm:space-y-4">
        {/* Category Filter Pills */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <h2 className="font-['Orbitron'] font-black text-sm sm:text-xl text-white flex items-center gap-1.5">
            <span>GAMES LOBBY</span>
            <span className="text-[10px] text-slate-400 font-normal">({ALL_GAMES.length})</span>
          </h2>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              { id: 'all', label: '🔥 All' },
              { id: 'crash', label: '🚀 Crash' },
              { id: 'table', label: '🎲 Tables' },
              { id: 'cards', label: '🎴 Cards' },
              { id: 'casino', label: '👑 Casino' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  sounds.playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-black font-black'
                    : 'bg-[#101625] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Mobile & 4-Column Desktop Game Posters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(game.id);
              }}
              className={`rounded-2xl border bg-gradient-to-b ${game.bgGradient} ${game.borderColor} hover:border-amber-400 p-3 sm:p-4 flex flex-col justify-between shadow-lg transition-all active:scale-98 hover:scale-[1.02] cursor-pointer group relative overflow-hidden`}
            >
              {/* Card Header Tag */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-wider border ${game.tagColor}`}
                >
                  {game.tag}
                </span>

                {!game.comingSoon && (
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{game.livePlayers.toLocaleString()}</span>
                  </span>
                )}
              </div>

              {/* Icon & Title */}
              <div className="space-y-1 my-1 sm:my-2">
                <div className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">
                  {game.iconEmoji}
                </div>
                <h3 className="font-['Orbitron'] font-black text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                  {game.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                  {game.description}
                </p>
              </div>

              {/* Footer Payout & Action */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px] sm:text-xs">
                <span className="font-mono font-bold text-amber-400">
                  {game.multiplier}
                </span>

                <button
                  type="button"
                  className={`px-2 py-1 rounded-lg font-['Orbitron'] font-black text-[9px] sm:text-[10px] uppercase transition-all ${
                    game.comingSoon
                      ? 'bg-amber-400 text-black'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black group-hover:from-amber-400'
                  }`}
                >
                  {game.comingSoon ? 'Preview' : 'Play'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Bets Feed (Compact List on Mobile) */}
      <div className="rounded-2xl bg-[#0b1019] border border-slate-800 p-3 sm:p-5 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <h3 className="font-['Orbitron'] font-black text-xs sm:text-sm text-white">
              LIVE CASINO BETS
            </h3>
          </div>
          <span className="text-[8px] sm:text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
            Live Stream
          </span>
        </div>

        <div className="space-y-1.5">
          {RECENT_LIVE_BETS.map((bet, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-[#070b12] border border-slate-800/60 text-xs font-mono"
            >
              <div className="flex items-center gap-2 font-sans font-bold text-white text-[11px]">
                <span>⚡</span>
                <span className="truncate max-w-[90px] sm:max-w-none">{bet.user}</span>
                <span className="text-slate-400 font-normal font-sans text-[10px]">on {bet.game}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold text-[10px] sm:text-xs">{bet.mult}</span>
                <span className="font-black text-emerald-400 text-[11px] sm:text-xs">
                  {bet.payout}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & License Regulatory Badges */}
      <div className="p-4 rounded-2xl bg-[#090d15] border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs shrink-0">
            18+
          </div>
          <div>
            <div className="font-bold text-white text-xs">Curacao eGaming License #8048/JAZ</div>
            <div className="text-[10px] text-slate-400">
              100% Provably Fair SHA-256 • Verified Encrypted Transactions
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 flex-wrap justify-center">
          <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">UPI</span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">Paytm</span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">PhonePe</span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">GPay</span>
        </div>
      </div>
    </div>
  );
};
