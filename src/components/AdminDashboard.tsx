import React, { useState, useEffect } from 'react';
import { DepositOrder, User, GiftCard } from '../types.js';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Users,
  Copy,
  Check,
  PlayCircle,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  LogOut,
  Gift,
  Plus,
  Trash2,
  Power,
  Eye,
  Sparkles,
  X,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';
import { socket } from '../lib/socket.js';

interface AdminDashboardProps {
  currentUser: User | null;
  onBalanceAdjusted?: () => void;
  isAdmin: boolean;
  onAdminAuthenticated: () => void;
  onAdminLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onBalanceAdjusted,
  isAdmin,
  onAdminAuthenticated,
  onAdminLogout,
}) => {
  const [passkeyInput, setPasskeyInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [deposits, setDeposits] = useState<DepositOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('AWAITING_VERIFICATION');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'deposits' | 'giftcards'>('deposits');
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [newCardCode, setNewCardCode] = useState<string>('');
  const [newCardAmount, setNewCardAmount] = useState<number>(100);
  const [newCardMaxClaims, setNewCardMaxClaims] = useState<string>('');
  const [newCardDesc, setNewCardDesc] = useState<string>('');
  const [isCreatingCard, setIsCreatingCard] = useState<boolean>(false);
  const [selectedCardForView, setSelectedCardForView] = useState<GiftCard | null>(null);

  useEffect(() => {
    fetchData();

    // Listen for real-time deposit events
    const handleNewDeposit = (dep: DepositOrder) => {
      setDeposits((prev) => {
        if (prev.some((d) => d.id === dep.id)) return prev;
        return [dep, ...prev];
      });
      showToast(`New deposit of ₹${dep.amount} submitted (UTR: ${dep.utr})`);
    };

    const handleUpdatedDeposit = (dep: DepositOrder) => {
      setDeposits((prev) => prev.map((d) => (d.id === dep.id ? dep : d)));
    };

    socket.on('deposit:new', handleNewDeposit);
    socket.on('deposit:updated', handleUpdatedDeposit);

    return () => {
      socket.off('deposit:new', handleNewDeposit);
      socket.off('deposit:updated', handleUpdatedDeposit);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [depRes, userRes, gcRes] = await Promise.all([
        fetch('/api/deposits'),
        fetch('/api/admin/users'),
        fetch('/api/giftcards'),
      ]);
      const depData = await depRes.json();
      const userData = await userRes.json();
      const gcData = await gcRes.json();

      if (depData.success) {
        setDeposits(depData.deposits);
      }
      if (userData.success) {
        setUsers(userData.users);
      }
      if (gcData.success) {
        setGiftCards(gcData.giftCards);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardCode.trim() || newCardAmount <= 0) return;
    try {
      const res = await fetch('/api/giftcards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCardCode.trim().toUpperCase(),
          amount: newCardAmount,
          maxClaims: newCardMaxClaims ? Number(newCardMaxClaims) : undefined,
          description: newCardDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Gift Card ${data.giftCard.code} created for ₹${data.giftCard.amount}!`);
        setNewCardCode('');
        setNewCardDesc('');
        setNewCardMaxClaims('');
        setIsCreatingCard(false);
        fetchData();
      } else {
        showToast(data.error || 'Failed to create gift card');
      }
    } catch {
      showToast('Network error');
    }
  };

  const handleToggleCard = async (id: string) => {
    try {
      const res = await fetch(`/api/giftcards/${id}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchData();
        showToast('Gift card status updated');
      }
    } catch {
      showToast('Failed to toggle status');
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      const res = await fetch(`/api/giftcards/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
        showToast('Gift card deleted');
      }
    } catch {
      showToast('Failed to delete gift card');
    }
  };

  const handleApprove = async (deposit: DepositOrder) => {
    sounds.playClick();
    setActionLoadingId(deposit.id);
    try {
      const res = await fetch(`/api/admin/deposits/${deposit.id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        sounds.playCashout();
        showToast(
          `Approved ₹${deposit.amount} for user ${deposit.userId}! Wallet credited atomically.`
        );
        fetchData();
        if (onBalanceAdjusted) onBalanceAdjusted();
      } else {
        alert(data.error || 'Failed to approve');
      }
    } catch (e) {
      console.error(e);
      alert('Error approving deposit');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (deposit: DepositOrder) => {
    const reason = window.prompt(
      'Enter rejection reason (e.g., "Invalid UTR", "Payment Not Received in Bank"):',
      'Invalid UTR or unmatched bank record'
    );
    if (reason === null) return;

    sounds.playClick();
    setActionLoadingId(deposit.id);
    try {
      const res = await fetch(`/api/admin/deposits/${deposit.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Rejected deposit ${deposit.id}`);
        fetchData();
      } else {
        alert(data.error || 'Failed to reject');
      }
    } catch (e) {
      console.error(e);
      alert('Error rejecting deposit');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Test Simulator: Quick generate a deposit to test approval flow
  const handleSimulateDeposit = async () => {
    setSimulating(true);
    sounds.playClick();
    try {
      const res = await fetch('/api/admin/test-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'user_demo_1',
          amount: [500, 1000, 2500][Math.floor(Math.random() * 3)],
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Generated Test Deposit for user ${data.deposit.userId}!`);
        setFilterStatus('AWAITING_VERIFICATION');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const handleAdjustBalance = async (userId: string, amount: number) => {
    sounds.playClick();
    try {
      await fetch(`/api/admin/user/${userId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      showToast(`Added ₹${amount} to ${userId}`);
      fetchData();
      if (onBalanceAdjusted) onBalanceAdjusted();
    } catch (e) {
      console.error(e);
    }
  };

  const copyUtr = (utr: string) => {
    sounds.playClick();
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Filtered deposits
  const filteredDeposits = deposits.filter((d) => {
    if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.utr.toLowerCase().includes(q) ||
        d.userId.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = deposits.filter((d) => d.status === 'AWAITING_VERIFICATION').length;
  const completedTotal = deposits
    .filter((d) => d.status === 'COMPLETED')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Security Barrier: Do not reveal admin dashboard if not verified
  if (!isAdmin) {
    const handlePasskeySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      const cleanKey = passkeyInput.trim();
      if (cleanKey === 'admin4time' || cleanKey === '4444' || cleanKey === 'admin') {
        sounds.playCashout();
        onAdminAuthenticated();
      } else {
        setAuthError('Access Denied: Invalid Security Passkey');
      }
    };

    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-[#101624] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-milestone">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-['Orbitron'] font-black text-xl text-white">
              Restricted Terminal Access
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Staff passkey verification required to access deposit approvals.
            </p>
          </div>
          <form onSubmit={handlePasskeySubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Enter Staff Passkey (e.g. 4444)"
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              className="w-full bg-[#161f30] border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-center text-sm tracking-widest focus:outline-none focus:border-purple-500"
            />
            {authError && (
              <div className="text-xs text-red-400 font-bold">{authError}</div>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-['Orbitron'] font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer transition-all active:scale-95"
            >
              Verify & Unlock Terminal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-black px-4 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/70 via-[#151928] to-[#121622] border border-purple-800/50 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Internal Management Terminal
          </div>
          <h1 className="text-2xl sm:text-3xl font-['Orbitron'] font-black text-white">
            Admin Approval Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review 12-digit UPI UTR receipts, approve transactions atomically, and broadcast live
            wallet updates via WebSocket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Test Simulator Button */}
          <button
            onClick={handleSimulateDeposit}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <PlayCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{simulating ? 'Generating...' : '+ Test Deposit Simulator'}</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onAdminLogout();
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs transition-colors cursor-pointer"
            title="Lock & Exit Admin Terminal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Terminal</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Requests */}
        <div className="p-4 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Pending Approvals
            </div>
            <div className="text-2xl font-['Orbitron'] font-black text-amber-400 mt-1">
              {pendingCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Awaiting manual UTR match</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Total Settled Volume */}
        <div className="p-4 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Settled Deposit Volume
            </div>
            <div className="text-2xl font-['Orbitron'] font-black text-emerald-400 mt-1">
              ₹{completedTotal.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Directly credited to users</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Registered Users */}
        <div className="p-4 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Active User Wallets
            </div>
            <div className="text-2xl font-['Orbitron'] font-black text-blue-400 mt-1">
              {users.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Connected player accounts</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Admin Module Switcher */}
      <div className="flex bg-[#0d121c] p-1.5 rounded-2xl border border-slate-800 gap-2">
        <button
          onClick={() => setAdminTab('deposits')}
          className={`flex-1 py-3 px-4 rounded-xl font-['Orbitron'] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminTab === 'deposits'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>UPI Deposits ({pendingCount} Pending)</span>
        </button>

        <button
          onClick={() => setAdminTab('giftcards')}
          className={`flex-1 py-3 px-4 rounded-xl font-['Orbitron'] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminTab === 'giftcards'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Gift Cards & Vouchers ({giftCards.length})</span>
        </button>
      </div>

      {adminTab === 'deposits' ? (
        <>
          {/* Main Table: Pending & Historical Deposits */}
          <div className="bg-[#101622] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-[#0d121b] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterStatus('AWAITING_VERIFICATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === 'AWAITING_VERIFICATION'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === 'COMPLETED'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilterStatus('REJECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === 'REJECTED'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === 'ALL'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              All Records
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by UTR, User ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161d2b] border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f17] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Order / User ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Submitted UTR (12-Digit)</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {filterStatus === 'AWAITING_VERIFICATION' ? (
                      <div className="space-y-2">
                        <p>No pending verification requests at this moment.</p>
                        <button
                          onClick={handleSimulateDeposit}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors"
                        >
                          Generate a Test Deposit Now
                        </button>
                      </div>
                    ) : (
                      'No matching deposit requests found.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User ID & Order ID */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-white text-xs">{dep.id}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="text-purple-400 font-medium">{dep.userId}</span>
                        <span>({dep.userName})</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5">
                      <div className="font-['Orbitron'] font-black text-emerald-400 text-sm">
                        ₹{dep.amount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* UTR */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-300 font-bold bg-[#141b26] px-2 py-1 rounded border border-slate-700 select-all">
                          {dep.utr}
                        </span>
                        <button
                          onClick={() => copyUtr(dep.utr)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                          title="Copy UTR"
                        >
                          {copiedUtr === dep.utr ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3.5 text-slate-400">
                      <div>{new Date(dep.createdAt).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(dep.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          dep.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : dep.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {dep.status === 'AWAITING_VERIFICATION' ? 'Pending Verification' : dep.status}
                      </span>
                      {dep.rejectReason && (
                        <div className="text-[10px] text-red-400 mt-1 max-w-xs truncate">
                          {dep.rejectReason}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      {dep.status === 'AWAITING_VERIFICATION' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(dep)}
                            disabled={actionLoadingId === dep.id}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-lg text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(dep)}
                            disabled={actionLoadingId === dep.id}
                            className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-700 text-red-300 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">
                          {dep.status === 'COMPLETED' ? 'Settled via WebSocket' : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Balance Management Panel */}
      <div className="bg-[#101622] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-['Orbitron'] font-bold text-base text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Connected User Accounts & Virtual Wallets
            </h2>
            <p className="text-xs text-slate-400">
              Real-time user balances. Use quick top-ups to test different betting brackets.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                u.id === currentUser?.id
                  ? 'bg-purple-950/30 border-purple-600/50'
                  : 'bg-[#151b27] border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-lg">
                  {u.avatar || '⚡'}
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{u.name}</span>
                    {u.id === currentUser?.id && (
                      <span className="text-[9px] bg-purple-500 text-black px-1.5 py-0.2 rounded font-black uppercase">
                        You
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">{u.id}</div>
                  <div className="font-['Orbitron'] font-black text-emerald-400 text-sm mt-0.5">
                    ₹{u.balance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleAdjustBalance(u.id, 500)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-400 border border-slate-700 transition-colors"
                >
                  +₹500
                </button>
                <button
                  onClick={() => handleAdjustBalance(u.id, 2000)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-400 border border-slate-700 transition-colors"
                >
                  +₹2,000
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      ) : (
        /* ==========================================
           GIFTCARDS & PROMO VOUCHERS MANAGEMENT TAB
           ========================================== */
        <div className="space-y-6 animate-milestone">
          {/* Header & Create Action */}
          <div className="p-6 rounded-2xl bg-[#101622] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gift Card Vouchers Engine</span>
              </div>
              <h2 className="text-xl font-['Orbitron'] font-black text-white">
                Gift Cards & Promotional Codes
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Create new gift cards, view redemptions, and toggle voucher access. Initial code: <code className="text-amber-400 font-bold font-mono">6291923478QRSTB</code> (₹100).
              </p>
            </div>

            <button
              onClick={() => setIsCreatingCard(!isCreatingCard)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-['Orbitron'] font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isCreatingCard ? 'Close Form' : 'Create New Gift Card'}</span>
            </button>
          </div>

          {/* Create Form Drawer */}
          {isCreatingCard && (
            <div className="p-6 rounded-2xl bg-[#141b29] border border-amber-500/40 shadow-2xl space-y-4 animate-milestone">
              <h3 className="font-['Orbitron'] font-bold text-sm text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>Generate New Gift Card Voucher</span>
              </h3>

              <form onSubmit={handleCreateGiftCard} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Gift Card Code
                  </label>
                  <input
                    type="text"
                    value={newCardCode}
                    onChange={(e) => setNewCardCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FESTIVAL500, SUPERVIP"
                    className="w-full bg-[#0d121c] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs uppercase focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Rupee Value (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCardAmount}
                    onChange={(e) => setNewCardAmount(Number(e.target.value))}
                    placeholder="100"
                    className="w-full bg-[#0d121c] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Max Redemptions (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCardMaxClaims}
                    onChange={(e) => setNewCardMaxClaims(e.target.value)}
                    placeholder="Unlimited if empty"
                    className="w-full bg-[#0d121c] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Campaign Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCardDesc}
                    onChange={(e) => setNewCardDesc(e.target.value)}
                    placeholder="e.g. VIP Member Bonus"
                    className="w-full bg-[#0d121c] border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-['Orbitron'] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Save & Activate Gift Card
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Gift Cards Table */}
          <div className="bg-[#101622] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-[#0d121b] flex items-center justify-between">
              <span className="font-['Orbitron'] font-bold text-xs text-white uppercase tracking-wider">
                Configured Gift Cards ({giftCards.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0e14] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Gift Card Code</th>
                    <th className="p-4">Value</th>
                    <th className="p-4">Redemptions</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {giftCards.map((card) => (
                    <tr key={card.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-bold text-amber-400 bg-black/60 px-2 py-1 rounded border border-amber-500/30">
                            {card.code}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(card.code);
                              showToast(`Copied ${card.code}`);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded"
                            title="Copy Code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {card.description && (
                          <div className="text-[11px] text-slate-400 mt-1">
                            {card.description}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="font-['Orbitron'] font-black text-emerald-400 text-sm">
                          ₹{card.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-mono text-xs">
                          <span className="text-white font-bold">{card.claimedBy.length}</span>
                          {card.maxClaims && (
                            <span className="text-slate-500"> / {card.maxClaims} max</span>
                          )}
                          <span className="text-slate-400 ml-1">claimed</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            card.isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}
                        >
                          {card.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="p-4 text-slate-400 text-[11px]">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCardForView(card)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="View Redemptions"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleCard(card.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              card.isActive
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                            }`}
                            title={card.isActive ? 'Deactivate Code' : 'Activate Code'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800 transition-colors"
                            title="Delete Gift Card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Claim History Modal */}
          {selectedCardForView && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-[#101624] border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-milestone">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-['Orbitron'] font-bold text-white text-base">
                      Redemptions for {selectedCardForView.code}
                    </h3>
                    <p className="text-xs text-slate-400">
                      ₹{selectedCardForView.amount} • Total claims: {selectedCardForView.claimedBy.length}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCardForView(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {selectedCardForView.claimedBy.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No player has claimed this code yet.
                    </div>
                  ) : (
                    selectedCardForView.claimedBy.map((c, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-[#151c2a] border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{c.userName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{c.userId}</div>
                        </div>
                        <div className="text-right text-slate-400 text-[11px]">
                          {new Date(c.claimedAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => setSelectedCardForView(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
