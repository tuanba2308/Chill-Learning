(() => {
  'use strict';
  const YTL = globalThis.YTL;
  const $ = (id) => document.getElementById(id);
  let settings = Object.assign({}, YTL.DEFAULT_SETTINGS);
  let lessons = {};
  let activeId = null;

  function fillSettings() {
    document.querySelectorAll('[data-k]').forEach((el) => {
      const v = settings[el.dataset.k];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
      showOutput(el);
    });
  }
  function showOutput(el) {
    if (el.type !== 'range') return;
    const out = el.parentElement.querySelector('output');
    if (out) out.textContent = el.value + (el.dataset.unit || '');
  }
  function readValue(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'range' || el.type === 'number') return Number(el.value);
    return el.value;
  }

  function renderLessons() {
    const sel = $('lessonSelect');
    sel.replaceChildren();
    const list = Object.values(lessons).sort((a, b) => b.addedAt - a.addedAt);
    if (!list.length) {
      const o = new Option('— Chưa có bài học —', '');
      sel.append(o);
    }
    list.forEach((l) => sel.append(new Option(l.title || l.name, l.id, false, l.id === activeId)));
    $('delLesson').disabled = !lessons[activeId];
    const info = $('lessonInfo'), warn = $('warnings');
    warn.replaceChildren();
    const rec = lessons[activeId];
    if (!rec) { info.textContent = 'Tải một file bài học .md (hoặc nạp bài mẫu) rồi mở video YouTube bất kỳ.'; return; }
    const p = YTL.parseLesson(rec.text);
    info.textContent = p.stats.lessons + ' bài học · ' + p.stats.quizzes + ' câu hỏi · mốc cuối ' +
      YTL.formatTime(p.stats.lastTime) + ' · file: ' + rec.name;
    p.warnings.forEach((w) => { const li = document.createElement('li'); li.textContent = w; warn.append(li); });
  }

  function renderLast(history) {
    const box = $('lastResult');
    const s = (history || [])[0];
    if (!s) { box.textContent = 'Chưa có phiên học nào.'; return; }
    const st = YTL.sessionStats(s);
    box.replaceChildren();
    const big = document.createElement('div');
    big.className = 'score';
    big.textContent = st.total ? st.percent + '%' : '—';
    const txt = document.createElement('div');
    const l1 = document.createElement('div');
    l1.textContent = st.correct + '/' + st.total + ' câu đúng · ' + s.lessonsSeen + ' bài học' + (s.finished ? '' : ' · chưa xem hết');
    const l2 = document.createElement('div');
    l2.className = 'muted ellipsis';
    l2.textContent = (s.lessonTitle || '') + ' — ' + (s.videoTitle || '');
    txt.append(l1, l2);
    box.className = 'last';
    box.append(big, txt);
  }

  async function load() {
    const st = await chrome.storage.local.get(['settings', 'lessons', 'activeLessonId', 'history']);
    settings = Object.assign({}, YTL.DEFAULT_SETTINGS, st.settings);
    lessons = st.lessons || {};
    activeId = st.activeLessonId || null;
    YTL.setLang(settings.lang);
    if (!load.i18n) load.i18n = YTL.autoLocalize(document.documentElement);
    numberSamples(); // sau khi dịch, để nhãn gốc còn khớp từ điển
    fillSettings();
    renderLessons();
    renderLast(st.history);
  }

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.k) return;
    settings[el.dataset.k] = readValue(el);
    if (el.dataset.k === 'lang') { chrome.storage.local.set({ settings }).then(() => location.reload()); return; }
    if (el.dataset.k === 'cardPos') { settings.offsetX = 0; settings.offsetY = 0; } // chọn vị trí mới thì bỏ độ dời do kéo thả
    showOutput(el);
    chrome.storage.local.set({ settings });
  });

  $('loadBtn').addEventListener('click', () => $('file').click());
  const onPick = (id, activate) => $(id).addEventListener('change', async (e) => {
    const items = await YTL.readLessonFiles(e.target.files);
    e.target.value = '';
    if (items.length) await YTL.saveLessons(items, activate || items.length === 1);
    load();
  });
  onPick('file', true);
  onPick('dir', false);
  $('loadDirBtn').addEventListener('click', () => $('dir').click());
  $('sampleSelect').addEventListener('change', async (e) => {
    const name = e.target.value;
    e.target.value = '';
    if (!name) return;
    await YTL.loadSamples(name); // nạp một bài mẫu và chuyển sang bài đó
    load();
  });
  $('loadAllSamples').addEventListener('click', async () => {
    const b = $('loadAllSamples');
    b.disabled = true;
    const n = await YTL.loadSamples();
    b.disabled = false;
    b.textContent = '✓ ' + n;
    load();
  });
  // Đánh số 01, 02… cho menu bài mẫu, khớp với số thứ tự trong thư viện.
  function numberSamples() {
    if (numberSamples.done) return;
    numberSamples.done = true;
    document.querySelectorAll('#sampleSelect option[value]').forEach((o) => {
      const i = YTL.SAMPLES.findIndex((s) => s[0] === o.value);
      if (i >= 0) o.textContent = String(i + 1).padStart(2, '0') + ' · ' + o.textContent;
    });
  }
  $('lessonSelect').addEventListener('change', async (e) => {
    activeId = e.target.value || null;
    await chrome.storage.local.set({ activeLessonId: activeId });
    renderLessons();
  });
  $('delLesson').addEventListener('click', async () => {
    if (!lessons[activeId]) return;
    delete lessons[activeId];
    activeId = (Object.values(lessons).sort((a, b) => b.addedAt - a.addedAt)[0] || {}).id || null;
    await chrome.storage.local.set({ lessons, activeLessonId: activeId });
    renderLessons();
  });
  $('resetSettings').addEventListener('click', async () => {
    settings = Object.assign({}, YTL.DEFAULT_SETTINGS, { enabled: settings.enabled });
    await chrome.storage.local.set({ settings });
    fillSettings();
  });
  $('resetPos').addEventListener('click', async () => {
    // đọc lại vì độ dời được lưu từ trang YouTube khi kéo thả
    const st = await chrome.storage.local.get('settings');
    settings = Object.assign({}, YTL.DEFAULT_SETTINGS, st.settings, { offsetX: 0, offsetY: 0, cardW: 0, cardH: 0 });
    await chrome.storage.local.set({ settings });
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.settings) settings = Object.assign({}, YTL.DEFAULT_SETTINGS, ch.settings.newValue);
  });
  $('openImport').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('import.html') }));
  $('openResults').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('results.html') }));

  load();
})();
