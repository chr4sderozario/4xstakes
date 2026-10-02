export interface User {
  id: string;
  name: string;
  balance: number; // in INR
  avatar: string;
  createdAt: number;
}

export interface DepositOrder {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  utr: string; // 12-digit UPI UTR
  status: 'AWAITING_VERIFICATION' | 'COMPLETED' | 'REJECTED';
  createdAt: number;
  completedAt?: number;
  rejectReason?: string;
}

export type CrashGameStatus = 'BETTING' | 'FLYING' | 'CRASHED';

export interface CrashBet {
  userId: string;
  userName: string;
  avatar: string;
  amount: number;
  targetMultiplier?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  winAmount?: number;
  isSimulated?: boolean;
  transactionId?: string;
}

export interface CrashGameState {
  gameId: 'sky-high' | 'sky-high-black';
  status: CrashGameStatus;
  roundId: number;
  currentMultiplier: number;
  crashMultiplier: number;
  elapsedTime: number; // in seconds
  countdown: number; // betting phase countdown in seconds
  history: number[]; // past multipliers
  bets: CrashBet[];
}

export type SevenUpDownChoice = 'down' | 'seven' | 'up'; // down: 2-6 (2x), seven: 7 (5x), up: 8-12 (2x)

export type SevenUpDownStatus = 'BETTING' | 'ROLLING' | 'RESOLVED';

export interface SevenBet {
  userId: string;
  userName: string;
  avatar: string;
  choice: SevenUpDownChoice;
  amount: number;
  won?: boolean;
  winAmount?: number;
  isSimulated?: boolean;
  transactionId?: string;
}

export interface GiftCard {
  id: string;
  code: string;
  amount: number;
  maxClaims?: number;
  claimedBy: Array<{
    userId: string;
    userName: string;
    claimedAt: number;
  }>;
  isActive: boolean;
  createdAt: number;
  description?: string;
}

export interface BetTransaction {
  id: string;
  userId: string;
  userName: string;
  gameId: 'sky-high' | 'sky-high-black' | 'seven-up-down' | 'mines' | 'dragon-tiger' | 'roulette' | 'mega-wheel' | 'andar-bahar' | string;
  gameName: string;
  stake: number;
  multiplier: number;
  status: 'WON' | 'LOST' | 'PENDING';
  winAmount: number;
  createdAt: number;
  details?: string;
}

export interface SevenUpDownState {
  status: SevenUpDownStatus;
  roundId: number;
  countdown: number; // 30s countdown
  dice1: number;
  dice2: number;
  total: number;
  winningChoice?: SevenUpDownChoice;
  history: Array<{
    roundId: number;
    dice1: number;
    dice2: number;
    total: number;
    choice: SevenUpDownChoice;
  }>;
  bets: SevenBet[];
}
