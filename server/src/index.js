import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { authMiddleware, organizerOnly } from './auth.js';
import authRoutes from './routes/auth.js';
import quizRoutes from './routes/quizzes.js';
import questionRoutes from './routes/questions.js';
import resultRoutes from './routes/results.js';
import { setupSocket } from './socket/quizHandler.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/quizzes', authMiddleware, organizerOnly, quizRoutes);
app.use('/api/quizzes', authMiddleware, organizerOnly, questionRoutes);
app.use('/api/results', authMiddleware, resultRoutes);

// Socket.IO
setupSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
