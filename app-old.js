const STORAGE_KEY = 'coca5000-vocab-progress-v2';
const OLD_STORAGE_KEY = 'coca5000-vocab-progress-v1';
const SETTINGS_KEY = 'coca5000-vocab-settings-v2';

const DEFAULT_INTERVALS = [1, 3, 7, 15, 30, 60];
const POS_LABELS = {
  a: 'article', c: 'conjunction', d: 'determiner', e: 'existential there', g: 'genitive',
  i: 'preposition', j: 'adjective', m: 'number', n: 'noun', p: 'pronoun', r: 'adverb',
  t: 'to + infinitive', u: 'interjection', v: 'verb', x: 'negation'
};

const state = {
  words: [],
  progress: {},
  settings: {
    batchSize: 50,
    dayIndex: 0,
    currentIndex: 0,
    intervals: DEFAULT_INTERVALS,
  },
  reviewIndex: 0,
  activeFilter: 'study',
  currentView: 'testView',
};

const $ = (id) => document.getElementById(id);
const els = {
  tabs: document.querySelectorAll('.tab'),
  views: document.querySelectorAll('.view'),
  dueBadge: $('dueBadge'),

  daySelect: $('daySelect'),
  batchSize: $('batchSize'),
  progressText: $('progressText'),
  rankRange: $('rankRange'),
  progressFill: $('progressFill'),
  rankText: $('rankText'),
  wordText: $('wordText'),
  posText: $('posText'),
  speakBtn: $('speakBtn'),
  detailsBox: $('detailsBox'),
  detailsContent: $('detailsContent'),
  masteredBtn: $('masteredBtn'),
  familiarBtn: $('familiarBtn'),
  unknownBtn: $('unknownBtn'),
  prevBtn: $('prevBtn'),
  nextBtn: $('nextBtn'),

  testedCount: $('testedCount'),
  masteredCount: $('masteredCount'),
  studyCount: $('studyCount'),
  dueCountSide: $('dueCountSide'),
  quickStudyList: $('quickStudyList'),

  dueCountMain: $('dueCountMain'),
  reviewedTodayCount: $('reviewedTodayCount'),
  maturedCount: $('maturedCount'),
  reviewRankText: $('reviewRankText'),
  reviewWordText: $('reviewWordText'),
  reviewPosText: $('reviewPosText'),
  reviewSpeakBtn: $('reviewSpeakBtn'),
  reviewDetailsBox: $('reviewDetailsBox'),
  reviewDetailsContent: $('reviewDetailsContent'),
  reviewGoodBtn: $('reviewGoodBtn'),
  reviewFuzzyBtn: $('reviewFuzzyBtn'),
  reviewForgotBtn: $('reviewForgotBtn'),
  prevReviewBtn: $('prevReviewBtn'),
  nextReviewBtn: $('nextReviewBtn'),
  startDueBtn: $('startDueBtn'),

  studyList: $('studyList'),
  searchInput: $('searchInput'),
  exportStudyListBtn: $('exportStudyListBtn'),
  exportListPageBtn: $('exportListPageBtn'),
  exportProgressBtn: $('exportProgressBtn'),
  importProgressInput: $('importProgressInput'),

  statTotal: $('statTotal'),
  statTested: $('statTested'),
  statUntested: $('statUntested'),
  statMastered: $('statMastered'),
  statFamiliar: $('statFamiliar'),
  statUnknown: $('statUnknown'),
  statDue: $('statDue'),
  statLearning: $('statLearning'),
  masteryRate: $('masteryRate'),
  masteryFill: $('masteryFill'),

  intervalInput: $('intervalInput'),
  defaultBatchSize: $('defaultBatchSize'),
  saveSettingsBtn: $('saveSettingsBtn'),
  resetTodayBtn: $('resetTodayBtn'),
  resetAllBtn: $('resetAllBtn'),
};

