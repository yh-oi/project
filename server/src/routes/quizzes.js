import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = Router();

// GET /api/quizzes
router.get('/', async (req, res) => {
  const db = await getDb();
  const quizzes = db.prepare(
    'SELECT * FROM quizzes WHERE organizer_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ quizzes });
});

// GET /api/quizzes/:id
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(quiz.id);
  const questionsWithOptions = questions.map((q) => {
    const options = db.prepare('SELECT * FROM options WHERE question_id = ?').all(q.id);
    return { ...q, options };
  });
  res.json({ quiz: { ...quiz, questions: questionsWithOptions } });
});

// POST /api/quizzes
router.post('/', async (req, res) => {
  const db = await getDb();
  const { title, description, time_limit } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const room_code = uuidv4().slice(0, 6).toUpperCase();
  const result = db.prepare(
    'INSERT INTO quizzes (organizer_id, title, description, time_limit, room_code) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, title, description || '', time_limit || 60, room_code);

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ quiz });
});

// PUT /api/quizzes/:id
router.put('/:id', async (req, res) => {
  const db = await getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const { title, description, time_limit } = req.body;
  db.prepare(
    'UPDATE quizzes SET title = ?, description = ?, time_limit = ? WHERE id = ?'
  ).run(
    title ?? quiz.title,
    description ?? quiz.description,
    time_limit ?? quiz.time_limit,
    quiz.id
  );

  const updated = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quiz.id);
  res.json({ quiz: updated });
});

// DELETE /api/quizzes/:id
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.id, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  db.prepare('DELETE FROM quizzes WHERE id = ?').run(quiz.id);
  res.json({ success: true });
});

export default router;
