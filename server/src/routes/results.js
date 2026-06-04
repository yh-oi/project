import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET /api/results/my
router.get('/my', async (req, res) => {
  const db = await getDb();
  const scores = db.prepare(`
    SELECT s.*, q.title as quiz_title, q.room_code
    FROM scores s JOIN quizzes q ON s.quiz_id = q.id
    WHERE s.user_id = ?
    ORDER BY s.completed_at DESC
  `).all(req.user.id);
  res.json({ scores });
});

// GET /api/results/quiz/:quizId
router.get('/quiz/:quizId', async (req, res) => {
  const db = await getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const leaderboard = db.prepare(`
    SELECT s.*, u.username
    FROM scores s JOIN users u ON s.user_id = u.id
    WHERE s.quiz_id = ?
    ORDER BY s.score DESC, s.completed_at ASC
  `).all(quiz.id);

  res.json({ quiz, leaderboard });
});

export default router;
