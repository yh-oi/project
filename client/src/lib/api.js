const API_BASE = 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || 'Request error');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Auth API
export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
};

// Quiz API
export const quizzes = {
  list: () => request('/quizzes'),
  get: (id) => request(`/quizzes/${id}`),
  create: (body) => request('/quizzes', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/quizzes/${id}`, { method: 'DELETE' }),
  addQuestion: (quizId, body) =>
    request(`/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (quizId, qid, body) =>
    request(`/quizzes/questions/${qid}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteQuestion: (quizId, qid) =>
    request(`/quizzes/questions/${qid}`, { method: 'DELETE' }),
};

// Results API
export const results = {
  my: () => request('/results/my'),
  quiz: (quizId) => request(`/results/quiz/${quizId}`),
};

export default { auth, quizzes, results };
