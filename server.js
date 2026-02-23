import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database('petty_cash.db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'accountant', 'employee')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    fund_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    receipt_url TEXT,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(fund_id) REFERENCES funds(id),
    FOREIGN KEY(approved_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Helper for audit logs
const logAction = (userId, action, details) => {
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details);
};

// Seed Admin User if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@company.com');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('System Admin', 'admin@company.com', hashedPassword, 'admin');
  
  // Seed some other roles for testing
  const accountantPassword = bcrypt.hashSync('acc123', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('John Accountant', 'accountant@company.com', accountantPassword, 'accountant');
  
  const employeePassword = bcrypt.hashSync('emp123', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Jane Employee', 'employee@company.com', employeePassword, 'employee');
}

const app = express();
app.use(express.json());

// File Upload Setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use('/uploads', express.static('uploads'));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashedPassword, role);
    logAction(result.lastInsertRowid, 'USER_REGISTER', `New user ${email} registered as ${role}`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
  logAction(user.id, 'LOGIN', `User ${user.email} logged in`);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Users Management (Admin)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashedPassword, role);
    logAction(req.user.id, 'USER_CREATE', `Created user ${email} with role ${role}`);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logAction(req.user.id, 'USER_DELETE', `Deleted user ID ${req.params.id}`);
  res.json({ success: true });
});

app.patch('/api/users/me/password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = Number(req.user.id);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isMatch = bcrypt.compareSync(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNewPassword, userId);
    logAction(userId, 'PASSWORD_CHANGE', `User ${user.email} changed their password`);
    res.json({ success: true });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Funds
app.get('/api/funds', authenticateToken, (req, res) => {
  const funds = db.prepare('SELECT * FROM funds').all();
  res.json(funds);
});

app.post('/api/funds', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { fund_name, total_amount } = req.body;
  const result = db.prepare('INSERT INTO funds (fund_name, total_amount, remaining_amount, created_by) VALUES (?, ?, ?, ?)').run(fund_name, total_amount, total_amount, req.user.id);
  logAction(req.user.id, 'FUND_CREATE', `Created fund ${fund_name} with AED ${total_amount}`);
  res.json({ id: result.lastInsertRowid });
});

app.patch('/api/funds/:id/topup', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { amount } = req.body;
  db.prepare('UPDATE funds SET total_amount = total_amount + ?, remaining_amount = remaining_amount + ? WHERE id = ?').run(amount, amount, req.params.id);
  logAction(req.user.id, 'FUND_TOPUP', `Topped up fund ID ${req.params.id} with AED ${amount}`);
  res.json({ success: true });
});

app.delete('/api/funds/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  db.prepare('DELETE FROM funds WHERE id = ?').run(req.params.id);
  logAction(req.user.id, 'FUND_DELETE', `Deleted fund ID ${req.params.id}`);
  res.json({ success: true });
});

// Expenses
app.get('/api/expenses', authenticateToken, (req, res) => {
  let query = `
    SELECT e.*, u.name as employee_name, f.fund_name 
    FROM expenses e 
    JOIN users u ON e.user_id = u.id 
    JOIN funds f ON e.fund_id = f.id
  `;
  const params = [];

  if (req.user.role === 'employee') {
    query += ' WHERE e.user_id = ?';
    params.push(req.user.id);
  }

  query += ' ORDER BY e.created_at DESC';
  const expenses = db.prepare(query).all(...params);
  res.json(expenses);
});

app.post('/api/expenses', authenticateToken, upload.single('receipt'), (req, res) => {
  const { fund_id, amount, category, description } = req.body;
  const receipt_url = req.file ? `/uploads/${req.file.filename}` : null;
  
  const result = db.prepare(`
    INSERT INTO expenses (user_id, fund_id, amount, category, description, receipt_url) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, fund_id, amount, category, description, receipt_url);
  
  logAction(req.user.id, 'EXPENSE_SUBMIT', `Submitted expense of AED ${amount} for ${category}`);
  res.json({ id: result.lastInsertRowid });
});

app.patch('/api/expenses/:id', authenticateToken, upload.single('receipt'), (req, res) => {
  const { amount, category, description } = req.body;
  const expenseId = req.params.id;
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  if (expense.user_id !== req.user.id) return res.sendStatus(403);
  if (expense.status !== 'pending') return res.status(400).json({ error: 'Only pending expenses can be edited' });

  let query = 'UPDATE expenses SET amount = ?, category = ?, description = ?';
  const params = [amount, category, description];

  if (req.file) {
    query += ', receipt_url = ?';
    params.push(`/uploads/${req.file.filename}`);
  }

  query += ' WHERE id = ?';
  params.push(expenseId);

  db.prepare(query).run(...params);
  logAction(req.user.id, 'EXPENSE_EDIT', `Edited expense ID ${expenseId}`);
  res.json({ success: true });
});

app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  const expenseId = req.params.id;
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  if (expense.user_id !== req.user.id && req.user.role !== 'admin') return res.sendStatus(403);
  if (expense.status !== 'pending' && req.user.role !== 'admin') return res.status(400).json({ error: 'Only pending expenses can be deleted' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
  logAction(req.user.id, 'EXPENSE_DELETE', `Deleted expense ID ${expenseId}`);
  res.json({ success: true });
});

app.patch('/api/expenses/:id/status', authenticateToken, (req, res) => {
  if (req.user.role === 'employee') return res.sendStatus(403);
  const { status } = req.body;
  const expenseId = req.params.id;

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  if (expense.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

  if (status === 'approved') {
    const fund = db.prepare('SELECT * FROM funds WHERE id = ?').get(expense.fund_id);
    if (fund.remaining_amount < expense.amount) {
      return res.status(400).json({ error: 'Insufficient fund balance' });
    }
    
    const updateFund = db.transaction(() => {
      db.prepare('UPDATE funds SET remaining_amount = remaining_amount - ? WHERE id = ?').run(expense.amount, expense.fund_id);
      db.prepare('UPDATE expenses SET status = ?, approved_by = ? WHERE id = ?').run('approved', req.user.id, expenseId);
    });
    updateFund();
    logAction(req.user.id, 'EXPENSE_APPROVE', `Approved expense ID ${expenseId} of AED ${expense.amount}`);
  } else {
    db.prepare('UPDATE expenses SET status = ?, approved_by = ? WHERE id = ?').run('rejected', req.user.id, expenseId);
    logAction(req.user.id, 'EXPENSE_REJECT', `Rejected expense ID ${expenseId}`);
  }

  res.json({ success: true });
});

// Dashboard Stats
app.get('/api/stats', authenticateToken, (req, res) => {
  try {
    const totalExpenses = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE status = 'approved'").get();
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status = 'pending'").get();
    const totalFunds = db.prepare("SELECT SUM(remaining_amount) as total FROM funds").get();
    
    const categoryStats = db.prepare(`
      SELECT category, SUM(amount) as total 
      FROM expenses 
      WHERE status = 'approved' 
      GROUP BY category
    `).all();

    res.json({
      totalApprovedExpenses: totalExpenses.total || 0,
      pendingRequests: pendingCount.count || 0,
      availableLiquidity: totalFunds.total || 0,
      categoryStats
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audit Logs
app.get('/api/audit-logs', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const logs = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 100
    `).all();
    res.json(logs);
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
