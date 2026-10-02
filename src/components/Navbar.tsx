import React, { useState } from 'react';
import { ActiveTab, User } from '../types.js';
import {
  Wallet,
  Volume2,
  VolumeX,
  Home,
  UserPlus,
  LogOut,
  Gift,
  History,
  Flame,
  Radio,
  Plus,
  Plane,
  Crown,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: User | null;
  onOpenDeposit: () => void;
  onOpenGiftCard: () => void;
  onOpenBetHistory: () => void;
  onOpenAuth: (tab?: 'player' | 'admin', message?: string) => void;
  onLogoutPlayer: () => void;
  isAdmin: boolean;
  onAdminLogout: () => void;
  pendingDepositsCount?: number;
}

const LIVE_WINS_TICKER = [
  { player: 'ShadowWhale_X', game: 'Roulette Royal', amount: '₹36,000', mult: '36x' },
  { player: 'Aarav_07', game: 'Diamond Mines', amount: '₹14,500', mult: '14.5x' },
  { player: 'Vikram_VIP', game: 'Sky High', amount: '₹18,400', mult: '9.20x' },
  { player: 'Priya_Queen', game: 'Dragon Tiger', amount: '₹35,000', mult: '50x Suited Tie' },
  { player: 'Rohan_Mumbai', game: '7 Up 7 Down', amount: '₹8,000', mult: '5X Lucky 7' },
  { player: 'LuckyStriker', game: 'Andar Bahar', amount: '₹12,000', mult: '2.0x' },
  { player: 'LordCommander', game: 'Mega Wheel', amount: '₹62,000', mult: '40x' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenDeposit,
  onOpenGiftCard,
  onOpenBetHistory,
  onOpenAuth,
  onLogoutPlayer,
  isAdmin,
  onAdminLogout,
  pendingDepositsCount = 0,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  const handleDepositClick = () => {
    sounds.playClick();
    if (!user) {
      onOpenAuth('player', 'Please login or register to deposit funds into your virtual wallet.');
      return;
    }
    onOpenDeposit();
  };

  return (
    <header className="sticky top-0 z-50 bg-[#070b12]/98 backdrop-blur-2xl border-b border-[#161f30] shadow-[0_4px_25px_rgba(0,0,0,0.7)] select-none">
      {/* Top Ambient Highlight Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 opacity-80"></div>

      {/* High-Roller Ticker (Desktop Only) */}
      <div className="hidden lg:block bg-[#04070d] border-b border-slate-800/60 py-1 px-4 text-xs overflow-hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase tracking-wider shrink-0 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>LIVE CASINO FEED:</span>
            </span>

            <div className="flex items-center gap-6 animate-ticker shrink-0 text-slate-300">
              {LIVE_WINS_TICKER.map((win, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="text-white font-bold">{win.player}</span>
                  <span className="text-slate-400">won</span>
                  <span className="text-emerald-400 font-mono font-black">{win.amount}</span>
                  <span className="text-slate-400">on {win.game}</span>
                  <span className="text-amber-400 font-bold">({win.mult})</span>
                  <span className="text-slate-600">•</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              24/7 Fast UPI
            </span>
            <span>•</span>
            <span className="text-amber-400 font-bold">100% Provably Fair</span>
          </div>
        </div>
      </div>

      {/* Main Top Header Bar (High-Roller Gambling Portal Style) */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* BRAND LOGO: 4X STAKES */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('home');
            }}
            className="flex items-center gap-1.5 sm:gap-2.5 text-left cursor-pointer group"
          >
            {/* Hexagonal / Rounded Badge */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-[1.5px] shadow-[0_0_15px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center font-['Orbitron'] font-black text-amber-400 text-xs sm:text-sm tracking-tighter">
                4X
              </div>
            </div>

            <div>
              <div className="font-['Orbitron'] font-black text-xs sm:text-base tracking-wider text-white flex items-center gap-1.5 leading-none">
                <span>4X STAKES OFFICIAL</span>
                <span className="text-[8px] sm:text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1 py-0.2 rounded font-black uppercase tracking-tight hidden xs:inline-flex items-center gap-0.5">
                  ✓
                </span>
              </div>
              <div className="text-[8px] sm:text-[9px] text-amber-400/80 font-['Orbitron'] uppercase tracking-widest leading-none mt-0.5 hidden sm:block">
                VIP iGAMING ARENA
              </div>
            </div>
          </button>
        </div>

        {/* CENTER & RIGHT CONTROLS: WALLET + DEPOSIT + VOUCHER + PROFILE */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* CASINO WALLET PILL (Stake-Style High Roller Display) */}
          <div
            onClick={handleDepositClick}
            className="flex items-center bg-[#0d1424] hover:bg-[#121c32] border border-[#1e2a44] hover:border-emerald-500/50 rounded-xl p-0.5 sm:p-1 shadow-inner cursor-pointer transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1">
              {/* Rupee Chip Icon */}
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-[10px] sm:text-xs font-black">
                ₹
              </div>

              {/* Balance Amount */}
              <div className="font-['Orbitron'] font-black text-xs sm:text-sm text-white group-hover:text-emerald-300 leading-none">
                {user ? user.balance.toLocaleString('en-IN') : '0.00'}
              </div>
            </div>

            {/* In-Pill Deposit Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDepositClick();
              }}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black font-['Orbitron'] font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span className="hidden sm:inline">Deposit</span>
            </button>
          </div>

          {/* ₹100 FREE VOUCHER BADGE */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenGiftCard();
            }}
            title="Redeem ₹100 VIP Voucher"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer active:scale-95 transition-all shrink-0 shadow-sm"
          >
            <Gift className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-['Orbitron'] font-black text-amber-400 hidden xs:inline">
              ₹100
            </span>
          </button>

          {/* USER ACCOUNT / LOGIN BUTTON */}
          {user ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenBetHistory();
                }}
                title="Player Profile & Bets"
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-[#111828] hover:bg-[#162136] border border-slate-700/60 text-white cursor-pointer active:scale-95 transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xs">
                  {user.avatar || '⚡'}
                </div>
                <span className="text-xs font-bold text-slate-200 hidden md:inline max-w-[80px] truncate">
                  {user.name}
                </span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onLogoutPlayer();
                }}
                title="Log Out"
                className="p-1.5 rounded-xl bg-slate-800/60 hover:text-red-400 text-slate-400 transition-colors cursor-pointer hidden sm:block"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAuth('player', 'Welcome to 4X STAKES! Please login or create an account.');
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-['Orbitron'] font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.25)] active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Login</span>
            </button>
          )}

          {/* Sound Toggle (Desktop Only) */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
            className="hidden lg:flex p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Admin Terminal Lock Badge */}
          {isAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                onAdminLogout();
              }}
              title="Logout from Staff Terminal"
              className="p-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070a12]/95 backdrop-blur-xl border-t border-[#1a2338] px-3 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        {/* Tab 1: Lobby */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('home');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'home' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] leading-none">Lobby</span>
        </button>

        {/* Tab 2: Originals / Crash */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('sky-high');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'sky-high' || activeTab === 'sky-high-black' || activeTab === 'mines'
              ? 'text-blue-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plane className="w-5 h-5" />
          <span className="text-[10px] leading-none">Crash</span>
        </button>

        {/* Tab 3: Central Deposit Pill Button */}
        <button
          onClick={handleDepositClick}
          className="flex flex-col items-center cursor-pointer group px-1"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] group-active:scale-95 transition-transform flex items-center justify-center">
            <div className="w-full h-full bg-[#091511] rounded-[14px] flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
          </div>
          <span className="text-[9px] font-['Orbitron'] font-black uppercase text-emerald-400 mt-0.5">
            Deposit
          </span>
        </button>

        {/* Tab 4: Live Casino */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('casino');
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer relative ${
            activeTab === 'casino' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] leading-none">Casino</span>
          <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        </button>

        {/* Tab 5: Bets / Profile */}
        {user ? (
          <button
            onClick={() => {
              sounds.playClick();
              onOpenBetHistory();
            }}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <History className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] leading-none">Bets</span>
          </button>
        ) : (
          <button
            onClick={() => {
              sounds.playClick();
              onOpenAuth('player');
            }}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-[10px] leading-none">Login</span>
          </button>
        )}
      </nav>
    </header>
  );
};
