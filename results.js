(() => {
  'use strict';
  const YTL = globalThis.YTL;
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const ICON = { correct: '✓', wrong: '✗', skipped: '–' };
  let history = [];

  function tile(value, label) {
    const t = h('div', 'tile');
    t.append(h('b', null, value), h('span', null, label));
    return t;
  }

  function render() {
    const all = history.flatMap((s) => s.answers || []);
    const correct = all.filter((a) => a.result === 'correct').length;
    $('tiles').replaceChildren(
      tile(String(history.length), 'phiên học'),
      tile(String(history.reduce((n, s) => n + (s.lessonsSeen || 0), 0)), 'bài học đã xem'),
      tile(String(all.length), 'câu hỏi đã làm'),
      tile(all.length ? Math.round((correct / all.length) * 100) + '%' : '—', 'tỉ lệ đúng (lần đầu)')
    );

    // Câu hay sai nhất, gộp theo nội dung câu hỏi.
    const miss = new Map();
    all.forEach((a) => {
      const m = miss.get(a.question) || { q: a.question, n: 0, wrong: 0, correct: a.correct };
      m.n++;
      if (a.result !== 'correct') m.wrong++;
      miss.set(a.question, m);
    });
    const hard = [...miss.values()].filter((m) => m.wrong).sort((a, b) => b.wrong - a.wrong || b.n - a.n).slice(0, 5);
    $('hardBox').hidden = !hard.length;
    $('hard').replaceChildren(...hard.map((m) => {
      const row = h('div', 'qa wrong');
      const q = h('div', 'q', m.q);
      q.append(h('small', null, 'Đáp án: ' + m.correct));
      row.append(h('span', 'ic', '✗'), q, h('span', 't', 'sai ' + m.wrong + '/' + m.n));
      return row;
    }));

    const box = $('sessions');
    box.replaceChildren();
    if (!history.length) {
      box.append(h('div', 'empty', 'Chưa có phiên học nào. Tải bài học trong popup rồi mở một video YouTube.'));
      return;
    }
    history.forEach((s, idx) => {
      const st = YTL.sessionStats(s);
      const d = h('details', 'session');
      if (idx === 0) d.open = true;
      const sum = h('summary');
      const meta = h('div', 'meta');
      meta.append(h('div', 'ellipsis', s.lessonTitle || 'Bài học'), h('div', 'muted ellipsis', s.videoTitle || s.url || ''));
      sum.append(
        h('span', 'pct', st.total ? st.percent + '%' : '—'),
        meta,
        h('span', 'when', new Date(s.startedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }))
      );
      const inner = h('div', 'inner');
      let line = st.correct + '/' + st.total + ' câu đúng · ' + st.skipped + ' bỏ qua · ' + (s.lessonsSeen || 0) + ' bài học đã xem';
      if (st.fixed) line += ' · sửa đúng ' + st.fixed + ' câu khi làm lại';
      if (s.droppedBlocks) line += ' · lược ' + s.droppedBlocks + ' khối cho vừa video';
      if (s.duration) line += ' · video ' + YTL.formatTime(s.duration);
      line += s.finished ? ' · đã xem hết' : ' · chưa xem hết';
      inner.append(h('p', 'muted', line));
      (s.answers || []).forEach((a) => {
        const row = h('div', 'qa ' + a.result);
        const q = h('div', 'q', a.question);
        let sub = a.result === 'correct' ? 'Trả lời: ' + a.user : (a.user ? 'Trả lời: ' + a.user + ' → ' : '') + 'Đáp án: ' + a.correct;
        if (a.retry) sub += a.retry === 'correct' ? ' (làm lại: đúng)' : ' (làm lại: chưa đúng)';
        q.append(h('small', null, sub));
        row.append(h('span', 'ic', ICON[a.result] || '–'), q, h('span', 't', YTL.formatTime(a.at)));
        inner.append(row);
      });
      const foot = h('p');
      if (/^https:\/\//.test(s.url || '')) {
        const a = h('a', null, 'Mở lại video');
        a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
        foot.append(a, ' · ');
      }
      const del = h('a', null, 'Xóa phiên này');
      del.href = '#';
      del.addEventListener('click', async (e) => {
        e.preventDefault();
        history = history.filter((x) => x.id !== s.id);
        await chrome.storage.local.set({ history });
        render();
      });
      foot.append(del);
      inner.append(foot);
      d.append(sum, inner);
      box.append(d);
    });
  }

  $('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chill-learn-ket-qua.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('clear').addEventListener('click', async () => {
    if (!history.length || !confirm('Xóa toàn bộ lịch sử kết quả? Không khôi phục được.')) return;
    history = [];
    await chrome.storage.local.set({ history });
    render();
  });

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.history) { history = ch.history.newValue || []; render(); }
  });
  chrome.storage.local.get(['history', 'settings']).then((st) => {
    YTL.setLang((st.settings || {}).lang);
    YTL.autoLocalize(document.documentElement);
    history = st.history || [];
    render();
  });
})();