function todayString() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + Number(days || 0));
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function entryKey(word) {
  return `${word.rank}|${word.word}|${word.pos}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) || {};

    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldRaw) return {};
    const oldProgress = JSON.parse(oldRaw) || {};
    const migrated = {};
    Object.entries(oldProgress).forEach(([key, rec]) => {
      migrated[key] = normalizeRecord(rec, key);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
}

function normalizeRecord(rec, key = '') {
  const today = todayString();
  const parts = key.split('|');
  const status = rec.status || 'untested';
  const base = {
    status,
    rank: rec.rank ?? Number(parts[0]) ?? null,
    word: rec.word ?? parts[1] ?? '',
    pos: rec.pos ?? parts[2] ?? '',
    posName: rec.posName || POS_LABELS[rec.pos] || '',
    firstSeen: rec.firstSeen || rec.updatedAt || rec.lastReviewed || today,
    updatedAt: rec.updatedAt || new Date().toISOString(),
    source: rec.source || 'test',
    reviewStage: Number(rec.reviewStage || 0),
    successCount: Number(rec.successCount || 0),
    fuzzyCount: Number(rec.fuzzyCount || 0),
    wrongCount: Number(rec.wrongCount || 0),
    reviewCount: Number(rec.reviewCount || 0),
    lastReviewed: rec.lastReviewed || '',
    nextReview: rec.nextReview || '',
    masteredAt: rec.masteredAt || '',
  };

  if (status === 'familiar' || status === 'unknown') {
    base.nextReview = base.nextReview || today;
  }
  if (status === 'mastered') {
    base.nextReview = '';
    base.masteredAt = base.masteredAt || rec.updatedAt || today;
  }
  return base;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function loadSettings() {
  try {
    const data = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    const intervals = Array.isArray(data.intervals) && data.intervals.length ? data.intervals : DEFAULT_INTERVALS;
    return { ...state.settings, ...data, intervals };
  } catch {
    return { ...state.settings };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function getBatchWords() {
  const start = state.settings.dayIndex * state.settings.batchSize;
  return state.words.slice(start, start + state.settings.batchSize);
}

function getWordByKey(key) {
  const rec = state.progress[key];
  if (!rec) return null;
  return state.words.find(w => entryKey(w) === key) || {
    rank: rec.rank, word: rec.word, pos: rec.pos, posName: rec.posName,
    frequency: '', dispersion: '', register: '', collocates: ''
  };
}

function populateDaySelect() {
  const totalDays = Math.ceil(state.words.length / state.settings.batchSize);
  els.daySelect.innerHTML = '';
  for (let i = 0; i < totalDays; i++) {
    const start = i * state.settings.batchSize + 1;
    const end = Math.min((i + 1) * state.settings.batchSize, state.words.length);
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `第 ${i + 1} 组：Rank ${start}–${end}`;
    els.daySelect.appendChild(option);
  }
  state.settings.dayIndex = Math.min(state.settings.dayIndex, Math.max(0, totalDays - 1));
  els.daySelect.value = String(state.settings.dayIndex);
}

function statusLabel(status) {
  return {
    mastered: '已掌握',
    familiar: '认识但不熟',
    unknown: '不认识',
    untested: '未测试',
  }[status] || '未测试';
}

function statusClass(status) {
  return status || 'untested';
}

function currentWord() {
  return getBatchWords()[state.settings.currentIndex];
}

function findNextUntestedIndex(batch) {
  const idx = batch.findIndex(w => !state.progress[entryKey(w)]);
  return idx === -1 ? Math.max(0, batch.length - 1) : idx;
}

function getReviewDueKeys() {
  const today = todayString();
  return Object.entries(state.progress)
    .filter(([, rec]) => (rec.status === 'familiar' || rec.status === 'unknown') && rec.nextReview && rec.nextReview <= today)
    .sort((a, b) => {
      const ar = a[1], br = b[1];
      if (ar.nextReview !== br.nextReview) return ar.nextReview.localeCompare(br.nextReview);
      if (ar.status !== br.status) return ar.status === 'unknown' ? -1 : 1;
      return Number(ar.rank || 0) - Number(br.rank || 0);
    })
    .map(([key]) => key);
}

function getLearningEntries() {
  return Object.entries(state.progress).filter(([, rec]) => rec.status === 'familiar' || rec.status === 'unknown');
}

function renderWord() {
  const batch = getBatchWords();
  if (!batch.length) return;
  state.settings.currentIndex = Math.max(0, Math.min(state.settings.currentIndex, batch.length - 1));
  const w = currentWord();
  const rec = state.progress[entryKey(w)];
  els.rankText.textContent = `Rank ${w.rank} · ${w.level}`;
  els.wordText.textContent = w.word;
  els.posText.textContent = `${w.pos} · ${w.posName}${rec ? ` · 已标记：${statusLabel(rec.status)}` : ''}`;
  els.detailsBox.open = false;
  els.detailsContent.innerHTML = wordDetailsHtml(w, rec);
  els.prevBtn.disabled = state.settings.currentIndex === 0;
  els.nextBtn.disabled = state.settings.currentIndex >= batch.length - 1;
  updateProgressBar();
  saveSettings();
}

function wordDetailsHtml(w, rec) {
  const reviewInfo = rec && (rec.status === 'familiar' || rec.status === 'unknown')
    ? `<p><strong>复习阶段:</strong> ${rec.reviewStage || 0} / ${state.settings.intervals.length + 1}</p>
       <p><strong>下次复习:</strong> ${rec.nextReview || '—'}</p>
       <p><strong>复习次数:</strong> ${rec.reviewCount || 0} · 会用 ${rec.successCount || 0} · 不熟 ${rec.fuzzyCount || 0} · 忘记 ${rec.wrongCount || 0}</p>`
    : '';
  return `
    <p><strong>Frequency:</strong> ${w.frequency?.toLocaleString?.() || w.frequency || ''}</p>
    <p><strong>Dispersion:</strong> ${w.dispersion ?? ''}</p>
    <p><strong>Register:</strong> ${w.register || '—'}</p>
    ${reviewInfo}
    <p><strong>Collocates:</strong> ${escapeHtml(w.collocates || '—')}</p>
  `;
}

function updateProgressBar() {
  const batch = getBatchWords();
  const tested = batch.filter(w => state.progress[entryKey(w)]).length;
  const pct = batch.length ? (tested / batch.length) * 100 : 0;
  const first = batch[0]?.rank || 0;
  const last = batch[batch.length - 1]?.rank || 0;
  els.progressText.textContent = `当前组进度：${tested} / ${batch.length}`;
  els.rankRange.textContent = `Rank ${first}–${last}`;
  els.progressFill.style.width = `${pct}%`;
}

function mark(status) {
  const w = currentWord();
  if (!w) return;
  const key = entryKey(w);
  const existing = state.progress[key] || {};
  state.progress[key] = createRecordForStatus(w, status, existing, 'test');
  saveProgress();
  const batch = getBatchWords();
  if (state.settings.currentIndex < batch.length - 1) state.settings.currentIndex += 1;
  renderAll();
}

function createRecordForStatus(w, status, existing = {}, source = 'test') {
  const today = todayString();
  const base = normalizeRecord({
    ...existing,
    status,
    rank: w.rank,
    word: w.word,
    pos: w.pos,
    posName: w.posName,
    updatedAt: new Date().toISOString(),
    source,
  }, entryKey(w));

  if (status === 'mastered') {
    return { ...base, nextReview: '', masteredAt: today, reviewStage: Number(base.reviewStage || 0) };
  }

  return {
    ...base,
    nextReview: base.nextReview || today,
    reviewStage: Number(base.reviewStage || 0),
    masteredAt: '',
  };
}

function renderStats() {
  const values = Object.values(state.progress);
  const tested = values.length;
  const mastered = values.filter(x => x.status === 'mastered').length;
  const familiar = values.filter(x => x.status === 'familiar').length;
  const unknown = values.filter(x => x.status === 'unknown').length;
  const learning = familiar + unknown;
  const due = getReviewDueKeys().length;
  const reviewedToday = values.filter(x => x.lastReviewed === todayString()).length;
  const maturedToday = values.filter(x => x.status === 'mastered' && x.masteredAt === todayString() && x.source === 'review').length;

  els.testedCount.textContent = tested;
  els.masteredCount.textContent = mastered;
  els.studyCount.textContent = learning;
  els.dueCountSide.textContent = due;
  els.dueBadge.textContent = due;
  els.dueCountMain.textContent = due;
  els.reviewedTodayCount.textContent = reviewedToday;
  els.maturedCount.textContent = maturedToday;

  els.statTotal.textContent = state.words.length || 5000;
  els.statTested.textContent = tested;
  els.statUntested.textContent = Math.max(0, (state.words.length || 5000) - tested);
  els.statMastered.textContent = mastered;
  els.statFamiliar.textContent = familiar;
  els.statUnknown.textContent = unknown;
  els.statDue.textContent = due;
  els.statLearning.textContent = learning;
  const rate = state.words.length ? Math.round((mastered / state.words.length) * 1000) / 10 : 0;
  els.masteryRate.textContent = `${rate}%`;
  els.masteryFill.style.width = `${rate}%`;
}

function renderReview() {
  const dueKeys = getReviewDueKeys();
  if (!dueKeys.length) {
    els.reviewRankText.textContent = '';
    els.reviewWordText.textContent = '今天没有到期词';
    els.reviewPosText.textContent = '可以去“测试新词”添加新的背词，或休息一下。';
    els.reviewDetailsContent.innerHTML = '<p>背词池里的词到了复习日会自动出现在这里。</p>';
    els.reviewGoodBtn.disabled = true;
    els.reviewFuzzyBtn.disabled = true;
    els.reviewForgotBtn.disabled = true;
    els.prevReviewBtn.disabled = true;
    els.nextReviewBtn.disabled = true;
    return;
  }

  state.reviewIndex = Math.max(0, Math.min(state.reviewIndex, dueKeys.length - 1));
  const key = dueKeys[state.reviewIndex];
  const w = getWordByKey(key);
  const rec = state.progress[key];
  els.reviewRankText.textContent = `Rank ${w.rank} · ${w.level || ''}`;
  els.reviewWordText.textContent = w.word;
  els.reviewPosText.textContent = `${w.pos} · ${w.posName || POS_LABELS[w.pos] || ''} · ${statusLabel(rec.status)} · 阶段 ${rec.reviewStage || 0}`;
  els.reviewDetailsBox.open = false;
  els.reviewDetailsContent.innerHTML = wordDetailsHtml(w, rec);
  els.reviewGoodBtn.disabled = false;
  els.reviewFuzzyBtn.disabled = false;
  els.reviewForgotBtn.disabled = false;
  els.prevReviewBtn.disabled = state.reviewIndex === 0;
  els.nextReviewBtn.disabled = state.reviewIndex >= dueKeys.length - 1;
}

function reviewCurrent(result) {
  const dueKeys = getReviewDueKeys();
  const key = dueKeys[state.reviewIndex];
  if (!key) return;
  const rec = state.progress[key];
  const today = todayString();
  const intervals = state.settings.intervals;
  const nextRec = { ...rec, lastReviewed: today, reviewCount: (rec.reviewCount || 0) + 1, updatedAt: new Date().toISOString(), source: 'review' };

  if (result === 'good') {
    nextRec.successCount = (nextRec.successCount || 0) + 1;
    nextRec.reviewStage = (nextRec.reviewStage || 0) + 1;
    if (nextRec.reviewStage > intervals.length) {
      nextRec.status = 'mastered';
      nextRec.nextReview = '';
      nextRec.masteredAt = today;
    } else {
      const delay = intervals[Math.min(nextRec.reviewStage - 1, intervals.length - 1)] || 1;
      nextRec.nextReview = addDays(today, delay);
    }
  }

  if (result === 'fuzzy') {
    nextRec.fuzzyCount = (nextRec.fuzzyCount || 0) + 1;
    nextRec.status = 'familiar';
    nextRec.reviewStage = Math.max(0, (nextRec.reviewStage || 0) - 1);
    nextRec.nextReview = addDays(today, 1);
  }

  if (result === 'forgot') {
    nextRec.wrongCount = (nextRec.wrongCount || 0) + 1;
    nextRec.status = 'unknown';
    nextRec.reviewStage = 0;
    nextRec.nextReview = addDays(today, 1);
  }

  state.progress[key] = nextRec;
  saveProgress();
  const remaining = getReviewDueKeys();
  state.reviewIndex = Math.min(state.reviewIndex, Math.max(0, remaining.length - 1));
  renderAll();
}

function getFilteredWords() {
  const q = els.searchInput.value.trim().toLowerCase();
  const today = todayString();
  return state.words.filter(w => {
    const key = entryKey(w);
    const rec = state.progress[key];
    const status = rec?.status || 'untested';
    let ok = false;
    if (state.activeFilter === 'study') ok = status === 'familiar' || status === 'unknown';
    else if (state.activeFilter === 'due') ok = (status === 'familiar' || status === 'unknown') && rec.nextReview && rec.nextReview <= today;
    else if (state.activeFilter === 'untested') ok = !rec;
    else ok = status === state.activeFilter;
    if (!ok) return false;
    if (!q) return true;
    return w.word.toLowerCase().includes(q) || String(w.rank).includes(q) || w.posName.toLowerCase().includes(q) || w.pos.toLowerCase().includes(q);
  });
}

function renderQuickStudyList() {
  const today = todayString();
  const list = state.words
    .filter(w => {
      const rec = state.progress[entryKey(w)];
      return rec?.status === 'unknown' || rec?.status === 'familiar';
    })
    .sort((a, b) => {
      const ra = state.progress[entryKey(a)], rb = state.progress[entryKey(b)];
      const adue = ra.nextReview && ra.nextReview <= today ? 0 : 1;
      const bdue = rb.nextReview && rb.nextReview <= today ? 0 : 1;
      if (adue !== bdue) return adue - bdue;
      return a.rank - b.rank;
    })
    .slice(0, 10);

  if (!list.length) {
    els.quickStudyList.innerHTML = '<p class="hint">这里暂时没有词。测试后会自动出现。</p>';
    return;
  }
  els.quickStudyList.innerHTML = list.map(w => listItemHtml(w)).join('');
  els.quickStudyList.querySelectorAll('[data-rank]').forEach(btn => btn.addEventListener('click', () => jumpToWord(Number(btn.dataset.rank))));
}

function renderStudyList() {
  const list = getFilteredWords();
  if (!list.length) {
    els.studyList.innerHTML = '<p class="hint">这里暂时没有词。</p>';
    return;
  }
  const limit = 600;
  els.studyList.innerHTML = list.slice(0, limit).map(w => listItemHtml(w, true)).join('');
  els.studyList.querySelectorAll('[data-rank]').forEach(btn => btn.addEventListener('click', () => jumpToWord(Number(btn.dataset.rank))));
  if (list.length > limit) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = `只显示前 ${limit} 个结果。当前共有 ${list.length} 个。`;
    els.studyList.appendChild(p);
  }
}

function listItemHtml(w, full = false) {
  const rec = state.progress[entryKey(w)] || { status: 'untested' };
  const due = rec.nextReview && rec.nextReview <= todayString() && (rec.status === 'familiar' || rec.status === 'unknown');
  const dueText = rec.nextReview ? `下次：${rec.nextReview}` : (rec.status === 'mastered' ? `掌握：${rec.masteredAt || '—'}` : '未安排');
  return `<button class="study-item" data-rank="${w.rank}">
    <strong>${escapeHtml(w.word)}</strong>
    <span class="badge ${statusClass(rec.status)}">${statusLabel(rec.status)}</span>
    ${due ? '<span class="badge due">今日到期</span>' : ''}
    <small>Rank ${w.rank} · ${w.pos} · ${escapeHtml(w.posName)}${full ? ` · 阶段 ${rec.reviewStage || 0} · ${dueText}` : ''}</small>
  </button>`;
}

function jumpToWord(rank) {
  state.settings.dayIndex = Math.floor((rank - 1) / state.settings.batchSize);
  populateDaySelect();
  const batch = getBatchWords();
  state.settings.currentIndex = batch.findIndex(w => w.rank === rank);
  if (state.settings.currentIndex < 0) state.settings.currentIndex = 0;
  showView('testView');
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderWord();
  renderReview();
  renderStats();
  renderQuickStudyList();
  renderStudyList();
}

function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportStudyList() {
  const rows = [['rank','word','pos','pos_name','status','review_stage','next_review','last_reviewed','review_count','success_count','fuzzy_count','wrong_count','frequency','dispersion','register','collocates']];
  state.words.forEach(w => {
    const rec = state.progress[entryKey(w)];
    if (rec?.status === 'familiar' || rec?.status === 'unknown') {
      rows.push([w.rank, w.word, w.pos, w.posName, rec.status, rec.reviewStage || 0, rec.nextReview || '', rec.lastReviewed || '', rec.reviewCount || 0, rec.successCount || 0, rec.fuzzyCount || 0, rec.wrongCount || 0, w.frequency || '', w.dispersion ?? '', w.register || '', w.collocates || '']);
    }
  });
  const tsv = rows.map(row => row.map(cell => String(cell).replaceAll('\t',' ').replaceAll('\n',' ')).join('\t')).join('\n');
  download(`coca5000-study-list-${todayString()}.tsv`, tsv, 'text/tab-separated-values;charset=utf-8');
}

function exportProgress() {
  const payload = {
    app: 'COCA 5000 Vocabulary Trainer',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    progress: state.progress,
  };
  download(`coca5000-progress-${todayString()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const progress = payload.progress || payload;
      if (!progress || typeof progress !== 'object') throw new Error('Invalid progress file');
      const normalized = {};
      Object.entries(progress).forEach(([key, rec]) => normalized[key] = normalizeRecord(rec, key));
      state.progress = normalized;
      if (payload.settings) {
        state.settings = { ...state.settings, ...payload.settings, intervals: sanitizeIntervals(payload.settings.intervals || state.settings.intervals) };
        applySettingsToUI();
      }
      saveProgress();
      saveSettings();
      renderAll();
      alert('进度已导入。');
    } catch (err) {
      alert('导入失败：文件格式不正确。');
    }
  };
  reader.readAsText(file, 'utf-8');
}

