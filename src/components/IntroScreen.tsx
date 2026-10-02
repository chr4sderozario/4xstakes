import React, { useState, useEffect } from 'react';
import { ActiveTab, User } from '../types.js';
import {
  Plane,
  Zap,
  Dices,
  ShieldCheck,
  QrCode,
  ArrowRight,
  TrendingUp,
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
  Lock,
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
    title: 'Sky High Rocket Crash',
    category: 'crash',
    tag: 'ORIGINAL • HOT 🔥',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    multiplier: '10,000x Max',
    rtp: '99.0% RTP',
    livePlayers: 2840,
    description: 'Watch the rocket climb and cash out before the supersonic explosion!',
    iconEmoji: '🚀',
    bgGradient: 'from-amber-950/60 via-[#131a29] to-[#0c1017]',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'sky-high-black',
    title: 'Sky High Black VIP',
    category: 'crash',
    tag: 'HIGH ROLLER ⚡',
    tagColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    multiplier: '50,000x Max',
    rtp: '99.2% RTP',
    livePlayers: 1420,
    description: 'Black Ops stealth bomber with ultra-high stakes and adrenaline surges.',
    iconEmoji: '🛩️',
    bgGradient: 'from-red-950/60 via-[#181119] to-[#0c1017]',
    borderColor: 'border-red-500/40',
  },
  {
    id: 'mines',
    title: 'Diamond Gold Mines',
    category: 'crash',
    tag: 'NEW LAUNCH 💎',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    multiplier: '100,000x Max',
    rtp: '99.0% RTP',
    livePlayers: 3190,
    description: 'Uncover sparkling diamonds on the 5x5 grid and dodge hidden landmines!',
    iconEmoji: '💎',
    bgGradient: 'from-cyan-950/60 via-[#0f1b29] to-[#0c1017]',
    borderColor: 'border-cyan-500/40',
  },
  {
    id: 'seven-up-down',
    title: '7 Up 7 Down Live',
    category: 'table',
    tag: 'POPULAR 🎲',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    multiplier: '5x Lucky 7',
    rtp: '98.5% RTP',
    livePlayers: 1980,
    description: 'Fast 30-second twin dice rolls with 5x jackpot payout on Lucky 7.',
    iconEmoji: '🎲',
    bgGradient: 'from-emerald-950/60 via-[#0e1c18] to-[#0c1017]',
    borderColor: 'border-emerald-500/40',
  },
  {
    id: 'dragon-tiger',
    title: 'Dragon Tiger Live',
    category: 'cards',
    tag: 'ASIAN CLASSIC 🐉',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    multiplier: '50x Suited Tie',
    rtp: '98.8% RTP',
    livePlayers: 2240,
    description: 'High-speed live card clash. 1 card Dragon vs 1 card Tiger. Highest wins!',
    iconEmoji: '🐉',
    bgGradient: 'from-rose-950/60 via-[#1a111a] to-[#0c1017]',
    borderColor: 'border-rose-500/40',
  },
  {
    id: 'roulette',
    title: 'Roulette Royal Lightning',
    category: 'table',
    tag: '500X LIGHTNING ⚡',
    tagColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    multiplier: '500x Max',
    rtp: '98.2% RTP',
    livePlayers: 1750,
    description: 'Single-zero European wheel featuring random 50x-500x Lightning strikes.',
    iconEmoji: '🎡',
    bgGradient: 'from-yellow-950/60 via-[#1a170d] to-[#0c1017]',
    borderColor: 'border-yellow-500/40',
  },
  {
    id: 'mega-wheel',
    title: 'Mega Wheel Carnival',
    category: 'wheel',
    tag: 'GAME SHOW 🎡',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    multiplier: '250x Mega Rush',
    rtp: '97.5% RTP',
    livePlayers: 1210,
    description: 'Giant 54-segment multiplier wheel with random Supercharged Multiplier Rushes.',
    iconEmoji: '🎪',
    bgGradient: 'from-purple-950/60 via-[#181024] to-[#0c1017]',
    borderColor: 'border-purple-500/40',
  },
  {
    id: 'andar-bahar',
    title: 'Andar Bahar Live Gold',
    category: 'cards',
    tag: 'DESI FAVORITE 🎴',
    tagColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    multiplier: '2.0x Even',
    rtp: '98.0% RTP',
    livePlayers: 2650,
    description: 'Match the center Joker card on Andar or Bahar in pure live suspense.',
    iconEmoji: '🎴',
    bgGradient: 'from-orange-950/60 via-[#1c140d] to-[#0c1017]',
    borderColor: 'border-orange-500/40',
  },
  {
    id: 'casino',
    title: 'Live Casino VIP Suite',
    category: 'casino',
    tag: 'COMING SOON 👑',
    tagColor: 'bg-amber-400 text-black font-black',
    multiplier: 'Live Streams',
    rtp: '4K 60FPS',
    livePlayers: 0,
    description: 'Real dealer Blackjack, Baccarat Squeeze, & Roulette straight from Macau & Riga.',
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
  { user: 'LuckyStriker', game: 'Andar Bahar', bet: '₹1,000', mult: '2.00x', payout: '₹2,000' },
  { user: 'LordCommander', game: 'Sky High VIP', bet: '₹5,000', mult: '14.20x', payout: '₹71,000' },
];

