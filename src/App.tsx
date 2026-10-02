import React, { useState, useEffect } from 'react';
import { ActiveTab, User, DepositOrder } from './types.js';
import { socket } from './lib/socket.js';
import { sounds } from './lib/sound.js';
import { Navbar } from './components/Navbar.js';
import { IntroScreen } from './components/IntroScreen.js';
import { SkyHighGame } from './components/SkyHighGame.js';
import { SkyHighBlackGame } from './components/SkyHighBlackGame.js';
import { SevenUpDownGame } from './components/SevenUpDownGame.js';
import { MinesGame } from './components/MinesGame.js';
import { DragonTigerGame } from './components/DragonTigerGame.js';
import { RouletteRoyalGame } from './components/RouletteRoyalGame.js';
import { MegaWheelGame } from './components/MegaWheelGame.js';
import { AndarBaharGame } from './components/AndarBaharGame.js';
import { LiveCasinoLobby } from './components/LiveCasinoLobby.js';
import { DepositModal } from './components/DepositModal.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { AuthModal } from './components/AuthModal.js';
import { GiftCardModal } from './components/GiftCardModal.js';
import { BetHistoryModal } from './components/BetHistoryModal.js';
import { CheckCircle, AlertCircle, Sparkles, Gift } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);
  const [isGiftCardOpen, setIsGiftCardOpen] = useState<boolean>(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'player' | 'admin'>('player');
  const [authMessage, setAuthMessage] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('4timebet_isAdmin') === 'true';
  });
  const [pendingDepositsCount, setPendingDepositsCount] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(
    null
  );

  // Check URL pathname or hash for direct /admin routing
  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      setActiveTab('admin');
    }
  }, []);

  // Fetch or initialize user (Users start logged out unless they have saved credentials)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const savedUserId = localStorage.getItem('4timebet_userId');
        if (!savedUserId) {
          setUser(null);
          return;
        }

        const res = await fetch(`/api/user?id=${savedUserId}`);
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          socket.emit('user:join', { userId: data.user.id });
        } else {
          localStorage.removeItem('4timebet_userId');
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        setUser(null);
      }
    };

    fetchUser();
    fetchPendingDepositsCount();
  }, []);

  const fetchPendingDepositsCount = async () => {
    try {
      const res = await fetch('/api/deposits?status=AWAITING_VERIFICATION');
      const data = await res.json();
      if (data.success && data.deposits) {
        setPendingDepositsCount(data.deposits.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleOpenAuth = (tab: 'player' | 'admin' = 'player', message?: string) => {
    setAuthTab(tab);
    setAuthMessage(message || '');
    setIsAuthOpen(true);
  };

  const handleOpenDeposit = () => {
    if (!user) {
      handleOpenAuth('player', 'Please login or register to deposit funds into your virtual wallet.');
      return;
    }
    setIsDepositOpen(true);
  };

  const handleOpenGiftCard = () => {
    if (!user) {
      handleOpenAuth('player', 'Please login or register to claim gift cards.');
      return;
    }
    setIsGiftCardOpen(true);
  };

  const handleOpenBetHistory = () => {
    if (!user) {
      handleOpenAuth('player', 'Please login or register to view your bet history.');
      return;
    }
    setIsBetHistoryOpen(true);
  };

  const handleLogoutPlayer = () => {
    sounds.playClick();
    setUser(null);
    localStorage.removeItem('4timebet_userId');
    showToast('Logged out of player account', 'info');
  };

  const handleAdminAuthenticated = () => {
    setIsAdmin(true);
    localStorage.setItem('4timebet_isAdmin', 'true');
    setActiveTab('admin');
    showToast('Staff authenticated: Terminal access granted', 'success');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('4timebet_isAdmin');
    setActiveTab('home');
    showToast('Logged out of Staff Terminal', 'info');
  };

  // Real-time socket events for wallet & deposit updates
  useEffect(() => {
    const handleWalletUpdate = (payload: {
      balance: number;
      reason?: string;
      amount?: number;
      winAmount?: number;
      multiplier?: number;
      utr?: string;
    }) => {
      setUser((prev) => (prev ? { ...prev, balance: payload.balance } : null));

      if (payload.reason === 'DEPOSIT_APPROVED') {
        sounds.playCashout();
        showToast(
          `🎉 Deposit of ₹${payload.amount?.toLocaleString('en-IN')} Approved! Credited to your wallet.`,
          'success'
        );
        fetchPendingDepositsCount();
      } else if (payload.reason === 'GIFTCARD_CLAIMED') {
        sounds.playCashout();
        showToast(
          `🎁 Gift Card Claimed! ₹${payload.amount?.toLocaleString('en-IN')} added to your wallet.`,
          'success'
        );
      } else if (payload.reason === 'WIN_CASHOUT' || payload.reason === 'AUTO_CASHOUT') {
        sounds.playCashout();
        showToast(
          `💰 Cashed out ₹${payload.winAmount?.toLocaleString('en-IN')}! Balance updated.`,
          'success'
        );
      } else if (payload.reason === 'SEVEN_UP_DOWN_WIN') {
        sounds.playDiceWin();
        showToast(
          `🎲 7 Up 7 Down Win: ₹${payload.winAmount?.toLocaleString('en-IN')} credited!`,
          'success'
        );
      } else if (payload.reason === 'CASINO_WIN') {
        sounds.playCashout();
        showToast(
          `🏆 Casino Win: ₹${payload.winAmount?.toLocaleString('en-IN')} (${payload.multiplier}x) credited!`,
          'success'
        );
      }
    };

    const handleDepositNew = () => {
      fetchPendingDepositsCount();
    };

    const handleDepositUpdated = () => {
      fetchPendingDepositsCount();
    };

    socket.on('wallet:update', handleWalletUpdate);
    socket.on('deposit:new', handleDepositNew);
    socket.on('deposit:updated', handleDepositUpdated);

    return () => {
      socket.off('wallet:update', handleWalletUpdate);
      socket.off('deposit:new', handleDepositNew);
      socket.off('deposit:updated', handleDepositUpdated);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-['Inter'] selection:bg-amber-500 selection:text-black">
      {/* Real-time Toast Notifications */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs sm:text-sm font-bold ${
              toast.type === 'success'
                ? 'bg-[#102219] text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-[#291114] text-red-300 border-red-500/50 shadow-red-950/50'
                : 'bg-[#171d2b] text-blue-300 border-blue-500/50 shadow-blue-950/50'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenDeposit={handleOpenDeposit}
        onOpenGiftCard={handleOpenGiftCard}
        onOpenBetHistory={handleOpenBetHistory}
        onOpenAuth={handleOpenAuth}
        onLogoutPlayer={handleLogoutPlayer}
        isAdmin={isAdmin}
        onAdminLogout={handleAdminLogout}
        pendingDepositsCount={pendingDepositsCount}
      />

      {/* Main Content Arena with Mobile Safe Bottom Padding */}
      <main className="flex-1 pb-24 md:pb-16">
        {activeTab === 'home' && (
          <IntroScreen
            setActiveTab={setActiveTab}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={(msg) => handleOpenAuth('player', msg || 'Please login or register to play.')}
            user={user}
          />
        )}

        {activeTab === 'sky-high' && (
          <SkyHighGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before placing bets in Sky High.')}
          />
        )}

        {activeTab === 'sky-high-black' && (
          <SkyHighBlackGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before deploying VIP bets.')}
          />
        )}

        {activeTab === 'mines' && (
          <MinesGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before playing Diamond Mines.')}
          />
        )}

        {activeTab === 'seven-up-down' && (
          <SevenUpDownGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before playing 7 Up 7 Down.')}
          />
        )}

        {activeTab === 'dragon-tiger' && (
          <DragonTigerGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before playing Dragon Tiger.')}
          />
        )}

        {activeTab === 'roulette' && (
          <RouletteRoyalGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before spinning Roulette Royal.')}
          />
        )}

        {activeTab === 'mega-wheel' && (
          <MegaWheelGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before spinning Mega Wheel.')}
          />
        )}

        {activeTab === 'andar-bahar' && (
          <AndarBaharGame
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register before playing Andar Bahar.')}
          />
        )}

        {activeTab === 'casino' && (
          <LiveCasinoLobby
            user={user}
            onOpenDeposit={handleOpenDeposit}
            onRequireAuth={() => handleOpenAuth('player', 'Please login or register to access VIP Casino.')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            currentUser={user}
            isAdmin={isAdmin}
            onAdminAuthenticated={handleAdminAuthenticated}
            onAdminLogout={handleAdminLogout}
            onBalanceAdjusted={() => {
              if (user?.id) {
                fetch(`/api/user?id=${user.id}`)
                  .then((r) => r.json())
                  .then((d) => d.success && setUser(d.user));
              }
            }}
          />
        )}
      </main>

      {/* User Registration & Staff Passkey Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onUserChanged={(updatedUser) => {
          setUser(updatedUser);
          socket.emit('user:join', { userId: updatedUser.id });
          showToast(`Logged in as ${updatedUser.name}`, 'success');
        }}
        onAdminAuthenticated={handleAdminAuthenticated}
        isAdmin={isAdmin}
        initialTab={authTab}
        authMessage={authMessage}
      />

      {/* UPI Manual Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        user={user}
        onDepositSubmitted={(deposit: DepositOrder) => {
          showToast(
            `Deposit request of ₹${deposit.amount} with UTR ${deposit.utr} submitted for verification!`,
            'info'
          );
          fetchPendingDepositsCount();
        }}
      />

      {/* Dedicated Gift Card / Voucher Redemption Modal */}
      <GiftCardModal
        isOpen={isGiftCardOpen}
        onClose={() => setIsGiftCardOpen(false)}
        user={user}
        onRequireAuth={(msg) => handleOpenAuth('player', msg || 'Please login or register to claim gift cards.')}
        onSuccessRedeem={(amount, newBalance) => {
          setUser((prev) => (prev ? { ...prev, balance: newBalance } : null));
          showToast(`Claimed ₹${amount} Gift Card! Balance is now ₹${newBalance}.`, 'success');
        }}
      />

      {/* Player Bet History Modal (Last 10 Transactions) */}
      <BetHistoryModal
        isOpen={isBetHistoryOpen}
        onClose={() => setIsBetHistoryOpen(false)}
        user={user}
        onRequireAuth={(msg) => handleOpenAuth('player', msg || 'Please login or register to view your bet history.')}
        onOpenDeposit={handleOpenDeposit}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#06080d] py-6 px-4 text-center text-xs text-slate-500 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-['Orbitron'] font-black text-slate-300">4X STAKES</span>
            <span>• Next-Gen iGaming & Virtual Casino Portal</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] flex-wrap justify-center">
            <button
              onClick={() => handleOpenGiftCard()}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Redeem Gift Card</span>
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenBetHistory()}
              className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Bet History</span>
            </button>
            <span>•</span>
            <span>100% Provably Fair</span>
            <span>•</span>
            <button
              onClick={() => {
                sounds.playClick();
                handleOpenAuth('admin');
              }}
              className="text-slate-500 hover:text-purple-400 transition-colors cursor-pointer"
            >
              Staff Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