function resetCurrentBatch() {
  if (!confirm('确定重测当前组吗？当前组内的标记和复习记录会被删除。')) return;
  getBatchWords().forEach(w => delete state.progress[entryKey(w)]);
  saveProgress();
  state.settings.currentIndex = 0;
  renderAll();
}

function resetAll() {
  if (!confirm('确定清空全部进度吗？这个操作不能撤销。')) return;
  state.progress = {};
  saveProgress();
  state.settings.currentIndex = 0;
  state.reviewIndex = 0;
  renderAll();
}

function speakWord(word) {
  if (!word || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function speakCurrentWord() {
  const w = currentWord();
  if (w) speakWord(w.word);
}

function speakReviewWord() {
  const dueKeys = getReviewDueKeys();
  const w = getWordByKey(dueKeys[state.reviewIndex]);
  if (w) speakWord(w.word);
}

function showView(viewId) {
  state.currentView = viewId;
  els.views.forEach(v => v.classList.toggle('active', v.id === viewId));
  els.tabs.forEach(t => t.classList.toggle('active', t.dataset.view === viewId));
  if (viewId === 'reviewView') state.reviewIndex = 0;
  renderAll();
}

function sanitizeIntervals(value) {
  const arr = Array.isArray(value) ? value : String(value).split(',');
  const parsed = arr.map(x => Number(String(x).trim())).filter(x => Number.isFinite(x) && x > 0).map(Math.round);
  return parsed.length ? parsed : DEFAULT_INTERVALS;
}

function applySettingsToUI() {
  els.batchSize.value = String(state.settings.batchSize);
  els.defaultBatchSize.value = String(state.settings.batchSize);
  els.intervalInput.value = state.settings.intervals.join(',');
}

function bindEvents() {
  els.tabs.forEach(tab => tab.addEventListener('click', () => showView(tab.dataset.view)));

  els.masteredBtn.addEventListener('click', () => mark('mastered'));
  els.familiarBtn.addEventListener('click', () => mark('familiar'));
  els.unknownBtn.addEventListener('click', () => mark('unknown'));
  els.prevBtn.addEventListener('click', () => { state.settings.currentIndex -= 1; renderAll(); });
  els.nextBtn.addEventListener('click', () => { state.settings.currentIndex += 1; renderAll(); });
  els.speakBtn.addEventListener('click', speakCurrentWord);

  els.daySelect.addEventListener('change', () => {
    state.settings.dayIndex = Number(els.daySelect.value);
    state.settings.currentIndex = findNextUntestedIndex(getBatchWords());
    renderAll();
  });

  els.batchSize.addEventListener('change', () => {
    const currentRank = currentWord()?.rank || 1;
    state.settings.batchSize = Number(els.batchSize.value);
    els.defaultBatchSize.value = String(state.settings.batchSize);
    state.settings.dayIndex = Math.floor((currentRank - 1) / state.settings.batchSize);
    populateDaySelect();
    const batch = getBatchWords();
    state.settings.currentIndex = batch.findIndex(w => w.rank === currentRank);
    if (state.settings.currentIndex < 0) state.settings.currentIndex = findNextUntestedIndex(batch);
    renderAll();
  });

  els.reviewGoodBtn.addEventListener('click', () => reviewCurrent('good'));
  els.reviewFuzzyBtn.addEventListener('click', () => reviewCurrent('fuzzy'));
  els.reviewForgotBtn.addEventListener('click', () => reviewCurrent('forgot'));
  els.reviewSpeakBtn.addEventListener('click', speakReviewWord);
  els.prevReviewBtn.addEventListener('click', () => { state.reviewIndex -= 1; renderAll(); });
  els.nextReviewBtn.addEventListener('click', () => { state.reviewIndex += 1; renderAll(); });
  els.startDueBtn.addEventListener('click', () => { state.reviewIndex = 0; renderAll(); });

  document.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      renderStudyList();
    });
  });

  els.searchInput.addEventListener('input', renderStudyList);
  els.exportStudyListBtn.addEventListener('click', exportStudyList);
  els.exportListPageBtn.addEventListener('click', exportStudyList);
  els.exportProgressBtn.addEventListener('click', exportProgress);
  els.importProgressInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importProgress(file);
    e.target.value = '';
  });

  els.saveSettingsBtn.addEventListener('click', () => {
    state.settings.intervals = sanitizeIntervals(els.intervalInput.value);
    state.settings.batchSize = Number(els.defaultBatchSize.value);
    els.batchSize.value = String(state.settings.batchSize);
    populateDaySelect();
    saveSettings();
    renderAll();
    alert('设置已保存。');
  });

  els.resetTodayBtn.addEventListener('click', resetCurrentBatch);
  els.resetAllBtn.addEventListener('click', resetAll);

  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (state.currentView === 'testView') {
      if (e.key === '1') mark('mastered');
      if (e.key === '2') mark('familiar');
      if (e.key === '3') mark('unknown');
      if (e.key === 'ArrowLeft' && state.settings.currentIndex > 0) { state.settings.currentIndex--; renderAll(); }
      if (e.key === 'ArrowRight' && state.settings.currentIndex < getBatchWords().length - 1) { state.settings.currentIndex++; renderAll(); }
      if (e.key.toLowerCase() === 's') speakCurrentWord();
    }
    if (state.currentView === 'reviewView') {
      if (e.key === '1') reviewCurrent('good');
      if (e.key === '2') reviewCurrent('fuzzy');
      if (e.key === '3') reviewCurrent('forgot');
      if (e.key === 'ArrowLeft' && state.reviewIndex > 0) { state.reviewIndex--; renderAll(); }
      if (e.key === 'ArrowRight' && state.reviewIndex < getReviewDueKeys().length - 1) { state.reviewIndex++; renderAll(); }
      if (e.key.toLowerCase() === 's') speakReviewWord();
    }
  });
}

async function init() {
  bindEvents();
  state.progress = loadProgress();
  state.settings = loadSettings();
  applySettingsToUI();

  try {
    const res = await fetch('coca5000.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.words = await res.json();
    populateDaySelect();
    if (!Number.isFinite(state.settings.currentIndex)) state.settings.currentIndex = findNextUntestedIndex(getBatchWords());
    renderAll();
  } catch (err) {
    els.wordText.textContent = '词库加载失败';
    els.posText.textContent = '请确认 coca5000.json 与 index.html 在同一目录，并通过 GitHub Pages 或本地服务器打开。';
    console.error(err);
  }
}

init();
