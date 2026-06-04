import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quizzes as quizzesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS = {
  draft: { label: 'Draft', cls: 'badge-gray' },
  active: { label: 'Active', cls: 'badge-yellow' },
  completed: { label: 'Completed', cls: 'badge-green' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [quizList, setQuizList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const data = await quizzesApi.list();
      setQuizList(data.quizzes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    try {
      await quizzesApi.delete(id);
      setQuizList(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Quizzes</h1>
          <p className="text-gray-600 mt-1">
            {user.role === 'organizer' ? 'Manage your created quizzes' : 'Participation history'}
          </p>
        </div>
        {user.role === 'organizer' && (
          <Link to="/quiz/create" className="btn-primary">
            + Create Quiz
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      {quizList.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold mb-2">No quizzes</h2>
          <p className="text-gray-600 mb-4">
            {user.role === 'organizer'
              ? 'Create your first quiz and launch it!'
              : 'Join a quiz using a room code.'}
          </p>
          {user.role === 'organizer' && (
            <Link to="/quiz/create" className="btn-primary">Create Quiz</Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {quizList.map(quiz => {
            const s = STATUS_LABELS[quiz.status] || STATUS_LABELS.draft;
            return (
              <div key={quiz.id} className="card flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg truncate">{quiz.title}</h3>
                    <span className={s.cls}>{s.label}</span>
                  </div>
                  <p className="text-gray-500 text-sm truncate">
                    {quiz.description || 'No description'} · {quiz.time_limit}s/question
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Room: {quiz.room_code}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link to={`/quiz/${quiz.id}/edit`} className="btn-secondary text-sm !py-1.5">
                    ✏️ Edit
                  </Link>
                  {quiz.status !== 'active' && (
                    <Link to={`/quiz/${quiz.id}/lobby`} className="btn-primary text-sm !py-1.5">
                      ▶️ Launch
                    </Link>
                  )}
                  <button onClick={() => handleDelete(quiz.id)} className="btn-danger text-sm !py-1.5">
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
