import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { User, DepositOrder } from '../types.js';
import {
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Gift,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onDepositSubmitted?: (deposit: DepositOrder) => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  user,
  onDepositSubmitted,
}) => {
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('500');
  const [orderId, setOrderId] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastSubmittedDeposit, setLastSubmittedDeposit] = useState<DepositOrder | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'history' | 'giftcard'>('new');
  const [depositHistory, setDepositHistory] = useState<DepositOrder[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [giftCode, setGiftCode] = useState<string>('');
  const [giftSubmitting, setGiftSubmitting] = useState<boolean>(false);
  const [giftSuccess, setGiftSuccess] = useState<string>('');
  const [giftError, setGiftError] = useState<string>('');

  const UPI_ID = 'chr4sderozario@fam';

  // Generate or regenerate unique order ID when modal opens or amount changes
  useEffect(() => {
    if (isOpen) {
      const newOrderId = `ORD${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
      setOrderId(newOrderId);
      setErrorMessage('');
      setLastSubmittedDeposit(null);
      setUtrNumber('');
      fetchUserDeposits();
    }
  }, [isOpen, user?.id]);

  // Construct UPI URI and generate QR Code
  useEffect(() => {
    if (!orderId || !amount || amount <= 0) return;

    // Requirement string:
    // upi://pay?pa=chr4sderozario@fam&pn=GameWallet&am={AMOUNT}&tr={ORDER_ID}&cu=INR
    const upiUri = `upi://pay?pa=${UPI_ID}&pn=GameWallet&am=${amount}&tr=${orderId}&cu=INR`;

    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
      });
  }, [amount, orderId]);

  const fetchUserDeposits = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/deposits?userId=${user.id}`);
      const data = await res.json();
      if (data.success && data.deposits) {
        setDepositHistory(data.deposits);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const handleSelectAmount = (val: number) => {
    sounds.playClick();
    setAmount(val);
    setCustomAmount(String(val));
    setErrorMessage('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    const num = Number(val);
    if (num > 0) {
      setAmount(num);
      setErrorMessage('');
    }
  };

  const copyToClipboard = (text: string, type: 'upi' | 'order') => {
    sounds.playClick();
    navigator.clipboard.writeText(text);
    if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUtr = utrNumber.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrorMessage('Please enter a valid 12-digit numeric UPI UTR / Reference Number.');
      return;
    }

    if (!user?.id) {
      setErrorMessage('User session missing.');
      return;
    }

    if (amount < 100) {
      setErrorMessage('Minimum deposit amount is ₹100.');
      return;
    }

    setIsSubmitting(true);
    sounds.playClick();

    try {
      const response = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount,
          utr: cleanUtr,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to submit deposit request. Please try again.');
        return;
      }

      // Success: Save pending deposit state
      setLastSubmittedDeposit(data.deposit);
      if (onDepositSubmitted && data.deposit) {
        onDepositSubmitted(data.deposit);
      }
      fetchUserDeposits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setGiftError('');
    setGiftSuccess('');

    if (!user?.id) {
      setGiftError('Please login to claim gift cards.');
      return;
    }

    const cleanCode = giftCode.trim().toUpperCase();
    if (!cleanCode) {
      setGiftError('Please enter a valid gift card code.');
      return;
    }

    setGiftSubmitting(true);
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
        setGiftSuccess(`Voucher Verified! +₹${data.amount} has been credited to your virtual wallet.`);
        setGiftCode('');
      } else {
        sounds.playCrash();
        setGiftError(data.error || 'Failed to claim gift card.');
      }
    } catch {
      setGiftError('Network connection error.');
    } finally {
      setGiftSubmitting(false);
    }
  };

  const upiUri = `upi://pay?pa=${UPI_ID}&pn=GameWallet&am=${amount}&tr=${orderId}&cu=INR`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#111723] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0d121c]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Orbitron'] font-bold text-lg text-white">
                Deposit Virtual Wallet
              </h2>
              <p className="text-xs text-slate-400">
                Manual UPI Verification • Direct Instant Processing
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs: New Deposit / History */}
        <div className="flex border-b border-slate-800/80 bg-[#0e141f] px-5 pt-2">
          <button
            onClick={() => setActiveSubTab('new')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'new'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Deposit via UPI</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('history');
              fetchUserDeposits();
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>My Requests</span>
            {depositHistory.length > 0 && (
              <span className="text-[10px] bg-slate-800 px-1.5 rounded-full text-slate-300">
                {depositHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setActiveSubTab('giftcard');
              setGiftError('');
              setGiftSuccess('');
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'giftcard'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>Redeem Gift Card</span>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">
              ₹100
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-5">
          {activeSubTab === 'giftcard' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#161c28] to-[#121824] border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-400" />
                    <span className="font-['Orbitron'] font-bold text-white text-sm">
                      Claim Virtual Cash Voucher
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/40">
                    Instant Credit
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5">
                  Redeem exclusive gift cards to get instant credit in your virtual wallet.
                </p>

                <div className="mt-3 p-3 bg-black/40 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <div className="text-xs">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Welcome Voucher (₹100)</div>
                    <code className="text-amber-400 font-mono font-bold text-sm">6291923478QRSTB</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setGiftCode('6291923478QRSTB');
                      setGiftError('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>

              {giftSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-milestone">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{giftSuccess}</span>
                </div>
              )}

              {giftError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 animate-screen-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{giftError}</span>
                </div>
              )}

              <form onSubmit={handleClaimGiftCard} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Gift Card / Voucher Code
                  </label>
                  <input
                    type="text"
                    value={giftCode}
                    onChange={(e) => {
                      setGiftCode(e.target.value.toUpperCase());
                      setGiftError('');
                    }}
                    placeholder="Enter code (e.g. 6291923478QRSTB)"
                    className="w-full bg-[#141b27] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-white font-mono text-sm tracking-widest uppercase focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Each code can be redeemed once per player account.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={giftSubmitting || !giftCode.trim()}
                  className={`w-full py-3 rounded-xl font-['Orbitron'] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    giftCode.trim() && !giftSubmitting
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/25 active:scale-95 animate-shimmer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  <span>{giftSubmitting ? 'Verifying...' : 'Claim ₹100 Voucher'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : activeSubTab === 'history' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent Deposit Submissions</span>
                <button
                  onClick={fetchUserDeposits}
                  className="flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {depositHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No deposit requests found yet. Make your first deposit!
                </div>
              ) : (
                <div className="space-y-2">
                  {depositHistory.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-[#141b27] border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-['Orbitron'] font-bold text-white text-sm">
                            ₹{d.amount.toLocaleString('en-IN')}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              d.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : d.status === 'REJECTED'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            }`}
                          >
                            {d.status === 'AWAITING_VERIFICATION' ? 'Awaiting Verification' : d.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-mono">
                          UTR: {d.utr} • Ref: {d.id}
                        </div>
                        {d.rejectReason && (
                          <div className="text-[11px] text-red-400 mt-0.5">
                            Reason: {d.rejectReason}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        {new Date(d.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : lastSubmittedDeposit ? (
            /* SUBMITTED SUCCESS / PENDING STATE */
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
                  Awaiting Admin Verification
                </span>
                <h3 className="text-xl font-['Orbitron'] font-bold text-white">
                  Deposit Request Submitted!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                  Your payment reference has been securely queued. Once our admin verifies the UPI
                  credit, your wallet will update automatically in real-time.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0d121c] border border-slate-800 text-left space-y-2 max-w-sm mx-auto font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="text-white font-bold">{lastSubmittedDeposit.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{lastSubmittedDeposit.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted UTR:</span>
                  <span className="text-amber-300 font-bold">{lastSubmittedDeposit.utr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time:</span>
                  <span className="text-slate-300">
                    {new Date(lastSubmittedDeposit.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setLastSubmittedDeposit(null);
                    setUtrNumber('');
                    setOrderId(
                      `ORD${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`
                    );
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Make Another Deposit
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    onClose();
                  }}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Done / Return to Games
                </button>
              </div>
            </div>
          ) : (
            /* NEW DEPOSIT FLOW */
            <>
              {/* Step 1: Select Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  1. Select or Enter Amount (₹)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {PRESET_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectAmount(val)}
                      className={`py-2 px-1 rounded-xl text-xs font-['Orbitron'] font-bold border transition-all ${
                        amount === val
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                          : 'bg-[#151c28] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Enter custom amount (min ₹100)"
                    className="w-full bg-[#141b27] border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-white font-['Orbitron'] text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Step 2: Scan QR & Pay */}
              <div className="p-4 rounded-xl bg-[#0c1017] border border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>2. Scan UPI QR Code to Pay</span>
                  </div>
                  <div className="text-xs font-['Orbitron'] font-black text-emerald-400">
                    ₹{amount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Dynamic QR Code with Laser Scan Sweep Animation */}
                  <div className="relative p-2 bg-white rounded-xl shadow-xl border border-slate-300 flex-shrink-0 overflow-hidden">
                    {/* Glowing Green Laser Scanner Beam */}
                    <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500 shadow-[0_0_10px_#10b981] animate-qr-laser pointer-events-none z-10"></div>
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="UPI Deposit QR Code"
                        className="w-40 h-40 object-contain block"
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                        Generating QR...
                      </div>
                    )}
                  </div>

                  {/* Payment Details & Links */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    {/* UPI ID */}
                    <div className="p-2 rounded-lg bg-[#141a24] border border-slate-800 flex items-center justify-between">
                      <div className="truncate">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">UPI ID</div>
                        <div className="font-mono text-white font-bold select-all truncate">
                          {UPI_ID}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(UPI_ID, 'upi')}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/60"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Order Reference */}
                    <div className="p-2 rounded-lg bg-[#141a24] border border-slate-800 flex items-center justify-between">
                      <div className="truncate">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">
                          Order Ref ID
                        </div>
                        <div className="font-mono text-amber-400 font-bold select-all truncate">
                          {orderId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(orderId, 'order')}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/60"
                        title="Copy Order ID"
                      >
                        {copiedOrderId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Mobile UPI Intent Link */}
                    <a
                      href={upiUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in GPay / PhonePe / Paytm</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Step 3: Enter 12-digit UTR */}
              <form onSubmit={handleSubmitUtr} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="utr-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                    >
                      3. Enter 12-Digit UPI UTR / Ref Number
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {utrNumber.length}/12 Digits
                    </span>
                  </div>
                  <input
                    id="utr-input"
                    type="text"
                    maxLength={12}
                    value={utrNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setUtrNumber(val);
                      setErrorMessage('');
                    }}
                    placeholder="e.g. 427819384912"
                    className="w-full bg-[#141b27] border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-white font-mono text-base tracking-widest focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Found on your UPI transaction receipt under "UPI Transaction ID" or "Ref No.".
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || utrNumber.length !== 12}
                  className={`w-full py-3 rounded-xl font-['Orbitron'] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    utrNumber.length === 12 && !isSubmitting
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-[0.99] animate-shimmer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Payment (₹{amount})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
