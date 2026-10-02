import fs from 'fs';
import path from 'path';
import { User, DepositOrder, GiftCard, BetTransaction } from './types.js';

interface StorageData {
  users: Record<string, User>;
  deposits: DepositOrder[];
  giftCards: GiftCard[];
  bets: BetTransaction[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'app_data.json');

class Storage {
  private data: StorageData = {
    users: {},
    deposits: [],
    giftCards: [],
    bets: [],
  };

  constructor() {
    this.loadData();
    this.ensureDefaultUser();
    this.ensureDefaultGiftCards();
    this.ensureDefaultBets();
  }

  private loadData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.saveData();
      }
    } catch (err) {
      console.error('Error loading storage data:', err);
    }
  }

  private saveData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving storage data:', err);
    }
  }

  private ensureDefaultUser() {
    // Ensure default demo user exists with 0 initial balance
    const defaultId = 'user_demo_1';
    if (!this.data.users[defaultId]) {
      this.data.users[defaultId] = {
        id: defaultId,
        name: 'LuckyStriker',
        balance: 0, // Starts with ₹0
        avatar: '⚡',
        createdAt: Date.now(),
      };
      this.saveData();
    }
  }

  private ensureDefaultGiftCards() {
    if (!this.data.giftCards) {
      this.data.giftCards = [];
    }
    // Seed initial ₹100 gift card code: 6291923478QRSTB
    const initialCode = '6291923478QRSTB';
    const exists = this.data.giftCards.some(
      (c) => c.code.toUpperCase() === initialCode.toUpperCase()
    );
    if (!exists) {
      this.data.giftCards.push({
        id: 'gc_welcome_100',
        code: initialCode,
        amount: 100, // ₹100 rupees
        maxClaims: 1000,
        claimedBy: [],
        isActive: true,
        createdAt: Date.now(),
        description: 'Official ₹100 Welcome Gift Card Voucher',
      });
      this.saveData();
    }
  }

  private ensureDefaultBets() {
    if (!this.data.bets) {
      this.data.bets = [];
    }
    if (this.data.bets.length === 0) {
      const now = Date.now();
      const demoBets: BetTransaction[] = [
        {
          id: 'bet_demo_1',
          userId: 'user_demo_1',
          userName: 'LuckyStriker',
          gameId: 'sky-high',
          gameName: 'Sky High',
          stake: 200,
          multiplier: 3.42,
          status: 'WON',
          winAmount: 684,
          createdAt: now - 1000 * 60 * 18,
          details: 'Cashed out at 3.42x multiplier',
        },
        {
          id: 'bet_demo_2',
          userId: 'user_demo_1',
          userName: 'LuckyStriker',
          gameId: 'seven-up-down',
          gameName: '7 Up 7 Down',
          stake: 100,
          multiplier: 5.0,
          status: 'WON',
          winAmount: 500,
          createdAt: now - 1000 * 60 * 14,
          details: 'Landed Lucky 7 (Dice [4, 3] = 7)',
        },
        {
          id: 'bet_demo_3',
          userId: 'user_demo_1',
          userName: 'LuckyStriker',
          gameId: 'sky-high-black',
          gameName: 'Sky High Black (VIP)',
          stake: 500,
          multiplier: 0,
          status: 'LOST',
          winAmount: 0,
          createdAt: now - 1000 * 60 * 10,
          details: 'Crashed at 1.84x before cashout',
        },
        {
          id: 'bet_demo_4',
          userId: 'user_demo_1',
          userName: 'LuckyStriker',
          gameId: 'seven-up-down',
          gameName: '7 Up 7 Down',
          stake: 100,
          multiplier: 2.0,
          status: 'WON',
          winAmount: 200,
          createdAt: now - 1000 * 60 * 6,
          details: 'Landed 7 Up (Dice [5, 5] = 10)',
        },
        {
          id: 'bet_demo_5',
          userId: 'user_demo_1',
          userName: 'LuckyStriker',
          gameId: 'sky-high',
          gameName: 'Sky High',
          stake: 150,
          multiplier: 2.15,
          status: 'WON',
          winAmount: 322,
          createdAt: now - 1000 * 60 * 2,
          details: 'Auto-cashout at 2.15x',
        },
      ];
      this.data.bets = demoBets;
      this.saveData();
    }
  }

  public getUser(id: string): User {
    if (!this.data.users[id]) {
      this.data.users[id] = {
        id,
        name: `Player_${id.slice(-4)}`,
        balance: 0, // Starts with ₹0
        avatar: '🎲',
        createdAt: Date.now(),
      };
      this.saveData();
    }
    return this.data.users[id];
  }

  public getAllUsers(): User[] {
    return Object.values(this.data.users);
  }

  /**
   * Atomic balance deduction. Ensures no negative balance.
   */
  public deductBalance(userId: string, amount: number): boolean {
    if (amount <= 0) return false;
    const user = this.getUser(userId);
    if (user.balance < amount) {
      return false; // Insufficient balance
    }
    user.balance -= amount;
    this.saveData();
    return true;
  }

  /**
   * Atomic balance credit.
   */
  public addBalance(userId: string, amount: number): number {
    if (amount <= 0) return this.getUser(userId).balance;
    const user = this.getUser(userId);
    user.balance += amount;
    this.saveData();
    return user.balance;
  }

  /**
   * Create a deposit order.
   * Checks for duplicate 12-digit UTR submissions.
   */
  public createDeposit(userId: string, amount: number, utr: string): { success: boolean; deposit?: DepositOrder; error?: string } {
    const cleanUtr = utr.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return { success: false, error: 'UTR must be exactly 12 digits' };
    }
    if (amount < 100) {
      return { success: false, error: 'Minimum deposit is ₹100' };
    }

    // Check duplicate UTR across all deposits
    const exists = this.data.deposits.some(d => d.utr === cleanUtr && d.status !== 'REJECTED');
    if (exists) {
      return {
        success: false,
        error: `UTR ${cleanUtr} has already been submitted and is currently being processed or completed!`,
      };
    }

    const user = this.getUser(userId);
    const orderId = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    
    const deposit: DepositOrder = {
      id: orderId,
      userId,
      userName: user.name,
      amount,
      utr: cleanUtr,
      status: 'AWAITING_VERIFICATION',
      createdAt: Date.now(),
    };

    this.data.deposits.unshift(deposit);
    this.saveData();

    return { success: true, deposit };
  }

  public getAllDeposits(): DepositOrder[] {
    return [...this.data.deposits];
  }

  public getPendingDeposits(): DepositOrder[] {
    return this.data.deposits.filter(d => d.status === 'AWAITING_VERIFICATION');
  }

  public getUserDeposits(userId: string): DepositOrder[] {
    return this.data.deposits.filter(d => d.userId === userId);
  }

  public approveDeposit(depositId: string): { success: boolean; deposit?: DepositOrder; newBalance?: number; error?: string } {
    const deposit = this.data.deposits.find(d => d.id === depositId);
    if (!deposit) {
      return { success: false, error: 'Deposit request not found' };
    }
    if (deposit.status === 'COMPLETED') {
      return { success: false, error: 'Deposit is already completed' };
    }

    deposit.status = 'COMPLETED';
    deposit.completedAt = Date.now();
    const newBalance = this.addBalance(deposit.userId, deposit.amount);

    this.saveData();
    return { success: true, deposit, newBalance };
  }

  public rejectDeposit(depositId: string, reason?: string): { success: boolean; deposit?: DepositOrder; error?: string } {
    const deposit = this.data.deposits.find(d => d.id === depositId);
    if (!deposit) {
      return { success: false, error: 'Deposit request not found' };
    }
    if (deposit.status === 'COMPLETED') {
      return { success: false, error: 'Cannot reject an already completed deposit' };
    }

    deposit.status = 'REJECTED';
    deposit.rejectReason = reason || 'Verification failed (Invalid UTR or unmatched bank record)';
    this.saveData();

    return { success: true, deposit };
  }

  /**
   * Redeem / claim a giftcard voucher code
   */
  public claimGiftCard(userId: string, code: string): { success: boolean; amount?: number; code?: string; newBalance?: number; error?: string } {
    if (!userId) {
      return { success: false, error: 'User session required to redeem gift card' };
    }
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Please enter a valid gift card code' };
    }

    if (!this.data.giftCards) {
      this.data.giftCards = [];
    }

    const card = this.data.giftCards.find(c => c.code.toUpperCase() === cleanCode);
    if (!card) {
      return { success: false, error: 'Invalid gift card code. Please check and try again.' };
    }

    if (!card.isActive) {
      return { success: false, error: 'This gift card has expired or is currently deactivated.' };
    }

    // Check if this specific player already redeemed this code
    const alreadyClaimed = card.claimedBy.some(c => c.userId === userId);
    if (alreadyClaimed) {
      return { success: false, error: 'You have already redeemed this gift card code on your account!' };
    }

    // Check max claims limit
    if (card.maxClaims && card.claimedBy.length >= card.maxClaims) {
      return { success: false, error: 'This gift card has reached its maximum global claim limit.' };
    }

    const user = this.getUser(userId);
    card.claimedBy.push({
      userId,
      userName: user.name,
      claimedAt: Date.now(),
    });

    const newBalance = this.addBalance(userId, card.amount);
    this.saveData();

    return {
      success: true,
      amount: card.amount,
      code: card.code,
      newBalance,
    };
  }

  public getAllGiftCards(): GiftCard[] {
    return [...(this.data.giftCards || [])];
  }

  public createGiftCard(code: string, amount: number, maxClaims?: number, description?: string): { success: boolean; giftCard?: GiftCard; error?: string } {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      return { success: false, error: 'Gift card code must be at least 4 characters long' };
    }
    if (!amount || amount <= 0) {
      return { success: false, error: 'Gift card amount must be greater than ₹0' };
    }

    if (!this.data.giftCards) {
      this.data.giftCards = [];
    }

    const exists = this.data.giftCards.some(c => c.code.toUpperCase() === cleanCode);
    if (exists) {
      return { success: false, error: `Gift card code ${cleanCode} already exists!` };
    }

    const newCard: GiftCard = {
      id: `gc_${Date.now().toString(36)}`,
      code: cleanCode,
      amount,
      maxClaims: maxClaims && maxClaims > 0 ? maxClaims : undefined,
      claimedBy: [],
      isActive: true,
      createdAt: Date.now(),
      description: description || `Promo ₹${amount} Voucher`,
    };

    this.data.giftCards.unshift(newCard);
    this.saveData();

    return { success: true, giftCard: newCard };
  }

  public toggleGiftCardActive(id: string): { success: boolean; giftCard?: GiftCard; error?: string } {
    const card = (this.data.giftCards || []).find(c => c.id === id);
    if (!card) {
      return { success: false, error: 'Gift card not found' };
    }
    card.isActive = !card.isActive;
    this.saveData();
    return { success: true, giftCard: card };
  }

  public deleteGiftCard(id: string): boolean {
    if (!this.data.giftCards) return false;
    const initialLen = this.data.giftCards.length;
    this.data.giftCards = this.data.giftCards.filter(c => c.id !== id);
    if (this.data.giftCards.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public recordBet(bet: Omit<BetTransaction, 'id' | 'createdAt'>): BetTransaction {
    if (!this.data.bets) {
      this.data.bets = [];
    }
    const newBet: BetTransaction = {
      id: `bet_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      ...bet,
    };
    this.data.bets.unshift(newBet);
    if (this.data.bets.length > 500) {
      this.data.bets.pop();
    }
    this.saveData();
    return newBet;
  }

  public updateBet(id: string, updates: Partial<BetTransaction>): BetTransaction | null {
    if (!this.data.bets) return null;
    const bet = this.data.bets.find(b => b.id === id);
    if (!bet) return null;
    Object.assign(bet, updates);
    this.saveData();
    return bet;
  }

  public getUserBets(userId: string, limit: number = 10): BetTransaction[] {
    if (!this.data.bets) {
      this.data.bets = [];
    }
    return this.data.bets
      .filter(b => b.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

export const storage = new Storage();
