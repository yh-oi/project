import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { generateToken } from '../auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const db = await getDb();
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const userRole = role === 'organizer' ? 'organizer' : 'participant';

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, password_hash, userRole);

  const user = { id: result.lastInsertRowid, username, role: userRole };
  const token = generateToken(user);

  res.status(201).json({ user, token });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const db = await getDb();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user);
  res.json({
    user: { id: user.id, username: user.username, role: user.role },
    token,
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const db = await getDb();
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

export default router;
