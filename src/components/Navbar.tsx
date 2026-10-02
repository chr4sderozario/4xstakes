import React, { useState } from 'react';
import { ActiveTab, User } from '../types.js';
import {
  Plane,
  Zap,
  Dices,
  ShieldAlert,
  Wallet,
  Volume2,
  VolumeX,
  PlusCircle,
  Home,
  UserPlus,
  Sparkles,
  Lock,
  LogOut,
  Gift,
  History,
  Gem,
  Flame,
  Radio,
  ChevronDown,
  Layers,
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
    <header className="sticky top-0 z-40 bg-[#090d15]/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* Top High Roller Ticker Ribbon */}
      <div className="bg-[#05080e] border-b border-slate-800/80 py-1 px-3 text-[10px] sm:text-xs overflow-hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase tracking-wider shrink-0">
              <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>LIVE CASINO WINS:</span>
            </span>

            <div className="flex items-center gap-6 animate-ticker shrink-0 text-slate-300">
              {LIVE_WINS_TICKER.map((win, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5">
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

          <div className="hidden md:flex items-center gap-3 shrink-0 text-slate-400 text-[11px]">
            <span className="text-emerald-400 font-bold">● UPI 24/7 Live</span>
            <span>•</span>
            <span className="text-yellow-400 font-bold">100% Provably Fair</span>
          </div>
        </div>
      </div>

      {/* Main Top Header Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('home');
            }}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-[#0a0d14] rounded-[10px] flex items-center justify-center font-['Orbitron'] font-black text-amber-400 text-sm sm:text-base">
                4X
              </div>
            </div>
            <div>
              <div className="font-['Orbitron'] font-black text-sm sm:text-lg tracking-wider text-white flex items-center gap-1">
                <span>4X STAKES</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded uppercase font-black">
                  VIP
                </span>
              </div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest leading-none hidden sm:block">
                iGaming & Casino Arena
              </div>
            </div>
          </button>
        </div>

        {/* Right Section: Sound, Wallet, Gift Card, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Virtual Wallet Box */}
          {user ? (
            <div className="flex items-center bg-[#101625] border border-slate-700 rounded-xl p-1 sm:p-1.5 shadow-inner">
              <div
                onClick={handleDepositClick}
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 cursor-pointer hover:opacity-90"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 font-bold leading-none">
                    Balance
                  </div>
                  <div className="font-['Orbitron'] font-black text-xs sm:text-sm text-emerald-400 leading-tight mt-0.5">
                    ₹{user.balance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDepositClick}
                className="ml-1 sm:ml-2 flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-black font-extrabold text-xs shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Deposit</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleDepositClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
          )}

          {/* Gift Card Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenGiftCard();
            }}
            title="Redeem Gift Card Voucher"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 hover:from-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-md shadow-amber-500/10 cursor-pointer transition-all active:scale-95"
          >
            <Gift className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Voucher</span>
            <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-black">
              ₹100
            </span>
          </button>

          {/* Bet History Button (Desktop) */}
          {user && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenBetHistory();
              }}
              title="View Last 10 Bets"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131a29] hover:bg-[#1a2336] border border-blue-500/40 text-blue-300 font-bold text-xs shadow-md cursor-pointer transition-all active:scale-95"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>History</span>
            </button>
          )}

          {/* Profile / Auth Button */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenBetHistory();
                }}
                title="Player Profile"
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-white cursor-pointer transition-all active:scale-95"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">
                  {user.avatar || '⚡'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-200 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[9px] text-emerald-400 font-bold leading-none">
                    Online
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onLogoutPlayer();
                }}
                title="Log Out"
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-950/40 hover:text-red-400 border border-slate-700/60 text-slate-400 transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-['Orbitron'] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Login / Register</span>
            </button>
          )}

          {/* Admin Terminal Lock Badge if Admin logged in */}
          {isAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                onAdminLogout();
              }}
              title="Logout from Staff Terminal"
              className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Secondary Fast Games Scroll Ribbon (Desktop & Mobile 1-Tap Access) */}
      <div className="bg-[#0b0f18] border-t border-slate-800/90 px-3 sm:px-6 py-2 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('home');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'home'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('sky-high');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'sky-high'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Plane className="w-3.5 h-3.5 text-blue-400" />
          <span>Sky High</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('sky-high-black');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'sky-high-black'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-red-400" />
          <span>VIP Black</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('mines');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'mines'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Gem className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mines</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('seven-up-down');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'seven-up-down'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Dices className="w-3.5 h-3.5 text-emerald-400" />
          <span>7 Up Down</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('dragon-tiger');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'dragon-tiger'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span>🐉</span>
          <span>Dragon Tiger</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('roulette');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'roulette'
              ? 'bg-yellow-600 text-black font-black shadow-md shadow-yellow-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span>🎡</span>
          <span>Roulette 500x</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('mega-wheel');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'mega-wheel'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span>🎪</span>
          <span>Mega Wheel</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('andar-bahar');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'andar-bahar'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span>🎴</span>
          <span>Andar Bahar</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('casino');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'casino'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span>Live Casino</span>
          <span className="text-[9px] bg-amber-400 text-black px-1.5 rounded font-black uppercase">
            Soon
          </span>
        </button>
      </div>

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR (Properly Structured for Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080c14]/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
        {/* Tab 1: Lobby */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('home');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl font-bold transition-colors cursor-pointer ${
            activeTab === 'home' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] leading-none">Lobby</span>
        </button>

        {/* Tab 2: Crash & Games */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('sky-high');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl font-bold transition-colors cursor-pointer ${
            activeTab === 'sky-high' || activeTab === 'sky-high-black' || activeTab === 'mines'
              ? 'text-blue-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plane className="w-5 h-5" />
          <span className="text-[10px] leading-none">Crash</span>
        </button>

        {/* Tab 3: Central Glowing Deposit Button */}
        <button
          onClick={handleDepositClick}
          className="flex flex-col items-center -mt-5 cursor-pointer group"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 p-0.5 shadow-xl shadow-emerald-500/40 group-active:scale-95 transition-transform flex items-center justify-center">
            <div className="w-full h-full bg-[#0a1612] rounded-[14px] flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>
          <span className="text-[9px] font-['Orbitron'] font-black uppercase tracking-wider text-emerald-400 mt-1">
            Deposit
          </span>
        </button>

        {/* Tab 4: Live Casino */}
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('casino');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl font-bold transition-colors cursor-pointer relative ${
            activeTab === 'casino' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] leading-none">Casino</span>
          <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        </button>

        {/* Tab 5: Bet History / User Profile */}
        {user ? (
          <button
            onClick={() => {
              sounds.playClick();
              onOpenBetHistory();
            }}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
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
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-[10px] leading-none">Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
