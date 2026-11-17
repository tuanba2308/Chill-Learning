/* Chill Learn — bộ nhập: chuyển văn bản bất kỳ (flashcard CSV/TSV, cặp từ–nghĩa, hỏi–đáp, ghi chú, markdown, cloze)
   sang chuẩn bài học <lesson>/<quiz>. Thuần thuật toán, không AI. Cách nhận dữ liệu phỏng theo các công cụ flashcard:
   mỗi dòng một thẻ, hai vế ngăn bằng tab / dấu phẩy / dấu chấm phẩy (Quizlet, Anki), và cú pháp cloze {{c1::...}} của Anki. */
(function (root) {
  'use strict';
  const YTL = root.YTL || (typeof require !== 'undefined' ? require('./core.js') : {});

  YTL.AI_PROMPT = [
    'Hãy chuyển nội dung tôi gửi bên dưới thành MỘT file markdown bài học theo đúng định dạng sau. Chỉ trả về file, không giải thích.',
    '',
    'ĐỊNH DẠNG',
    '- Mở đầu bằng frontmatter:',
    '  ---',
    '  title: Tên bài học',
    '  ---',
    '- Mỗi ý là một khối: <lesson time="30s" title="Tiêu đề" priority="1"> nội dung markdown </lesson>',
    '- Câu hỏi là khối <quiz>. Ba kiểu:',
    '  * một đáp án: các dòng "- [x] đúng" và "- [ ] sai" (đúng một dòng [x])',
    '  * nhiều đáp án: <quiz type="multi"> với từ hai dòng [x]',
    '  * điền chữ: <quiz type="input"> và một dòng "= đáp án | cách viết khác"',
    '  Mỗi quiz có một dòng bắt đầu bằng "> " để giải thích. Không dùng dấu ">" trong câu hỏi.',
    '- Luôn có thẻ đóng </lesson>, </quiz>. Không dùng HTML khác.',
    '',
    'QUY TẮC NỘI DUNG',
    '- Khối đầu tiên: <lesson time="5s" title="Mở đầu" size="banner"> một câu giới thiệu </lesson>',
    '- Một khối một ý, dưới 80 chữ. Dùng **đậm**, ==tô vàng==, {#ffd34d: chữ màu} cho từ khóa; bảng markdown cho từ vựng.',
    '- Sau mỗi 1-2 lesson đặt một <quiz> KHÔNG có time (nó hiện ngay sau lesson). Trộn cả ba kiểu câu hỏi.',
    '- time viết kiểu 30s, 1p, 1p30s. Các mốc cách nhau ít nhất 30 giây; mốc cuối trước khi hết video 30 giây.',
    '- priority: 1 = cốt lõi, 2 = bổ sung, 3 = mở rộng (bị lược trước khi video ngắn).',
    '- Giữ nguyên kiến thức của nguồn, không thêm ý nguồn không có.',
    '',
    'Độ dài video dự kiến: [N] phút.',
    '',
    'NỘI DUNG CẦN CHUYỂN:',
    '[dán nội dung vào đây]'
  ].join('\n');

  const clean = (s) => String(s == null ? '' : s).replace(/\|/g, '/').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  const fmtT = (sec) => { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return m ? m + 'p' + (s ? s + 's' : '') : s + 's'; };
  const words = (s) => String(s).split(/\s+/).filter(Boolean).length;

  /* ---------- Tự sửa bài "gần đúng định dạng" ----------
     Người dùng (hoặc AI) hay đưa bài đúng ý nhưng lệch cú pháp: bọc trong khối code, thẻ bị escape, dùng [lesson],
     ngoặc kép cong, đáp án viết "[x] ..." không có gạch đầu dòng, "Đáp án: B"... Sửa những lỗi đó và báo lại đã sửa gì. */
  const TAGLIKE = /(<|&lt;|＜|\[)\s*\/?\s*(lesson|quiz|bài học|bai hoc|câu hỏi|cau hoi)\b/i;
  YTL.repairLessonText = function (text) {
    const fixes = [];
    const fix = (msg) => { if (!fixes.includes(msg)) fixes.push(msg); };
    let t = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (!TAGLIKE.test(t)) return { text: t, fixes, native: false };
    const fence = /^\s*```[a-zA-Z]*\n([\s\S]*?)\n```\s*$/.exec(t);
    if (fence && TAGLIKE.test(fence[1])) { t = fence[1]; fix('bỏ khối code ``` bọc ngoài bài'); }
    if (/&lt;\s*\/?\s*(lesson|quiz)/i.test(t)) {
      t = t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      fix('đổi &lt; &gt; thành < >');
    }
    if (/[＜＞]/.test(t)) { t = t.replace(/＜/g, '<').replace(/＞/g, '>'); fix('đổi ngoặc ＜＞ toàn chiều rộng thành < >'); }
    t = t.replace(/^([ \t]*)\[(\s*\/?\s*)(lesson|quiz)\b([^\]\n]*)\][ \t]*$/gim, (m, ind, s, name, rest) => { fix('đổi [lesson] / [quiz] thành <lesson> / <quiz>'); return '<' + s.trim() + name + rest + '>'; });
    t = t.replace(/<(\s*\/?\s*)(bài học|bai hoc)\b/gi, (m, s) => { fix('đổi thẻ <bài học> thành <lesson>'); return '<' + s.trim() + 'lesson'; });
    t = t.replace(/<(\s*\/?\s*)(câu hỏi|cau hoi)\b/gi, (m, s) => { fix('đổi thẻ <câu hỏi> thành <quiz>'); return '<' + s.trim() + 'quiz'; });
    t = t.replace(/<\s+(\/?)\s*(lesson|quiz)\b/gi, (m, s, name) => { fix('bỏ khoảng trắng thừa trong thẻ'); return '<' + s + name; });
    t = t.replace(/<\/\s+(lesson|quiz)\s*>/gi, (m, name) => '</' + name + '>');
    t = t.replace(/<(lesson|quiz)\b([^>\n]*)>/gi, (m, name, attrs) => {
      let a2 = attrs.replace(/[“”„‟«»]/g, '"').replace(/[‘’]/g, "'");
      a2 = a2.replace(/\b(time|title|size|priority|type|color|bg|font|align|fontsize)\s*:\s*(?=["'\w])/gi, '$1=');
      if (a2 !== attrs) fix('sửa thuộc tính thẻ (ngoặc kép cong, dấu ":" thay cho "=")');
      return '<' + name + a2 + '>';
    });
    // sửa bên trong từng <quiz>
    t = t.replace(/(<quiz\b[^>]*>)([\s\S]*?)(<\/quiz>|(?=<(?:lesson|quiz)\b)|$)/gi, (m, open, body, close) => {
      let lines = body.split('\n');
      lines = lines.map((l) => {
        let m2;
        if ((m2 = /^\s*\[( |x|X)?\]\s*(.+)$/.exec(l))) { fix('thêm gạch đầu dòng cho đáp án "[x] ..."'); return '- [' + (m2[1] && m2[1] !== ' ' ? 'x' : ' ') + '] ' + m2[2]; }
        if ((m2 = /^\s*[-*•]\s*\((x|X| )?\)\s*(.+)$/.exec(l))) { fix('đổi "(x)" thành "[x]"'); return '- [' + (m2[1] && m2[1] !== ' ' ? 'x' : ' ') + '] ' + m2[2]; }
        if ((m2 = /^\s*(?:[-*•]\s*)?(☑|✅|✔|✓)\s*(.+)$/.exec(l))) { fix('đổi dấu tích thành "- [x]"'); return '- [x] ' + m2[2]; }
        if ((m2 = /^\s*(?:[-*•]\s*)?(☐|⬜|❌|✗|✘)\s*(.+)$/.exec(l))) { fix('đổi ô trống thành "- [ ]"'); return '- [ ] ' + m2[2]; }
        if ((m2 = /^\s*(?:explain|explanation|giải thích|giai thich)\s*[:：]\s*(.+)$/i.exec(l))) { fix('đổi "Giải thích:" thành dòng ">"'); return '> ' + m2[1]; }
        return l;
      });
      const hasBoxes = lines.some((l) => /^\s*[-*+]\s*\[[ xX]?\]/.test(l));
      const ansIdx = lines.findIndex((l) => /^\s*(đáp án|dap an|answer|trả lời|correct)\s*[:：]/i.test(l));
      if (ansIdx >= 0) {
        const answer = lines[ansIdx].replace(/^[^:：]*[:：]\s*/, '').trim();
        const letterRe = /^\s*([A-Ha-h])[.)]\s+(.*)$/;
        if (!hasBoxes && lines.filter((l) => letterRe.test(l)).length >= 2) {
          const right = answer.toUpperCase().split(/[\s,;]+/).filter((x) => /^[A-H]$/.test(x));
          lines.splice(ansIdx, 1);
          lines = lines.map((l) => { const m3 = letterRe.exec(l); return m3 ? '- [' + (right.includes(m3[1].toUpperCase()) ? 'x' : ' ') + '] ' + m3[2] : l; });
          fix('đổi đáp án A/B/C + "Đáp án: …" thành "- [x]"');
        } else if (!hasBoxes && !lines.some((l) => /^\s*=\s*\S/.test(l))) {
          lines[ansIdx] = '= ' + answer;
          fix('đổi "Đáp án: …" thành dòng "= …"');
        }
      }
      return open + lines.join('\n') + close;
    });
    const opens = (t.match(/<(lesson|quiz)\b[^>]*>/gi) || []).length, closes = (t.match(/<\/(lesson|quiz)>/gi) || []).length;
    if (opens && opens !== closes) fix('thiếu ' + Math.abs(opens - closes) + ' thẻ đóng — đã tự ngắt khối ở thẻ kế tiếp');
    return { text: t, fixes, native: /<(lesson|quiz)\b/i.test(t) };
  };

  // Cắt văn bản thành các phần vừa một khung: gom câu cho tới khi đủ max "từ" (chữ Hán/Nhật tính nửa từ mỗi ký tự).
  const CJK = /[\u3040-\u30ff\u3400-\u9fff]/g;
  const measure = (s) => words(String(s).replace(CJK, ' ')) + (String(s).match(CJK) || []).length / 2;
  function chunkText(text, max) {
    const out = [];
    let buf = '';
    const flush = () => { if (buf.trim()) out.push(buf.trim()); buf = ''; };
    String(text).split(/\n\s*\n/).forEach((para) => {
      const p = para.replace(/\s*\n\s*/g, ' ').trim();
      if (!p) return;
      if (/^(\s*([-*+]|\d+[.)])\s|\s*\|)/.test(para) || /^\s*```/.test(para)) { // danh sách, bảng, code: giữ nguyên khối
        if (buf && measure(buf) + measure(para) > max) flush();
        buf += (buf ? '\n\n' : '') + para.trim();
        return;
      }
      let first = true;
      p.split(/(?<=[.!?。！？…])\s*/).filter(Boolean).forEach((sentence) => {
        let parts = [sentence];
        if (measure(sentence) > max) { // câu quá dài: cắt tiếp theo dấu phẩy rồi theo số từ
          parts = [];
          let piece = '';
          sentence.split(/(?<=[,;:，、；])\s*|\s+/).forEach((w) => {
            if (piece && measure(piece) + measure(w) > max) { parts.push(piece); piece = w; } else piece += (piece ? ' ' : '') + w;
          });
          if (piece) parts.push(piece);
        }
        parts.forEach((part) => {
          if (buf && measure(buf) + measure(part) > max) { flush(); first = false; }
          buf += (buf ? (first && !buf.endsWith('\n') ? '\n\n' : ' ') : '') + part;
          first = false;
        });
      });
    });
    flush();
    return out;
  }

  // CSV theo RFC 4180 với dấu ngăn tùy chọn.
  function parseDelimited(text, d) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === d) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c));
  }

  const PAIR = /^(.+?)\s*(?:::|=>|→|\s[-–—]\s|\s=\s|:\s)\s*(.+)$/;
  const HEAD_Q = /^(question|câu hỏi|cau hoi|hỏi|q)$/i;
  const HEAD_TERM = /^(term|front|word|từ|tu|từ vựng|tu vung|mặt trước|kanji|vocabulary|vocab)$/i;
  const HEAD_DEF = /^(definition|back|meaning|nghĩa|nghia|mặt sau|answer|đáp án|dap an)$/i;

  function findTable(text, ext, loose) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const order = ext === 'tsv' ? ['\t'] : ext === 'csv' ? [',', ';', '\t'] : ['\t', ';', ','];
    for (const d of order) {
      const rows = parseDelimited(text, d);
      const multi = rows.filter((r) => r.length >= 2 && r[0] && r[1]);
      if (rows.length < 2 || multi.length < rows.length * 0.8) continue;
      // dấu phẩy trong văn xuôi rất hay gặp: chỉ coi là bảng khi các dòng ngắn, cùng số cột, không kết thúc như một câu
      const strict = d === ',' && ext !== 'csv' && !loose;
      const sameCols = rows.every((r) => r.length === rows[0].length);
      const short = rows.length >= 3 && rows.every((r) => r.every((x) => x.length <= 60 && !/[.!?。]$/.test(x)) && r.join(' ').split(/\s+/).length <= 14);
      if (!strict || (sameCols && short)) return rows;
    }
    const pairs = lines.map((l) => PAIR.exec(l));
    const need = loose ? 0.5 : 0.8;
    if (lines.length >= (loose ? 1 : 3) && (loose || !/^#{1,4}\s/m.test(text)) && pairs.filter(Boolean).length >= lines.length * need && (loose || lines.every((l) => l.length <= 200))) {
      return pairs.filter(Boolean).map((m) => [m[1].trim(), m[2].trim()]);
    }
    return null;
  }
  const isQaLines = (lines) => lines.filter((l) => /^(q|hỏi|câu hỏi)\s*[:.]/i.test(l)).length >= 2 && lines.some((l) => /^(a|đáp|đáp án|trả lời)\s*[:.]/i.test(l));
  const isQaTable = (rows) => rows[0].some((x) => HEAD_Q.test(x.toLowerCase()));
  const hasStructure = (text) => /^#{1,3}\s+\S/m.test(text) || /^\s*(đáp án|dap an|answer|trả lời)\s*[:：]/im.test(text) || /^\s*[-*+]\s*\[[ xX]?\]/m.test(text) || /\{\{c\d+::/.test(text);

  /* Nhận diện loại nội dung. Trả về { kind, rows? }:
     native  — đã theo định dạng <lesson>/<quiz> (kể cả sau khi tự sửa)
     cards   — flashcard: mỗi dòng "từ <ngăn> nghĩa"
     qa      — bảng hỏi–đáp có dòng tiêu đề
     qalines — các cặp Q:/A:
     doc     — ghi chú có cấu trúc (tiêu đề mục, "Đáp án:", cloze)
     prose   — văn bản thường, không theo định dạng nào */
  YTL.detectKind = function (text, ext) {
    if (/<(lesson|quiz)\b/i.test(text)) return { kind: 'native' };
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return { kind: 'empty' };
    if (/\{\{c\d+::/.test(text)) return { kind: 'doc' };
    if (isQaLines(lines)) return { kind: 'qalines' };
    const rows = findTable(text, ext, false);
    if (rows) return { kind: isQaTable(rows) ? 'qa' : 'cards', rows };
    return { kind: hasStructure(text) ? 'doc' : 'prose' };
  };
  YTL.KIND_LABEL = {
    native: 'bài học chuẩn', cards: 'flashcard', qa: 'bảng hỏi–đáp', qalines: 'các cặp Hỏi/Đáp',
    doc: 'ghi chú có cấu trúc', prose: 'văn bản thường (không theo định dạng)'
  };

  function emit(title, units, note) {
    let md = '---\ntitle: ' + clean(title) + '\n---\n\n# ' + clean(title) + '\n';
    let lessons = 0, quizzes = 0;
    units.forEach((u) => u.forEach((b) => {
      const attrs = (b.time != null ? ' time="' + fmtT(b.time) + '"' : '') + (b.title ? ' title="' + clean(b.title).replace(/"/g, "'") + '"' : '') + (b.attrs || '');
      md += '\n<' + b.type + attrs + '>\n' + b.body.trim() + '\n</' + b.type + '>\n';
      if (b.type === 'quiz') quizzes++; else lessons++;
    }));
    return { md, lessons, quizzes, note: note || '' };
  }
  const stamp = (units, gap) => units.forEach((u, i) => { u[0].time = 5 + i * gap; });

  // Câu hỏi chọn đáp án: đáp án đúng đặt ở vị trí xoay vòng.
  function choice(question, correct, wrongs, pos, explain) {
    const arr = wrongs.slice(0, 3);
    const at = arr.length ? pos % (arr.length + 1) : 0;
    arr.splice(at, 0, correct);
    return { type: 'quiz', body: question + '\n' + arr.map((o, i) => '- [' + (i === at ? 'x' : ' ') + '] ' + o).join('\n') + (explain ? '\n> ' + explain : '') };
  }
  const inputQ = (question, answer, explain) => ({ type: 'quiz', attrs: ' type="input"', body: question + '\n= ' + answer + (explain ? '\n> ' + explain : '') });

  // Flashcard: mỗi nhóm thẻ thành một bảng, kèm câu hỏi xuôi, ngược và (thỉnh thoảng) gõ lại.
  function fromCards(cards, opts) {
    const size = Math.max(2, Math.min(8, Number(opts.groupSize) || 4));
    const hasNote = cards.some((c) => c.note);
    const units = [];
    const pick = (field, self, seed) => {
      const out = [];
      for (let k = 1; out.length < 3 && k <= cards.length * 2; k++) {
        const c = cards[(seed + k * 7) % cards.length];
        const v = c[field];
        if (c !== self && v && v.toLowerCase() !== self[field].toLowerCase() && !out.includes(v)) out.push(v);
      }
      return out;
    };
    for (let g = 0; g * size < cards.length; g++) {
      const group = cards.slice(g * size, g * size + size);
      const from = g * size + 1;
      let table = '| ' + opts.termLabel + ' | ' + opts.defLabel + (hasNote ? ' | Ghi chú' : '') + ' |\n|---|---|' + (hasNote ? '---|' : '') + '\n';
      group.forEach((c) => { table += '| **' + c.term + '** | ' + c.def + (hasNote ? ' | ' + (c.note || '') : '') + ' |\n'; });
      const unit = [{ type: 'lesson', title: 'Thẻ ' + from + '–' + (from + group.length - 1), body: table }];
      const a = group[g % group.length];
      const explainA = '**' + a.term + '** = ' + a.def + (a.note ? ' (' + a.note + ')' : '');
      const wrongDefs = pick('def', a, g * 3);
      unit.push(wrongDefs.length ? choice('**' + a.term + '** nghĩa là gì?', a.def, wrongDefs, g, explainA) : inputQ('**' + a.term + '** nghĩa là gì?', a.def, explainA));
      if (group.length > 1) {
        const b = group[(g + 1) % group.length];
        const explainB = '**' + b.term + '** = ' + b.def;
        const wrongTerms = pick('term', b, g * 5 + 1);
        if (g % 3 === 2 && b.term.length <= 30) unit.push(inputQ('Gõ lại từ có nghĩa «' + b.def + '»', b.term, explainB));
        else if (wrongTerms.length) unit.push(choice('Từ nào nghĩa là «' + b.def + '»?', b.term, wrongTerms, g + 1, explainB));
      }
      units.push(unit);
    }
    return units;
  }

  function fromTable(rows, opts) {
    const head = rows[0].map((c) => c.toLowerCase());
    const hasHeader = head.some((c) => HEAD_Q.test(c) || HEAD_TERM.test(c) || HEAD_DEF.test(c));
    const body = hasHeader ? rows.slice(1) : rows;
    if (hasHeader && head.some((c) => HEAD_Q.test(c))) { // bảng hỏi–đáp: câu hỏi, đáp án, các cột còn lại là đáp án sai / giải thích
      const qi = head.findIndex((c) => HEAD_Q.test(c));
      let ai = head.findIndex((c) => /^(answer|đáp án|dap an|correct|đúng)$/i.test(c));
      if (ai < 0) ai = qi === 0 ? 1 : 0;
      const ei = head.findIndex((c) => /^(explain|explanation|giải thích|giai thich|note|ghi chú)$/i.test(c));
      const units = body.filter((r) => r[qi] && r[ai]).map((r, i) => {
        const wrongs = r.filter((c, k) => k !== qi && k !== ai && k !== ei && c).map(clean);
        const ex = ei >= 0 ? clean(r[ei]) : '';
        return [wrongs.length ? choice(clean(r[qi]), clean(r[ai]), wrongs, i, ex) : inputQ(clean(r[qi]), clean(r[ai]), ex)];
      });
      return { units, what: 'bảng hỏi–đáp → ' + units.length + ' câu hỏi' };
    }
    const cards = body.filter((r) => r[0] && r[1]).map((r) => ({ term: clean(r[0]), def: clean(r[1]), note: clean(r.slice(2).filter(Boolean).join(' · ')) }));
    const o = Object.assign({ termLabel: hasHeader ? clean(rows[0][0]) : 'Từ', defLabel: hasHeader ? clean(rows[0][1]) : 'Nghĩa' }, opts);
    return { units: fromCards(cards, o), what: 'flashcard → ' + cards.length + ' thẻ từ' };
  }

  function fromQaLines(text) {
    const units = [];
    let q = null, a = null;
    const flush = () => { if (q && a) units.push([inputQ(clean(q), clean(a), '')]); q = a = null; };
    text.split('\n').forEach((l) => {
      let m;
      if ((m = /^\s*(?:q|hỏi|câu hỏi)\s*[:.]\s*(.*)$/i.exec(l))) { flush(); q = m[1]; }
      else if ((m = /^\s*(?:a|đáp|đáp án|trả lời)\s*[:.]\s*(.*)$/i.exec(l))) a = m[1];
      else if (l.trim()) { if (a != null) a += ' ' + l.trim(); else if (q != null) q += ' ' + l.trim(); }
    });
    flush();
    return { units, what: 'các cặp Hỏi/Đáp → ' + units.length + ' câu hỏi' };
  }

  // Văn bản / markdown: chia theo tiêu đề hoặc đoạn; mục có đáp án thành quiz; cloze Anki và chữ in đậm thành câu điền từ.
  function fromDoc(text, opts) {
    const sections = [];
    let cur = null, title = '';
    if (/^#{1,3}\s+\S/m.test(text)) {
      text.split('\n').forEach((line) => {
        const m = /^(#{1,3})\s+(.*)$/.exec(line);
        if (m) {
          if (m[1].length === 1 && !title && !sections.length) { title = m[2].trim(); return; }
          cur = { title: m[2].trim(), lines: [] }; sections.push(cur);
        } else if (cur) cur.lines.push(line);
        else if (line.trim()) { cur = { title: '', lines: [line] }; sections.push(cur); }
      });
    } else text.split(/\n\s*\n/).forEach((p) => { if (p.trim()) sections.push({ title: '', lines: p.split('\n') }); });

    const units = [];
    let clozeN = 0;
    sections.forEach((sec) => {
      let lines = sec.lines.slice();
      const ansIdx = lines.findIndex((l) => /^\s*(đáp án|dap an|answer|trả lời)\s*[:：]/i.test(l));
      const hasBoxes = lines.some((l) => /^\s*[-*+]\s*\[[ xX]?\]/.test(l));
      if (hasBoxes || ansIdx >= 0) {
        let answer = null;
        if (ansIdx >= 0) { answer = lines[ansIdx].replace(/^[^:：]*[:：]\s*/, '').trim(); lines.splice(ansIdx, 1); }
        const letterRe = /^\s*([A-Ha-h])[.)]\s+(.*)$/;
        if (!hasBoxes && answer && lines.filter((l) => letterRe.test(l)).length >= 2) {
          const right = answer.toUpperCase().split(/[\s,;]+/).filter((x) => /^[A-H]$/.test(x));
          lines = lines.map((l) => { const m = letterRe.exec(l); return m ? '- [' + (right.includes(m[1].toUpperCase()) ? 'x' : ' ') + '] ' + m[2] : l; });
          answer = null;
        }
        if (answer && !hasBoxes) lines.push('= ' + answer);
        const named = sec.title && !/^(câu|cau|question|quiz|q)\s*\d*[.:]?$/i.test(sec.title);
        const quiz = { type: 'quiz', body: (named ? sec.title + '\n' : '') + lines.join('\n').trim().replace(/\n{2,}/g, '\n') };
        const last = units[units.length - 1];
        if (last && last[last.length - 1].type === 'lesson') last.push(quiz); else units.push([quiz]);
        return;
      }
      const body = lines.join('\n').trim();
      if (!body && !sec.title) return;
      const parts = chunkText(body, Math.max(20, Number(opts.maxWords) || 55));
      if (!parts.length) parts.push('**' + sec.title + '**');
      parts.forEach((p, i) => {
        const unit = [];
        // cloze kiểu Anki: {{c1::đáp án}} hoặc {{c1::đáp án::gợi ý}}
        const clozes = [];
        const shown = p.replace(/\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g, (m0, ans) => { clozes.push(ans); return '==' + ans + '=='; });
        unit.push({ type: 'lesson', title: sec.title + (parts.length > 1 ? ' (' + (i + 1) + '/' + parts.length + ')' : ''), body: shown.trim() });
        const sentenceOf = (src, needle) => src.split(/(?<=[.!?。！？])\s+|\n/).find((s) => s.includes(needle)) || '';
        if (clozes.length) {
          clozes.slice(0, 2).forEach((ans) => {
            const s = sentenceOf(p, '::' + ans).replace(/\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g, (m0, a2, hint) => (a2 === ans ? '______' + (hint ? ' (' + hint + ')' : '') : a2));
            if (s) { unit.push(inputQ('Điền chỗ trống: ' + clean(s), clean(ans), '')); clozeN++; }
          });
        } else if (opts.cloze !== false) { // tự tạo câu điền từ từ cụm in đậm / tô vàng đầu tiên (ngắn)
          const m = /\*\*([^*\n]{2,40})\*\*|==([^=\n]{2,40})==/.exec(p);
          const term = m && (m[1] || m[2]);
          if (term && words(term) <= 4) {
            const s = sentenceOf(p, m[0]);
            if (s && s.length <= 240 && s.replace(m[0], '').trim().length > 12) {
              unit.push(inputQ('Điền chỗ trống: ' + clean(s.replace(m[0], '______').replace(/\*\*|==/g, '')), clean(term), ''));
              clozeN++;
            }
          }
        }
        units.push(unit);
      });
    });
    return { units, title, what: 'ghi chú có cấu trúc → ' + sections.length + ' mục' + (clozeN ? ', ' + clozeN + ' câu điền từ tự tạo' : '') };
  }

  // Văn bản thường: 'split' = cắt thành nhiều thẻ vừa khung; 'scroll' = một thẻ lớn có thanh cuộn.
  function fromProse(text, opts) {
    const body = text.trim();
    if (opts.prose === 'scroll') {
      return { units: [[{ type: 'lesson', title: opts.name || '', attrs: ' size="full"', body }]], what: 'văn bản thường → một thẻ có thanh cuộn (' + Math.round(measure(body)) + ' chữ)' };
    }
    const parts = chunkText(body, Math.max(20, Number(opts.maxWords) || 55));
    const units = parts.map((p, i) => [{ type: 'lesson', title: 'Phần ' + (i + 1) + '/' + parts.length, body: p }]);
    return { units, what: 'văn bản thường → cắt thành ' + parts.length + ' thẻ vừa khung' };
  }

  /* Chuyển văn bản sang markdown bài học.
     opts: { name, ext, kind ('auto' | native | cards | qa | qalines | doc | prose), prose ('split' | 'scroll'),
             gap (giây giữa các mốc, mặc định 45), groupSize (thẻ mỗi nhóm, 4), maxWords (chữ mỗi thẻ, 55), cloze }
     Trả về { kind, md, lessons, quizzes, what, fixes[], last } hoặc { kind: 'empty' }. */
  YTL.convertText = function (text, opts) {
    opts = opts || {};
    const rep = YTL.repairLessonText(text);
    text = rep.text;
    const want = opts.kind && opts.kind !== 'auto' ? opts.kind : null;
    let det = YTL.detectKind(text, opts.ext);
    if (det.kind === 'empty') return { kind: 'empty', md: '', fixes: rep.fixes };
    if (want && want !== det.kind) {
      if (want === 'cards' || want === 'qa') {
        const rows = findTable(text, opts.ext, true);
        det = rows ? { kind: want, rows } : { kind: 'failed', why: 'Không tìm thấy các dòng dạng "vế 1 <ngăn> vế 2" (ngăn bằng tab, phẩy, chấm phẩy, " - ", "::").' };
      } else if (want === 'native') {
        det = /<(lesson|quiz)\b/i.test(text) ? { kind: 'native' } : { kind: 'failed', why: 'Không thấy thẻ <lesson> hay <quiz> nào trong nội dung.' };
      } else det = { kind: want };
    }
    if (det.kind === 'failed') return { kind: 'failed', md: '', why: det.why, fixes: rep.fixes };
    if (det.kind === 'native') return { kind: 'native', md: text, what: YTL.KIND_LABEL.native, fixes: rep.fixes };
    const gap = Math.max(15, Number(opts.gap) || 45);
    const plain = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    let res;
    if (det.kind === 'cards' || det.kind === 'qa') res = fromTable(det.rows, opts);
    else if (det.kind === 'qalines') res = fromQaLines(text);
    else if (det.kind === 'prose') res = fromProse(plain, opts);
    else res = fromDoc(plain, opts);
    if (!res.units.length) return { kind: 'empty', md: '', fixes: rep.fixes };
    stamp(res.units, gap);
    const out = emit(opts.name || res.title || 'Bài học', res.units);
    return { kind: det.kind, md: out.md, lessons: out.lessons, quizzes: out.quizzes, what: res.what, fixes: rep.fixes, last: 5 + (res.units.length - 1) * gap };
  };

  // Bộ bài mẫu, theo đúng thứ tự đánh số. [file trong samples/, tên hiển thị ('' = lấy tiêu đề trong file)]
  YTL.SAMPLES = [
    ['huong-dan-su-dung.md', ''],
    ['user-guide-en.md', ''],
    ['bai-hoc-chuan.md', ''],
    ['demo-nhanh-1-phut.md', ''],
    ['flashcard.csv', 'Flashcard dạng bảng (.csv)'],
    ['flashcard-cap-tu.txt', 'Flashcard "từ - nghĩa" (.txt)'],
    ['hoi-dap.csv', 'Bảng hỏi–đáp (.csv)'],
    ['hoi-dap-qa.txt', 'Hỏi / Đáp từng dòng (.txt)'],
    ['ghi-chu.md', 'Ghi chú có tiêu đề mục (.md)'],
    ['van-ban-thuong.txt', 'Văn bản thường (.txt)'],
    ['cloze-anki.txt', 'Cloze kiểu Anki (.txt)'],
    ['gan-dung-dinh-dang.md', 'Bài gần đúng định dạng (tự sửa)'],
    ['bai-mau.md', ''],
    ['tieng-nhat-chao-hoi.md', ''],
    ['python-co-ban.md', ''],
    ['he-mat-troi.md', ''],
    ['ky-nang-hoc-tap.md', '']
  ];
  // Nạp một bài mẫu (only = tên file) hoặc cả bộ. Tên bài được đánh số 01, 02… để thư viện xếp đúng thứ tự.
  YTL.loadSamples = async function (only) {
    const items = [];
    for (let i = 0; i < YTL.SAMPLES.length; i++) {
      const [file, label] = YTL.SAMPLES[i];
      if (only && only !== file) continue;
      const text = await (await fetch(chrome.runtime.getURL('samples/' + file))).text();
      const m = /^(.*)[.]([a-z]+)$/.exec(file);
      const r = YTL.convertText(text, { name: label || m[1], ext: m[2] });
      if (!r.md) continue;
      const num = String(i + 1).padStart(2, '0');
      items.push({ name: num + '-' + m[1], text: r.md, title: num + ' · ' + (label || YTL.parseLesson(r.md).title || m[1]) });
    }
    if (items.length) await YTL.saveLessons(items, !!only);
    return items.length;
  };

  // Tên file được nhận ở các ô chọn file (PDF chỉ đọc được ở trang nhập đầy đủ).
  YTL.LESSON_FILE = /\.(md|markdown|txt|csv|tsv)$/i;
  YTL.readLessonFiles = async function (fileList, opts) {
    const items = [];
    for (const f of Array.from(fileList || [])) {
      const m = YTL.LESSON_FILE.exec(f.name);
      if (!m) continue;
      const name = f.name.replace(YTL.LESSON_FILE, '');
      const r = YTL.convertText(await f.text(), Object.assign({ name, ext: m[1].toLowerCase() }, opts));
      if (r.md) items.push({ name, text: r.md, what: r.what || 'bài học chuẩn', fixes: r.fixes || [] });
    }
    return items;
  };

  root.YTL = YTL;
  if (typeof module !== 'undefined' && module.exports) module.exports = YTL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
