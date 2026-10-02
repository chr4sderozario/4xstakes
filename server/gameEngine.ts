import { Server as SocketIOServer } from 'socket.io';
import { storage } from './storage.js';
import {
  CrashGameState,
  CrashBet,
  SevenUpDownState,
  SevenBet,
  SevenUpDownChoice,
} from './types.js';

const SIMULATED_PLAYERS = [
  { name: 'Aarav_07', avatar: '🦁' },
  { name: 'Vikram_VIP', avatar: '👑' },
  { name: 'Priya_Queen', avatar: '💎' },
  { name: 'Karan_Jet', avatar: '🚀' },
  { name: 'Rohan_Mumbai', avatar: '⚡' },
  { name: 'Sneha_Lucky', avatar: '🍀' },
  { name: 'Aditya_High', avatar: '🔥' },
  { name: 'Neha_Whale', avatar: '🌟' },
  { name: 'Kabir_Ace', avatar: '♠️' },
  { name: 'Ananya_Pro', avatar: '🎯' },
  { name: 'Raj_Royal', avatar: '🏆' },
  { name: 'Deepak_Striker', avatar: '⚡' },
];

const VIP_PLAYERS = [
  { name: 'ShadowWhale_X', avatar: '🏴‍☠️' },
  { name: 'LordCommander', avatar: '🎖️' },
  { name: 'StealthViper', avatar: '🐍' },
  { name: 'BlackFalcon_9', avatar: '🦅' },
  { name: 'PhantomKing', avatar: '👑' },
  { name: 'CyberTitan', avatar: '⚡' },
  { name: 'BillionaireX', avatar: '💰' },
  { name: 'DarkKnight_7', avatar: '🗡️' },
];

export class GameEngine {
  private io: SocketIOServer;

  // Sky High Standard
  public skyHighState: CrashGameState;
  private skyHighTimer: NodeJS.Timeout | null = null;
  private skyHighTickInterval: NodeJS.Timeout | null = null;

  // Sky High Black VIP
  public skyHighBlackState: CrashGameState;
  private skyHighBlackTimer: NodeJS.Timeout | null = null;
  private skyHighBlackTickInterval: NodeJS.Timeout | null = null;

  // 7 Up 7 Down
  public sevenUpDownState: SevenUpDownState;
  private sevenUpDownTimer: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;

    this.skyHighState = {
      gameId: 'sky-high',
      status: 'BETTING',
      roundId: 101,
      currentMultiplier: 1.0,
      crashMultiplier: 2.45,
      elapsedTime: 0,
      countdown: 5,
      history: [1.84, 3.12, 1.25, 6.72, 1.15, 2.04, 14.85, 1.45, 4.3],
      bets: [],
    };

    this.skyHighBlackState = {
      gameId: 'sky-high-black',
      status: 'BETTING',
      roundId: 501,
      currentMultiplier: 1.0,
      crashMultiplier: 3.8,
      elapsedTime: 0,
      countdown: 5,
      history: [4.2, 1.35, 12.4, 2.15, 1.08, 28.5, 3.4, 1.62, 8.9],
      bets: [],
    };

    this.sevenUpDownState = {
      status: 'BETTING',
      roundId: 301,
      countdown: 30,
      dice1: 3,
      dice2: 4,
      total: 7,
      winningChoice: 'seven',
      history: [
        { roundId: 297, dice1: 2, dice2: 3, total: 5, choice: 'down' },
        { roundId: 298, dice1: 4, dice2: 5, total: 9, choice: 'up' },
        { roundId: 299, dice1: 6, dice2: 6, total: 12, choice: 'up' },
        { roundId: 300, dice1: 3, dice2: 4, total: 7, choice: 'seven' },
      ],
      bets: [],
    };

