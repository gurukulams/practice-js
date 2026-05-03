const USER_QUESTIONS_KEY = 'practiceJs_userQuestions';

export function loadUserQuestions() {
  try { return JSON.parse(localStorage.getItem(USER_QUESTIONS_KEY)) || []; }
  catch { return []; }
}

export function saveUserQuestion(q) {
  const all = loadUserQuestions();
  const idx = all.findIndex(x => x.id === q.id);
  if (idx >= 0) all[idx] = q; else all.push(q);
  localStorage.setItem(USER_QUESTIONS_KEY, JSON.stringify(all));
}

export function deleteUserQuestion(id) {
  const all = loadUserQuestions().filter(x => x.id !== id);
  localStorage.setItem(USER_QUESTIONS_KEY, JSON.stringify(all));
}
