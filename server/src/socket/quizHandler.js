import { getDb } from '../db.js';

const rooms = {};

export function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Organizer creates/opens a room
    socket.on('open-room', async ({ quizId }) => {
      const db = await getDb();
      const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
      if (!quiz) return socket.emit('error', { message: 'Quiz not found' });

      const room = `quiz-${quizId}`;
      socket.join(room);

      if (!rooms[room]) {
        rooms[room] = {
          quizId,
          roomCode: quiz.room_code,
          participants: {},
          currentQuestionIndex: -1,
          questionStartTime: null,
          timeLimit: quiz.time_limit,
          status: 'waiting',
          responses: {},
        };
      }

      io.to(room).emit('room-state', {
        status: rooms[room].status,
        participantCount: Object.keys(rooms[room].participants).length,
        currentQuestionIndex: rooms[room].currentQuestionIndex,
      });

      socket.emit('room-opened', { roomCode: quiz.room_code });
    });

    // Participant joins by room code
    socket.on('join-room', async ({ roomCode, user }) => {
      const db = await getDb();
      const quiz = db.prepare('SELECT * FROM quizzes WHERE room_code = ?').get(roomCode);
      if (!quiz) return socket.emit('error', { message: 'Room not found' });

      const room = `quiz-${quiz.id}`;
      if (!rooms[room]) {
        return socket.emit('error', { message: 'Room is not open yet' });
      }

      socket.join(room);
      rooms[room].participants[socket.id] = { userId: user.id, username: user.username };

      io.to(room).emit('participant-joined', {
        username: user.username,
        total: Object.keys(rooms[room].participants).length,
      });
    });

    // Organizer starts the quiz
    socket.on('start-quiz', async ({ quizId }) => {
      const db = await getDb();
      const room = `quiz-${quizId}`;
      if (!rooms[room]) return;

      db.prepare('UPDATE quizzes SET status = ? WHERE id = ?').run('active', quizId);
      rooms[room].status = 'active';
      rooms[room].currentQuestionIndex = 0;

      const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(quizId);
      rooms[room].questions = questions;

      sendCurrentQuestion(io, room);
    });

    // Next question
    socket.on('next-question', async ({ quizId }) => {
      const db = await getDb();
      const room = `quiz-${quizId}`;
      if (!rooms[room]) return;

      rooms[room].currentQuestionIndex++;
      const questions = rooms[room].questions || [];

      if (rooms[room].currentQuestionIndex >= questions.length) {
        await finishQuiz(io, room);
      } else {
        sendCurrentQuestion(io, room);
      }
    });

    // Participant submits answer
    socket.on('submit-answer', async ({ quizId, questionId, selectedOptionIds }) => {
      const db = await getDb();
      const room = `quiz-${quizId}`;
      if (!rooms[room] || rooms[room].status !== 'active') return;

      const participant = rooms[room].participants[socket.id];
      if (!participant) return;

      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
      if (!question) return;

      // Check correctness
      const correctOptions = db.prepare(
        'SELECT id FROM options WHERE question_id = ? AND is_correct = 1'
      ).all(questionId).map((o) => String(o.id));

      const selected = selectedOptionIds.map(String).sort();
      const correctSorted = correctOptions.sort();
      const isCorrect =
        selected.length === correctSorted.length &&
        selected.every((id, i) => id === correctSorted[i]);

      // Save response
      db.prepare(
        'INSERT INTO responses (user_id, quiz_id, question_id, selected_option_ids, is_correct) VALUES (?, ?, ?, ?, ?)'
      ).run(participant.userId, quizId, questionId, JSON.stringify(selectedOptionIds), isCorrect ? 1 : 0);

      if (!rooms[room].responses[questionId]) {
        rooms[room].responses[questionId] = {};
      }
      rooms[room].responses[questionId][participant.userId] = { isCorrect, selectedOptionIds };

      io.to(room).emit('answer-submitted', {
        questionId,
        responded: Object.keys(rooms[room].responses[questionId] || {}).length,
        total: Object.keys(rooms[room].participants).length,
      });
    });

    // Organizer ends quiz early
    socket.on('end-quiz', async ({ quizId }) => {
      const room = `quiz-${quizId}`;
      if (!rooms[room]) return;
      await finishQuiz(io, room);
    });

    socket.on('disconnect', () => {
      for (const room of Object.keys(rooms)) {
        if (rooms[room].participants[socket.id]) {
          delete rooms[room].participants[socket.id];
          io.to(room).emit('participant-left', {
            total: Object.keys(rooms[room].participants).length,
          });
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

function sendCurrentQuestion(io, room) {
  const state = rooms[room];
  const questions = state.questions || [];
  const idx = state.currentQuestionIndex;

  if (idx < 0 || idx >= questions.length) return;

  const question = questions[idx];
  // We need the db here — but since this is called from socket handlers that already have db,
  // we need a different approach. Let's use getDb() directly.
  getDb().then((db) => {
    const options = db.prepare('SELECT id, content FROM options WHERE question_id = ?').all(question.id);

    state.questionStartTime = Date.now();

    io.to(room).emit('show-question', {
      questionIndex: idx,
      totalQuestions: questions.length,
      question: {
        id: question.id,
        type: question.type,
        choice_type: question.choice_type,
        content: question.content,
        image_url: question.image_url,
        options,
      },
      timeLimit: state.timeLimit,
      serverTime: Date.now(),
    });
  });
}

async function finishQuiz(io, room) {
  const db = await getDb();
  const state = rooms[room];
  state.status = 'finished';

  db.prepare('UPDATE quizzes SET status = ? WHERE id = ?').run('completed', state.quizId);

  // Calculate scores
  const questions = db.prepare('SELECT id FROM questions WHERE quiz_id = ?').all(state.quizId);
  const totalQuestions = questions.length;

  const userScores = {};
  for (const question of questions) {
    const responses = db.prepare(
      'SELECT user_id, is_correct FROM responses WHERE quiz_id = ? AND question_id = ?'
    ).all(state.quizId, question.id);

    for (const resp of responses) {
      if (!userScores[resp.user_id]) userScores[resp.user_id] = 0;
      if (resp.is_correct) userScores[resp.user_id]++;
    }
  }

  // Save scores
  for (const [userId, score] of Object.entries(userScores)) {
    db.prepare(
      'INSERT OR REPLACE INTO scores (user_id, quiz_id, score, total, completed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(userId, state.quizId, score, totalQuestions);
  }

  // Build leaderboard
  const leaderboard = db.prepare(`
    SELECT s.score, s.total, u.username
    FROM scores s JOIN users u ON s.user_id = u.id
    WHERE s.quiz_id = ?
    ORDER BY s.score DESC, s.completed_at ASC
  `).all(state.quizId);

  io.to(room).emit('quiz-ended', {
    leaderboard,
    roomCode: state.roomCode,
  });

  // Clean up after 5 minutes
  setTimeout(() => {
    delete rooms[room];
  }, 300000);
}
