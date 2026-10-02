import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { storage } from './server/storage.js';
import { GameEngine } from './server/gameEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

// Initialize Game Engine
const gameEngine = new GameEngine(io);

// ==========================================
// REST API ROUTES
// ==========================================

// Get current or specific user
app.get('/api/user/:id', (req, res) => {
  const user = storage.getUser(req.params.id);
  res.json({ success: true, user });
});

// Get player bet history (last 10 bets by default)
app.get('/api/user/:id/bets', (req, res) => {
  const userId = req.params.id;
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const bets = storage.getUserBets(userId, limit);
  res.json({ success: true, bets });
});

app.get('/api/user', (req, res) => {
  const userId = (req.query.id as string) || 'user_demo_1';
  const user = storage.getUser(userId);
  res.json({ success: true, user });
});

// Switch or create profile
app.post('/api/user/create', (req, res) => {
  const { name, avatar: reqAvatar } = req.body;
  const id = `user_${Date.now().toString(36)}`;
  const avatars = ['⚡', '💎', '🔥', '👑', '🚀', '🎲', '🦁', '♠️', '🎯', '🦅'];
  const avatar = reqAvatar || avatars[Math.floor(Math.random() * avatars.length)];
  const user = storage.getUser(id);
  user.name = name || `Player_${id.slice(-4)}`;
  user.avatar = avatar;
  user.balance = 0;
  res.json({ success: true, user });
});

// Login by username or ID
app.post('/api/user/login', (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, error: 'Please enter your username to login' });
  }
  const clean = username.trim();
  const allUsers = storage.getAllUsers();
  let user = allUsers.find(
    u => u.name.toLowerCase() === clean.toLowerCase() || u.id.toLowerCase() === clean.toLowerCase()
  );
  if (!user) {
    // Register new user on first login with balance 0
    const id = `user_${Date.now().toString(36)}`;
    const avatars = ['⚡', '💎', '🔥', '👑', '🚀', '🎲', '🦁', '♠️', '🎯', '🦅'];
    user = storage.getUser(id);
    user.name = clean;
    user.avatar = avatars[Math.floor(Math.random() * avatars.length)];
    user.balance = 0;
  }
  res.json({ success: true, user });
});

// ==========================================
// CASINO & ARCADE GAMES ATOMIC SETTLEMENT
// ==========================================

// Place a bet in any game (Mines, Dragon Tiger, Roulette, Mega Wheel, Andar Bahar)
app.post('/api/game/bet', (req, res) => {
  const { userId, gameId, gameName, stake, details } = req.body;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'User not logged in' });
  }

  const numStake = Number(stake);
  if (isNaN(numStake) || numStake <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid stake amount' });
  }

  // Deduct balance atomically
  const deducted = storage.deductBalance(userId, numStake);
  if (!deducted) {
    return res.status(400).json({ success: false, error: 'Insufficient wallet balance. Please deposit funds!' });
  }

  const user = storage.getUser(userId);

  // Record bet transaction in storage
  const betRecord = storage.recordBet({
    userId,
    userName: user.name,
    gameId: gameId || 'casino-game',
    gameName: gameName || 'Casino Game',
    stake: numStake,
    multiplier: 0,
    status: 'PENDING',
    winAmount: 0,
    details: details || 'Round in progress',
  });

  // Emit real-time wallet update
  io.to(`user_${userId}`).emit('wallet:update', {
    balance: user.balance,
    reason: 'BET_PLACED',
    amount: numStake,
  });

  res.json({ success: true, betId: betRecord.id, balance: user.balance });
});

// Settle a bet (Won or Lost)
app.post('/api/game/settle', (req, res) => {
  const { userId, betId, status, multiplier, winAmount, details } = req.body;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'User not logged in' });
  }

  const user = storage.getUser(userId);
  let newBalance = user.balance;

  if (status === 'WON') {
    const won = Number(winAmount) || 0;
    if (won > 0) {
      newBalance = storage.addBalance(userId, won);
    }
  }

  if (betId) {
    storage.updateBet(betId, {
      status: status === 'WON' ? 'WON' : 'LOST',
      multiplier: Number(multiplier) || 0,
      winAmount: status === 'WON' ? Number(winAmount) || 0 : 0,
      details: details || (status === 'WON' ? 'Won round' : 'Lost round'),
    });
  }

  if (status === 'WON') {
    io.to(`user_${userId}`).emit('wallet:update', {
      balance: newBalance,
      reason: 'CASINO_WIN',
      winAmount: Number(winAmount) || 0,
      multiplier: Number(multiplier) || 0,
    });
  }

  res.json({ success: true, balance: newBalance });
});

// Deposits list
app.get('/api/deposits', (req, res) => {
  const { userId, status } = req.query;
  let list = storage.getAllDeposits();
  if (userId) {
    list = list.filter(d => d.userId === userId);
  }
  if (status) {
    list = list.filter(d => d.status === status);
  }
  res.json({ success: true, deposits: list });
});

// Create manual UPI deposit
app.post('/api/deposits', (req, res) => {
  const { userId, amount, utr } = req.body;
  if (!userId || !amount || !utr) {
    return res.status(400).json({ success: false, error: 'Missing required deposit fields' });
  }

  const result = storage.createDeposit(userId, Number(amount), utr);
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Notify admin dashboard and all clients via WebSocket
  io.emit('deposit:new', result.deposit);

  res.json(result);
});

