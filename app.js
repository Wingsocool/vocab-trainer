const STORAGE_KEY = 'coca5000-vocab-progress-v1';
const SETTINGS_KEY = 'coca5000-vocab-settings-v1';

const state = {
  words: [],
  progress: {},
  batchSize: 100,
  dayIndex: 0,
  currentIndex: 0,
  activeFilter: 'study',
};

const $ = (id) => document.getElementById(id);
const els = {
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
  familiarCount: $('familiarCount'),
  unknownCount: $('unknownCount'),
  studyList: $('studyList'),
  searchInput: $('searchInput'),
  exportStudyListBtn: $('exportStudyListBtn'),
  exportProgressBtn: $('exportProgressBtn'),
  importProgressInput: $('importProgressInput'),
  resetTodayBtn: $('resetTodayBtn'),
  resetAllBtn: $('resetAllBtn'),
};

function entryKey(word) {
  return `${word.rank}|${word.word}|${word.pos}`;
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    batchSize: state.batchSize,
    dayIndex: state.dayIndex,
    currentIndex: state.currentIndex,
  }));
}

function getBatchWords() {
  const start = state.dayIndex * state.batchSize;
  return state.words.slice(start, start + state.batchSize);
}

function populateDaySelect() {
  const totalDays = Math.ceil(state.words.length / state.batchSize);
  els.daySelect.innerHTML = '';
  for (let i = 0; i < totalDays; i++) {
    const start = i * state.batchSize + 1;
    const end = Math.min((i + 1) * state.batchSize, state.words.length);
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `第 ${i + 1} 组：Rank ${start}–${end}`;
    els.daySelect.appendChild(option);
  }
  state.dayIndex = Math.min(state.dayIndex, totalDays - 1);
  els.daySelect.value = String(state.dayIndex);
}

function statusLabel(status) {
  return {
    mastered: '能应用',
    familiar: '认识但不熟',
    unknown: '不认识',
  }[status] || '未测试';
}

function statusClass(status) {
  return status || 'untested';
}

function currentWord() {
  return getBatchWords()[state.currentIndex];
}

function findNextUntestedIndex(batch) {
  const idx = batch.findIndex(w => !state.progress[entryKey(w)]);
  return idx === -1 ? Math.max(0, batch.length - 1) : idx;
}

function renderWord() {
  const batch = getBatchWords();
  if (!batch.length) return;
  state.currentIndex = Math.max(0, Math.min(state.currentIndex, batch.length - 1));
  const w = currentWord();
  const rec = state.progress[entryKey(w)];
  els.rankText.textContent = `Rank ${w.rank} · ${w.level}`;
  els.wordText.textContent = w.word;
  els.posText.textContent = `${w.pos} · ${w.posName}${rec ? ` · 已标记：${statusLabel(rec.status)}` : ''}`;
  els.detailsBox.open = false;
  els.detailsContent.innerHTML = `
    <p><strong>Frequency:</strong> ${w.frequency?.toLocaleString() || ''}</p>
    <p><strong>Dispersion:</strong> ${w.dispersion ?? ''}</p>
    <p><strong>Register:</strong> ${w.register || '—'}</p>
    <p><strong>Collocates:</strong> ${escapeHtml(w.collocates || '—')}</p>
  `;
  els.prevBtn.disabled = state.currentIndex === 0;
  els.nextBtn.disabled = state.currentIndex >= batch.length - 1;
  updateProgressBar();
  saveSettings();
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
  state.progress[entryKey(w)] = {
    status,
    rank: w.rank,
    word: w.word,
    pos: w.pos,
    posName: w.posName,
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
  const batch = getBatchWords();
  if (state.currentIndex < batch.length - 1) state.currentIndex += 1;
  renderAll();
}

function renderStats() {
  const values = Object.values(state.progress);
  els.testedCount.textContent = values.length;
  els.masteredCount.textContent = values.filter(x => x.status === 'mastered').length;
  els.familiarCount.textContent = values.filter(x => x.status === 'familiar').length;
  els.unknownCount.textContent = values.filter(x => x.status === 'unknown').length;
}

function getFilteredWords() {
  const q = els.searchInput.value.trim().toLowerCase();
  return state.words.filter(w => {
    const rec = state.progress[entryKey(w)];
    const status = rec?.status;
    let ok = false;
    if (state.activeFilter === 'study') ok = status === 'familiar' || status === 'unknown';
    else ok = status === state.activeFilter;
    if (!ok) return false;
    if (!q) return true;
    return w.word.toLowerCase().includes(q) || w.posName.toLowerCase().includes(q);
  });
}

function renderStudyList() {
  const list = getFilteredWords();
  if (!list.length) {
    els.studyList.innerHTML = '<p class="hint">这里暂时没有词。继续测试后会自动出现。</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.slice(0, 300).forEach(w => {
    const rec = state.progress[entryKey(w)];
    const btn = document.createElement('button');
    btn.className = 'study-item';
    btn.innerHTML = `<strong>${escapeHtml(w.word)}</strong> <span class="badge ${statusClass(rec.status)}">${statusLabel(rec.status)}</span><small>Rank ${w.rank} · ${w.pos} · ${escapeHtml(w.posName)}</small>`;
    btn.addEventListener('click', () => jumpToWord(w.rank));
    frag.appendChild(btn);
  });
  els.studyList.innerHTML = '';
  els.studyList.appendChild(frag);
  if (list.length > 300) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = `只显示前 300 个结果。当前共有 ${list.length} 个。`;
    els.studyList.appendChild(p);
  }
}

