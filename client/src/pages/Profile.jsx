import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { results } from '../lib/api';

export default function Profile() {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    results.my()
      .then(data => setScores(data.scores || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-3xl">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.username}</h1>
            <p className="text-gray-600">{user?.email}</p>
            <span className={user?.role === 'organizer' ? 'badge-blue mt-1' : 'badge-green mt-1'}>
              {user?.role === 'organizer' ? '🎤 Organizer' : '🎮 Participant'}
            </span>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

      <h2 className="text-xl font-bold mb-4">Quiz History</h2>

      {scores.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-xl font-bold mb-2">No participations</h2>
          <p className="text-gray-600">You haven't participated in any quizzes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((s) => (
            <div key={s.id} className="card flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <h3 className="font-bold">{s.quiz_title}</h3>
                <p className="text-sm text-gray-500">
                  Room: {s.room_code} · {new Date(s.completed_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{s.score} pts</div>
                <div className="text-sm text-gray-500">/{s.total}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
