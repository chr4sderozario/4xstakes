import React, { useState } from 'react';
import { User } from '../types.js';
import {
  X,
  UserCheck,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Lock,
  LogIn,
} from 'lucide-react';
import { sounds } from '../lib/sound.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User) => void;
  onAdminAuthenticated: () => void;
  isAdmin: boolean;
  initialTab?: 'player' | 'admin';
  authMessage?: string;
}

const AVATARS = ['⚡', '💎', '🔥', '👑', '🚀', '🎲', '🦁', '♠️', '🎯', '🦅'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onAdminAuthenticated,
  isAdmin,
  initialTab = 'player',
  authMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'admin'>(initialTab);
  const [name, setName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentUser?.avatar || '⚡');
  const [adminPasskey, setAdminPasskey] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Please enter your player username.');
      return;
    }

    setIsSubmitting(true);
    sounds.playClick();

    try {
      const res = await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanName }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        data.user.avatar = selectedAvatar;
        localStorage.setItem('4timebet_userId', data.user.id);
        onUserChanged(data.user);
        sounds.playCashout();
        setSuccessMessage(`Welcome, ${data.user.name}! You are now logged in.`);
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1100);
      } else {
        setErrorMessage(data.error || 'Failed to login.');
      }
    } catch {
      setErrorMessage('Network connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanKey = adminPasskey.trim();
    // Valid passkeys: 'admin4time' or '4444' or 'admin'
    if (cleanKey === 'admin4time' || cleanKey === '4444' || cleanKey === 'admin') {
      sounds.playCashout();
      onAdminAuthenticated();
      setSuccessMessage('Staff passkey verified! Redirecting to Management Portal...');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1000);
    } else {
      setErrorMessage('Invalid Staff Security Passkey. Access denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#101624] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-milestone">
        {/* Header Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0c101a] px-4 pt-3 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('player');
                setErrorMessage('');
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'player'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Player Login / Register</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('admin');
                setErrorMessage('');
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Staff Portal</span>
            </button>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="pb-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {authMessage && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{authMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'player' ? (
            /* Player Login / Register Form */
            <form onSubmit={handleLoginOrRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select Player Avatar
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setSelectedAvatar(av);
                      }}
                      className={`h-11 rounded-xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        selectedAvatar === av
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 scale-105 shadow-md shadow-amber-500/20'
                          : 'bg-[#151c2a] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Player Username / ID
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter username (e.g. LuckyStriker, Priya99)"
                  maxLength={20}
                  className="w-full bg-[#151d2c] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-['Orbitron'] text-xs focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter your username to log in or automatically register. Initial balance starts at ₹0.
                </p>
              </div>

              {currentUser && (
                <div className="p-3 rounded-xl bg-[#0c1018] border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Currently logged in:</span>
                  <span className="font-bold text-white">
                    {currentUser.avatar} {currentUser.name} (₹{currentUser.balance})
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-black font-['Orbitron'] font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer animate-shimmer"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Logging in...' : 'Login / Register to Play'}</span>
              </button>
            </form>
          ) : (
            /* Staff / Admin Security Gateway */
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="text-center space-y-1 py-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-['Orbitron'] font-bold text-base text-white">
                  Staff & Admin Verification
                </h3>
                <p className="text-xs text-slate-400">
                  Enter authorized terminal passkey to access deposit approvals.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Security Passkey / PIN
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={adminPasskey}
                    onChange={(e) => setAdminPasskey(e.target.value)}
                    placeholder="Enter Staff Passkey (e.g. 4444 or admin4time)"
                    className="w-full bg-[#151d2c] border border-slate-700 focus:border-purple-500 rounded-xl pl-9 pr-3.5 py-2.5 text-white font-mono text-sm tracking-widest focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Default Demo Passkey: <code className="text-purple-400 font-bold">4444</code> or <code className="text-purple-400 font-bold">admin4time</code>
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-['Orbitron'] font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Verify & Open Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
