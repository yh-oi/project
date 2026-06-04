import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizzes as quizzesApi } from '../lib/api';

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    time_limit: 30,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Enter a quiz title');
      return;
    }
    setSubmitting(true);
    try {
      const data = await quizzesApi.create(form);
      navigate(`/quiz/${data.quiz.id}/edit`);
    } catch (err) {
      setError(err.message || 'Error creating quiz');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Quiz</h1>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="label">Quiz Title *</label>
          <input
            type="text"
            className="input"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            required
            maxLength={200}
            placeholder="e.g. History of the 20th Century"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            maxLength={1000}
            placeholder="Brief quiz description..."
          />
        </div>

        <div>
          <label className="label">Time per Question (seconds)</label>
          <input
            type="number"
            className="input w-32"
            value={form.time_limit}
            onChange={e => setForm(p => ({ ...p, time_limit: parseInt(e.target.value) || 30 }))}
            min={5}
            max={300}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1 !py-3" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create and Add Questions'}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary !py-3">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