export const IntroScreen: React.FC<IntroScreenProps> = ({
  setActiveTab,
  onOpenDeposit,
  onRequireAuth,
  user,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jackpot, setJackpot] = useState<number>(4892450.8);

  // Progressive jackpot animation
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-8 sm:space-y-12">
      {/* Mega Progressive Jackpot Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#17120a] via-[#121624] to-[#1a0e14] border-2 border-amber-500/50 p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 sm:gap-4 z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl sm:text-3xl shrink-0 shadow-lg shadow-amber-500/20 animate-pulse">
            💰
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-['Orbitron'] font-black uppercase tracking-widest text-amber-400">
                MEGA PROGRESSIVE CASINO JACKPOT
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div className="text-2xl sm:text-4xl lg:text-5xl font-['Orbitron'] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-tight">
              ₹{jackpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto z-10">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('sky-high');
            }}
            className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-['Orbitron'] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            Play to Win
          </button>
          <button
            onClick={handleDepositClick}
            className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 font-['Orbitron'] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
          >
            + Deposit UPI
          </button>
        </div>
      </div>

      {/* Hero Cinematic Section */}
      <div className="relative rounded-3xl overflow-hidden bg-[#0d121c] border border-slate-800 shadow-2xl min-h-[380px] sm:min-h-[440px] flex items-center">
        {/* Background Image Artwork */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/casino_vip_lounge_1790874128834.jpg"
            alt="4TimeBet Luxury Portal"
            className="w-full h-full object-cover object-center filter brightness-[0.35] saturate-[1.3]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#090e18]/90 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-black/40"></div>
        </div>

        <div className="relative z-10 max-w-2xl p-5 sm:p-12 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>8 LIVE GAMES • INSTANT UPI WITHDRAWALS</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-['Orbitron'] font-black tracking-tight text-white leading-tight">
            NEXT-GEN <span className="text-amber-400">iGAMING</span> CASINO ARENA
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Experience lightning-fast provably fair games: Sky High Crash, Diamond Mines, Dragon Tiger,
            Roulette Royal 500x, Mega Wheel, and Andar Bahar. Built for mobile, powered by direct UPI verification!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('sky-high');
              }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-black font-['Orbitron'] font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Explore All Games</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('casino');
              }}
              className="px-6 py-3.5 rounded-2xl bg-[#141b29]/90 hover:bg-[#1c273b] border border-amber-500/50 text-amber-300 font-['Orbitron'] font-bold text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Live Casino (Coming Soon)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Promotional High-Roller Banners Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Banner 1: Welcome Voucher */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#121929] to-[#0c111c] border border-amber-500/30 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-['Orbitron'] font-black text-amber-400 uppercase tracking-wider">
              FREE GIFT CARD
            </span>
            <div className="text-lg font-black text-white mt-0.5">₹100 Instant Bonus</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">Code: 6291923478QRSTB</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
        </div>

        {/* Banner 2: VIP Instant UPI */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#121929] to-[#0c111c] border border-emerald-500/30 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-['Orbitron'] font-black text-emerald-400 uppercase tracking-wider">
              INSTANT SETTLEMENT
            </span>
            <div className="text-lg font-black text-white mt-0.5">Direct UPI Pay</div>
            <div className="text-[11px] text-slate-400 mt-0.5">0% Fees • 24/7 Verified</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        {/* Banner 3: Fair Play */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#121929] to-[#0c111c] border border-blue-500/30 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-['Orbitron'] font-black text-blue-400 uppercase tracking-wider">
              PROVABLY FAIR
            </span>
            <div className="text-lg font-black text-white mt-0.5">SHA-256 Verifiable</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Certified Random Seed</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Curated Games Section */}
      <div className="space-y-6">
        {/* Category Filter Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="font-['Orbitron'] font-black text-lg sm:text-2xl text-white flex items-center gap-2">
              <span>CASINO GAME ARENA</span>
              <span className="text-xs font-normal text-slate-400">({ALL_GAMES.length} Titles)</span>
            </h2>
            <p className="text-xs text-slate-400">Choose your game and place your wager with instant payouts.</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: '🔥 All Games' },
              { id: 'crash', label: '🚀 Crash & Mines' },
              { id: 'table', label: '🎲 Table & Dice' },
              { id: 'cards', label: '🎴 Asian Cards' },
              { id: 'wheel', label: '🎡 Mega Wheel' },
              { id: 'casino', label: '👑 Live Casino' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  sounds.playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                    : 'bg-[#101625] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Games Grid (Mobile Optimized Responsive Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => {
                sounds.playClick();
                setActiveTab(game.id);
              }}
              className={`rounded-3xl border bg-gradient-to-b ${game.bgGradient} ${game.borderColor} hover:border-amber-400 p-5 flex flex-col justify-between shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group relative overflow-hidden`}
            >
              {/* Top Tags */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${game.tagColor}`}
                >
                  {game.tag}
                </span>

                {!game.comingSoon && (
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{game.livePlayers.toLocaleString()} Live</span>
                  </span>
                )}
              </div>

              {/* Game Visual Icon & Title */}
              <div className="space-y-2 mb-4">
                <div className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300 inline-block">
                  {game.iconEmoji}
                </div>
                <h3 className="font-['Orbitron'] font-black text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors">
                  {game.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {game.description}
                </p>
              </div>

              {/* Stats Footer & CTA */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Max Multiplier:</span>
                  <strong className="font-['Orbitron'] font-black text-amber-400">
                    {game.multiplier}
                  </strong>
                </div>

                <button
                  type="button"
                  className={`w-full py-3 rounded-2xl font-['Orbitron'] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md ${
                    game.comingSoon
                      ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/20'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 group-hover:from-amber-400 group-hover:to-yellow-400 text-black shadow-amber-500/25'
                  }`}
                >
                  <span>{game.comingSoon ? 'Preview Studio (VIP)' : 'Play Now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Live Bets Casino Feed */}
      <div className="rounded-3xl bg-[#0b1019] border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <h3 className="font-['Orbitron'] font-black text-sm sm:text-base text-white">
              LIVE HIGH ROLLER BETS
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
            Real-Time Stream
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-[#070b12] text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3">Game</th>
                <th className="py-2.5 px-3">Bet Amount</th>
                <th className="py-2.5 px-3">Multiplier</th>
                <th className="py-2.5 px-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {RECENT_LIVE_BETS.map((bet, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{bet.user}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">{bet.game}</td>
                  <td className="py-2.5 px-3 text-slate-300">{bet.bet}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">{bet.mult}</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                    {bet.payout}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust & License Regulatory Badges */}
      <div className="p-6 rounded-3xl bg-[#090d15] border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
            18+
          </div>
          <div>
            <div className="font-bold text-white">Responsible Gaming & Licensed Portal</div>
            <div className="text-[11px] text-slate-400">
              Curacao eGaming License #8048/JAZ • 100% Provably Fair SHA-256 Algorithms
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 flex-wrap justify-center">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">UPI Instant</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">Paytm</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">PhonePe</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">GPay</span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">SSL 256-Bit</span>
        </div>
      </div>
    </div>
  );
};
