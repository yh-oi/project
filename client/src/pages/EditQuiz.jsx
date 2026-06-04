import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quizzes as quizzesApi } from '../lib/api';

const QUESTION_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
];

const CHOICE_TYPES = [
  { value: 'single', label: 'Single choice' },
  { value: 'multiple', label: 'Multiple choice' },
];

function QuestionForm({ question, index, onSave, onDelete, onCancel }) {
  const isNew = !question.id;
  const [form, setForm] = useState({
    type: question.type || 'text',
    choice_type: question.choice_type || 'single',
    content: question.content || '',
    image_url: question.image_url || '',
    options: question.options?.length
      ? question.options.map(o => ({ content: o.content, is_correct: !!o.is_correct }))
      : [
          { content: '', is_correct: true },
          { content: '', is_correct: false },
        ],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    if (form.options.length >= 6) return;
    setForm(p => ({ ...p, options: [...p.options, { content: '', is_correct: false }] }));
  };

  const removeOption = (i) => {
    if (form.options.length <= 2) return;
    setForm(p => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }));
  };

  const updateOption = (i, field, value) => {
    setForm(p => ({
      ...p,
      options: p.options.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.content.trim()) { setError('Enter question text'); return; }
    const hasCorrect = form.options.some(o => o.is_correct);
    if (!hasCorrect) { setError('Mark at least one correct answer'); return; }
    if (form.choice_type === 'single' && form.options.filter(o => o.is_correct).length > 1) {
      setError('Single choice must have exactly one correct answer'); return;
    }
    if (form.type === 'image' && !form.image_url.trim()) {
      setError('Add an image URL for image questions'); return;
    }

    setSaving(true);
    try {
      await onSave(form, question.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card border-2 border-primary-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">
          {isNew ? 'New Question' : `Question ${index + 1}`}
        </h3>
        {!isNew && (
          <button type="button" onClick={() => onDelete(question.id)} className="btn-danger text-sm !py-1">
            Delete
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Question Type</label>
            <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Choice Type</label>
            <select className="input" value={form.choice_type} onChange={e => setForm(p => ({ ...p, choice_type: e.target.value }))}>
              {CHOICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Question Text</label>
          <textarea className="input" rows={2} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Enter question..." />
        </div>

        {form.type === 'image' && (
          <div>
            <label className="label">Image URL</label>
            <input type="url" className="input" value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://example.com/image.jpg" />
            {form.image_url && (
              <img src={form.image_url} alt="Preview" className="mt-2 max-h-40 rounded-lg" onError={e => { e.target.style.display = 'none'; }} />
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Answer Options</label>
            {form.options.length < 6 && (
              <button type="button" onClick={addOption} className="text-sm text-primary-600 hover:text-primary-700">+ Add Option</button>
            )}
          </div>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={form.choice_type === 'single' ? 'radio' : 'checkbox'}
                  name="correct_option"
                  checked={opt.is_correct}
                  onChange={e => updateOption(i, 'is_correct', e.target.checked)}
                  className="w-4 h-4 text-primary-600"
                />
                <input
                  type="text"
                  className="input flex-1"
                  value={opt.content}
                  onChange={e => updateOption(i, 'content', e.target.value)}
                  placeholder={`Option ${i + 1}`}
                />
                {form.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="text-red-500 hover:text-red-700 text-lg leading-none px-1">&times;</button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {form.choice_type === 'single' ? 'Select one correct answer (radio)' : 'Select one or more correct answers (checkbox)'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isNew ? 'Add Question' : 'Save'}
        </button>
        {!isNew && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}
      </div>
    </form>
  );
}

export default function EditQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const loadQuiz = useCallback(async () => {
    try {
      const data = await quizzesApi.get(id);
      setQuiz(data.quiz);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  const handleSaveQuestion = async (form, questionId) => {
    if (questionId) {
      await quizzesApi.updateQuestion(quiz.id, questionId, form);
    } else {
      await quizzesApi.addQuestion(quiz.id, form);
    }
    setShowNewQuestion(false);
    setEditingQuestionId(null);
    await loadQuiz();
  };

  const handleDeleteQuestion = async (qid) => {
    if (!confirm('Delete this question?')) return;
    await quizzesApi.deleteQuestion(quiz.id, qid);
    await loadQuiz();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Error loading quiz</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const questions = quiz.questions || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="text-gray-600 mt-1">
            Questions: {questions.length} · {quiz.time_limit}s/question
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/quiz/${quiz.id}/lobby`)} className="btn-accent" disabled={questions.length === 0}>
            ▶️ Launch
          </button>
          <Link to="/dashboard" className="btn-secondary">Back</Link>
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="mb-4">
          {editingQuestionId === q.id ? (
            <QuestionForm
              question={q}
              index={i}
              onSave={handleSaveQuestion}
              onDelete={handleDeleteQuestion}
              onCancel={() => setEditingQuestionId(null)}
            />
          ) : (
            <div className="card flex items-start justify-between hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-blue">#{i + 1}</span>
                  <span className="badge-gray">{q.type} / {q.choice_type}</span>
                </div>
                <p className="font-medium">{q.content}</p>
                {q.image_url && <img src={q.image_url} alt="" className="mt-2 max-h-32 rounded" />}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {q.options?.map(o => (
                    <span key={o.id} className={`text-xs px-2 py-0.5 rounded ${o.is_correct ? 'bg-green-100 text-green-800 font-medium' : 'bg-gray-100 text-gray-600'}`}>
                      {o.content}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setEditingQuestionId(q.id)} className="btn-secondary text-sm !py-1 ml-4 flex-shrink-0">
                ✏️
              </button>
            </div>
          )}
        </div>
      ))}

      {showNewQuestion ? (
        <div className="mb-4">
          <QuestionForm
            question={{}}
            index={questions.length}
            onSave={handleSaveQuestion}
            onDelete={() => {}}
            onCancel={() => setShowNewQuestion(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => { setShowNewQuestion(true); setEditingQuestionId(null); }}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          + Add Question
        </button>
      )}
    </div>
  );
}
