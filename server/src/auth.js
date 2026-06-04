import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'quiz-app-secret-change-in-production';

export function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '24h',
  });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function organizerOnly(req, res, next) {
  if (req.user.role !== 'organizer') {
    return res.status(403).json({ error: 'Organizer access required' });
  }
  next();
}
