import React, { useState } from 'react';
import { User } from '../types.js';
import {
  Gift,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Coins,
  Copy,
  Check,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface GiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onRequireAuth: (msg?: string) => void;
  onSuccessRedeem: (amount: number, newBalance: number) => void;
}

export const GiftCardModal: React.FC<GiftCardModalProps> = ({
  isOpen,
  onClose,
  user,
  onRequireAuth,
  onSuccessRedeem,
}) => {
  const [code, setCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<{ amount: number; code: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo(null);

    if (!user) {
      onClose();
      onRequireAuth('Please login or register to claim gift cards.');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter your gift card code.');
      return;
    }

    setIsSubmitting(true);
    sounds.playClick();

    try {
      const res = await fetch('/api/giftcards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          code: cleanCode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        sounds.playCashout();
        setSuccessInfo({ amount: data.amount, code: data.code });
        onSuccessRedeem(data.amount, data.newBalance);
        setCode('');
      } else {
        sounds.playCrash();
        setErrorMessage(data.error || 'Failed to claim gift card.');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillWelcomeCode = () => {
    sounds.playClick();
    setCode('6291923478QRSTB');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#101624] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden animate-milestone">
        {/* Luxury Gold Ambient Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_15px_#f59e0b]"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0c101a]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/20">
              <Gift className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-['Orbitron'] font-black text-base text-white flex items-center gap-1.5">
                Redeem Gift Card
              </h2>
              <p className="text-[11px] text-slate-400">
                Claim instant virtual cash vouchers directly to your wallet
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Virtual Card Graphic */}
          <div className="relative rounded-2xl p-5 bg-gradient-to-br from-[#1a2133] via-[#121826] to-[#0d121c] border border-amber-500/30 shadow-xl overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <div className="text-[10px] font-['Orbitron'] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>4TimeBet VIP Voucher</span>
              </div>
              <div className="w-8 h-6 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <div className="w-4 h-3 border border-amber-400/50 rounded-sm"></div>
              </div>
            </div>

            <div className="my-4 font-mono text-xs sm:text-sm text-slate-300 tracking-wider">
              •••• •••• •••• ••••
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Cardholder: <strong className="text-white">{user?.name || 'Guest'}</strong></span>
              <span className="font-['Orbitron'] font-bold text-amber-400">Instant Credit</span>
            </div>
          </div>

          {/* Active Promo Notice & Auto-Fill */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Active ₹100 Welcome Gift Card</span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                Code: <code className="bg-black/60 px-1.5 py-0.5 rounded text-amber-400 font-bold">6291923478QRSTB</code>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFillWelcomeCode}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer"
            >
              Use Code
            </button>
          </div>

          {/* Success Notification */}
          {successInfo && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-3 animate-milestone">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-['Orbitron'] text-white">
                  +₹{successInfo.amount} Credited Successfully!
                </div>
                <div className="text-[11px] text-emerald-400/90 font-normal mt-0.5">
                  Code {successInfo.code} redeemed. Balance updated in your virtual wallet!
                </div>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 animate-screen-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Enter Gift Card Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setErrorMessage('');
                  }}
                  placeholder="e.g. 6291923478QRSTB"
                  className="w-full bg-[#151d2c] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-white font-mono text-sm tracking-widest uppercase focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Case-insensitive. Each code can only be redeemed once per player account.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className={`w-full py-3.5 rounded-xl font-['Orbitron'] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                code.trim() && !isSubmitting
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/25 active:scale-95 animate-shimmer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <span>{isSubmitting ? 'Verifying & Claiming...' : 'Claim Gift Card'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Fair Play & Usage Info */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant Wallet Credit</span>
            </span>
            <span>Single-use per account</span>
          </div>
        </div>
      </div>
    </div>
  );
};