    this.startSkyHighRound();
    this.startSkyHighBlackRound();
    this.startSevenUpDownCycle();
  }

  // ==========================================
  // SKY HIGH (STANDARD CRASH)
  // ==========================================

  private generateCrashMultiplier(isVip: boolean = false): number {
    const r = Math.random();

    // Standard Sky High: low chances of winning (high house edge, frequent early crashes)
    if (!isVip) {
      if (r < 0.48) {
        // 48% chance of immediate crash between 1.01x and 1.15x
        return Number((1.01 + Math.random() * 0.14).toFixed(2));
      }
      if (r < 0.82) {
        // 34% chance of early crash between 1.16x and 1.45x
        return Number((1.16 + Math.random() * 0.29).toFixed(2));
      }
      if (r < 0.95) {
        // 13% chance of reaching between 1.46x and 2.10x
        return Number((1.46 + Math.random() * 0.64).toFixed(2));
      }
      // Only 5% chance of rare flight up to 3.50x
      return Number((2.11 + Math.random() * 1.39).toFixed(2));
    }

    // Sky High Black (VIP): volatile with tight edge
    if (r < 0.42) {
      return Number((1.02 + Math.random() * 0.18).toFixed(2));
    }
    if (r < 0.78) {
      return Number((1.20 + Math.random() * 0.50).toFixed(2));
    }
    if (r > 0.96) {
      return Number((15.0 + Math.random() * 45.0).toFixed(2));
    }
    return Number((1.70 + Math.random() * 3.5).toFixed(2));
  }

  private startSkyHighRound() {
    this.skyHighState.status = 'BETTING';
    this.skyHighState.currentMultiplier = 1.0;
    this.skyHighState.elapsedTime = 0;
    this.skyHighState.countdown = 5;
    this.skyHighState.crashMultiplier = this.generateCrashMultiplier(false);
    this.skyHighState.bets = [];

    // Add initial simulated bets
    this.addSimulatedBets('sky-high');

    this.io.emit('crash:state', this.skyHighState);

    // 5-second countdown
    let count = 5;
    if (this.skyHighTimer) clearInterval(this.skyHighTimer);
    this.skyHighTimer = setInterval(() => {
      count -= 1;
      this.skyHighState.countdown = count;
      this.io.emit('crash:countdown', { gameId: 'sky-high', countdown: count });

      if (count <= 0) {
        if (this.skyHighTimer) clearInterval(this.skyHighTimer);
        this.launchSkyHighFlight();
      }
    }, 1000);
  }

  private launchSkyHighFlight() {
    this.skyHighState.status = 'FLYING';
    this.skyHighState.elapsedTime = 0;
    this.skyHighState.currentMultiplier = 1.0;
    this.io.emit('crash:flight_start', {
      gameId: 'sky-high',
      roundId: this.skyHighState.roundId,
    });

    const startTime = Date.now();
    if (this.skyHighTickInterval) clearInterval(this.skyHighTickInterval);

    this.skyHighTickInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      this.skyHighState.elapsedTime = elapsed;

      // Exponential growth curve: 1.00 + rate * t^1.7
      const mult = Number((1.0 + Math.pow(elapsed * 0.42, 1.85)).toFixed(2));
      this.skyHighState.currentMultiplier = mult;

      // Check auto-cashouts for players
      this.checkAutoCashouts(this.skyHighState);

      // Check crash condition
      if (mult >= this.skyHighState.crashMultiplier) {
        this.crashSkyHigh();
        return;
      }

      this.io.emit('crash:tick', {
        gameId: 'sky-high',
        multiplier: mult,
        elapsedTime: elapsed,
      });
    }, 60);
  }

  private crashSkyHigh() {
    if (this.skyHighTickInterval) clearInterval(this.skyHighTickInterval);
    this.skyHighState.status = 'CRASHED';
    this.skyHighState.history.unshift(this.skyHighState.crashMultiplier);
    if (this.skyHighState.history.length > 20) {
      this.skyHighState.history.pop();
    }

    // Mark lost bets in transaction history
    for (const bet of this.skyHighState.bets) {
      if (!bet.isSimulated && !bet.cashedOut && bet.transactionId) {
        storage.updateBet(bet.transactionId, {
          status: 'LOST',
          multiplier: 0,
          winAmount: 0,
          details: `Flight crashed at ${this.skyHighState.crashMultiplier.toFixed(2)}x`,
        });
      }
    }

    this.io.emit('crash:crashed', {
      gameId: 'sky-high',
      crashMultiplier: this.skyHighState.crashMultiplier,
      history: this.skyHighState.history,
    });

    // Wait 3 seconds, then start next round
    setTimeout(() => {
      this.skyHighState.roundId += 1;
      this.startSkyHighRound();
    }, 3000);
  }

  // ==========================================
  // SKY HIGH BLACK (VIP CRASH)
  // ==========================================

  private startSkyHighBlackRound() {
    this.skyHighBlackState.status = 'BETTING';
    this.skyHighBlackState.currentMultiplier = 1.0;
    this.skyHighBlackState.elapsedTime = 0;
    this.skyHighBlackState.countdown = 5;
    this.skyHighBlackState.crashMultiplier = this.generateCrashMultiplier(true);
    this.skyHighBlackState.bets = [];

    this.addSimulatedBets('sky-high-black');

    this.io.emit('crash:state', this.skyHighBlackState);

    let count = 5;
    if (this.skyHighBlackTimer) clearInterval(this.skyHighBlackTimer);
    this.skyHighBlackTimer = setInterval(() => {
      count -= 1;
      this.skyHighBlackState.countdown = count;
      this.io.emit('crash:countdown', { gameId: 'sky-high-black', countdown: count });

      if (count <= 0) {
        if (this.skyHighBlackTimer) clearInterval(this.skyHighBlackTimer);
        this.launchSkyHighBlackFlight();
      }
    }, 1000);
  }

  private launchSkyHighBlackFlight() {
    this.skyHighBlackState.status = 'FLYING';
    this.skyHighBlackState.elapsedTime = 0;
    this.skyHighBlackState.currentMultiplier = 1.0;
    this.io.emit('crash:flight_start', {
      gameId: 'sky-high-black',
      roundId: this.skyHighBlackState.roundId,
    });

    const startTime = Date.now();
    if (this.skyHighBlackTickInterval) clearInterval(this.skyHighBlackTickInterval);

    this.skyHighBlackTickInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      this.skyHighBlackState.elapsedTime = elapsed;

      // VIP curve is slightly sharper
      const mult = Number((1.0 + Math.pow(elapsed * 0.46, 1.9)).toFixed(2));
      this.skyHighBlackState.currentMultiplier = mult;

      this.checkAutoCashouts(this.skyHighBlackState);

      if (mult >= this.skyHighBlackState.crashMultiplier) {
        this.crashSkyHighBlack();
        return;
      }

      this.io.emit('crash:tick', {
        gameId: 'sky-high-black',
        multiplier: mult,
        elapsedTime: elapsed,
      });
    }, 60);
  }

  private crashSkyHighBlack() {
    if (this.skyHighBlackTickInterval) clearInterval(this.skyHighBlackTickInterval);
    this.skyHighBlackState.status = 'CRASHED';
    this.skyHighBlackState.history.unshift(this.skyHighBlackState.crashMultiplier);
    if (this.skyHighBlackState.history.length > 20) {
      this.skyHighBlackState.history.pop();
    }

    // Mark lost bets in transaction history
    for (const bet of this.skyHighBlackState.bets) {
      if (!bet.isSimulated && !bet.cashedOut && bet.transactionId) {
        storage.updateBet(bet.transactionId, {
          status: 'LOST',
          multiplier: 0,
          winAmount: 0,
          details: `Stealth VIP flight crashed at ${this.skyHighBlackState.crashMultiplier.toFixed(2)}x`,
        });
      }
    }

    this.io.emit('crash:crashed', {
      gameId: 'sky-high-black',
      crashMultiplier: this.skyHighBlackState.crashMultiplier,
      history: this.skyHighBlackState.history,
    });

    setTimeout(() => {
      this.skyHighBlackState.roundId += 1;
      this.startSkyHighBlackRound();
    }, 3000);
  }

  // ==========================================
  // BETTING & CASHOUT LOGIC (ATOMIC & IN-MEMORY)
  // ==========================================

  public placeCrashBet(
    gameId: 'sky-high' | 'sky-high-black',
    userId: string,
    amount: number,
    targetMultiplier?: number
  ): { success: boolean; error?: string; bet?: CrashBet; balance?: number } {
    const gameState = gameId === 'sky-high' ? this.skyHighState : this.skyHighBlackState;

    if (gameState.status !== 'BETTING') {
      return { success: false, error: 'Betting is closed for this round. Please wait for the next flight!' };
    }

    // In-memory check: Prevent duplicate bets in the same round
    const existing = gameState.bets.find(b => b.userId === userId);
    if (existing) {
      return { success: false, error: 'You have already placed a bet for this round.' };
    }

    if (amount <= 0) {
      return { success: false, error: 'Invalid bet amount' };
    }

    // Atomic balance deduction
    const deducted = storage.deductBalance(userId, amount);
    if (!deducted) {
      return { success: false, error: 'Insufficient wallet balance. Please deposit funds!' };
    }

    const user = storage.getUser(userId);
    const gameName = gameId === 'sky-high-black' ? 'Sky High Black (VIP)' : 'Sky High';
    const betRecord = storage.recordBet({
      userId,
      userName: user.name,
      gameId,
      gameName,
      stake: amount,
      multiplier: 0,
      status: 'PENDING',
      winAmount: 0,
      details: targetMultiplier ? `Auto-cashout target: ${targetMultiplier.toFixed(2)}x` : 'Flight active',
    });

    const newBet: CrashBet = {
      userId,
      userName: user.name,
      avatar: user.avatar,
      amount,
      targetMultiplier: targetMultiplier && targetMultiplier > 1.01 ? targetMultiplier : undefined,
      cashedOut: false,
      transactionId: betRecord.id,
    };

    gameState.bets.push(newBet);

    // Broadcast new bet to all players in the room
    this.io.emit('crash:bet_placed', {
      gameId,
      bet: newBet,
    });

    // Notify user of updated balance
    this.io.to(`user_${userId}`).emit('wallet:update', {
      balance: user.balance,
      reason: 'BET_PLACED',
    });

    return { success: true, bet: newBet, balance: user.balance };
  }

  public cashoutCrashBet(
    gameId: 'sky-high' | 'sky-high-black',
    userId: string
  ): { success: boolean; error?: string; winAmount?: number; multiplier?: number; balance?: number } {
    const gameState = gameId === 'sky-high' ? this.skyHighState : this.skyHighBlackState;

    if (gameState.status !== 'FLYING') {
      return { success: false, error: 'Cannot cash out right now.' };
    }

    const bet = gameState.bets.find(b => b.userId === userId);
    if (!bet) {
      return { success: false, error: 'No active bet found for this round.' };
    }

    // Atomic check: Ensure NO double cashout occurs
    if (bet.cashedOut) {
      return { success: false, error: 'Already cashed out!' };
    }

    const currentMultiplier = gameState.currentMultiplier;
    const winAmount = Math.floor(bet.amount * currentMultiplier);

    bet.cashedOut = true;
    bet.cashoutMultiplier = currentMultiplier;
    bet.winAmount = winAmount;

    if (bet.transactionId) {
      storage.updateBet(bet.transactionId, {
        status: 'WON',
        multiplier: currentMultiplier,
        winAmount,
        details: `Cashed out at ${currentMultiplier.toFixed(2)}x`,
      });
    }

    // Credit to wallet atomically
    const newBalance = storage.addBalance(userId, winAmount);

    // Broadcast cashout event
    this.io.emit('crash:player_cashed_out', {
      gameId,
      bet,
    });

    this.io.to(`user_${userId}`).emit('wallet:update', {
      balance: newBalance,
      reason: 'WIN_CASHOUT',
      winAmount,
      multiplier: currentMultiplier,
    });

    return {
      success: true,
      winAmount,
      multiplier: currentMultiplier,
      balance: newBalance,
    };
  }

  private checkAutoCashouts(gameState: CrashGameState) {
    const mult = gameState.currentMultiplier;
    for (const bet of gameState.bets) {
      if (!bet.cashedOut && bet.targetMultiplier && mult >= bet.targetMultiplier) {
        bet.cashedOut = true;
        bet.cashoutMultiplier = bet.targetMultiplier;
        bet.winAmount = Math.floor(bet.amount * bet.targetMultiplier);

        if (!bet.isSimulated) {
          const newBalance = storage.addBalance(bet.userId, bet.winAmount);
          if (bet.transactionId) {
            storage.updateBet(bet.transactionId, {
              status: 'WON',
              multiplier: bet.targetMultiplier,
              winAmount: bet.winAmount,
              details: `Auto-cashed out at ${bet.targetMultiplier.toFixed(2)}x`,
            });
          }
          this.io.to(`user_${bet.userId}`).emit('wallet:update', {
            balance: newBalance,
            reason: 'AUTO_CASHOUT',
            winAmount: bet.winAmount,
            multiplier: bet.targetMultiplier,
          });
        }

        this.io.emit('crash:player_cashed_out', {
          gameId: gameState.gameId,
          bet,
        });
      }
    }
  }

  private addSimulatedBets(gameId: 'sky-high' | 'sky-high-black') {
    const isVip = gameId === 'sky-high-black';
    const list = isVip ? VIP_PLAYERS : SIMULATED_PLAYERS;
    const count = 5 + Math.floor(Math.random() * 6);
    const gameState = isVip ? this.skyHighBlackState : this.skyHighState;

    const shuffled = [...list].sort(() => 0.5 - Math.random()).slice(0, count);

    for (const p of shuffled) {
      const amount = isVip
        ? [500, 1000, 2000, 5000, 10000][Math.floor(Math.random() * 5)]
        : [50, 100, 200, 500, 1000][Math.floor(Math.random() * 5)];

      // Random target cashout between 1.2x and 8.0x
      const targetMultiplier = Number((1.2 + Math.random() * (isVip ? 15.0 : 6.0)).toFixed(2));

      gameState.bets.push({
        userId: `sim_${p.name}`,
        userName: p.name,
        avatar: p.avatar,
        amount,
        targetMultiplier,
        cashedOut: false,
        isSimulated: true,
      });
    }
  }

  // ==========================================
  // 7 UP 7 DOWN (30-SECOND PREDICTION GAME)
  // ==========================================

  private startSevenUpDownCycle() {
    this.sevenUpDownState.status = 'BETTING';
    this.sevenUpDownState.countdown = 30;
    this.sevenUpDownState.bets = [];

    // Add simulated community bets on the 3 options
    this.addSimulatedSevenBets();

    this.io.emit('seven:state', this.sevenUpDownState);

    let count = 30;
    if (this.sevenUpDownTimer) clearInterval(this.sevenUpDownTimer);
    this.sevenUpDownTimer = setInterval(() => {
      count -= 1;
      this.sevenUpDownState.countdown = count;
      this.io.emit('seven:countdown', { countdown: count });

      if (count === 5) {
        // Switch to ROLLING phase for last 5 seconds
        this.sevenUpDownState.status = 'ROLLING';
        this.io.emit('seven:rolling', { roundId: this.sevenUpDownState.roundId });
      }

      if (count <= 0) {
        if (this.sevenUpDownTimer) clearInterval(this.sevenUpDownTimer);
        this.resolveSevenUpDown();
      }
    }, 1000);
  }

  private resolveSevenUpDown() {
    // Roll two 6-sided dice (1-6 each)
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    let winningChoice: SevenUpDownChoice;
    if (total < 7) {
      winningChoice = 'down'; // 2-6
    } else if (total === 7) {
      winningChoice = 'seven'; // 7
    } else {
      winningChoice = 'up'; // 8-12
    }

    this.sevenUpDownState.status = 'RESOLVED';
    this.sevenUpDownState.dice1 = dice1;
    this.sevenUpDownState.dice2 = dice2;
    this.sevenUpDownState.total = total;
    this.sevenUpDownState.winningChoice = winningChoice;

    // Resolve bets and payouts: 2x for Down / Up, 5x for Lucky 7
    const payoutMultiplier = winningChoice === 'seven' ? 5 : 2;

    for (const bet of this.sevenUpDownState.bets) {
      if (bet.choice === winningChoice) {
        bet.won = true;
        bet.winAmount = bet.amount * payoutMultiplier;

        if (!bet.isSimulated) {
          const newBalance = storage.addBalance(bet.userId, bet.winAmount);
          if (bet.transactionId) {
            storage.updateBet(bet.transactionId, {
              status: 'WON',
              multiplier: payoutMultiplier,
              winAmount: bet.winAmount,
              details: `Dice [${dice1}, ${dice2}] = ${total} (${winningChoice.toUpperCase()}) - Won ₹${bet.winAmount}!`,
            });
          }
          this.io.to(`user_${bet.userId}`).emit('wallet:update', {
            balance: newBalance,
            reason: 'SEVEN_UP_DOWN_WIN',
            winAmount: bet.winAmount,
            choice: winningChoice,
          });
        }
      } else {
        bet.won = false;
        bet.winAmount = 0;
        if (!bet.isSimulated && bet.transactionId) {
          storage.updateBet(bet.transactionId, {
            status: 'LOST',
            multiplier: 0,
            winAmount: 0,
            details: `Dice [${dice1}, ${dice2}] = ${total} (${winningChoice.toUpperCase()}) - Lost`,
          });
        }
      }
    }

    // Add to history
    this.sevenUpDownState.history.unshift({
      roundId: this.sevenUpDownState.roundId,
      dice1,
      dice2,
      total,
      choice: winningChoice,
    });
    if (this.sevenUpDownState.history.length > 20) {
      this.sevenUpDownState.history.pop();
    }

    this.io.emit('seven:resolved', {
      dice1,
      dice2,
      total,
      winningChoice,
      payoutMultiplier,
      bets: this.sevenUpDownState.bets,
      history: this.sevenUpDownState.history,
    });

    // 4 seconds celebration/reveal before starting next 30s round
    setTimeout(() => {
      this.sevenUpDownState.roundId += 1;
      this.startSevenUpDownCycle();
    }, 4000);
  }

  public placeSevenBet(
    userId: string,
    choice: SevenUpDownChoice,
    amount: number
  ): { success: boolean; error?: string; bet?: SevenBet; balance?: number } {
    if (this.sevenUpDownState.status !== 'BETTING' || this.sevenUpDownState.countdown <= 5) {
      return { success: false, error: 'Betting is locked! Dice are rolling.' };
    }

    if (amount <= 0) {
      return { success: false, error: 'Invalid bet amount' };
    }

    // Atomic balance deduction
    const deducted = storage.deductBalance(userId, amount);
    if (!deducted) {
      return { success: false, error: 'Insufficient balance to place bet.' };
    }

    const user = storage.getUser(userId);
    const choiceLabel = choice === 'down' ? '7 Down (2-6)' : choice === 'up' ? '7 Up (8-12)' : 'Lucky 7';
    const betRecord = storage.recordBet({
      userId,
      userName: user.name,
      gameId: 'seven-up-down',
      gameName: '7 Up 7 Down',
      stake: amount,
      multiplier: 0,
      status: 'PENDING',
      winAmount: 0,
      details: `Predicted ${choiceLabel}`,
    });

    const newBet: SevenBet = {
      userId,
      userName: user.name,
      avatar: user.avatar,
      choice,
      amount,
      transactionId: betRecord.id,
    };

    this.sevenUpDownState.bets.push(newBet);

    this.io.emit('seven:bet_placed', { bet: newBet });

    this.io.to(`user_${userId}`).emit('wallet:update', {
      balance: user.balance,
      reason: 'BET_PLACED',
    });

    return { success: true, bet: newBet, balance: user.balance };
  }

  private addSimulatedSevenBets() {
    const count = 4 + Math.floor(Math.random() * 5);
    const choices: SevenUpDownChoice[] = ['down', 'seven', 'up'];
    const shuffled = [...SIMULATED_PLAYERS].sort(() => 0.5 - Math.random()).slice(0, count);

    for (const p of shuffled) {
      const choice = choices[Math.floor(Math.random() * choices.length)];
      const amount = [50, 100, 200, 500][Math.floor(Math.random() * 4)];
      this.sevenUpDownState.bets.push({
        userId: `sim_${p.name}`,
        userName: p.name,
        avatar: p.avatar,
        choice,
        amount,
        isSimulated: true,
      });
    }
  }
}