// Admin Approve Deposit
app.post('/api/admin/deposits/:id/approve', (req, res) => {
  const depositId = req.params.id;
  const result = storage.approveDeposit(depositId);
  if (!result.success) {
    return res.status(400).json(result);
  }

  const deposit = result.deposit!;
  // 1. Emit real-time wallet update to the target user room and globally
  io.to(`user_${deposit.userId}`).emit('wallet:update', {
    balance: result.newBalance,
    reason: 'DEPOSIT_APPROVED',
    amount: deposit.amount,
    depositId: deposit.id,
    utr: deposit.utr,
  });

  // 2. Broadcast deposit status updated
  io.emit('deposit:updated', deposit);

  res.json({ success: true, deposit, newBalance: result.newBalance });
});

// Admin Reject Deposit
app.post('/api/admin/deposits/:id/reject', (req, res) => {
  const depositId = req.params.id;
  const { reason } = req.body;
  const result = storage.rejectDeposit(depositId, reason);
  if (!result.success) {
    return res.status(400).json(result);
  }

  const deposit = result.deposit!;
  io.to(`user_${deposit.userId}`).emit('deposit:rejected', {
    deposit,
    reason: deposit.rejectReason,
  });

  io.emit('deposit:updated', deposit);

  res.json({ success: true, deposit });
});

// Admin Simulator: Create a mock pending deposit to test approval flow
app.post('/api/admin/test-deposit', (req, res) => {
  const { userId, amount } = req.body;
  const targetUser = userId || 'user_demo_1';
  const testAmount = Number(amount) || [500, 1000, 2000, 5000][Math.floor(Math.random() * 4)];
  const randomUtr = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');

  const result = storage.createDeposit(targetUser, testAmount, randomUtr);
  if (result.success && result.deposit) {
    io.emit('deposit:new', result.deposit);
  }
  res.json(result);
});

// Admin Top-up / Reset Balance
app.post('/api/admin/user/:id/balance', (req, res) => {
  const { amount, mode } = req.body;
  const userId = req.params.id;
  const val = Number(amount);
  let newBalance: number;

  if (mode === 'set') {
    const u = storage.getUser(userId);
    u.balance = Math.max(0, val);
    newBalance = u.balance;
  } else {
    newBalance = storage.addBalance(userId, val);
  }

  io.to(`user_${userId}`).emit('wallet:update', {
    balance: newBalance,
    reason: 'ADMIN_ADJUSTMENT',
  });

  res.json({ success: true, balance: newBalance });
});

// Get all users (for Admin dashboard)
app.get('/api/admin/users', (req, res) => {
  const users = storage.getAllUsers();
  res.json({ success: true, users });
});

// ==========================================
// GIFTCARD / VOUCHER ROUTES
// ==========================================

// Redeem a gift card
app.post('/api/giftcards/redeem', (req, res) => {
  const { userId, code } = req.body;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Please login or register to redeem gift cards.' });
  }

  const result = storage.claimGiftCard(userId, code);
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Real-time wallet update to user socket
  io.to(`user_${userId}`).emit('wallet:update', {
    balance: result.newBalance,
    reason: 'GIFTCARD_CLAIMED',
    amount: result.amount,
    code: result.code,
  });

  res.json(result);
});

// Get all gift cards (for Admin)
app.get('/api/giftcards', (req, res) => {
  const cards = storage.getAllGiftCards();
  res.json({ success: true, giftCards: cards });
});

// Admin Create new gift card
app.post('/api/giftcards/create', (req, res) => {
  const { code, amount, maxClaims, description } = req.body;
  const result = storage.createGiftCard(code, Number(amount), maxClaims ? Number(maxClaims) : undefined, description);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Admin Toggle gift card active
app.post('/api/giftcards/:id/toggle', (req, res) => {
  const result = storage.toggleGiftCardActive(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Admin Delete gift card
app.delete('/api/giftcards/:id', (req, res) => {
  const success = storage.deleteGiftCard(req.params.id);
  res.json({ success });
});

// ==========================================
// SOCKET.IO EVENT HANDLERS
// ==========================================

io.on('connection', (socket) => {
  let currentUserId: string | null = null;

  // Client identifies user
  socket.on('user:join', ({ userId }) => {
    currentUserId = userId;
    socket.join(`user_${userId}`);
    const user = storage.getUser(userId);
    socket.emit('wallet:update', { balance: user.balance, user });

    // Send current game states on connection
    socket.emit('crash:state', gameEngine.skyHighState);
    socket.emit('crash:state', gameEngine.skyHighBlackState);
    socket.emit('seven:state', gameEngine.sevenUpDownState);
  });

  // Crash Bet placement
  socket.on('crash:place_bet', ({ gameId, userId, amount, targetMultiplier }, callback) => {
    const result = gameEngine.placeCrashBet(
      gameId || 'sky-high',
      userId,
      Number(amount),
      targetMultiplier ? Number(targetMultiplier) : undefined
    );
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  // Crash Cashout
  socket.on('crash:cashout', ({ gameId, userId }, callback) => {
    const result = gameEngine.cashoutCrashBet(gameId || 'sky-high', userId);
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  // 7 Up 7 Down Bet placement
  socket.on('seven:place_bet', ({ userId, choice, amount }, callback) => {
    const result = gameEngine.placeSevenBet(userId, choice, Number(amount));
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  socket.on('disconnect', () => {
    // client disconnected
  });
});

// ==========================================
// VITE OR STATIC ASSETS MOUNTING
// ==========================================

async function startServer() {
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`4TimeBet Portal running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
