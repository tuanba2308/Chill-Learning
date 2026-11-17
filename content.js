/* Chill Learn — content script: phủ bài học / quiz lên trình phát YouTube theo mốc thời gian. */
(() => {
  'use strict';
  if (window.__ytlContent) return;
  window.__ytlContent = true;
  const YTL = globalThis.YTL;
  const fmt = YTL.formatTime;

  const S = {
    settings: Object.assign({}, YTL.DEFAULT_SETTINGS),
    lesson: null, lessonSig: null,
    vid: null, player: null, video: null, root: null, stage: null, hudLabel: null, hideBtn: null,
    schedule: null, done: new Set(), shown: new Set(), queue: [], active: null,
    session: null, saveChain: Promise.resolve(),
    summaryShown: false, pendingSummary: false, pausedByUs: false, hidden: false,
    lastBlock: null, base: null, autoTimer: null, deadline: new Map(),
    allUnits: [], plan: null, completed: false, holdUntil: 0,
    library: {}, progAll: {}, progReady: false, progTimer: null, menu: null, hud: null
  };

  const isYT = /(^|\.)youtube\.com$/.test(location.hostname);
  const onWatchPage = () => !isYT || /^\/(watch|live\/|embed\/)/.test(location.pathname);
  const currentVid = () => new URLSearchParams(location.search).get('v') || location.pathname;
  const alive = () => { try { return !!chrome.runtime.id; } catch (e) { return false; } };
  const isAd = () => !!S.player && (S.player.classList.contains('ad-showing') || S.player.classList.contains('ad-interrupting'));

  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(label, cls, fn) {
    const b = h('button', 'ytl-btn ' + (cls || ''), label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  /* ---------- Trạng thái lưu trữ ---------- */
  const KEYS = ['settings', 'lessons', 'activeLessonId'];
  function applyStored(st) {
    S.settings = Object.assign({}, YTL.DEFAULT_SETTINGS, st.settings);
    const lang = S.settings.lang === 'en' ? 'en' : 'vi';
    if (lang !== YTL.lang) { YTL.setLang(lang); S.langChanged = true; }
    S.library = st.lessons || {};
    const rec = S.library[st.activeLessonId];
    const sig = rec ? rec.id + ':' + rec.addedAt : '';
    if (sig === S.lessonSig) return false;
    saveProgressNow(); // chốt tiến độ của bài đang học trước khi đổi bài
    S.progReady = false;
    S.lessonSig = sig;
    S.lesson = rec ? YTL.parseLesson(rec.text) : null;
    if (S.lesson) { S.lesson.id = rec.id; S.lesson.title = rec.title || S.lesson.title || rec.name; }
    S.allUnits = S.lesson ? YTL.buildSchedule(S.lesson, Infinity, S.settings).units : [];
    return true;
  }

  /* ---------- Tiến độ theo từng bài: giữ qua video khác, tải lại trang, đổi bài ---------- */
  function clearRun() {
    clearStage();
    S.pausedByUs = false;
    S.done = new Set(); S.shown = new Set(); S.queue = [];
    S.session = null; S.summaryShown = false; S.pendingSummary = false; S.lastBlock = null;
    S.completed = false; S.base = null; S.plan = null; S.deadline = new Map();
  }

  async function restoreProgress() {
    S.progReady = false;
    clearRun();
    if (S.lesson) {
      let st = {};
      try { st = await chrome.storage.local.get(['progress', 'history']); } catch (e) { return; }
      S.progAll = st.progress || {};
      const p = S.progAll[S.lesson.id];
      if (p) {
        const byId = new Map(S.lesson.blocks.map((b) => [b.id, b]));
        S.done = new Set((p.done || []).filter((k) => byId.has(k)));
        S.shown = new Set((p.shown || []).filter((k) => byId.has(k)));
        S.queue = (p.pending || []).map((id) => byId.get(id)).filter(Boolean);
        S.lastBlock = byId.get(p.lastBlock) || null;
        S.completed = !!p.completed;
        S.summaryShown = S.completed;
        S.session = (st.history || []).find((x) => x.id === p.sessionId) || null;
      }
    }
    S.progReady = true;
    buildSchedule();
    updateHud();
  }

  function snapshotProgress() {
    if (!S.lesson || !S.progReady) return false;
    if (!S.done.size && !S.shown.size) { delete S.progAll[S.lesson.id]; return true; }
    const pending = [];
    if (S.active && S.active.block && !S.active.answered) pending.push(S.active.block.id);
    S.queue.forEach((b) => pending.push(b.id));
    S.progAll[S.lesson.id] = {
      done: [...S.done], shown: [...S.shown], pending,
      lastBlock: S.lastBlock ? S.lastBlock.id : null,
      sessionId: S.session ? S.session.id : null,
      completed: S.completed, updatedAt: Date.now()
    };
    return true;
  }
  function saveProgressNow() {
    clearTimeout(S.progTimer);
    if (!snapshotProgress() || !alive()) return;
    Object.keys(S.progAll).forEach((id) => { if (!S.library[id]) delete S.progAll[id]; });
    try { chrome.storage.local.set({ progress: S.progAll }); } catch (e) { /* bỏ qua */ }
  }
  function saveProgress() {
    clearTimeout(S.progTimer);
    S.progTimer = setTimeout(saveProgressNow, 400);
  }

  // Học lại bài hiện tại từ đầu (xóa tiến độ, mở phiên mới).
  function restartLesson() {
    if (!S.lesson) return;
    clearRun();
    S.progReady = true;
    buildSchedule();
    updateHud();
    saveProgressNow();
  }

  // Sang video khác: giữ nguyên tiến độ, thẻ đang mở sẽ hiện lại, phần còn lại xếp lịch lại trên video mới.
  function onVideoChange() {
    stashActive();
    clearStage();
    S.pausedByUs = false;
    S.base = null; S.plan = null; S.schedule = null; S.deadline = new Map();
    S.snooze = false;
    S.holdUntil = Date.now() + 1000; // chờ trình phát nạp video mới rồi mới lấy mốc
    if (S.session && S.vid) {
      S.session.videos = S.session.videos || [S.session.videoId];
      if (!S.session.videos.includes(S.vid)) { S.session.videos.push(S.vid); saveSession(); }
    }
    renderMarkers();
    updateHud();
  }

  function stashActive() {
    const a = S.active;
    if (!a) return;
    if (a.block && !a.answered) S.queue.unshift(a.block);
    else if (a.summary) S.pendingSummary = true;
  }

  chrome.storage.onChanged.addListener(async (ch, area) => {
    if (area !== 'local' || !alive()) return;
    if (ch.progress) { // tab khác vừa lưu tiến độ: nhận phần của các bài khác, bài đang học thì tab này tự giữ
      const nv = ch.progress.newValue || {};
      Object.keys(nv).forEach((id) => { if (!S.lesson || id !== S.lesson.id) S.progAll[id] = nv[id]; });
    }
    if (!(ch.settings || ch.lessons || ch.activeLessonId)) return;
    const prev = S.settings;
    const st = await chrome.storage.local.get(KEYS);
    const lessonChanged = applyStored(st);
    applyTheme();
    if (S.langChanged) { // đổi ngôn ngữ: dựng lại lớp phủ (thẻ đang mở được cất lại rồi hiện lại)
      S.langChanged = false;
      if (S.root) { unmount(); mount(); }
    }
    if (lessonChanged) await restoreProgress();
    else if (prev.fitMode !== S.settings.fitMode || prev.minGap !== S.settings.minGap) buildSchedule();
    else renderMarkers();
    if (!S.settings.enabled) dismissActive();
    updateHud();
  });

  /* ---------- Gắn vào trình phát ---------- */
  function unmount() {
    if (S.video) {
      S.video.removeEventListener('timeupdate', tick);
      S.video.removeEventListener('ended', tick);
      S.video.removeEventListener('durationchange', onDuration);
    }
    stashActive();
    if (S.i18n) { S.i18n.disconnect(); S.i18n = null; }
    if (S.root) S.root.remove();
    document.querySelectorAll('.ytl-markers, .ytl-ctl').forEach((n) => n.remove());
    S.player = S.video = S.root = S.stage = S.hudLabel = S.menu = S.hud = S.panel = null;
    S.active = null;
  }

  function mount() {
    if (!onWatchPage()) { if (S.root) unmount(); return false; }
    const player = document.querySelector('#movie_player');
    const video = player && player.querySelector('video');
    if (!player || !video) return false;
    if (S.player === player && S.video === video && S.root && S.root.isConnected) return true;
    unmount();
    S.player = player; S.video = video;

    const root = h('div'); root.id = 'ytl-root';
    const stage = h('div', 'ytl-stage');
    const hud = h('div', 'ytl-hud');
    const label = h('span', 'ytl-hud-label');
    const file = h('input'); file.type = 'file'; file.accept = '.md,.markdown,.txt,.csv,.tsv'; file.multiple = true; file.hidden = true;
    const dir = h('input'); dir.type = 'file'; dir.webkitdirectory = true; dir.multiple = true; dir.hidden = true;
    const onPick = (input, activate) => input.addEventListener('change', async () => {
      const files = Array.from(input.files || []); // chép ra trước khi xóa value, nếu không danh sách file bị rỗng
      input.value = '';
      await importFiles(files, activate);
    });
    onPick(file, true);
    onPick(dir, false);
    const menu = h('div', 'ytl-menu');
    S.pickFile = () => file.click();
    S.pickDir = () => dir.click();
    label.title = 'Danh sách bài học';
    label.addEventListener('click', toggleMenu);
    const bLoad = btn('☰', 'ytl-icon', toggleMenu); bLoad.title = 'Danh sách bài học / nạp bài';
    const bHide = btn('⏸', 'ytl-icon', toggleHidden); bHide.title = 'Tạm ẩn / hiện bài học';
    const bFs = btn('⛶', 'ytl-icon', toggleFullscreen); bFs.title = 'Toàn màn hình / bình thường';
    const bPrev = btn('⏮', 'ytl-icon', () => go(-1)); bPrev.title = 'Bài trước  [';
    const bNext = btn('⏭', 'ytl-icon', () => go(1)); bNext.title = 'Bài sau  ]';
    const bSet = btn('⚙', 'ytl-icon', togglePanel); bSet.title = 'Cài đặt nhanh';
    const panel = h('div', 'ytl-panel');
    hud.append(label, bLoad, bPrev, bNext, bHide, bSet, bFs, file, dir);
    const toastEl = h('div', 'ytl-toast');
    root.append(stage, hud, menu, panel, toastEl);
    S.toastEl = toastEl;
    S.panel = panel;
    // Không để thao tác trên lớp phủ lọt xuống YouTube (click = pause, phím tắt...).
    ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend',
      'wheel', 'contextmenu', 'keydown', 'keyup', 'keypress'].forEach((t) => root.addEventListener(t, (e) => e.stopPropagation()));
    player.appendChild(root);
    S.i18n = YTL.autoLocalize(root);
    S.root = root; S.stage = stage; S.hudLabel = label; S.hideBtn = bHide; S.menu = menu; S.hud = hud;

    video.addEventListener('timeupdate', tick);
    video.addEventListener('ended', tick);
    video.addEventListener('durationchange', onDuration);
    applyTheme();
    buildSchedule();
    updateHud();
    return true;
  }

  // Các cài đặt về kích thước và vị trí được lưu riêng cho chế độ toàn màn hình (settings.fs); chưa chỉnh thì dùng giá trị chế độ thường.
  const MODE_KEYS = ['fontScale', 'cardW', 'cardH', 'offsetX', 'offsetY', 'cardPos'];
  const isFs = () => !!document.fullscreenElement;
  function gs(k) {
    const f = S.settings.fs;
    return isFs() && MODE_KEYS.includes(k) && f && f[k] != null ? f[k] : S.settings[k];
  }
  function ss(k, v) {
    if (isFs() && MODE_KEYS.includes(k)) S.settings.fs = Object.assign({}, S.settings.fs, { [k]: v });
    else S.settings[k] = v;
  }

  function applyTheme() {
    if (!S.root) return;
    const st = S.root.style, s = S.settings;
    const num = (v, d) => (v == null || v === '' || isNaN(Number(v)) ? d : Number(v));
    const tx = YTL.validColor(s.textColor) ? s.textColor : '#ffffff';
    const ta = num(s.textOpacity, 100) / 100;
    st.setProperty('--ytl-text', /^#/.test(tx) && ta < 1 ? YTL.hexToRgba(tx, ta) : tx);
    // Kiểu chỉ viền: viền chữ (vòng bóng không nhòe quanh nét chữ) + bóng đổ, màu tùy chọn để chữ tối vẫn đọc được.
    const oc = YTL.validColor(s.outlineColor) ? s.outlineColor : '#000000';
    const shc = YTL.validColor(s.shadowColor) ? s.shadowColor : '#000000';
    const ow = num(s.outlineW, 1), ssz = num(s.shadowSize, 2), sbl = num(s.shadowBlur, 6);
    const ts = [];
    if (ow > 0) {
      const n = ow <= 1 ? 8 : 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ts.push((Math.cos(a) * ow).toFixed(2) + 'px ' + (Math.sin(a) * ow).toFixed(2) + 'px 0 ' + oc);
      }
    }
    if (ssz > 0 || sbl > 0) ts.push((ssz * 0.5).toFixed(1) + 'px ' + ssz + 'px ' + sbl + 'px ' + shc);
    st.setProperty('--ytl-ts', ts.join(', ') || 'none');
    const bc = YTL.validColor(s.borderColor) ? s.borderColor : tx;
    st.setProperty('--ytl-border', /^#/.test(bc) ? YTL.hexToRgba(bc, num(s.borderOpacity, 100) / 100) : bc);
    st.setProperty('--ytl-ls', num(s.letterSpacing, 0) / 100 + 'em');
    st.setProperty('--ytl-lh', String(num(s.lineHeight, 150) / 100));
    st.setProperty('--ytl-card', YTL.hexToRgba(s.cardColor, s.cardOpacity / 100));
    st.setProperty('--ytl-accent', YTL.validColor(s.accentColor) ? s.accentColor : '#4f9cff');
    st.setProperty('--ytl-dim', String(s.dimOpacity / 100));
    st.setProperty('--ytl-scale', String((Number(gs('fontScale')) || 100) / 100));
    st.setProperty('--ytl-font', YTL.fontStack(s));
    st.setProperty('--ytl-dx', (Number(gs('offsetX')) || 0) + 'cqw');
    st.setProperty('--ytl-dy', (Number(gs('offsetY')) || 0) + 'cqh');
    st.setProperty('--ytl-radius', (s.radius == null ? 9 : Number(s.radius)) / 10 + 'em');
    st.setProperty('--ytl-bw', (s.borderW == null ? 2 : Number(s.borderW)) + 'px');
    const cw = Number(gs('cardW')) || 0, chh = Number(gs('cardH')) || 0;
    st.setProperty('--ytl-w', cw + 'cqw');
    st.setProperty('--ytl-h', chh + 'cqh');
    S.root.classList.toggle('ytl-w', cw > 0);
    S.root.classList.toggle('ytl-h', chh > 0);
    S.root.dataset.pos = gs('cardPos') || 'auto';
    S.root.classList.toggle('ytl-outline', s.cardStyle === 'outline');
    S.root.classList.toggle('ytl-off', !s.enabled);
  }

  function persistSettings() {
    try { chrome.storage.local.set({ settings: Object.assign({}, S.settings) }); } catch (e) { /* bỏ qua */ }
  }
  const clampPct = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v * 10) / 10));

  // Núm ở góc dưới phải: kéo để đổi rộng / cao của khung, nhấp đúp để về kích thước tự động.
  // Góc trên trái được giữ nguyên chỗ bằng cách bù vào độ dời.
  function makeResizable(card) {
    const handle = h('div', 'ytl-resize');
    handle.title = 'Kéo để đổi kích thước khung, nhấp đúp để về kích thước và vị trí mặc định';
    card.append(handle);
    let st = null;
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const r = card.getBoundingClientRect();
      st = { x: e.clientX, y: e.clientY, w: r.width, h: r.height, left: r.left, top: r.top, tall: false };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!st) return;
      const W = S.root.clientWidth, H = S.root.clientHeight;
      ss('cardW', clampPct(((st.w + e.clientX - st.x) / W) * 100, 14, 100));
      if (Math.abs(e.clientY - st.y) > 6) st.tall = true;
      if (st.tall) ss('cardH', clampPct(((st.h + e.clientY - st.y) / H) * 100, 8, 100));
      applyTheme();
      const r = card.getBoundingClientRect();
      ss('offsetX', clampPct((Number(gs('offsetX')) || 0) + ((st.left - r.left) / W) * 100, -90, 90));
      ss('offsetY', clampPct((Number(gs('offsetY')) || 0) + ((st.top - r.top) / H) * 100, -90, 90));
      applyTheme();
    });
    const end = () => { if (st) { st = null; persistSettings(); } };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('dblclick', () => { ['cardW', 'cardH', 'offsetX', 'offsetY'].forEach((k) => ss(k, 0)); applyTheme(); persistSettings(); });
  }

  // Kéo phần đầu thẻ để dời khung; nhấp đúp để về vị trí gốc. Lưu vào cài đặt.
  function makeDraggable(head) {
    let start = null;
    const saveOffset = (x, y) => {
      ss('offsetX', x); ss('offsetY', y);
      applyTheme();
    };
    const persist = persistSettings;
    head.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      start = { x: e.clientX, y: e.clientY, ox: Number(gs('offsetX')) || 0, oy: Number(gs('offsetY')) || 0 };
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', (e) => {
      if (!start) return;
      const clamp = (v) => clampPct(v, -90, 90);
      saveOffset(clamp(start.ox + ((e.clientX - start.x) / S.root.clientWidth) * 100),
        clamp(start.oy + ((e.clientY - start.y) / S.root.clientHeight) * 100));
    });
    const end = () => { if (start) { start = null; persist(); } };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
    head.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) { saveOffset(0, 0); persist(); } });
  }

  function toggleFullscreen() {
    const b = S.player && S.player.querySelector('.ytp-fullscreen-button');
    if (b) b.click();
    else if (document.fullscreenElement) document.exitFullscreen();
    else if (S.player) S.player.requestFullscreen().catch(() => {});
  }

  function toggleHidden() {
    S.hidden = !S.hidden;
    if (S.hidden) dismissActive(); else pump();
    updateHud();
  }

  // Đóng thẻ đang mở mà không coi là đã xong (đưa lại vào hàng chờ).
  function dismissActive() {
    if (!S.active) { resumeIfPaused(); return; }
    stashActive();
    clearStage();
    resumeIfPaused();
  }

  function clearStage() {
    clearTimeout(S.autoTimer);
    S.active = null;
    if (S.stage) { S.stage.className = 'ytl-stage'; S.stage.replaceChildren(); }
  }

  function pauseVideo() {
    if (S.video && !S.video.paused) { S.video.pause(); S.pausedByUs = true; }
  }
  function resumeIfPaused() {
    if (S.pausedByUs && S.video) {
      S.pausedByUs = false;
      const p = S.video.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  /* ---------- Lịch + mốc trên thanh tiến trình ---------- */
  function buildSchedule() {
    S.schedule = null;
    if (!S.lesson || !S.video || !S.progReady || isAd() || Date.now() < S.holdUntil) { renderMarkers(); return; }
    const D = S.video.duration;
    if (!D || isNaN(D)) { renderMarkers(); return; }
    // Bài học tính giờ từ lúc nó được nạp: nạp giữa video (hoặc YouTube phát tiếp từ chỗ cũ) thì mốc 0 là thời điểm đang phát.
    if (S.base == null) {
      const t = S.video.currentTime || 0;
      S.base = t > 5 && (!isFinite(D) || t < D - 5) ? t : 0;
    }
    // Kế hoạch cho video này = các cụm chưa học. Bài mới tinh thì giữ mốc gốc; học dở thì dồn lại từ giây thứ 5,
    // giữ khoảng cách gốc giữa các cụm (tối đa 2 phút). Chốt một lần cho mỗi video để mốc không nhảy khi xếp lại.
    if (!S.plan) {
      const rem = S.allUnits.filter((u) => !S.done.has(u.key));
      const fresh = rem.length === S.allUnits.length;
      const blocks = [];
      let t = 5, prev = null;
      rem.forEach((u) => {
        if (prev != null) t += Math.min(120, Math.max(1, u.origT - prev));
        prev = u.origT;
        u.blocks.forEach((b, i) => blocks.push(i === 0 ? Object.assign({}, b, { time: fresh ? u.origT : t }) : b));
      });
      S.plan = { blocks };
    }
    const sc = YTL.buildSchedule({ blocks: S.plan.blocks }, isFinite(D) ? D - S.base : D, S.settings);
    const byKey = new Map(S.allUnits.map((u) => [u.key, u]));
    sc.units.forEach((u) => { u.t = Math.round((u.t + S.base) * 10) / 10; u.blocks = byKey.get(u.key).blocks; });
    sc.duration = isFinite(D) ? D : null;
    sc.builtFor = D;
    S.schedule = sc;
    renderMarkers();
  }

  function onDuration() {
    if (isAd() || !S.video) return;
    const D = S.video.duration;
    if (!S.schedule || (isFinite(D) && Math.abs(D - S.schedule.builtFor) > 1)) { buildSchedule(); updateHud(); }
  }

  function renderMarkers() {
    document.querySelectorAll('.ytl-markers').forEach((n) => n.remove());
    const sc = S.schedule;
    if (!S.settings.enabled || !S.settings.showMarkers || !sc || !sc.duration || !S.player) return;
    const bar = S.player.querySelector('.ytp-progress-bar');
    if (!bar) return;
    const wrap = h('div', 'ytl-markers');
    sc.units.forEach((u) => {
      const mk = h('div', 'ytl-marker' + (u.hasQuiz ? ' ytl-marker-quiz' : ''));
      mk.style.left = Math.min(100, (u.t / sc.duration) * 100) + '%';
      wrap.appendChild(mk);
    });
    bar.appendChild(wrap);
  }

  /* ---------- Vòng lặp theo thời gian video ---------- */
  function tick() {
    if (!S.settings.enabled || !S.lesson || S.hidden || !S.video || !S.progReady || isAd()) return;
    if (!S.schedule) buildSchedule();
    // Mọi mốc đã qua mà chưa hiện đều được xếp hàng theo thứ tự (tua tới cũng không mất bài; dùng ⏭ để bỏ qua).
    // Hết video mà chưa hết bài thì không chặn gì cả: phần còn lại tự tiếp tục ở video sau.
    let added = false;
    if (S.schedule) {
      const t = S.video.currentTime;
      S.schedule.units.forEach((u) => {
        if (!S.done.has(u.key) && u.t <= t) {
          S.done.add(u.key);
          u.blocks.forEach((b) => S.queue.push(b));
          // Chia khoảng thời gian tới mốc kế tiếp cho các thẻ của cụm (theo độ dài ước tính) để tự chuyển đúng nhịp.
          const nxt = S.schedule.units.find((x) => x.t > u.t);
          const est = u.blocks.map((b) => YTL.estimateBlock(b));
          const total = est.reduce((a, c) => a + c, 0);
          const slot = nxt ? nxt.t - u.t : total;
          u.blocks.forEach((b, i) => S.deadline.set(b.id, (slot * est[i]) / total)); // thời lượng (giây) của từng thẻ
          added = true;
        }
      });
    }
    if (added) S.snooze = false;
    if (S.active) updateCountdown(); else pump();
    if (added) updateHud();
  }

  function pump() {
    if (S.active || !S.settings.enabled || S.hidden || !S.root || !S.progReady) return;
    if (S.snooze && !S.pendingSummary) return; // đang thu nhỏ: chờ mốc kế tiếp (tick sẽ bỏ thu nhỏ khi có mốc mới)
    if (S.queue.length) showBlock(S.queue.shift());
    else if (S.pendingSummary) showSummary();
    else if (!S.summaryShown && S.settings.endSummary && S.session && allDone()) showSummary(); // học xong là tổng kết, không chờ hết video
  }

  // Xong bài = mọi cụm của cả bài (không chỉ phần xếp được vào video này) đã hiện.
  const allDone = () => S.allUnits.length > 0 && S.allUnits.every((u) => S.done.has(u.key));

  /* ---------- Bài trước / bài sau (không tua video) ---------- */
  function go(dir) {
    S.snooze = false;
    if (!S.lesson || !S.progReady || !S.root || !S.settings.enabled || S.hidden) return;
    const list = [];
    S.allUnits.forEach((u) => u.blocks.forEach((b) => list.push({ b, u })));
    if (!list.length) return;
    const a = S.active;
    let target;
    if (a && a.block) target = list.findIndex((x) => x.b === a.block) + dir;
    else if (a && a.summary) target = dir < 0 ? list.length - 1 : list.length;
    else {
      const last = list.findIndex((x) => x.b === S.lastBlock);
      target = dir > 0 ? last + 1 : last;
    }
    if (target < 0) return;
    if (dir > 0 && a && a.block && a.block.type === 'quiz' && !a.answered) record(a.block, 'skipped', '');
    clearStage();
    if (target >= list.length) {
      S.allUnits.forEach((u) => S.done.add(u.key));
      S.queue = [];
      if (S.session) S.pendingSummary = true;
      pump();
      if (!S.active) resumeIfPaused();
      updateHud();
      return;
    }
    const tu = list[target].u;
    for (const u of S.allUnits) { S.done.add(u.key); if (u === tu) break; }
    S.queue = tu.blocks.slice(tu.blocks.indexOf(list[target].b) + 1);
    S.summaryShown = false;
    S.pendingSummary = false;
    showBlock(list[target].b);
  }

  function closeCard() {
    clearStage();
    pump();
    if (!S.active) resumeIfPaused();
    updateHud();
  }

  const hasNext = () => S.queue.length > 0 || S.allUnits.some((u) => !S.done.has(u.key));

  // Nút "Tiếp": hiện ngay khối kế tiếp, kể cả khi chưa tới mốc thời gian của nó (không tua video).
  function nextNow() {
    S.snooze = false;
    if (S.queue.length) { closeCard(); return; }
    const nx = S.allUnits.find((u) => !S.done.has(u.key));
    if (!nx) { closeCard(); return; } // hết bài: đóng thẻ, bảng kết quả tự hiện
    clearStage();
    S.done.add(nx.key);
    S.queue = nx.blocks.slice(1);
    showBlock(nx.blocks[0]);
  }

  // Nút "–": ẩn thẻ đang xem và chờ tới mốc thời gian của bài kế tiếp. Câu hỏi chưa trả lời tính là bỏ qua.
  function minimize() {
    const a = S.active;
    if (!a) return;
    if (a.block && a.block.type === 'quiz' && !a.answered) record(a.block, 'skipped', '');
    S.snooze = !a.summary;
    closeCard();
  }

  /* ---------- Phiên học + lưu kết quả ---------- */
  function ensureSession() {
    if (S.session) return;
    const sc = S.schedule;
    S.session = {
      id: 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      videoId: S.vid,
      videoTitle: document.title.replace(/^\(\d+\)\s*/, '').replace(/\s*-\s*YouTube$/, ''),
      url: location.href,
      lessonId: S.lesson.id, lessonTitle: S.lesson.title,
      startedAt: Date.now(), updatedAt: Date.now(),
      duration: sc && sc.duration ? Math.round(sc.duration) : null,
      plannedBlocks: S.lesson.blocks.length,
      droppedBlocks: 0, videos: [S.vid],
      lessonsSeen: 0, answers: [], finished: false
    };
  }

  function saveSession() {
    if (!S.session || !alive()) return;
    S.session.updatedAt = Date.now();
    const snap = JSON.parse(JSON.stringify(S.session));
    S.saveChain = S.saveChain.then(async () => {
      try {
        const st = await chrome.storage.local.get('history');
        const hist = (st.history || []).filter((x) => x.id !== snap.id);
        hist.unshift(snap);
        await chrome.storage.local.set({ history: hist.slice(0, 200) });
      } catch (e) { /* extension vừa được tải lại */ }
    });
  }

  function record(b, result, user) {
    const s = S.session;
    const ex = s.answers.find((a) => a.blockId === b.id);
    if (ex) { ex.retry = result; ex.retryUser = user; }
    else s.answers.push({
      blockId: b.id, question: YTL.plainText(b.quiz.question).slice(0, 300), type: b.quiz.type,
      result, user, correct: YTL.correctText(b.quiz), at: Math.round(S.video.currentTime || 0)
    });
    saveSession();
  }

  /* ---------- Thẻ hiển thị ---------- */
  function resolveSize(b) {
    if (b.size !== 'auto') return b.size;
    const len = b.body.length, rows = b.body.split('\n').length;
    if (b.type === 'quiz') return len > 700 ? 'full' : 'card';
    if (len <= 140 && rows <= 2) return 'banner';
    return len <= 600 && rows <= 14 ? 'card' : 'full';
  }

  function openCard(b, badge, size, title) {
    size = size || resolveSize(b);
    S.stage.replaceChildren();
    S.stage.className = 'ytl-stage on ytl-size-' + size;
    const card = h('div', 'ytl-card');
    const head = h('div', 'ytl-head');
    head.append(h('span', 'ytl-badge' + (b && b.type === 'quiz' ? ' ytl-badge-quiz' : ''), badge));
    title = title || (b && b.title);
    if (title) head.append(h('span', 'ytl-title', title));
    const bp = btn('◀', 'ytl-icon', () => go(-1)); bp.title = 'Bài trước  [';
    const bn = btn('▶', 'ytl-icon', () => go(1)); bn.title = 'Bài sau  ]';
    const timer = btn('', 'ytl-timer', () => {
      S.settings.autoAdvance = !S.settings.autoAdvance;
      persistSettings();
      updateCountdown();
    });
    const bx = btn('✕', 'ytl-icon', toggleHidden);
    bx.title = 'Ẩn bài học. Bật lại bằng nút ▶ trên thanh đầu video';
    const count = h('div', 'ytl-count');
    const bm = btn('–', 'ytl-icon', minimize);
    bm.title = 'Thu nhỏ: ẩn thẻ này và chờ tới bài kế tiếp';
    head.append(h('span', 'ytl-spacer'), timer, bp, bn, bm, bx);
    card.append(count);
    head.classList.add('ytl-drag');
    head.title = 'Kéo để dời khung, nhấp đúp để về chỗ cũ';
    makeDraggable(head);
    makeResizable(card);
    const body = h('div', 'ytl-body');
    const footer = h('div', 'ytl-footer');
    card.append(head, body, footer);
    if (b) {
      const st = b.style;
      if (YTL.validColor(st.color)) card.style.color = st.color;
      if (YTL.validColor(st.bg)) card.style.background = st.bg;
      // Font riêng của khối chỉ dùng khi người học chưa tự chọn font trong cài đặt.
      const userFont = String(S.settings.fontCustom || '').trim() || (S.settings.fontFamily && S.settings.fontFamily !== 'system');
      if (st.font && !userFont) card.style.fontFamily = YTL.FONTS[st.font] || YTL.fontStack({ fontCustom: st.font });
      if (/^(left|center|right)$/.test(st.align || '')) body.style.textAlign = st.align;
      const fs = Number(st.fontSize);
      if (fs >= 50 && fs <= 300) body.style.fontSize = fs / 100 + 'em';
    }
    S.stage.append(card);
    return { card, head, body, footer, timer, count };
  }

  function showBlock(b) {
    ensureSession();
    const isQuiz = b.type === 'quiz';
    const pm = S.settings.pauseMode;
    if (pm === 'all' || (pm === 'quiz' && isQuiz)) pauseVideo();
    const ui = openCard(b, isQuiz ? 'Câu hỏi' : 'Bài học');
    S.active = { block: b, timerEl: ui.timer, barEl: ui.count };
    // Mỗi thẻ có thời lượng riêng, tính từ lúc nó hiện ra (không dồn giờ cho thẻ cuối cụm khi các thẻ trước chạy trễ).
    const est = YTL.estimateBlock(b);
    S.active.total = Math.max(S.deadline.has(b.id) ? S.deadline.get(b.id) : est, est * 0.6, isQuiz ? 12 : 5);
    if (isQuiz) renderQuiz(b, ui); else renderLesson(b, ui);
    updateCountdown();
    S.shown.add(b.id);
    S.lastBlock = b;
    updateHud();
  }

  function renderLesson(b, ui) {
    ui.body.append(YTL.renderMarkdown(b.body));
    if (!S.shown.has(b.id)) { S.session.lessonsSeen++; saveSession(); }
    ui.footer.append(h('span', 'ytl-hint', 'Enter'), btn(hasNext() ? 'Tiếp ▶' : 'Xong ✓', 'ytl-primary', nextNow));
    S.active.primary = nextNow;
  }

  // Chế độ tự chuyển: đếm ngược theo thời gian video (video dừng thì đồng hồ cũng dừng). Hết giờ thì sang thẻ kế;
  // câu hỏi chưa trả lời được ghi là bỏ qua.
  function updateCountdown() {
    const a = S.active;
    if (!a || !a.timerEl) return;
    if (!a.total || !S.video) { a.timerEl.textContent = ''; a.barEl.style.display = 'none'; return; }
    if (!S.settings.autoAdvance) { // đồng hồ đang tạm dừng: bấm vào để chạy lại
      a.deadline = null;
      a.timerEl.textContent = '⏱ ▶';
      a.timerEl.title = 'Đồng hồ đang dừng. Bấm để tự chuyển thẻ trở lại';
      a.barEl.style.display = 'none';
      return;
    }
    const now = S.video.currentTime || 0;
    if (a.deadline == null) { a.start = now; a.deadline = now + a.total; }
    a.timerEl.title = 'Bấm để tạm dừng đồng hồ (tắt tự chuyển thẻ)';
    const left = a.deadline - now;
    if (left <= 0) {
      if (a.block && a.block.type === 'quiz' && !a.answered) record(a.block, 'skipped', '');
      closeCard();
      return;
    }
    a.timerEl.textContent = '⏱ ' + fmt(Math.ceil(left)) + ' ❚❚';
    a.barEl.style.display = '';
    a.barEl.style.transform = 'scaleX(' + Math.max(0, Math.min(1, left / Math.max(1, a.deadline - a.start))) + ')';
  }

  function renderQuiz(b, ui) {
    const q = b.quiz;
    const active = S.active;
    ui.body.append(YTL.renderMarkdown(q.question));
    const fb = h('div', 'ytl-feedback');
    let done = false;
    let reveal = () => {};

    const finish = (result, userText) => {
      if (done) return;
      done = true;
      active.answered = true;
      record(b, result, userText);
      fb.classList.add('ytl-' + result);
      fb.append(h('div', 'ytl-verdict', result === 'correct' ? '✓ Chính xác!' : result === 'wrong' ? '✗ Chưa đúng' : '– Đã bỏ qua'));
      if (result !== 'correct') fb.append(h('div', 'ytl-answer', 'Đáp án: ' + YTL.correctText(q)));
      if (q.explain) { const ex = h('div', 'ytl-explain'); ex.append(YTL.renderMarkdown(q.explain)); fb.append(ex); }
      const hint = h('span', 'ytl-hint', 'Enter');
      ui.footer.replaceChildren(hint, btn(hasNext() ? 'Tiếp ▶' : 'Xong ✓', 'ytl-primary', nextNow));
      active.primary = nextNow;
      if (result === 'correct') { // trả lời đúng: tự ẩn sau 5 giây (bấm Tiếp để sang bài kế ngay)
        let left = 5;
        const tickHide = () => {
          if (S.active !== active) return;
          if (left <= 0) { closeCard(); return; }
          hint.textContent = 'Tự ẩn sau ' + left + 's';
          left--;
          S.autoTimer = setTimeout(tickHide, 1000);
        };
        tickHide();
      }
      active.pick = null;
      fb.scrollIntoView({ block: 'nearest' });
      // Trả lời xong vẫn còn vài giây để đọc đáp án / giải thích.
      if (active.deadline != null && S.video) active.deadline = Math.max(active.deadline, S.video.currentTime + (q.explain ? 8 : 4));
      updateCountdown();
      updateHud();
    };
    const skip = btn('Bỏ qua', 'ytl-ghost', () => { reveal(); finish('skipped', ''); });

    if (q.type === 'input') {
      const inp = h('input', 'ytl-input');
      inp.type = 'text'; inp.placeholder = 'Nhập câu trả lời…'; inp.autocomplete = 'off'; inp.spellcheck = false;
      const check = () => {
        const v = inp.value.trim();
        if (!v) { inp.focus(); return; }
        const ok = YTL.checkInput(q, v);
        inp.disabled = true;
        inp.classList.add(ok ? 'ok' : 'bad');
        finish(ok ? 'correct' : 'wrong', v);
      };
      reveal = () => { inp.disabled = true; };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      ui.body.append(inp, fb);
      ui.footer.append(skip, btn('Kiểm tra', 'ytl-primary', check));
      active.primary = check;
      setTimeout(() => { if (inp.isConnected) inp.focus({ preventScroll: true }); }, 60);
      return;
    }

    const order = q.options.map((_, i) => i);
    if (S.settings.shuffleOptions) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    const list = h('div', 'ytl-options');
    const sel = new Set();
    const btns = [];
    reveal = () => btns.forEach((bt, k) => {
      bt.disabled = true;
      if (q.options[order[k]].correct) bt.classList.add('ok');
      else if (sel.has(order[k])) bt.classList.add('bad');
    });
    const submit = () => {
      if (done || !sel.size) return;
      reveal();
      const ok = q.options.every((o, i) => o.correct === sel.has(i));
      finish(ok ? 'correct' : 'wrong', [...sel].sort((a, c) => a - c).map((i) => YTL.plainText(q.options[i].text)).join('; '));
    };
    const pick = (k) => {
      if (done || k >= order.length) return;
      const i = order[k];
      if (q.type === 'multi') {
        if (sel.has(i)) sel.delete(i); else sel.add(i);
        btns[k].classList.toggle('sel');
      } else { sel.add(i); submit(); }
    };
    order.forEach((i, k) => {
      const bt = h('button', 'ytl-option');
      bt.type = 'button';
      const tx = h('span', 'ytl-opt-text');
      YTL.renderInline(q.options[i].text, tx);
      bt.append(h('span', 'ytl-key', String(k + 1)), tx);
      bt.addEventListener('click', () => pick(k));
      btns.push(bt);
      list.append(bt);
    });
    ui.body.append(list, fb);
    active.pick = pick;
    if (q.type === 'multi') {
      ui.footer.append(h('span', 'ytl-hint', 'Chọn nhiều đáp án'), skip, btn('Kiểm tra', 'ytl-primary', submit));
      active.primary = submit;
    } else ui.footer.append(h('span', 'ytl-hint', 'Phím 1–' + order.length), skip);
  }

  function showSummary() {
    S.pendingSummary = false;
    ensureSession();
    const s = S.session;
    const finished = allDone();
    if (finished) { S.summaryShown = true; S.completed = true; } // xem kết quả giữa chừng thì chưa tính là xong
    s.finished = finished;
    saveSession();
    const ui = openCard(null, 'Kết quả', 'full', s.lessonTitle);
    S.active = { summary: true, primary: closeCard };
    const st = YTL.sessionStats(s);
    const score = h('div', 'ytl-score');
    let sub = st.correct + '/' + st.total + ' câu đúng';
    if (st.skipped) sub += ' · ' + st.skipped + ' bỏ qua';
    if (st.fixed) sub += ' · sửa đúng ' + st.fixed + ' câu khi làm lại';
    sub += ' · ' + s.lessonsSeen + ' bài học';
    const left = S.lesson ? S.lesson.blocks.length - S.shown.size : 0;
    if (!finished && left > 0) sub += ' · còn ' + left + ' khối chưa học';
    if (s.droppedBlocks) sub += ' · lược ' + s.droppedBlocks + ' khối cho vừa video';
    score.append(h('div', 'ytl-score-num', st.total ? st.percent + '%' : '✓'), h('div', 'ytl-score-sub', sub));
    ui.body.append(score);
    const list = h('div', 'ytl-review');
    s.answers.forEach((a) => {
      const row = h('div', 'ytl-review-row ytl-' + a.result);
      row.append(h('span', 'ytl-review-icon', a.result === 'correct' ? '✓' : a.result === 'wrong' ? '✗' : '–'));
      const col = h('div', 'ytl-review-col');
      col.append(h('div', 'ytl-review-q', a.question));
      if (a.result !== 'correct') {
        let line = (a.user ? 'Bạn chọn: ' + a.user + ' → ' : '') + 'Đáp án: ' + a.correct;
        if (a.retry) line += a.retry === 'correct' ? '  (làm lại: đúng ✓)' : '  (làm lại: chưa đúng)';
        col.append(h('div', 'ytl-review-a', line));
      }
      row.append(col, h('span', 'ytl-review-t', fmt(a.at)));
      list.append(row);
    });
    ui.body.append(list);

    const wrong = s.answers.filter((a) => (a.retry || a.result) !== 'correct')
      .map((a) => S.lesson && S.lesson.blocks.find((b) => b.id === a.blockId)).filter(Boolean);
    if (wrong.length) {
      ui.footer.append(btn('Làm lại câu sai (' + wrong.length + ')', 'ytl-ghost', () => {
        wrong.forEach((b) => S.queue.push(b));
        S.pendingSummary = true;
        closeCard();
      }));
    }
    ui.footer.append(
      btn('Xem chi tiết', 'ytl-ghost', () => { try { chrome.runtime.sendMessage({ type: 'ytl-open-results' }); } catch (e) { /* bỏ qua */ } }),
      btn('Đóng', 'ytl-primary', closeCard)
    );
    updateHud();
  }

  function updateHud() {
    saveProgress();
    if (!S.root) return;
    let text;
    if (!S.lesson) text = '📂 Chọn bài học';
    else if (S.completed && !S.active) text = '✓ ' + (S.lesson.title || 'Bài học') + ' · đã học xong';
    else {
      const total = S.lesson.blocks.length;
      text = '📘 ' + (S.lesson.title || 'Bài học') + ' · ' + Math.min(S.shown.size, total) + '/' + total;
      if (S.session && S.session.answers.length) {
        const st = YTL.sessionStats(S.session);
        text += ' · ✓' + st.correct + ' ✗' + (st.total - st.correct);
      }
      const t = S.video ? S.video.currentTime : 0;
      const nx = S.schedule && S.schedule.units.find((u) => !S.done.has(u.key) && u.t > t);
      if (S.hidden) text += ' · đang ẩn';
      else if (S.snooze && S.queue.length) text += ' · đã thu nhỏ, ⏭ để xem tiếp';
      else if (nx) text += ' · ⏭ ' + fmt(nx.t);
      else if (S.schedule && !allDone() && !S.active && !S.queue.length) text += ' · phần còn lại sang video sau';
    }
    S.hudLabel.textContent = text + ' ▾';
    S.hideBtn.textContent = S.hidden ? '▶' : '⏸';
    S.root.classList.toggle('ytl-active', !!S.active);
  }

  /* ---------- Menu trên thanh đầu video: danh sách bài, nạp file / thư mục, học lại, xem kết quả ---------- */
  function closeMenu() {
    if (S.menu) S.menu.classList.remove('on');
    if (S.root) S.root.classList.remove('ytl-menu-open');
  }
  function toggleMenu() {
    if (S.menu && S.menu.classList.contains('on')) closeMenu(); else openMenu();
  }
  function toast(text) {
    if (!S.toastEl) return;
    S.toastEl.textContent = text;
    S.toastEl.classList.add('on');
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(() => { if (S.toastEl) S.toastEl.classList.remove('on'); }, 3200);
  }

  // Đọc + chuyển đổi + lưu các file được chọn, rồi báo kết quả ngay trên video.
  async function importFiles(files, activate) {
    files = Array.from(files || []);
    if (!files.length) return;
    let items = [];
    try { items = await YTL.readLessonFiles(files); } catch (e) { toast('Không đọc được file: ' + e.message); return; }
    if (!items.length) { toast('Không có file .md .txt .csv .tsv nào dùng được trong ' + files.length + ' file đã chọn'); return; }
    try {
      await YTL.saveLessons(items, activate || items.length === 1);
      toast(items.length === 1 ? 'Đã nạp "' + items[0].name + '" (' + items[0].what + ')' : 'Đã nạp ' + items.length + ' bài vào thư viện');
    } catch (e) { toast('Không lưu được. Hãy tải lại trang YouTube rồi thử lại.'); return; }
    if (S.menu && S.menu.classList.contains('on')) openMenu();
  }

  // Nút chọn file dạng <label> bọc <input type=file>: trình duyệt tự mở hộp chọn file, không phụ thuộc click() bằng mã.
  function fileLabel(text, cls, dir, activate) {
    const l = h('label', cls);
    const i = h('input', 'ytl-file');
    i.type = 'file'; i.multiple = true;
    if (dir) i.webkitdirectory = true; else i.accept = '.md,.markdown,.txt,.csv,.tsv';
    i.addEventListener('change', async () => {
      const files = Array.from(i.files || []);
      i.value = '';
      await importFiles(files, activate);
    });
    l.append(h('span', null, text), i);
    return l;
  }

  async function deleteLesson(id) {
    let st;
    try { st = await chrome.storage.local.get(['lessons', 'activeLessonId']); } catch (e) { return; }
    const lessons = st.lessons || {};
    const rec = lessons[id];
    if (!rec) return;
    delete lessons[id];
    let active = st.activeLessonId;
    if (active === id) active = (Object.values(lessons).sort((a, b) => b.addedAt - a.addedAt)[0] || {}).id || null;
    await chrome.storage.local.set({ lessons, activeLessonId: active });
    toast('Đã xóa "' + (rec.title || rec.name) + '"');
  }

  async function openMenu() {
    if (!S.menu) return;
    let st;
    try { st = await chrome.storage.local.get(['lessons', 'activeLessonId']); } catch (e) { return; }
    if (!S.menu) return;
    closePanel();
    snapshotProgress();
    const m = S.menu;
    m.replaceChildren();
    const name = (l) => l.title || l.name || '';
    const list = Object.values(st.lessons || {}).sort((a, b) => name(a).localeCompare(name(b), 'vi'));
    const head = h('div', 'ytl-menu-head');
    head.append(h('span', null, 'Thư viện bài học'), h('span', 'ytl-menu-count', String(list.length)), btn('✕', 'ytl-icon', closeMenu));
    m.append(head);

    const box = h('div', 'ytl-lib');
    const loadDemo = async () => {
      try { const n = await YTL.loadSamples(); toast('Đã nạp ' + n + ' bài mẫu'); }
      catch (e) { toast('Không nạp được bài mẫu. Hãy tải lại trang YouTube rồi thử lại.'); }
      if (S.menu && S.menu.classList.contains('on')) openMenu();
    };
    if (!list.length) {
      box.append(h('div', 'ytl-menu-empty', 'Chưa có bài nào. Nạp bộ bài mẫu để thử, hoặc tải file / tạo bài mới bên dưới.'));
      box.append(btn('🎓 Nạp bộ bài mẫu (' + YTL.SAMPLES.length + ' bài, có hướng dẫn sử dụng)', 'ytl-menu-btn ytl-menu-main ytl-menu-demo', loadDemo));
    }
    list.forEach((l) => {
      const p = S.progAll[l.id];
      const current = l.id === st.activeLessonId;
      const total = (String(l.text || '').match(/<(lesson|quiz)\b/gi) || []).length || 1;
      const seen = p ? Math.min(total, (p.shown || []).length) : 0;
      const item = h('div', 'ytl-lib-item' + (current ? ' ytl-current' : ''));
      const pick = btn('', 'ytl-lib-pick', () => {
        closeMenu();
        if (!current) { try { chrome.storage.local.set({ activeLessonId: l.id }); } catch (e) { /* bỏ qua */ } }
      });
      pick.title = current ? 'Bài đang học' : 'Chuyển sang bài này';
      const bar = h('span', 'ytl-lib-bar');
      const fill = h('span', 'ytl-lib-fill');
      fill.style.width = Math.round((seen / total) * 100) + '%';
      bar.append(fill);
      const sub = (p && p.completed ? '✓ đã học xong' : seen ? 'đã học ' + seen + '/' + total + ' khối' : total + ' khối · chưa học') + (current ? ' · đang học' : '');
      pick.append(h('span', 'ytl-lib-name', name(l)), h('span', 'ytl-lib-sub', sub), bar);
      const del = btn('🗑', 'ytl-lib-del', async () => {
        if (!del.classList.contains('arm')) { // bấm lần hai mới xóa
          del.classList.add('arm'); del.textContent = 'Xóa?';
          setTimeout(() => { if (del.isConnected) { del.classList.remove('arm'); del.textContent = '🗑'; } }, 3000);
          return;
        }
        await deleteLesson(l.id);
        openMenu();
      });
      del.title = 'Xóa bài này khỏi thư viện';
      item.append(pick, del);
      box.append(item);
    });
    m.append(box);

    const add = h('div', 'ytl-menu-actions');
    add.append(
      fileLabel('＋ Tải file', 'ytl-menu-btn ytl-menu-main', false, true),
      fileLabel('📁 Nạp thư mục', 'ytl-menu-btn', true, false),
      btn('✎ Tạo bài', 'ytl-menu-btn', () => { closeMenu(); S.panelTab = 'create'; openPanel(); })
    );
    m.append(add);
    if (S.lesson) {
      const cur = h('div', 'ytl-menu-actions ytl-menu-sub');
      cur.append(
        btn('📊 Kết quả đến giờ', 'ytl-menu-btn', () => { closeMenu(); stashActive(); clearStage(); showSummary(); }),
        btn('↻ Học lại từ đầu', 'ytl-menu-btn', () => { closeMenu(); restartLesson(); })
      );
      m.append(cur);
    }
    if (list.length) {
      const demo = h('div', 'ytl-menu-actions ytl-menu-sub');
      demo.append(btn('🎓 Nạp bộ bài mẫu', 'ytl-menu-btn', loadDemo));
      m.append(demo);
    }
    m.classList.add('on');
    S.root.classList.add('ytl-menu-open');
  }
  document.addEventListener('pointerdown', (e) => {
    const tg = e.target;
    const inside = (sel) => !!(tg && tg.closest && tg.closest(sel));
    if (S.menu && S.menu.classList.contains('on') && !inside('.ytl-menu') && !inside('.ytl-hud')) closeMenu();
    if (S.panel && S.panel.classList.contains('on') && !inside('.ytl-panel') && !inside('.ytl-ctl') && !inside('.ytl-hud')) closePanel();
  }, true);

  /* ---------- Nút trên thanh điều khiển của YouTube + bảng cài đặt nhanh ngay trong trình phát ---------- */
  function ensureControlButton() {
    if (!S.player) return;
    const bar = S.player.querySelector('.ytp-right-controls');
    if (!bar) return;
    const old = bar.querySelector('.ytl-ctl');
    if (old) {
      if (old.parentNode === bar && bar.querySelector(':scope > :not(.ytl-ctl) .ytp-button')) old.remove(); // đang nằm sai nhóm: chèn lại
      else { fitControlIcon(bar, old); return; }
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ytp-button ytl-ctl';
    b.title = YTL.tr('Chill Learn — cài đặt bài học');
    b.setAttribute('aria-label', b.title);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    const p = document.createElementNS(NS, 'path'); // quyển sách mở
    p.setAttribute('fill', '#fff');
    p.setAttribute('d', 'M8 11c3-1.2 6-1.2 9 .4V26c-3-1.6-6-1.6-9-.4zm20 0c-3-1.2-6-1.2-9 .4V26c3-1.6 6-1.6 9-.4z');
    svg.appendChild(p);
    b.appendChild(svg);
    b.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
    // Giao diện YouTube mới gom các nút vào nhóm con bên trong .ytp-right-controls: phải chèn vào cùng nhóm với
    // nút gốc đầu tiên, nếu chèn thẳng vào thanh thì nút rơi ra ngoài hàng.
    const first = [...bar.querySelectorAll('.ytp-button')].find((x) => x.offsetWidth > 0);
    if (first && first.parentNode) first.parentNode.insertBefore(b, first);
    else bar.insertBefore(b, bar.firstChild);
    fitControlIcon(bar, b);
  }

  // Canh icon theo đúng nút gốc bên cạnh: giao diện YouTube mới đặt icon nhỏ ở giữa nút, giao diện cũ cho icon phủ kín nút.
  function fitControlIcon(bar, b) {
    const svg = b.firstChild;
    const refBtn = [...bar.querySelectorAll('.ytp-button:not(.ytl-ctl)')].find((x) => x.offsetWidth > 0 && x.querySelector('svg'));
    if (!svg || !refBtn) return;
    const rs = refBtn.querySelector('svg').getBoundingClientRect(), rb = refBtn.getBoundingClientRect();
    if (rs.width < 8) return;
    // Đặt icon tuyệt đối vào chính giữa nút, cùng kích thước icon gốc. Không dựa vào dòng chảy bố cục của nút
    // vì nút YouTube có phần tử giả (nền bo tròn khi rê chuột) chiếm chỗ và đẩy icon lệch xuống góc.
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.width = rb.width + 'px';
    b.style.height = rb.height + 'px';
    const st = svg.style;
    st.position = 'absolute';
    st.left = '50%';
    st.top = '50%';
    st.transform = 'translate(-50%, -50%)';
    st.width = rs.width + 'px';
    st.height = rs.height + 'px';
    st.margin = '0';
    svg.setAttribute('viewBox', rs.width < rb.width - 6 ? '6 7 24 23' : '0 0 36 36');
  }

  function closePanel() { if (S.panel) S.panel.classList.remove('on'); }
  function togglePanel() {
    if (!S.panel) return;
    if (S.panel.classList.contains('on')) closePanel(); else openPanel();
  }
  function setSetting(k, v) {
    ss(k, v);
    if (k === 'fontFamily') S.settings.fontCustom = '';
    applyTheme();
    updateCountdown();
    persistSettings(); // phần còn lại (vạch mốc, bật/tắt) do bộ lắng nghe storage xử lý
    if (k === 'cardStyle' && S.panel && S.panel.classList.contains('on')) openPanel();
  }

  // Tab "Tạo bài học": ba cách (nhờ AI, dán nội dung, chọn file) thành ba thẻ đánh số; trang nhập đầy đủ là một vùng riêng ở cuối.
  const PASTE_SAMPLES = [
    ['Flashcard', 'cat, con mèo\ndog, con chó\nbird, con chim\nfish, con cá'],
    ['Hỏi–đáp', 'question;answer;wrong1;wrong2\nThủ đô Nhật Bản?;Tokyo;Osaka;Kyoto\n2 + 2 = ?;4;3;5'],
    ['Ghi chú', '## Quang hợp\nCây dùng **ánh sáng** để tạo đường từ CO2 và nước.\n\n## Câu 1\nQuang hợp diễn ra ở đâu?\nA. Ti thể\nB. Lục lạp\nĐáp án: B'],
    ['Bài chuẩn', '<lesson time="5s" title="Mở đầu">\nNội dung **bài học**.\n</lesson>\n\n<quiz>\nCâu hỏi?\n- [x] Đúng\n- [ ] Sai\n> Giải thích.\n</quiz>']
  ];
  function renderCreateTab(p) {
    const step = (n, title, desc) => {
      const card = h('div', 'ytl-step');
      const hd = h('div', 'ytl-step-head');
      hd.append(h('span', 'ytl-step-n', String(n)), h('span', 'ytl-step-t', title));
      card.append(hd);
      if (desc) card.append(h('div', 'ytl-step-d', desc));
      p.append(card);
      return card;
    };

    // 1. Nhờ AI
    const s1 = step(1, 'Nhờ AI soạn bài', 'Chép prompt, dán vào một AI bất kỳ cùng tài liệu của bạn, rồi mang kết quả về bước 2.');
    const copy = btn('📋 Chép prompt chuẩn', 'ytl-step-btn', async () => {
      try { await navigator.clipboard.writeText(YTL.getPrompt()); copy.textContent = '✓ Đã chép, dán vào AI nhé'; }
      catch (e) { copy.textContent = 'Trình duyệt không cho chép'; }
      setTimeout(() => { copy.textContent = '📋 Chép prompt chuẩn'; }, 1800);
    });
    s1.append(copy);

    // 2. Dán nội dung
    const s2 = step(2, 'Dán nội dung', 'Dán kết quả của AI, hoặc dán thẳng flashcard / ghi chú. Bấm một mẫu để xem thử.');
    const chips = h('div', 'ytl-chips');
    const name = h('input', 'ytl-field'); name.type = 'text'; name.placeholder = 'Tên bài học (không bắt buộc)'; name.value = S.draftName || '';
    const ta = h('textarea', 'ytl-field'); ta.rows = 6; ta.spellcheck = false; ta.value = S.draft || '';
    ta.placeholder = 'Dán vào đây…';
    const prose = h('select', 'ytl-field');
    [['split', 'Văn bản thường: cắt thành nhiều thẻ vừa khung'], ['scroll', 'Văn bản thường: một thẻ lớn có thanh cuộn']].forEach(([v, t]) => prose.append(new Option(t, v, false, (S.proseMode || 'split') === v)));
    const badge = h('div', 'ytl-detect');
    const convert = (nm) => YTL.convertText(ta.value, { name: nm || 'Bài học', prose: prose.value });
    const imp = btn('Nhập và học ngay', 'ytl-step-btn ytl-step-go', async () => {
      if (!ta.value.trim()) { ta.focus(); return; }
      const nm = name.value.trim() || 'Bài dán ' + new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
      const r = convert(nm);
      if (!r.md) { refresh(); return; }
      try {
        await YTL.saveLesson(nm, r.md);
        S.draft = ''; S.draftName = ''; S.panelTab = 'settings';
        closePanel();
        toast('Đã nạp "' + nm + '" (' + r.what + ')');
      } catch (e) { badge.className = 'ytl-detect bad'; badge.textContent = 'Không lưu được, hãy tải lại trang rồi thử lại.'; }
    });
    const refresh = () => {
      S.draft = ta.value;
      prose.style.display = 'none';
      if (!ta.value.trim()) { badge.className = 'ytl-detect'; badge.textContent = 'Chưa có nội dung.'; imp.disabled = true; return; }
      const r = convert();
      if (!r.md) { badge.className = 'ytl-detect bad'; badge.textContent = '✗ Chưa tách được khối nào từ nội dung này.'; imp.disabled = true; return; }
      const L = YTL.parseLesson(r.md);
      if (r.kind === 'prose') prose.style.display = '';
      badge.className = 'ytl-detect ' + (L.warnings.length ? 'warn' : 'ok');
      badge.textContent = (L.warnings.length ? '⚠ ' : '✓ ') + r.what + ' · ' + L.stats.lessons + ' thẻ, ' + L.stats.quizzes + ' câu hỏi' +
        (r.fixes.length ? ' · đã tự sửa ' + r.fixes.length + ' lỗi định dạng' : '') + (L.warnings.length ? ' · ' + L.warnings[0] : '');
      imp.disabled = false;
    };
    PASTE_SAMPLES.forEach(([label, sample]) => chips.append(btn(label, 'ytl-chip', () => { ta.value = sample; refresh(); ta.focus(); })));
    ta.addEventListener('input', refresh);
    name.addEventListener('input', () => { S.draftName = name.value; });
    prose.addEventListener('change', () => { S.proseMode = prose.value; refresh(); });
    s2.append(chips, ta, prose, badge, name, imp);
    refresh();

    // 3. Từ file
    const s3 = step(3, 'Hoặc lấy từ file', '.md · .txt · .csv · .tsv — tự nhận diện và chuyển đổi.');
    const files = h('div', 'ytl-step-row');
    files.append(fileLabel('📄 Chọn file', 'ytl-step-btn', false, true), fileLabel('📁 Cả thư mục', 'ytl-step-btn', true, false));
    s3.append(files);

    // Vùng riêng: trang nhập đầy đủ
    const full = h('div', 'ytl-fullpage');
    const txt = h('div', 'ytl-fullpage-text');
    txt.append(h('b', null, 'Trang nhập đầy đủ'), h('span', null, 'PDF · xem trước và sửa trước khi lưu · chọn kiểu nội dung · nhập hàng loạt'));
    full.append(txt, btn('Mở trang ↗', 'ytl-step-btn', () => { try { chrome.runtime.sendMessage({ type: 'ytl-open-import' }); } catch (e) { /* bỏ qua */ } }));
    p.append(full);
  }

  // [tên, màu chữ, màu nền khung, màu nhấn, màu viền + bóng chữ dùng ở kiểu chỉ viền]
  const THEMES = [
    ['Đêm', '#ffffff', '#101422', '#4f9cff', '#000000'],
    ['Kem', '#2b2118', '#fff6e0', '#d9822b', '#fff6e0'],
    ['Rừng', '#eafff2', '#0f2a1e', '#35c27a', '#04140c'],
    ['Hồng', '#ffffff', '#3a1030', '#ff6fb5', '#1c0417'],
    ['Tương phản', '#ffff66', '#000000', '#ffd34d', '#000000'],
    ['Đại dương', '#e8f6ff', '#0b2540', '#38bdf8', '#03101f'],
    ['Hoàng hôn', '#fff1e0', '#3b1a12', '#ff8a4c', '#1a0800'],
    ['Tím than', '#f3e8ff', '#1e1433', '#a78bfa', '#0d0620']
  ];
  const TEXT_PRESETS = ['#ffffff', '#ffff66', '#ffd34d', '#eafff2', '#ffd9cc', '#2b2118', '#000000'];
  const BG_PRESETS = ['#101422', '#000000', '#1e1433', '#0b2540', '#0f2a1e', '#3b1a12', '#fff6e0', '#ffffff'];
  const HALO_PRESETS = ['#000000', '#ffffff', '#101422', '#fff6e0', '#3a1030'];

  function openPanel() {
    if (!S.panel) return;
    closeMenu();
    const p = S.panel, s = S.settings;
    const keep = p.scrollTop;
    p.replaceChildren();
    const head = h('div', 'ytl-panel-head');
    head.append(h('span', null, 'Chill Learn'), btn('✕', 'ytl-icon', closePanel));
    p.append(head);
    const tabs = h('div', 'ytl-tabs');
    [['settings', 'Cài đặt'], ['create', 'Tạo bài học']].forEach(([id, label]) => {
      tabs.append(btn(label, 'ytl-tab' + ((S.panelTab || 'settings') === id ? ' on' : ''), () => { S.panelTab = id; openPanel(); }));
    });
    p.append(tabs);
    if (S.panelTab === 'create') { renderCreateTab(p); p.classList.add('on'); return; }

    const outline = s.cardStyle === 'outline';
    const section = (t) => p.append(h('div', 'ytl-panel-sec', t));
    // only = 'outline' | 'solid': tùy chọn chỉ có tác dụng ở kiểu khung đó; ở kiểu còn lại thì làm mờ và khóa.
    const row = (label, control, tag, only) => {
      const r = h(tag || 'label', 'ytl-row');
      r.append(h('span', 'ytl-row-label', label), control);
      if (only && (only === 'outline') !== outline) {
        r.classList.add('ytl-disabled');
        r.title = only === 'outline' ? 'Chỉ có tác dụng ở kiểu khung "Chỉ viền"' : 'Chỉ có tác dụng ở kiểu khung "Nền màu"';
        r.querySelectorAll('input, select, button').forEach((x) => { x.disabled = true; });
      }
      p.append(r);
    };
    const check = (label, k) => {
      const i = h('input'); i.type = 'checkbox'; i.checked = !!s[k];
      i.addEventListener('change', () => setSetting(k, i.checked));
      row(label, i);
    };
    const select = (label, k, opts) => {
      const el = h('select');
      opts.forEach(([v, t]) => el.append(new Option(t, v, false, s[k] === v)));
      el.addEventListener('change', () => setSetting(k, el.value));
      row(label, el);
    };
    const range = (label, k, min, max, step, show, only, def) => {
      show = show || ((v) => v + '%');
      const wrap = h('span', 'ytl-range');
      const cur0 = gs(k);
      const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step;
      i.value = cur0 == null || cur0 === '' ? (def == null ? 0 : def) : Number(cur0) || 0;
      const o = h('span', 'ytl-range-val', show(Number(i.value)));
      i.addEventListener('input', () => { o.textContent = show(Number(i.value)); ss(k, Number(i.value)); applyTheme(); });
      i.addEventListener('change', () => setSetting(k, Number(i.value)));
      wrap.append(i, o);
      row(label, wrap, null, only);
    };
    const hex6 = (v) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : null);
    const color = (label, k, presets, only, fallback) => {
      const wrap = h('span', 'ytl-colors');
      (presets || []).forEach((col) => {
        const b = btn('', 'ytl-swatch' + (String(s[k]).toLowerCase() === col ? ' on' : ''), () => { setSetting(k, col); openPanel(); });
        b.style.background = col; b.title = col; b.setAttribute('aria-label', label + ' ' + col);
        wrap.append(b);
      });
      const i = h('input'); i.type = 'color'; i.value = hex6(s[k]) || fallback || '#ffffff'; i.title = 'Chọn màu khác';
      i.addEventListener('input', () => { S.settings[k] = i.value; applyTheme(); });
      i.addEventListener('change', () => setSetting(k, i.value));
      wrap.append(i);
      row(label, wrap, 'div', only);
    };
    const px = (v) => v + 'px';

    select('Ngôn ngữ / Language', 'lang', [['vi', 'Tiếng Việt'], ['en', 'English']]);
    check('Bật bài học trên video', 'enabled');
    check('Tự chuyển thẻ (đếm ngược)', 'autoAdvance');
    select('Tạm dừng video', 'pauseMode', [['none', 'Không'], ['quiz', 'Khi có câu hỏi'], ['all', 'Mọi thẻ']]);

    // Kích thước và vị trí lưu riêng cho chế độ thường và toàn màn hình.
    section('Kích thước và vị trí · ' + (isFs() ? 'toàn màn hình' : 'chế độ thường'));
    const auto = (v) => (v ? v + '%' : 'tự động');
    range('Cỡ chữ', 'fontScale', 50, 200, 5, null, null, 100);
    range('Rộng khung', 'cardW', 0, 100, 2, auto);
    range('Cao khung', 'cardH', 0, 100, 2, auto);
    const setPos = (v) => { ss('offsetX', 0); ss('offsetY', 0); setSetting('cardPos', v); openPanel(); };
    const cur = gs('cardPos') || 'auto';
    const grid = h('span', 'ytl-posgrid');
    [['top-left', 'Trên trái'], ['top', 'Trên'], ['top-right', 'Trên phải'], ['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải'],
      ['bottom-left', 'Dưới trái'], ['bottom', 'Dưới'], ['bottom-right', 'Dưới phải']].forEach(([v, t]) => {
      const b = btn('', 'ytl-pos' + (cur === v ? ' on' : ''), () => setPos(v));
      b.title = t; b.setAttribute('aria-label', 'Vị trí: ' + t);
      grid.append(b);
    });
    const posWrap = h('span', 'ytl-poswrap');
    posWrap.append(grid, btn('Tự động', 'ytl-pos-auto' + (cur === 'auto' ? ' on' : ''), () => setPos('auto')));
    row('Vị trí khung', posWrap, 'div');

    section('Màu sắc');
    const chips = h('span', 'ytl-themes');
    THEMES.forEach(([name, text, card, accent, halo]) => {
      const b = btn('', 'ytl-theme', () => {
        // Bộ màu đặt luôn màu viền / bóng chữ hợp với màu chữ, để kiểu chỉ viền vẫn đọc được (vd. Kem: chữ nâu, viền kem sáng).
        Object.assign(S.settings, { textColor: text, cardColor: card, accentColor: accent, outlineColor: halo, shadowColor: halo, borderColor: '' });
        applyTheme(); persistSettings(); openPanel();
      });
      b.title = name; b.setAttribute('aria-label', 'Bộ màu ' + name);
      b.style.background = 'linear-gradient(135deg, ' + card + ' 0 55%, ' + accent + ' 55% 100%)';
      b.style.borderColor = text;
      chips.append(b);
    });
    row('Bộ màu gợi ý', chips, 'div');
    color('Màu chữ', 'textColor', TEXT_PRESETS);
    color('Màu nhấn', 'accentColor', ['#4f9cff', '#35c27a', '#ff6fb5', '#ffd34d', '#ff8a4c', '#a78bfa']);

    section('Khung');
    select('Kiểu khung', 'cardStyle', [['solid', 'Nền màu'], ['outline', 'Chỉ viền']]);
    color('Màu nền khung', 'cardColor', BG_PRESETS, 'solid');
    range('Độ đặc nền khung', 'cardOpacity', 0, 100, 5, null, 'solid', 82);
    color('Màu viền khung', 'borderColor', TEXT_PRESETS.slice(0, 5), 'outline', hex6(s.textColor));
    range('Độ dày viền khung', 'borderW', 0, 6, 1, px, 'outline', 2);
    range('Độ đậm viền khung', 'borderOpacity', 0, 100, 5, null, 'outline', 100);
    range('Bo góc', 'radius', 0, 24, 1, (v) => String(v), null, 9);
    range('Làm tối video', 'dimOpacity', 0, 85, 5);

    section('Chữ');
    select('Font chữ', 'fontFamily', [['system', 'Mặc định'], ['rounded', 'Tròn'], ['serif', 'Có chân'], ['mono', 'Đơn cách'], ['hand', 'Viết tay'], ['jp', 'Tiếng Nhật']]);
    // Các tinh chỉnh chữ ít dùng gom vào mục "Nâng cao", mặc định thu gọn.
    const adv = btn((S.advOpen ? '▾' : '▸') + ' Nâng cao: giãn chữ, viền chữ, bóng chữ', 'ytl-adv' + (S.advOpen ? ' on' : ''), () => { S.advOpen = !S.advOpen; openPanel(); });
    adv.setAttribute('aria-expanded', S.advOpen ? 'true' : 'false');
    p.append(adv);
    if (S.advOpen) {
      range('Độ đậm chữ', 'textOpacity', 20, 100, 5, null, null, 100);
      range('Giãn chữ', 'letterSpacing', 0, 20, 1, (v) => (v / 100).toFixed(2) + 'em', null, 0);
      range('Giãn dòng', 'lineHeight', 110, 220, 5, (v) => (v / 100).toFixed(2), null, 150);
      color('Màu viền chữ', 'outlineColor', HALO_PRESETS, 'outline', '#000000');
      range('Độ dày viền chữ', 'outlineW', 0, 5, 0.5, px, 'outline', 1);
      color('Màu bóng chữ', 'shadowColor', HALO_PRESETS, 'outline', '#000000');
      range('Độ lệch bóng', 'shadowSize', 0, 10, 1, px, 'outline', 2);
      range('Độ nhòe bóng', 'shadowBlur', 0, 20, 1, px, 'outline', 6);
    }

    section('Khác');
    check('Vạch mốc trên thanh tiến trình', 'showMarkers');
    const foot = h('div', 'ytl-panel-foot');
    foot.append(
      btn('Danh sách bài', 'ytl-ghost', () => { closePanel(); openMenu(); }),
      btn('Đặt lại khung', 'ytl-ghost', () => {
        ['cardW', 'cardH', 'offsetX', 'offsetY'].forEach((k) => ss(k, 0));
        ss('cardPos', 'auto'); ss('fontScale', 100);
        applyTheme(); persistSettings(); openPanel();
      }),
      btn('Kết quả', 'ytl-ghost', () => { try { chrome.runtime.sendMessage({ type: 'ytl-open-results' }); } catch (e) { /* bỏ qua */ } })
    );
    p.append(foot);
    p.classList.add('on');
    p.scrollTop = keep;
  }

  /* ---------- Phím tắt: 1-9 chọn đáp án, Enter = nút chính ---------- */
  window.addEventListener('keydown', (e) => {
    const a = S.active;
    if (e.ctrlKey || e.metaKey || e.altKey || !S.root || !S.lesson) return;
    const tg = e.target;
    if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) return;
    if (e.key === ']') go(1);
    else if (e.key === '[') go(-1);
    else if (!a) return;
    else if (e.key === 'Enter' && a.primary) a.primary();
    else if (/^[1-9]$/.test(e.key) && a.pick) a.pick(Number(e.key) - 1);
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  /* ---------- Khởi động + theo dõi điều hướng SPA của YouTube ---------- */
  function sync() {
    if (!alive()) { clearInterval(timer); unmount(); return; }
    const vid = onWatchPage() ? currentVid() : null;
    if (vid !== S.vid) { S.vid = vid; onVideoChange(); }
    mount();
    ensureControlButton();
    if (S.progReady && S.lesson) {
      if (!S.schedule) { buildSchedule(); if (S.schedule) updateHud(); }
      if (!S.active) pump();
    }
  }
  let timer = 0;
  (async function init() {
    try { applyStored(await chrome.storage.local.get(KEYS)); } catch (e) { return; }
    S.langChanged = false;
    await restoreProgress();
    sync();
    timer = setInterval(sync, 1000);
    document.addEventListener('yt-navigate-finish', sync);
    document.addEventListener('fullscreenchange', () => {
      renderMarkers();
      applyTheme(); // đổi sang bộ kích thước / vị trí của chế độ mới
      if (S.panel && S.panel.classList.contains('on')) openPanel();
    });
  })();
})();
