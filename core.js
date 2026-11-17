/* Chill Learn — lõi dùng chung: parser bài học, markdown -> DOM, xếp lịch theo độ dài video.
   Thuần thuật toán, không gọi mạng, không AI. */
(function (root) {
  'use strict';
  const YTL = {};

  YTL.DEFAULT_SETTINGS = {
    enabled: true,
    lang: 'vi', // vi | en
    fontFamily: 'system',
    fontCustom: '',
    fontScale: 100,
    textColor: '#ffffff',
    cardColor: '#101422',
    cardOpacity: 82,
    cardStyle: 'solid', // solid | outline (nền trong suốt, chỉ viền)
    cardPos: 'auto', // auto | center | top | bottom | left | right | top-left | top-right | bottom-left | bottom-right
    fs: {}, // giá trị riêng cho toàn màn hình: fontScale, cardW, cardH, offsetX, offsetY, cardPos
    // kiểu chỉ viền: viền + bóng chữ, màu và độ đậm viền khung ('' = theo màu chữ)
    outlineColor: '#000000', outlineW: 1, shadowColor: '#000000', shadowSize: 2, shadowBlur: 6,
    borderColor: '', borderOpacity: 100, textOpacity: 100, letterSpacing: 0, lineHeight: 150,
    radius: 9, borderW: 2, // bo góc (phần mười em) và độ dày viền (px)
    cardW: 0, cardH: 0, // kích thước khung khi kéo góc, % player (0 = tự động)
    offsetX: 0, offsetY: 0, // độ dời khi kéo thả, % kích thước player
    accentColor: '#4f9cff',
    dimOpacity: 30,
    pauseMode: 'none', // none | quiz | all
    fitMode: 'auto', // auto | spread | original
    minGap: 15,
    autoAdvance: true, // tự chuyển thẻ theo mốc thời gian, có đếm ngược
    showMarkers: true,
    shuffleOptions: false,
    endSummary: true
  };

  YTL.FONTS = {
    system: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'Consolas, "Cascadia Code", "Courier New", monospace',
    rounded: '"Segoe UI Variable Display", "Nunito", "Trebuchet MS", system-ui, sans-serif',
    hand: '"Segoe Print", "Comic Sans MS", cursive',
    jp: '"Yu Gothic UI", "Meiryo", "Noto Sans JP", system-ui, sans-serif'
  };

  YTL.fontStack = function (s) {
    const custom = String(s.fontCustom || '').replace(/[;{}<>]/g, '').trim();
    if (custom) return '"' + custom.replace(/"/g, '') + '", ' + YTL.FONTS.system;
    return YTL.FONTS[s.fontFamily] || YTL.FONTS.system;
  };

  YTL.validColor = function (c) {
    if (!c || !/^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(c)) return false;
    if (typeof CSS !== 'undefined' && CSS.supports) return CSS.supports('color', c);
    return true;
  };

  YTL.hexToRgba = function (hex, alpha) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (h.length < 6 || isNaN(n)) return 'rgba(16,20,34,' + alpha + ')';
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  };

  /* ---------- Thời gian: 30s, 1p, 1p30s, 1m30, 1:30, 1h2p, 90 ---------- */
  YTL.parseTime = function (v) {
    if (v == null) return null;
    const s = String(v).trim().toLowerCase();
    if (!s) return null;
    if (/^\d+(:\d{1,2}){1,2}$/.test(s)) return s.split(':').reduce((a, x) => a * 60 + Number(x), 0);
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    const re = /(\d+(?:\.\d+)?)\s*(giờ|gio|h|phút|phut|ph|p|min|m|giây|giay|sec|s)?/g;
    if (s.replace(re, '').trim() !== '') return null;
    let m, total = 0, last = null, found = false;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      let u = m[2];
      let kind;
      if (!u) kind = last === 'h' ? 'm' : last === 'm' ? 's' : null;
      else if (/^(giờ|gio|h)$/.test(u)) kind = 'h';
      else if (/^(phút|phut|ph|p|min|m)$/.test(u)) kind = 'm';
      else kind = 's';
      if (!kind) return null;
      total += Number(m[1]) * (kind === 'h' ? 3600 : kind === 'm' ? 60 : 1);
      last = kind;
      found = true;
    }
    return found ? total : null;
  };

  YTL.formatTime = function (sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
  };

  /* ---------- Parser bài học ---------- */
  function parseAttrs(str) {
    const attrs = {};
    const re = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))|([^\s=]+)/g;
    let m;
    while ((m = re.exec(str || ''))) {
      if (m[1]) attrs[m[1].toLowerCase()] = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4];
      else if (m[5] && YTL.parseTime(m[5]) != null && attrs.time == null) attrs.time = m[5];
    }
    return attrs;
  }

  function parseQuiz(body, attrs) {
    const q = [], options = [], answers = [], explain = [];
    let fence = false;
    body.split('\n').forEach((line) => {
      let m;
      if (/^\s*```/.test(line)) { fence = !fence; q.push(line); return; }
      if (fence) { q.push(line); return; }
      if ((m = /^\s*[-*+]\s*\[([ xX]?)\]\s*(.*)$/.exec(line))) {
        options.push({ text: m[2].trim(), correct: m[1].toLowerCase() === 'x' });
      } else if ((m = /^\s*=\s*(.+)$/.exec(line))) {
        m[1].split('|').map((x) => x.trim()).filter(Boolean).forEach((x) => answers.push(x));
      } else if ((m = /^\s*>\s?(.*)$/.exec(line))) {
        explain.push(m[1]);
      } else q.push(line);
    });
    let type = String(attrs.type || '').toLowerCase();
    if (type === 'text' || type === 'fill') type = 'input';
    if (!/^(single|multi|input)$/.test(type)) type = '';
    if (!type) {
      if (options.length) type = options.filter((o) => o.correct).length > 1 ? 'multi' : 'single';
      else if (answers.length) type = 'input';
    }
    return { type, question: q.join('\n').trim(), options, answers, explain: explain.join('\n').trim() };
  }

  YTL.parseLesson = function (text) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const lesson = { title: '', meta: {}, blocks: [], warnings: [] };
    const fm = /^\s*---\n([\s\S]*?)\n---[ \t]*\n?/.exec(text);
    if (fm) {
      fm[1].split('\n').forEach((l) => {
        const m = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(l);
        if (m) lesson.meta[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '');
      });
      text = text.slice(fm[0].length);
    }
    const tagRe = /<(\/?)(lesson|quiz)\b([^>]*)>/gi;
    const raws = [];
    let cur = null, m, outside = '', lastEnd = 0;
    const close = (end) => {
      if (cur) { cur.body = text.slice(cur.start, end).trim(); raws.push(cur); cur = null; }
      else outside += text.slice(lastEnd, end);
    };
    while ((m = tagRe.exec(text))) {
      close(m.index);
      lastEnd = tagRe.lastIndex;
      if (!m[1]) cur = { type: m[2].toLowerCase(), attrs: parseAttrs(m[3]), start: tagRe.lastIndex };
    }
    close(text.length);

    const h1 = /^#\s+(.+)$/m.exec(outside);
    lesson.title = lesson.meta.title || (h1 ? h1[1].trim() : '');

    const ids = new Set();
    raws.forEach((r) => {
      if (!r.body) return; // thẻ rỗng (kiểu <lesson> ... <lesson> dùng làm thẻ đóng)
      const a = r.attrs;
      const n = lesson.blocks.length + 1;
      let id = a.id || r.type[0] + n;
      while (ids.has(id)) id += '_';
      ids.add(id);
      const rawTime = a.time != null ? a.time : a.at != null ? a.at : a.t;
      const time = YTL.parseTime(rawTime);
      if (rawTime != null && time == null) lesson.warnings.push('Khối ' + n + ': không đọc được mốc thời gian "' + rawTime + '"');
      const pr = Number(a.priority != null ? a.priority : a.p);
      const b = {
        id, type: r.type, time,
        title: a.title || '',
        priority: isFinite(pr) && pr > 0 ? pr : 2,
        size: /^(banner|card|full)$/.test(a.size || '') ? a.size : 'auto',
        style: { color: a.color, bg: a.bg, font: a.font, align: a.align, fontSize: a.fontsize },
        body: r.body
      };
      if (r.type === 'quiz') {
        b.quiz = parseQuiz(r.body, a);
        if (!b.quiz.type) {
          lesson.warnings.push('Khối ' + n + ' (quiz): không có đáp án "- [x]" hoặc "= ..." nên hiển thị như lesson');
          b.type = 'lesson'; delete b.quiz;
        } else if (b.quiz.type !== 'input' && !b.quiz.options.some((o) => o.correct)) {
          lesson.warnings.push('Khối ' + n + ' (quiz): chưa đánh dấu đáp án đúng [x]');
        } else if (b.quiz.type === 'input' && !b.quiz.answers.length) {
          lesson.warnings.push('Khối ' + n + ' (quiz input): thiếu dòng "= đáp án"');
        }
      }
      lesson.blocks.push(b);
    });
    if (!lesson.blocks.length) lesson.warnings.push('Không tìm thấy khối <lesson> hoặc <quiz> nào');
    const times = lesson.blocks.map((b) => b.time).filter((t) => t != null);
    lesson.stats = {
      blocks: lesson.blocks.length,
      lessons: lesson.blocks.filter((b) => b.type === 'lesson').length,
      quizzes: lesson.blocks.filter((b) => b.type === 'quiz').length,
      lastTime: times.length ? Math.max.apply(null, times) : 0
    };
    return lesson;
  };

  /* ---------- Chấm điểm ---------- */
  const norm = (s) => String(s).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?。！？]+$/, '');
  YTL.checkInput = (quiz, value) => quiz.answers.map(norm).includes(norm(value));
  YTL.correctText = (quiz) => quiz.type === 'input'
    ? (quiz.answers[0] || '')
    : quiz.options.filter((o) => o.correct).map((o) => YTL.plainText(o.text)).join('; ');
  YTL.plainText = (md) => String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\{(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}):\s*([^{}]+)\}/g, '$1')
    .replace(/(\*\*|==|~~|`|^#{1,4}\s+)/gm, '')
    .replace(/\s+/g, ' ').trim();

  YTL.sessionStats = function (s) {
    const a = (s && s.answers) || [];
    const correct = a.filter((x) => x.result === 'correct').length;
    const skipped = a.filter((x) => x.result === 'skipped').length;
    const fixed = a.filter((x) => x.result !== 'correct' && x.retry === 'correct').length;
    return {
      total: a.length, correct, skipped, wrong: a.length - correct - skipped, fixed,
      percent: a.length ? Math.round((correct / a.length) * 100) : 0
    };
  };

  /* ---------- Xếp lịch theo độ dài video ----------
     - Khối có mốc thời gian mở một "cụm"; các khối không có mốc đi kèm cụm trước (hiện ngay sau khi bấm Tiếp).
     - Video đủ dài: giữ nguyên mốc (hoặc giãn đều nếu fitMode = spread).
     - Video ngắn hơn bài: chọn cụm theo priority (số nhỏ = quan trọng hơn) cho vừa ngân sách thời gian,
       rồi co mốc theo tỉ lệ và giữ khoảng cách tối thiểu. */
  YTL.estimateBlock = function (b) {
    if (b.type === 'quiz') return 10 + (b.quiz.options.length || 2) * 1.5;
    // Chữ Nhật / Hán không có dấu cách nên đếm theo ký tự (người học đọc khoảng 5 ký tự mỗi giây).
    const text = YTL.plainText(b.body);
    const cjk = (text.match(/[぀-ヿ㐀-鿿]/g) || []).length;
    const words = text.replace(/[぀-ヿ㐀-鿿]+/g, ' ').split(' ').filter(Boolean).length;
    return 4 + words / 3.5 + cjk / 5;
  };

  YTL.buildSchedule = function (lesson, duration, settings) {
    const s = Object.assign({}, YTL.DEFAULT_SETTINGS, settings);
    const minGap = Math.max(3, Number(s.minGap) || 15);
    const D = Number(duration);
    const units = [];
    let cur = null;
    lesson.blocks.forEach((b) => {
      if (b.time != null || !cur) {
        cur = { key: b.id, origT: b.time != null ? b.time : 5, blocks: [b], priority: b.priority, idx: units.length };
        units.push(cur);
      } else cur.blocks.push(b);
    });
    units.sort((a, b) => a.origT - b.origT || a.idx - b.idx);
    units.forEach((u, i) => {
      u.idx = i;
      u.t = u.origT;
      u.cost = Math.max(minGap, u.blocks.reduce((n, b) => n + YTL.estimateBlock(b), 0));
    });
    const total = lesson.blocks.length;
    const out = (list, scaled) => {
      const kept = list.reduce((n, u) => n + u.blocks.length, 0);
      return {
        units: list.map((u) => ({
          key: u.key, t: Math.round(u.t * 10) / 10, origT: u.origT, blocks: u.blocks,
          hasQuiz: u.blocks.some((b) => b.type === 'quiz')
        })),
        totalBlocks: total, keptBlocks: kept, droppedBlocks: total - kept, scaled: !!scaled,
        duration: isFinite(D) && D > 0 ? D : null
      };
    };
    if (!units.length) return out([], false);
    if (!isFinite(D) || D <= 0) return out(units, false);

    const end = Math.max(1, D - Math.max(3, Math.min(10, D * 0.05)));
    const last = units[units.length - 1];
    if (s.fitMode === 'original') return out(units.filter((u) => u.origT <= end), false);

    if (last.origT <= end) {
      if (s.fitMode === 'spread') {
        const k = (end - last.cost) / Math.max(1, last.origT);
        if (k > 1.05) { units.forEach((u) => { u.t = u.origT * k; }); return out(units, true); }
      }
      return out(units, false);
    }

    // Bài dài hơn video: chọn cụm theo độ ưu tiên rồi co mốc.
    const startAt = Math.min(units[0].origT, Math.max(2, end * 0.05));
    const budget = end - startAt + minGap;
    const order = units.slice().sort((a, b) => a.priority - b.priority || a.idx - b.idx);
    const picked = [];
    let used = 0;
    order.forEach((u) => {
      if (!picked.length || used + u.cost <= budget) { picked.push(u); used += u.cost; }
    });
    picked.sort((a, b) => a.idx - b.idx);
    const k = end / last.origT;
    picked.forEach((u) => { u.t = Math.max(startAt, u.origT * k); });
    for (let i = 1; i < picked.length; i++) picked[i].t = Math.max(picked[i].t, picked[i - 1].t + picked[i - 1].cost);
    const n = picked.length - 1;
    picked[n].t = Math.min(picked[n].t, end);
    for (let i = n - 1; i >= 0; i--) picked[i].t = Math.min(picked[i].t, picked[i + 1].t - picked[i].cost);
    picked[0].t = Math.max(1, picked[0].t);
    for (let i = 1; i <= n; i++) picked[i].t = Math.max(picked[i].t, picked[i - 1].t + 1);
    return out(picked, true);
  };

  /* ---------- Markdown -> DOM (không dùng innerHTML) ---------- */
  const INLINE = [
    ['code', /`([^`]+)`/],
    ['img', /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/],
    ['link', /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/],
    ['bold', /\*\*(.+?)\*\*/],
    ['mark', /==(.+?)==/],
    ['del', /~~(.+?)~~/],
    ['em', /\*([^*\s][^*]*?)\*/],
    ['color', /\{(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}):\s*([^{}]+)\}/]
  ];

  YTL.renderInline = function (text, parent) {
    const doc = parent.ownerDocument;
    text = String(text == null ? '' : text);
    while (text) {
      let best = null;
      for (const [kind, re] of INLINE) {
        const m = re.exec(text);
        if (m && (!best || m.index < best.m.index)) best = { kind, m };
      }
      if (!best) { parent.appendChild(doc.createTextNode(text)); return; }
      const m = best.m;
      if (m.index) parent.appendChild(doc.createTextNode(text.slice(0, m.index)));
      let node;
      switch (best.kind) {
        case 'code': node = doc.createElement('code'); node.textContent = m[1]; break;
        case 'img': node = doc.createElement('img'); node.src = m[2]; node.alt = m[1]; node.referrerPolicy = 'no-referrer'; break;
        case 'link':
          node = doc.createElement('a'); node.href = m[2]; node.target = '_blank'; node.rel = 'noopener noreferrer';
          YTL.renderInline(m[1], node); break;
        case 'bold': node = doc.createElement('strong'); YTL.renderInline(m[1], node); break;
        case 'mark': node = doc.createElement('mark'); YTL.renderInline(m[1], node); break;
        case 'del': node = doc.createElement('del'); YTL.renderInline(m[1], node); break;
        case 'em': node = doc.createElement('em'); YTL.renderInline(m[1], node); break;
        case 'color':
          if (YTL.validColor(m[1])) {
            node = doc.createElement('span'); node.style.color = m[1]; YTL.renderInline(m[2], node);
          } else node = doc.createTextNode(m[0]);
          break;
      }
      parent.appendChild(node);
      text = text.slice(m.index + m[0].length);
    }
  };

  const RE_LIST = /^\s*([-*+]|\d+[.)])\s+(.*)$/;
  const RE_HEAD = /^(#{1,4})\s+(.*)$/;
  const RE_HR = /^\s*(-{3,}|\*{3,})\s*$/;
  const RE_TABLE = /^\s*\|.*\|\s*$/;

  YTL.renderMarkdown = function (src, doc) {
    doc = doc || document;
    const frag = doc.createDocumentFragment();
    const lines = String(src || '').split('\n');
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      let m;
      if (!line.trim()) { i++; continue; }
      if (/^\s*```/.test(line)) {
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        const pre = doc.createElement('pre'), code = doc.createElement('code');
        code.textContent = buf.join('\n'); pre.appendChild(code); frag.appendChild(pre);
        continue;
      }
      if ((m = RE_HEAD.exec(line))) {
        const h = doc.createElement('h' + m[1].length);
        YTL.renderInline(m[2], h); frag.appendChild(h); i++; continue;
      }
      if (RE_HR.test(line)) { frag.appendChild(doc.createElement('hr')); i++; continue; }
      if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        const bq = doc.createElement('blockquote');
        bq.appendChild(YTL.renderMarkdown(buf.join('\n'), doc)); frag.appendChild(bq);
        continue;
      }
      if (RE_TABLE.test(line)) {
        const rows = [];
        while (i < lines.length && RE_TABLE.test(lines[i])) rows.push(lines[i++]);
        const table = doc.createElement('table');
        const hasHead = rows.length > 1 && /^[\s|:-]+$/.test(rows[1]);
        rows.forEach((r, ri) => {
          if (hasHead && ri === 1) return;
          const tr = doc.createElement('tr');
          cells(r).forEach((c) => {
            const td = doc.createElement(hasHead && ri === 0 ? 'th' : 'td');
            YTL.renderInline(c, td); tr.appendChild(td);
          });
          table.appendChild(tr);
        });
        frag.appendChild(table);
        continue;
      }
      if ((m = RE_LIST.exec(line))) {
        const ordered = /\d/.test(m[1]);
        const list = doc.createElement(ordered ? 'ol' : 'ul');
        while (i < lines.length && (m = RE_LIST.exec(lines[i])) && /\d/.test(m[1]) === ordered) {
          const li = doc.createElement('li');
          YTL.renderInline(m[2], li); list.appendChild(li); i++;
        }
        frag.appendChild(list);
        continue;
      }
      const p = doc.createElement('p');
      let first = true;
      while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !RE_HEAD.test(lines[i]) &&
        !RE_HR.test(lines[i]) && !/^\s*>/.test(lines[i]) && !RE_TABLE.test(lines[i]) && !(RE_LIST.test(lines[i]) && !first)) {
        if (!first) p.appendChild(doc.createElement('br'));
        YTL.renderInline(lines[i].trim(), p);
        first = false; i++;
      }
      frag.appendChild(p);
    }
    return frag;
  };

  /* ---------- Lưu bài học vào thư viện (chrome.storage.local) ---------- */
  // Lưu một hoặc nhiều bài trong một lần ghi. Bài trùng tên được thay; nếu nội dung y hệt thì giữ nguyên
  // (giữ cả tiến độ đang học). activateFirst = chuyển sang bài đầu tiên trong danh sách.
  YTL.saveLessons = async function (items, activateFirst) {
    const st = await chrome.storage.local.get(['lessons', 'activeLessonId']);
    const lessons = st.lessons || {};
    const out = [];
    items.forEach((it, i) => {
      const parsed = YTL.parseLesson(it.text);
      let id = null;
      Object.keys(lessons).forEach((k) => {
        if (lessons[k].name !== it.name) return;
        if (lessons[k].text === it.text && !id) id = k; else delete lessons[k];
      });
      if (!id) {
        id = 'L' + Date.now().toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 6);
        lessons[id] = { id, name: it.name, title: it.title || parsed.title || it.name, text: it.text, addedAt: Date.now() };
      }
      out.push({ id, parsed });
    });
    let active = st.activeLessonId;
    if (out.length && (activateFirst || !lessons[active])) active = out[0].id;
    await chrome.storage.local.set({ lessons, activeLessonId: active || null });
    return out;
  };
  YTL.saveLesson = async function (name, text) {
    return (await YTL.saveLessons([{ name, text }], true))[0];
  };
  YTL.LESSON_FILE = /\.(md|markdown|txt)$/i;
  YTL.readLessonFiles = async function (fileList) {
    const items = [];
    for (const f of Array.from(fileList || [])) {
      if (!YTL.LESSON_FILE.test(f.name)) continue;
      items.push({ name: f.name.replace(YTL.LESSON_FILE, ''), text: await f.text() });
    }
    return items;
  };

  root.YTL = YTL;
  if (typeof module !== 'undefined' && module.exports) module.exports = YTL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
