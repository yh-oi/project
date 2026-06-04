import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

export default function PlayerRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { user } = useAuth();

  const [status, setStatus] = useState('loading');
  const [participantCount, setParticipantCount] = useState(0);
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [quizId, setQuizId] = useState(null);

  useEffect(() => {
    if (!socket || !roomCode || !user) return;

    socket.emit('join-room', { roomCode, user: { id: user.id, username: user.username } });

    socket.on('participant-joined', (data) => {
      setParticipantCount(data.total);
      setStatus('waiting');
    });

    socket.on('show-question', (data) => {
      setQuestion(data.question);
      setOptions(data.question.options || []);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.timeLimit);
      setSubmitted(false);
      setSelectedOptions([]);
      setStatus('active');
    });

    socket.on('quiz-ended', (data) => {
      setStatus('finished');
      setFinalLeaderboard(data.leaderboard);
      setQuestion(null);
      setOptions([]);
    });

    socket.on('error', (data) => {
      setError(data.message);
    });

    return () => {
      socket.off('participant-joined');
      socket.off('show-question');
      socket.off('quiz-ended');
      socket.off('error');
    };
  }, [socket, roomCode, user]);

  useEffect(() => {
    if (timeLeft <= 0 || status !== 'active' || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, status, submitted]);

  const toggleOption = (optionId) => {
    if (submitted || !question) return;
    const optionIdStr = String(optionId);

    if (question.choice_type === 'single') {
      setSelectedOptions([optionIdStr]);
    } else {
      setSelectedOptions(prev =>
        prev.includes(optionIdStr)
          ? prev.filter(id => id !== optionIdStr)
          : [...prev, optionIdStr]
      );
    }
  };

  const submitAnswer = () => {
    if (submitted || selectedOptions.length === 0 || !socket || !question) return;

    // Get quizId from socket rooms or store it
    socket.emit('submit-answer', {
      quizId: quizId,
      questionId: question.id,
      selectedOptionIds: selectedOptions,
    });

    setSubmitted(true);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to room {roomCode}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">
          Room: <span className="font-mono font-bold">{roomCode}</span>
        </div>
        <div className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? '🟢' : '🔴'}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4">{error}</div>}

      {/* Waiting */}
      {status === 'waiting' && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-6 animate-bounce">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Waiting to Start</h2>
          <p className="text-gray-600 mb-4">The organizer will start the quiz soon</p>
          <div className="text-4xl font-bold text-primary-600">{participantCount}</div>
          <p className="text-gray-500">participants in room</p>
        </div>
      )}

      {/* Active question */}
      {status === 'active' && question && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="badge-blue">Question {questionIndex + 1} of {totalQuestions}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold ${
              timeLeft <= 5 ? 'border-red-500 text-red-600 animate-pulse' :
              timeLeft <= 10 ? 'border-yellow-500 text-yellow-600' :
              'border-primary-500 text-primary-600'
            }`}>
              {timeLeft}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="badge-gray">
                {question.choice_type === 'single' ? 'Single answer' : 'Multiple answers'}
              </span>
            </div>

            <h2 className="text-xl font-bold mb-4">{question.content}</h2>

            {question.image_url && (
              <img
                src={question.image_url}
                alt="Question"
                className="mb-4 max-h-64 rounded-lg mx-auto"
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}

            <div className="space-y-3">
              {options.map(opt => {
                const isSelected = selectedOptions.includes(String(opt.id));

                let optClass = 'border-gray-200 hover:border-primary-300 hover:bg-primary-50';
                if (submitted) {
                  optClass = 'border-gray-200 opacity-60';
                } else if (isSelected) {
                  optClass = 'border-primary-500 bg-primary-50 ring-2 ring-primary-200';
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    disabled={submitted}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${optClass} ${
                      submitted ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-${question.choice_type === 'single' ? 'full' : 'lg'} border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <span className="text-white text-sm">{question.choice_type === 'single' ? '●' : '✓'}</span>
                        )}
                      </div>
                      <span className="font-medium">{opt.content}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {!submitted && (
              <button
                onClick={submitAnswer}
                disabled={selectedOptions.length === 0}
                className="btn-primary w-full !py-3 mt-6 text-lg"
              >
                {selectedOptions.length > 0 ? 'Submit Answer 🔒' : 'Select an answer'}
              </button>
            )}

            {submitted && (
              <div className="mt-4 text-center text-green-600 font-medium">
                ✅ Answer submitted! Waiting...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finished */}
      {status === 'finished' && (
        <div className="space-y-6">
          <div className="card text-center bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-gray-600">Thanks for participating!</p>
          </div>

          {finalLeaderboard.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-xl mb-4">🏆 Final Rankings</h3>
              <div className="space-y-2">
                {finalLeaderboard.map((p, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                    p.username === user?.username ? 'bg-primary-50 border border-primary-200' :
                    i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'border-b'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yellow-400 text-white text-xl' :
                        i === 1 ? 'bg-gray-300 text-white' :
                        i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <div>
                        <div className="font-bold">{p.username}</div>
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

          <div className="text-center flex gap-3 justify-center">
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              Dashboard
            </button>
            <button onClick={() => navigate('/join')} className="btn-secondary">
              Another Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