function jumpToWord(rank) {
  state.dayIndex = Math.floor((rank - 1) / state.batchSize);
  populateDaySelect();
  const batch = getBatchWords();
  state.currentIndex = batch.findIndex(w => w.rank === rank);
  if (state.currentIndex < 0) state.currentIndex = 0;
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderWord();
  renderStats();
  renderStudyList();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
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
  const rows = [['rank','word','pos','pos_name','status','frequency','dispersion','register','collocates']];
  state.words.forEach(w => {
    const rec = state.progress[entryKey(w)];
    if (rec?.status === 'familiar' || rec?.status === 'unknown') {
      rows.push([w.rank, w.word, w.pos, w.posName, rec.status, w.frequency || '', w.dispersion ?? '', w.register || '', w.collocates || '']);
    }
  });
  const tsv = rows.map(row => row.map(cell => String(cell).replaceAll('\t',' ').replaceAll('\n',' ')).join('\t')).join('\n');
  download(`coca5000-study-list-${todayString()}.tsv`, tsv, 'text/tab-separated-values;charset=utf-8');
}

function exportProgress() {
  const payload = {
    app: 'COCA 5000 Vocabulary Tester',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { batchSize: state.batchSize, dayIndex: state.dayIndex, currentIndex: state.currentIndex },
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
      state.progress = progress;
      saveProgress();
      renderAll();
      alert('进度已导入。');
    } catch (err) {
      alert('导入失败：文件格式不正确。');
    }
  };
  reader.readAsText(file, 'utf-8');
}

function resetCurrentBatch() {
  if (!confirm('确定重测当前组吗？当前组内的标记会被删除。')) return;
  getBatchWords().forEach(w => delete state.progress[entryKey(w)]);
  saveProgress();
  state.currentIndex = 0;
  renderAll();
}

function resetAll() {
  if (!confirm('确定清空全部进度吗？这个操作不能撤销。')) return;
  state.progress = {};
  saveProgress();
  state.currentIndex = 0;
  renderAll();
}

function speakCurrentWord() {
  const w = currentWord();
  if (!w || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(w.word);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function bindEvents() {
  els.masteredBtn.addEventListener('click', () => mark('mastered'));
  els.familiarBtn.addEventListener('click', () => mark('familiar'));
  els.unknownBtn.addEventListener('click', () => mark('unknown'));
  els.prevBtn.addEventListener('click', () => { state.currentIndex -= 1; renderAll(); });
  els.nextBtn.addEventListener('click', () => { state.currentIndex += 1; renderAll(); });
  els.speakBtn.addEventListener('click', speakCurrentWord);
  els.daySelect.addEventListener('change', () => {
    state.dayIndex = Number(els.daySelect.value);
    state.currentIndex = findNextUntestedIndex(getBatchWords());
    renderAll();
  });
  els.batchSize.addEventListener('change', () => {
    const currentRank = currentWord()?.rank || 1;
    state.batchSize = Number(els.batchSize.value);
    state.dayIndex = Math.floor((currentRank - 1) / state.batchSize);
    populateDaySelect();
    const batch = getBatchWords();
    state.currentIndex = batch.findIndex(w => w.rank === currentRank);
    if (state.currentIndex < 0) state.currentIndex = findNextUntestedIndex(batch);
    renderAll();
  });
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
  els.exportProgressBtn.addEventListener('click', exportProgress);
  els.importProgressInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importProgress(file);
    e.target.value = '';
  });
  els.resetTodayBtn.addEventListener('click', resetCurrentBatch);
  els.resetAllBtn.addEventListener('click', resetAll);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === '1') mark('mastered');
    if (e.key === '2') mark('familiar');
    if (e.key === '3') mark('unknown');
    if (e.key === 'ArrowLeft' && state.currentIndex > 0) { state.currentIndex--; renderAll(); }
    if (e.key === 'ArrowRight' && state.currentIndex < getBatchWords().length - 1) { state.currentIndex++; renderAll(); }
    if (e.key.toLowerCase() === 's') speakCurrentWord();
  });
}

async function init() {
  bindEvents();
  state.progress = loadProgress();
  const settings = loadSettings();
  state.batchSize = Number(settings.batchSize || 100);
  state.dayIndex = Number(settings.dayIndex || 0);
  state.currentIndex = Number(settings.currentIndex || 0);
  els.batchSize.value = String(state.batchSize);

  try {
    const res = await fetch('coca5000.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.words = await res.json();
    populateDaySelect();
    if (!settings.currentIndex) state.currentIndex = findNextUntestedIndex(getBatchWords());
    renderAll();
  } catch (err) {
    els.wordText.textContent = '词库加载失败';
    els.posText.textContent = '请确认 coca5000.json 与 index.html 在同一目录，并通过 GitHub Pages 或本地服务器打开。';
    console.error(err);
  }
}

init();
