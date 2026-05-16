const USER_QUESTIONS_KEY = 'practiceJs_userQuestions';

let _config = { type: 'local', baseUrl: '' };
let _callbacks = { onQuestionCreated: null, onQuestionUpdated: null, onQuestionDeleted: null };

export function configureStorage(opts) {
  _config = {
    type: (opts && opts.type) || 'local',
    baseUrl: (opts && opts.baseUrl) || '',
  };
  _callbacks = {
    onQuestionCreated: (opts && opts.onQuestionCreated) || null,
    onQuestionUpdated: (opts && opts.onQuestionUpdated) || null,
    onQuestionDeleted: (opts && opts.onQuestionDeleted) || null,
  };
}

export async function loadUserQuestions() {
  if (_config.type === 'server') {
    const res = await fetch(`${_config.baseUrl}/questions`);
    if (!res.ok) throw new Error(`loadUserQuestions failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
  try { return JSON.parse(localStorage.getItem(USER_QUESTIONS_KEY)) || []; }
  catch { return []; }
}

export async function saveUserQuestion(q) {
  const all = await loadUserQuestions();
  const idx = all.findIndex(x => x.id === q.id);
  const isUpdate = idx >= 0;

  if (_config.type === 'server') {
    const url = isUpdate
      ? `${_config.baseUrl}/questions/${q.id}`
      : `${_config.baseUrl}/questions`;
    const method = isUpdate ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q),
    });
    if (!res.ok) throw new Error(`saveUserQuestion failed: ${res.status}`);
    const saved = await res.json();
    if (isUpdate && _callbacks.onQuestionUpdated) _callbacks.onQuestionUpdated(saved);
    if (!isUpdate && _callbacks.onQuestionCreated) _callbacks.onQuestionCreated(saved);
    return saved;
  }

  // localStorage path
  if (idx >= 0) all[idx] = q; else all.push(q);
  localStorage.setItem(USER_QUESTIONS_KEY, JSON.stringify(all));
  if (isUpdate && _callbacks.onQuestionUpdated) _callbacks.onQuestionUpdated(q);
  if (!isUpdate && _callbacks.onQuestionCreated) _callbacks.onQuestionCreated(q);
  return q;
}

export async function deleteUserQuestion(id) {
  if (_config.type === 'server') {
    const res = await fetch(`${_config.baseUrl}/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`deleteUserQuestion failed: ${res.status}`);
    if (_callbacks.onQuestionDeleted) _callbacks.onQuestionDeleted(id);
    return;
  }
  const all = (await loadUserQuestions()).filter(x => x.id !== id);
  localStorage.setItem(USER_QUESTIONS_KEY, JSON.stringify(all));
  if (_callbacks.onQuestionDeleted) _callbacks.onQuestionDeleted(id);
}
