import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// POST /api/quizzes/:quizId/questions
router.post('/:quizId/questions', async (req, res) => {
  const db = await getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?').get(req.params.quizId, req.user.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const { type, choice_type, content, image_url, options } = req.body;
  if (!type || !choice_type || !content) {
    return res.status(400).json({ error: 'type, choice_type, and content are required' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM questions WHERE quiz_id = ?').get(quiz.id);
  const sort_order = (maxOrder?.max ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO questions (quiz_id, type, choice_type, content, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(quiz.id, type, choice_type, content, image_url || null, sort_order);

  const questionId = result.lastInsertRowid;

  if (options && Array.isArray(options)) {
    for (const opt of options) {
      db.prepare(
        'INSERT INTO options (question_id, content, is_correct) VALUES (?, ?, ?)'
      ).run(questionId, opt.content, opt.is_correct ? 1 : 0);
    }
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  const opts = db.prepare('SELECT * FROM options WHERE question_id = ?').all(questionId);
  res.status(201).json({ question: { ...question, options: opts } });
});

// PUT /api/questions/:id
router.put('/questions/:id', async (req, res) => {
  const db = await getDb();
  const question = db.prepare(
    `SELECT q.* FROM questions q
     JOIN quizzes z ON q.quiz_id = z.id
     WHERE q.id = ? AND z.organizer_id = ?`
  ).get(req.params.id, req.user.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const { type, choice_type, content, image_url, options } = req.body;
  db.prepare(
    'UPDATE questions SET type = ?, choice_type = ?, content = ?, image_url = ? WHERE id = ?'
  ).run(
    type ?? question.type,
    choice_type ?? question.choice_type,
    content ?? question.content,
    image_url ?? question.image_url,
    question.id
  );

  if (options && Array.isArray(options)) {
    db.prepare('DELETE FROM options WHERE question_id = ?').run(question.id);
    for (const opt of options) {
      db.prepare(
        'INSERT INTO options (question_id, content, is_correct) VALUES (?, ?, ?)'
      ).run(question.id, opt.content, opt.is_correct ? 1 : 0);
    }
  }

  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(question.id);
  const opts = db.prepare('SELECT * FROM options WHERE question_id = ?').all(question.id);
  res.json({ question: { ...updated, options: opts } });
});

// DELETE /api/questions/:id
router.delete('/questions/:id', async (req, res) => {
  const db = await getDb();
  const question = db.prepare(
    `SELECT q.* FROM questions q
     JOIN quizzes z ON q.quiz_id = z.id
     WHERE q.id = ? AND z.organizer_id = ?`
  ).get(req.params.id, req.user.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  db.prepare('DELETE FROM questions WHERE id = ?').run(question.id);
  res.json({ success: true });
});

export default router;
