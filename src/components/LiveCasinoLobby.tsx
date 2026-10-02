import React, { useState } from 'react';
import { User } from '../types.js';
import {
  Sparkles,
  Lock,
  Clock,
  ShieldCheck,
  Bell,
  CheckCircle,
  Crown,
  Eye,
  Radio,
  Flame,
  Award,
  Video,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface LiveCasinoLobbyProps {
  user: User | null;
  onOpenDeposit: () => void;
  onRequireAuth: (msg?: string) => void;
}

interface CasinoTable {
  id: string;
  title: string;
  provider: string;
  category: 'Blackjack' | 'Baccarat' | 'Roulette' | 'Game Shows' | 'Indian Live';
  dealer: string;
  minBet: number;
  maxBet: number;
  badge: string;
  bannerGradient: string;
  accentColor: string;
  emoji: string;
}

const CASINO_TABLES: CasinoTable[] = [
  {
    id: 'blackjack-prive',
    title: 'Blackjack Salon Privé VIP',
    provider: 'Evolution Gaming Studio 1',
    category: 'Blackjack',
    dealer: 'Natasha (VIP High Roller Host)',
    minBet: 1000,
    maxBet: 500000,
    badge: 'EXCLUSIVE SALON',
    bannerGradient: 'from-amber-950 via-[#16120b] to-[#0c0d14]',
    accentColor: '#f59e0b',
    emoji: '♠️',
  },
  {
    id: 'baccarat-squeeze',
    title: 'Baccarat VIP Macao Squeeze',
    provider: 'Pragmatic Play Live Studio',
    category: 'Baccarat',
    dealer: 'Mei-Ling (Master Dealer)',
    minBet: 500,
    maxBet: 250000,
    badge: '0% COMMISSION',
    bannerGradient: 'from-red-950 via-[#180d11] to-[#0c0d14]',
    accentColor: '#ef4444',
    emoji: '💎',
  },
  {
    id: 'lightning-storm',
    title: 'Lightning Storm 10,000x Live',
    provider: 'Evolution Gaming Mega Room',
    category: 'Game Shows',
    dealer: 'Alexander (Game Show Host)',
    minBet: 50,
    maxBet: 100000,
    badge: '10,000X TOP MULTIPLIER',
    bannerGradient: 'from-yellow-950 via-[#18150a] to-[#0c0d14]',
    accentColor: '#eab308',
    emoji: '⚡',
  },
  {
    id: 'teen-patti-live',
    title: 'Royal Teen Patti 20-20 Live',
    provider: 'Ezugi Live Gaming',
    category: 'Indian Live',
    dealer: 'Pooja (Hindi Live Host)',
    minBet: 100,
    maxBet: 50000,
    badge: 'DESI VIP TABLE',
    bannerGradient: 'from-orange-950 via-[#18110b] to-[#0c0d14]',
    accentColor: '#f97316',
    emoji: '🎴',
  },
  {
    id: 'crazy-time-vip',
    title: 'Crazy Time VIP Extravaganza',
    provider: 'Evolution Gaming World Stage',
    category: 'Game Shows',
    dealer: 'Chloe (Celebrity Host)',
    minBet: 50,
    maxBet: 200000,
    badge: '4 BONUS ROUNDS',
    bannerGradient: 'from-purple-950 via-[#150d18] to-[#0c0d14]',
    accentColor: '#a855f7',
    emoji: '🎡',
  },
  {
    id: 'hindi-roulette',
    title: 'Namaste Hindi Roulette 4K',
    provider: 'Authentic Gaming Studio',
    category: 'Roulette',
    dealer: 'Aarohi (Hindi Dealer)',
    minBet: 100,
    maxBet: 100000,
    badge: '4K 60FPS UHD STREAM',
    bannerGradient: 'from-emerald-950 via-[#0d1814] to-[#0c0d14]',
    accentColor: '#10b981',
    emoji: '👑',
  },
];

export const LiveCasinoLobby: React.FC<LiveCasinoLobbyProps> = ({
  user,
  onOpenDeposit,
  onRequireAuth,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [reservedTables, setReservedTables] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleReserveSeat = (tableId: string, title: string) => {
    sounds.playClick();
    if (!user) {
      onRequireAuth('Please login or register to reserve VIP early access.');
      return;
    }

    setReservedTables((prev) => new Set(prev).add(tableId));
    sounds.playCashout();
    setToastMessage(`VIP Early Access Confirmed for ${title}! 50 VIP Free Chips assigned on launch.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const filteredTables =
    selectedFilter === 'All'
      ? CASINO_TABLES
      : CASINO_TABLES.filter((t) => t.category === selectedFilter);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 animate-bounce">
          <div className="px-5 py-3.5 rounded-2xl bg-[#0f241a] text-emerald-300 border border-emerald-500/80 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold shadow-emerald-950/60">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Hero Mega Banner: COMING SOON */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#17120a] via-[#121624] to-[#1a0e14] border-2 border-amber-500/40 p-6 sm:p-10 overflow-hidden shadow-2xl">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>VIP LIVE CASINO • COMING SOON</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-['Orbitron'] font-black text-white tracking-wide leading-tight">
            REAL DEALER VIP SUITE <br />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              4K ULTRA BROADCASTS
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            We are integrating ultra-low latency direct live camera feeds from certified European & Asian studios.
            Experience authentic Macau & Vegas high-roller tables with private salons, Hindi speaking dealers, and unlimited betting limits!
          </p>

          {/* Countdown & Audit Status Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <div className="px-4 py-2 rounded-2xl bg-black/60 border border-amber-500/30 text-amber-300 font-mono font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Launch Phase: Final Regulatory Review</span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-black/60 border border-slate-800 text-slate-300 font-mono text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Curacao Live Gaming Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['All', 'Blackjack', 'Baccarat', 'Game Shows', 'Indian Live', 'Roulette'].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              sounds.playClick();
              setSelectedFilter(cat);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Orbitron'] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === cat
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#101625] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Live Table Studio Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTables.map((table) => {
          const isReserved = reservedTables.has(table.id);

          return (
            <div
              key={table.id}
              className={`rounded-3xl border bg-gradient-to-b ${table.bannerGradient} border-slate-800 hover:border-amber-500/50 transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between group`}
            >
              {/* Card Top Preview */}
              <div className="p-6 relative">
                {/* Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-black/70 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-3 h-3 text-red-500 animate-pulse" />
                    <span>Live Studio Feed</span>
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-wider">
                    {table.badge}
                  </span>
                </div>

                {/* Game Icon & Title */}
                <div className="text-3xl mb-2">{table.emoji}</div>
                <h3 className="font-['Orbitron'] font-bold text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors">
                  {table.title}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">{table.provider}</div>

                {/* Dealer Info & Limits */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Host / Dealer:</span>
                    <strong className="text-white">{table.dealer}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>VIP Limits:</span>
                    <strong className="font-mono text-emerald-400">
                      ₹{table.minBet.toLocaleString('en-IN')} - ₹{table.maxBet.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="p-4 bg-[#0a0e17] border-t border-slate-800/80 flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>VIP Launch Imminent</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleReserveSeat(table.id, table.title)}
                  className={`px-4 py-2 rounded-xl text-xs font-['Orbitron'] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isReserved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-md shadow-amber-500/20 active:scale-95'
                  }`}
                >
                  {isReserved ? 'Seat Reserved ✓' : 'Pre-Reserve Seat'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* VIP Salon Benefits Ribbon */}
      <div className="p-6 rounded-3xl bg-[#0e1422] border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-['Orbitron'] font-bold text-xs text-white uppercase">Personal VIP Host</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dedicated high-roller table supervisor and instant Telegram/WhatsApp manager.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-['Orbitron'] font-bold text-xs text-white uppercase">Zero Latency 60FPS</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Direct WebRTC video stream encoded in ultra-low latency sub-second delivery.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-['Orbitron'] font-bold text-xs text-white uppercase">Licensed Studios</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Audited by eCOGRA and Curacao Gaming Board for 100% fair physical card dealing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
