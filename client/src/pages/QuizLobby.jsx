import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { quizzes } from '../lib/api';

export default function QuizLobby() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [quiz, setQuiz] = useState(null);
  const [status, setStatus] = useState('loading');
  const [participantCount, setParticipantCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    quizzes.get(id)
      .then(data => setQuiz(data.quiz))
      .catch(err => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!socket || !quiz) return;

    socket.on('room-state', (data) => {
      setStatus(data.status);
      setParticipantCount(data.participantCount);
    });

    socket.on('room-opened', (data) => {
      setRoomCode(data.roomCode);
    });

    socket.on('participant-joined', (data) => {
      setParticipantCount(data.total);
    });

    socket.on('participant-left', (data) => {
      setParticipantCount(data.total);
    });

    socket.on('show-question', (data) => {
      setCurrentQuestion(data.question);
      setCurrentOptions(data.question.options || []);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.timeLimit);
      setAnswersCount(0);
    });

    socket.on('answer-submitted', (data) => {
      setAnswersCount(data.responded);
    });

    socket.on('quiz-ended', (data) => {
      setStatus('finished');
      setLeaderboard(data.leaderboard);
      setCurrentQuestion(null);
    });

    socket.on('error', (data) => {
      setError(data.message);
    });

    return () => {
      socket.off('room-state');
      socket.off('room-opened');
      socket.off('participant-joined');
      socket.off('participant-left');
      socket.off('show-question');
      socket.off('answer-submitted');
      socket.off('quiz-ended');
      socket.off('error');
    };
  }, [socket, quiz]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOpenRoom = () => {
    if (!socket || !quiz) return;
    setStatus('waiting');
    socket.emit('open-room', { quizId: quiz.id });
  };

  const handleStartQuiz = () => {
    if (!socket || !quiz) return;
    socket.emit('start-quiz', { quizId: quiz.id });
  };

  const handleNextQuestion = () => {
    if (!socket || !quiz) return;
    socket.emit('next-question', { quizId: quiz.id });
  };

  const handleFinishQuiz = () => {
    if (!socket || !quiz) return;
    if (!confirm('End the quiz? Results will be shown to participants.')) return;
    socket.emit('end-quiz', { quizId: quiz.id });
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-primary-600 mb-4 inline-block">
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
      <p className="text-gray-600 mb-6">Quiz Control Panel</p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4">{error}</div>}

      {status !== 'loading' && (
        <div className={`text-sm mb-4 ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      )}

      {/* Not started — open room */}
      {(status === 'loading' || !roomCode) && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-2">Ready to Launch</h2>
          <p className="text-gray-600 mb-6">
            {quiz.questions?.length || 0} questions in this quiz
          </p>
          <button onClick={handleOpenRoom} className="btn-primary text-lg !px-8 !py-3">
            Create Room
          </button>
        </div>
      )}

      {/* Waiting for players */}
      {status === 'waiting' && roomCode && (
        <div className="space-y-6">
          <div className="card text-center bg-gradient-to-br from-primary-50 to-accent-50 border-primary-200">
            <p className="text-sm text-gray-600 mb-2">Room Code</p>
            <div className="text-6xl font-bold tracking-[0.3em] text-primary-700 mb-4 font-mono select-all">
              {roomCode}
            </div>
            <button onClick={copyRoomCode} className="btn-outline mb-2">
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Send this code to participants to join
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-2">👥 {participantCount}</div>
            <p className="text-gray-600 mb-4">participants in room</p>
            <button onClick={handleStartQuiz} className="btn-accent text-lg !px-8 !py-3">
              Start Quiz!
            </button>
          </div>
        </div>
      )}

      {/* Active quiz */}
      {status === 'active' && (
        <div className="space-y-6">
          <div className="card flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold">{questionIndex + 1}</span>
              <span className="text-gray-500"> / {totalQuestions}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg font-bold">{participantCount}</div>
                <div className="text-xs text-gray-500">participants</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{answersCount}</div>
                <div className="text-xs text-gray-500">answers</div>
              </div>
            </div>
            <button onClick={handleFinishQuiz} className="btn-danger text-sm">
              End Quiz
            </button>
          </div>

          {currentQuestion ? (
            <div className="card border-2 border-primary-200">
              <div className="flex items-center justify-between mb-4">
                <span className="badge-blue">Question {questionIndex + 1}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : ''}`}>
                    ⏱ {timeLeft}s
                  </span>
                </div>
              </div>

              <h2 className="text-xl font-bold mb-4">{currentQuestion.content}</h2>
              {currentQuestion.image_url && (
                <img src={currentQuestion.image_url} alt="" className="mb-4 max-h-64 rounded-lg" />
              )}

              <div className="grid grid-cols-2 gap-3">
                {currentOptions.map(o => (
                  <div key={o.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-center">
                    {o.content}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${participantCount > 0 ? (answersCount / participantCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{answersCount}/{participantCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-gray-600 mb-4">Ready for the next question?</p>
              <button onClick={handleNextQuestion} className="btn-primary text-lg !px-8 !py-3">
                {questionIndex < totalQuestions - 1 ? 'Next Question ▶️' : 'Show Results 🏆'}
              </button>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-lg mb-4">🏆 Current Rankings</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-yellow-400 text-white' :
                        i === 1 ? 'bg-gray-300 text-white' :
                        i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-medium">{p.username}</span>
                    </div>
                    <span className="font-bold">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Finished */}
      {status === 'finished' && (
        <div className="space-y-6">
          <div className="card text-center bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-gray-600">Results have been saved</p>
          </div>

          {leaderboard.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-xl mb-4">🏆 Final Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.map((p, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                    i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'border-b'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        i === 0 ? 'bg-yellow-400 text-white text-2xl' :
                        i === 1 ? 'bg-gray-300 text-white' :
                        i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <div>
                        <div className="font-bold text-lg">{p.username}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl">{p.score}</div>
                      <div className="text-xs text-gray-500">/{p.total} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
