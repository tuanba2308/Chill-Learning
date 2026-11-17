(() => {
  'use strict';
  const YTL = globalThis.YTL;
  const $ = (id) => document.getElementById(id);
  const status = (t) => { $('status').textContent = t || ''; };
  const opts = () => ({
    gap: Number($('gap').value) || 45, groupSize: Number($('group').value) || 4, cloze: $('cloze').checked,
    kind: $('kind').value, prose: $('prose').value, maxWords: Number($('maxWords').value) || 55
  });
  let srcExt = '';

  $('prompt').value = YTL.AI_PROMPT;
  try {
    chrome.storage.local.get('settings').then((st) => {
      YTL.setLang((st.settings || {}).lang);
      YTL.autoLocalize(document.documentElement);
      $('prompt').value = YTL.getPrompt();
    });
  } catch (e) { /* mở ngoài extension */ }
  $('copyPrompt').addEventListener('click', async () => {
    await navigator.clipboard.writeText(YTL.getPrompt());
    $('copyPrompt').textContent = 'Đã chép ✓';
    setTimeout(() => { $('copyPrompt').textContent = 'Chép prompt'; }, 1500);
  });
  $('openResults').addEventListener('click', () => { location.href = 'results.html'; });

  /* ---------- PDF -> văn bản (pdf.js, chạy tại chỗ) ---------- */
  let pdfjs = null;
  async function pdfToText(file) {
    if (!pdfjs) {
      pdfjs = await import(chrome.runtime.getURL('lib/pdf.min.mjs'));
      pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.mjs');
    }
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      let text = '', size = 0, y = null;
      const push = () => { if (text.trim()) lines.push({ text: text.trim(), size, y, page: p }); text = ''; size = 0; y = null; };
      tc.items.forEach((it) => {
        if (typeof it.str !== 'string') return;
        const iy = it.transform ? it.transform[5] : 0;
        if (y != null && Math.abs(iy - y) > (it.height || size || 10) * 0.6) push();
        text += it.str;
        if (it.height) size = Math.max(size, it.height);
        if (y == null) y = iy;
        if (it.hasEOL) push();
      });
      push();
    }
    if (!lines.length) return '';
    const sizes = lines.map((l) => l.size).filter(Boolean).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)] || 10;
    const cjk = /[぀-ヿ㐀-鿿]$/;
    let out = '', prev = null;
    lines.forEach((l) => {
      const heading = l.size >= body * 1.25 && l.text.length <= 90;
      const gapBig = prev && (prev.page !== l.page || Math.abs(prev.y - l.y) > Math.max(prev.size, l.size, body) * 1.9);
      if (heading) out += '\n\n## ' + l.text + '\n';
      else if (!prev || gapBig || prev.heading) out += '\n\n' + l.text;
      else out += (cjk.test(out) ? '' : ' ') + l.text; // nối các dòng của cùng một đoạn
      prev = Object.assign({ heading }, l);
    });
    return out.replace(/\n{3,}/g, '\n\n').trim();
  }

  async function readFile(f) {
    const ext = (/\.([a-z0-9]+)$/i.exec(f.name) || [, ''])[1].toLowerCase();
    const name = f.name.replace(/\.[^.]+$/, '');
    if (ext === 'pdf') {
      const text = await pdfToText(f);
      if (!text) throw new Error('PDF không có lớp chữ (file scan ảnh) — cần OCR trước.');
      return { name, ext, text };
    }
    return { name, ext, text: await f.text() };
  }

  /* ---------- Chuyển đổi + xem trước ---------- */
  function preview(md, what, fixes) {
    $('out').value = md;
    $('fixes').replaceChildren(...(fixes || []).map((x) => { const li = document.createElement('li'); li.textContent = 'Đã tự sửa: ' + x; return li; }));
    const L = YTL.parseLesson(md);
    const sc = L.stats;
    $('info').textContent = (what ? 'Nhận diện: ' + what + '. ' : '') + sc.lessons + ' thẻ bài học · ' + sc.quizzes + ' câu hỏi · mốc cuối ' +
      YTL.formatTime(sc.lastTime) + ' (cần video khoảng ' + YTL.formatTime(sc.lastTime + 60) + ').';
    $('warn').replaceChildren(...L.warnings.map((w) => { const li = document.createElement('li'); li.textContent = w; return li; }));
    $('save').disabled = $('download').disabled = !sc.blocks;
  }

  function convert() {
    const text = $('src').value;
    if (!text.trim()) { status('Chưa có nội dung nguồn.'); return; }
    const name = $('name').value.trim() || 'Bài học';
    const r = YTL.convertText(text, Object.assign({ name, ext: srcExt }, opts()));
    if (r.kind === 'failed') { status('Không chuyển được theo kiểu đã chọn: ' + r.why); return; }
    if (r.kind === 'empty') { status('Không tách được khối nào từ nội dung này.'); return; }
    status('');
    preview(r.md, r.kind === 'native' ? 'bài học chuẩn' + (r.fixes.length ? '' : ', giữ nguyên') : r.what, r.fixes);
  }
  $('convert').addEventListener('click', convert);
  $('out').addEventListener('input', () => preview($('out').value, '', []));
  ['kind', 'prose', 'gap', 'group', 'maxWords', 'cloze'].forEach((id) => $(id).addEventListener('change', () => { if ($('src').value.trim()) convert(); }));
  $('src').addEventListener('input', () => { srcExt = ''; });

  async function handleFiles(files) {
    files = Array.from(files || []);
    if (!files.length) return;
    $('batch').replaceChildren();
    if (files.length === 1) {
      status('Đang đọc ' + files[0].name + '…');
      try {
        const f = await readFile(files[0]);
        $('src').value = f.text;
        $('name').value = f.name;
        srcExt = f.ext === 'pdf' ? 'txt' : f.ext;
        convert();
      } catch (e) { status('Lỗi: ' + e.message); }
      return;
    }
    // Nhiều file: chuyển và lưu thẳng vào thư viện.
    const items = [];
    for (const file of files) {
      const li = document.createElement('li');
      try {
        const f = await readFile(file);
        const r = YTL.convertText(f.text, Object.assign({ name: f.name, ext: f.ext === 'pdf' ? 'txt' : f.ext }, opts()));
        if (!r.md) throw new Error(r.why || 'không tách được khối nào');
        items.push({ name: f.name, text: r.md });
        li.textContent = '✓ ' + file.name + ' — ' + (r.what || 'bài học chuẩn') + (r.fixes.length ? ' (đã tự sửa ' + r.fixes.length + ' lỗi định dạng)' : '');
      } catch (e) { li.textContent = '✗ ' + file.name + ' — ' + e.message; li.className = 'bad'; }
      $('batch').append(li);
    }
    if (items.length) await YTL.saveLessons(items, false);
    status('Đã lưu ' + items.length + '/' + files.length + ' bài vào thư viện.');
  }
  $('pick').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

  $('save').addEventListener('click', async () => {
    const name = $('name').value.trim() || YTL.parseLesson($('out').value).title || 'Bài học';
    await YTL.saveLesson(name, $('out').value);
    status('Đã lưu "' + name + '" vào thư viện và chọn làm bài đang học. Mở một video YouTube để bắt đầu.');
  });
  $('download').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([$('out').value], { type: 'text/markdown' }));
    a.download = ($('name').value.trim() || 'bai-hoc').replace(/[\\/:*?"<>|]+/g, '-') + '.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
})();
