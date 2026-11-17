/* Chill Learn — giao diện tiếng Anh.
   Mã nguồn viết chuỗi tiếng Việt; khi ngôn ngữ là 'en', một MutationObserver dịch các nút chữ và thuộc tính
   (title / placeholder / aria-label) của phần giao diện ngay khi chúng xuất hiện. Nội dung bài học của người dùng
   (thẻ bài, tên bài, câu hỏi) được đánh dấu bỏ qua, không bao giờ bị dịch. */
(function (root) {
  'use strict';
  const YTL = root.YTL || {};

  // Chuỗi nguyên vẹn.
  const EXACT = {
    // --- thẻ bài / câu hỏi ---
    'Bài học': 'Lesson', 'Câu hỏi': 'Question', 'Kết quả': 'Results',
    'Tiếp ▶': 'Next ▶', 'Xong ✓': 'Done ✓', 'Bỏ qua': 'Skip', 'Kiểm tra': 'Check', 'Đóng': 'Close',
    'Nhập câu trả lời…': 'Type your answer…', 'Chọn nhiều đáp án': 'Select all that apply',
    '✓ Chính xác!': '✓ Correct!', '✗ Chưa đúng': '✗ Not quite', '– Đã bỏ qua': '– Skipped',
    'Xem chi tiết': 'View details',
    'Kéo để dời khung, nhấp đúp để về chỗ cũ': 'Drag to move the card, double-click to reset its position',
    'Kéo để đổi kích thước khung, nhấp đúp để về kích thước và vị trí mặc định': 'Drag to resize the card, double-click to reset size and position',
    'Ẩn bài học. Bật lại bằng nút ▶ trên thanh đầu video': 'Hide lessons. Turn them back on with the ▶ button on the top bar',
    'Thu nhỏ: ẩn thẻ này và chờ tới bài kế tiếp': 'Minimize: hide this card and wait for the next lesson',
    'Bấm để tạm dừng đồng hồ (tắt tự chuyển thẻ)': 'Click to pause the timer (turns auto-advance off)',
    'Đồng hồ đang dừng. Bấm để tự chuyển thẻ trở lại': 'Timer is paused. Click to resume auto-advance',
    'Bài trước [': 'Previous [', 'Bài sau ]': 'Next ]',
    // --- thanh đầu video ---
    'Danh sách bài học': 'Lesson library', 'Danh sách bài học / nạp bài': 'Lesson library / load lessons',
    'Tạm ẩn / hiện bài học': 'Hide / show lessons', 'Toàn màn hình / bình thường': 'Fullscreen / normal',
    'Cài đặt nhanh': 'Quick settings', 'Chill Learn — cài đặt bài học': 'Chill Learn — lesson settings',
    '📂 Chọn bài học ▾': '📂 Choose a lesson ▾',
    // --- menu thư viện ---
    'Thư viện bài học': 'Lesson library',
    'Chưa có bài nào. Tải file, nạp cả thư mục, hoặc tạo bài mới bên dưới.': 'No lessons yet. Load a file, load a whole folder, or create one below.',
    'Bài đang học': 'Current lesson', 'Chuyển sang bài này': 'Switch to this lesson',
    'Xóa?': 'Delete?', 'Xóa bài này khỏi thư viện': 'Remove this lesson from the library',
    '＋ Tải file': '＋ Load file', '📁 Nạp thư mục': '📁 Load folder', '✎ Tạo bài': '✎ Create',
    '📊 Kết quả đến giờ': '📊 Results so far', '↻ Học lại từ đầu': '↻ Restart lesson',
    'Không lưu được. Hãy tải lại trang YouTube rồi thử lại.': 'Could not save. Reload the YouTube page and try again.',
    // --- bảng cài đặt ---
    'Cài đặt': 'Settings', 'Tạo bài học': 'Create lesson', 'Ngôn ngữ / Language': 'Ngôn ngữ / Language',
    'Bật bài học trên video': 'Show lessons on the video', 'Tự chuyển thẻ (đếm ngược)': 'Auto-advance cards (countdown)',
    'Tạm dừng video': 'Pause the video', 'Không': 'Never', 'Khi có câu hỏi': 'On questions', 'Mọi thẻ': 'On every card',
    'Cỡ chữ': 'Text size', 'Rộng khung': 'Card width', 'Cao khung': 'Card height', 'Vị trí khung': 'Card position',
    'Tự động': 'Auto', 'tự động': 'auto',
    'Trên trái': 'Top left', 'Trên': 'Top', 'Trên phải': 'Top right', 'Trái': 'Left', 'Giữa': 'Center', 'Phải': 'Right',
    'Dưới trái': 'Bottom left', 'Dưới': 'Bottom', 'Dưới phải': 'Bottom right',
    'Màu sắc': 'Colors', 'Bộ màu gợi ý': 'Suggested themes', 'Màu chữ': 'Text color', 'Màu nhấn': 'Accent color', 'Chọn màu khác': 'Pick another color',
    'Khung': 'Card', 'Kiểu khung': 'Card style', 'Nền màu': 'Filled', 'Chỉ viền': 'Outline only',
    'Màu nền khung': 'Card background', 'Độ đặc nền khung': 'Background opacity',
    'Màu viền khung': 'Border color', 'Độ dày viền khung': 'Border width', 'Độ đậm viền khung': 'Border opacity',
    'Bo góc': 'Corner radius', 'Làm tối video': 'Dim the video',
    'Chữ': 'Text', 'Font chữ': 'Font', 'Mặc định': 'Default', 'Tròn': 'Rounded', 'Có chân': 'Serif', 'Đơn cách': 'Monospace', 'Viết tay': 'Handwriting', 'Tiếng Nhật': 'Japanese',
    '▸ Nâng cao: giãn chữ, viền chữ, bóng chữ': '▸ Advanced: spacing, text outline, text shadow',
    '▾ Nâng cao: giãn chữ, viền chữ, bóng chữ': '▾ Advanced: spacing, text outline, text shadow',
    'Độ đậm chữ': 'Text opacity', 'Giãn chữ': 'Letter spacing', 'Giãn dòng': 'Line height',
    'Màu viền chữ': 'Text outline color', 'Độ dày viền chữ': 'Text outline width',
    'Màu bóng chữ': 'Text shadow color', 'Độ lệch bóng': 'Shadow offset', 'Độ nhòe bóng': 'Shadow blur',
    'Khác': 'Other', 'Vạch mốc trên thanh tiến trình': 'Markers on the progress bar',
    'Danh sách bài': 'Library', 'Đặt lại khung': 'Reset card',
    'Chỉ có tác dụng ở kiểu khung "Chỉ viền"': 'Only applies to the "Outline only" card style',
    'Chỉ có tác dụng ở kiểu khung "Nền màu"': 'Only applies to the "Filled" card style',
    'Kích thước và vị trí · toàn màn hình': 'Size and position · fullscreen',
    'Kích thước và vị trí · chế độ thường': 'Size and position · normal mode',
    // --- tab tạo bài học ---
    'Nhờ AI soạn bài': 'Let an AI write it',
    'Chép prompt, dán vào một AI bất kỳ cùng tài liệu của bạn, rồi mang kết quả về bước 2.': 'Copy the prompt, paste it into any AI together with your material, then bring the result to step 2.',
    '📋 Chép prompt chuẩn': '📋 Copy the standard prompt', '✓ Đã chép, dán vào AI nhé': '✓ Copied — paste it into your AI',
    'Trình duyệt không cho chép': 'The browser blocked copying',
    'Dán nội dung': 'Paste content',
    'Dán kết quả của AI, hoặc dán thẳng flashcard / ghi chú. Bấm một mẫu để xem thử.': 'Paste the AI result, or paste flashcards / notes directly. Click a sample to try it.',
    'Hỏi–đáp': 'Q&A', 'Ghi chú': 'Notes', 'Bài chuẩn': 'Native lesson',
    'Dán vào đây…': 'Paste here…', 'Tên bài học (không bắt buộc)': 'Lesson name (optional)',
    'Văn bản thường: cắt thành nhiều thẻ vừa khung': 'Plain text: split into cards that fit the frame',
    'Văn bản thường: một thẻ lớn có thanh cuộn': 'Plain text: one large scrollable card',
    'Nhập và học ngay': 'Import and start', 'Chưa có nội dung.': 'Nothing pasted yet.',
    '✗ Chưa tách được khối nào từ nội dung này.': '✗ No blocks could be extracted from this content.',
    'Không lưu được, hãy tải lại trang rồi thử lại.': 'Could not save — reload the page and try again.',
    'Hoặc lấy từ file': 'Or take it from a file',
    '.md · .txt · .csv · .tsv — tự nhận diện và chuyển đổi.': '.md · .txt · .csv · .tsv — detected and converted automatically.',
    '📄 Chọn file': '📄 Choose files', '📁 Cả thư mục': '📁 Whole folder',
    'Trang nhập đầy đủ': 'Full import page',
    'PDF · xem trước và sửa trước khi lưu · chọn kiểu nội dung · nhập hàng loạt': 'PDF · preview and edit before saving · choose content type · batch import',
    'Mở trang ↗': 'Open ↗',
    // --- popup ---
    'Bật / tắt lớp bài học trên YouTube': 'Turn the lesson overlay on YouTube on / off',
    'Bài học đang dùng': 'Active lesson', '— Chưa có bài học —': '— No lessons yet —', 'Xóa': 'Delete', 'Xóa bài đang chọn': 'Delete the selected lesson',
    'Tải file .md': 'Load file', 'Nạp thư mục': 'Load folder', 'Nạp mọi file .md trong một thư mục': 'Load every lesson file in a folder',
    'Nạp bài mẫu…': 'Load a sample…', 'Nạp toàn bộ bài mẫu': 'Load all samples', '🎓 Nạp bộ bài mẫu': '🎓 Load the sample set',
    'Chưa có bài nào. Nạp bộ bài mẫu để thử, hoặc tải file / tạo bài mới bên dưới.': 'No lessons yet. Load the sample set to try it, or load a file / create a lesson below.',
    'Không nạp được bài mẫu. Hãy tải lại trang YouTube rồi thử lại.': 'Could not load the samples. Reload the YouTube page and try again.', 'Nạp bài mẫu': 'Load a sample',
    'Hướng dẫn và bài chuẩn': 'Guide and native lessons', 'Thử từng kiểu đầu vào': 'Try each input type', 'Bài theo chủ đề': 'Topic lessons',
    'Hướng dẫn sử dụng (bắt đầu ở đây)': 'User guide (start here)', 'User guide (English)': 'User guide (English)',
    'Bài học chuẩn: đủ mọi tính năng': 'Native lesson: every feature', 'Demo nhanh 1 phút': 'Quick 1-minute demo',
    'Flashcard .csv (từ, nghĩa, ghi chú)': 'Flashcards .csv (term, meaning, note)', 'Flashcard dạng "từ - nghĩa" .txt': 'Flashcards as "term - meaning" .txt',
    'Bảng hỏi–đáp .csv': 'Q&A table .csv', 'Hỏi / Đáp từng dòng .txt': 'Q: / A: lines .txt', 'Ghi chú có tiêu đề mục .md': 'Notes with headings .md',
    'Văn bản thường .txt': 'Plain text .txt', 'Cloze kiểu Anki .txt': 'Anki-style cloze .txt', 'Bài gần đúng định dạng (tự sửa)': 'Almost-valid lesson (auto-repaired)',
    'Tiếng Anh: từ vựng thư giãn': 'English: relaxing vocabulary', 'Tiếng Nhật: chào hỏi cơ bản': 'Japanese: basic greetings',
    'Python: list và vòng lặp': 'Python: lists and loops', 'Khoa học: Hệ Mặt Trời': 'Science: the Solar System', 'Kỹ năng: học sao cho nhớ lâu': 'Skills: how to remember longer',
    'Tạo / chuyển đổi bài học (dán văn bản, CSV, PDF)…': 'Create / convert lessons (paste text, CSV, PDF)…',
    'Tải một file bài học .md (hoặc nạp bài mẫu) rồi mở video YouTube bất kỳ.': 'Load a lesson file (or a sample), then open any YouTube video.',
    'Kết quả gần nhất': 'Latest result', 'Chưa có phiên học nào.': 'No study sessions yet.', 'Xem chi tiết tất cả phiên': 'View all sessions',
    'Khung, chữ và màu': 'Card, text and colors',
    'Nền màu (chỉnh độ đặc bên dưới)': 'Filled (set opacity below)', 'Chỉ viền — nền trong suốt hoàn toàn': 'Outline only — fully transparent background',
    'Vị trí khung (kéo đầu khung để dời, kéo góc dưới phải để đổi kích thước)': 'Card position (drag the header to move, drag the bottom-right corner to resize)',
    'Tự động: thẻ ở giữa, dải ở dưới': 'Auto: cards centered, banners at the bottom',
    'Đặt lại vị trí và kích thước khung': 'Reset card position and size',
    'Mặc định hệ thống': 'System default', 'Tròn, hiện đại': 'Rounded, modern', 'Có chân (serif)': 'Serif', 'Đơn cách (mono)': 'Monospace', 'Tiếng Nhật (Yu Gothic)': 'Japanese (Yu Gothic)',
    'Font tùy chỉnh': 'Custom font', 'vd: Be Vietnam Pro': 'e.g. Inter',
    'Màu nền thẻ': 'Card background', 'Độ đặc nền thẻ': 'Background opacity', 'Làm tối video khi hiện thẻ': 'Dim the video behind cards',
    'Cách hiển thị theo video': 'Timing and behavior',
    'Khi bài dài hơn / ngắn hơn video': 'When the lesson is longer / shorter than the video',
    'Tự tối ưu: lược khối ít ưu tiên, co mốc': 'Optimize: defer low-priority blocks, compress timing',
    'Giãn đều các mốc theo cả video': 'Spread the marks across the whole video', 'Giữ nguyên mốc trong file': 'Keep the timestamps from the file',
    'Không — video chạy nền': 'Never — the video keeps playing', 'Chỉ khi có câu hỏi': 'Only on questions', 'Mỗi khi hiện bài hoặc câu hỏi': 'On every lesson or question',
    'Khoảng cách tối thiểu giữa các mốc': 'Minimum gap between marks',
    'Tự chuyển thẻ theo mốc thời gian (có đếm ngược)': 'Auto-advance cards on schedule (with countdown)',
    'Hiện mốc trên thanh tiến trình': 'Show markers on the progress bar', 'Trộn thứ tự đáp án': 'Shuffle answer order',
    'Hiện bảng kết quả ở cuối video': 'Show the results summary when a lesson ends', 'Đặt lại mặc định': 'Reset to defaults',
    // --- trang kết quả ---
    'Chill Learn — Kết quả học': 'Chill Learn — Study results', 'Kết quả học': 'Study results', 'Xuất JSON': 'Export JSON', 'Xóa lịch sử': 'Clear history',
    'Câu hay sai nhất': 'Most-missed questions', 'Các phiên học': 'Sessions',
    'phiên học': 'sessions', 'bài học đã xem': 'lessons viewed', 'câu hỏi đã làm': 'questions answered', 'tỉ lệ đúng (lần đầu)': 'accuracy (first try)',
    'Chưa có phiên học nào. Tải bài học trong popup rồi mở một video YouTube.': 'No sessions yet. Load a lesson from the popup, then open a YouTube video.',
    'Mở lại video': 'Reopen the video', 'Xóa phiên này': 'Delete this session',
    // --- trang nhập ---
    'Chill Learn — Tạo và nhập bài học': 'Chill Learn — Create and import lessons', 'Tạo và nhập bài học': 'Create and import lessons',
    '1. Nội dung nguồn': '1. Source content', 'Kéo thả file vào đây hoặc': 'Drop files here or', 'Chọn file': 'Choose files',
    '.md · .txt · .csv · .tsv · .pdf — chọn nhiều file để nhập hàng loạt': '.md · .txt · .csv · .tsv · .pdf — choose several files to import them in one go',
    'Hoặc dán nội dung': 'Or paste content', 'Tên bài học': 'Lesson name', 'vd: Từ vựng bài 3': 'e.g. Vocabulary unit 3',
    'Kiểu nội dung': 'Content type', 'Tự nhận diện': 'Detect automatically', 'Flashcard (từ – nghĩa)': 'Flashcards (term – meaning)',
    'Bảng hỏi–đáp': 'Q&A table', 'Các cặp Q: / A:': 'Q: / A: pairs', 'Ghi chú có tiêu đề mục': 'Notes with headings', 'Văn bản thường': 'Plain text',
    'Văn bản thường thì': 'For plain text', 'Cắt thành nhiều thẻ vừa khung': 'Split into cards that fit the frame', 'Một thẻ lớn có thanh cuộn': 'One large scrollable card',
    'Giây giữa các mốc': 'Seconds between marks', 'Số thẻ mỗi nhóm': 'Cards per group', 'Chữ mỗi thẻ khi cắt': 'Words per card when splitting',
    'Tự tạo câu điền từ từ chữ': 'Create fill-in questions from', 'in đậm': 'bold', '/ ==tô vàng==': '/ ==highlighted== text',
    'Chuyển đổi và xem trước': 'Convert and preview', '2. Bài học (sửa được trước khi lưu)': '2. Lesson (editable before saving)',
    'Chưa có gì. Chọn file hoặc dán nội dung rồi bấm Chuyển đổi.': 'Nothing yet. Choose a file or paste content, then click Convert.',
    'Lưu vào thư viện': 'Save to library', 'Tải file .md ': 'Download .md', 'Các kiểu nội dung được nhận': 'Accepted content types',
    'Prompt chuẩn để nhờ AI chuyển nội dung thành bài học': 'Standard prompt for having an AI turn content into a lesson',
    'Chép prompt': 'Copy prompt', 'Đã chép ✓': 'Copied ✓', 'Chưa có nội dung nguồn.': 'No source content yet.',
    'Không tách được khối nào từ nội dung này.': 'No blocks could be extracted from this content.',
    '(kiểu Quizlet / Anki)': '(Quizlet / Anki style)', '(có dòng tiêu đề)': '(with a header row)', 'Hỏi / Đáp từng dòng': 'Q / A lines',
    'Ghi chú, markdown, PDF': 'Notes, markdown, PDF', 'Cloze của Anki': 'Anki cloze', 'Bài học chuẩn': 'Native lesson',
    'Mỗi dòng một thẻ. Ngăn bằng tab, dấu phẩy, chấm phẩy, hoặc': 'One card per line. Separate with a tab, comma, semicolon, or',
    '. Tự tạo bảng từ và câu hỏi nghĩa xuôi / ngược.': '. Builds word tables plus forward / reverse meaning questions.',
    'Có cột đáp án sai thì thành câu chọn đáp án, không có thì thành câu điền chữ.': 'Rows with wrong-answer columns become multiple choice; rows without become type-in questions.',
    'Cũng nhận': 'Also accepts', 'Mỗi mục thành một thẻ; mục có "Đáp án:" thành câu hỏi. Không có tiêu đề thì chia theo đoạn.': 'Each section becomes a card; a section with "Answer:" becomes a question. Without headings the text is split by paragraph.',
    'Thành thẻ có từ tô vàng kèm câu điền chỗ trống.': 'Becomes a card with the word highlighted plus a fill-in-the-blank question.',
    'Nhập nguyên vẹn, không chuyển đổi.': 'Imported as is, no conversion.',
    'Bài học chuẩn <lesson>/<quiz>': 'Native lesson <lesson>/<quiz>',
    'Bài viết gần đúng định dạng (bọc trong khối code, thẻ': 'Almost-valid lessons (wrapped in a code fence, tags written as',
    ', đáp án': ', answers written as',
    'thiếu gạch đầu dòng, "Đáp án: B"…) được tự sửa và liệt kê những gì đã sửa. Nhận diện sai thì chọn lại ở ô': 'without the leading dash, "Answer: B"…) are repaired automatically and every fix is listed. If detection is wrong, pick the right one under',
    'Văn bản thường và PDF không có sẵn câu hỏi: bộ chuyển chỉ tạo được thẻ bài học và câu điền từ từ chữ in đậm. Muốn có câu hỏi hay hơn, dùng prompt bên dưới với một AI bất kỳ rồi dán kết quả vào ô nội dung.':
      'Plain text and PDFs contain no questions: the converter can only build lesson cards and fill-in questions from bold text. For better questions, use the prompt below with any AI and paste the result into the content box.'
  };

  // Mảnh chuỗi (cho chuỗi ghép động). Xếp từ dài tới ngắn; áp lần lượt.
  const PHRASES = [
    ['Không có file .md .txt .csv .tsv nào dùng được trong', 'No usable .md .txt .csv .tsv file among the'], ['file đã chọn', 'selected files'],
    ['Nạp bộ bài mẫu', 'Load the sample set'], ['bài, có hướng dẫn sử dụng', 'lessons, including a user guide'], ['bài mẫu', 'samples'],
    ['Không đọc được file:', 'Could not read the file:'], ['bài vào thư viện', 'lessons to the library'], ['Đã nạp', 'Loaded'], ['Đã xóa', 'Deleted'],
    ['Đã lưu', 'Saved'], ['vào thư viện và chọn làm bài đang học. Mở một video YouTube để bắt đầu.', 'to the library and made it the active lesson. Open a YouTube video to start.'],
    ['Không chuyển được theo kiểu đã chọn:', 'Could not convert as the selected type:'],
    ['Không tìm thấy các dòng dạng "vế 1 <ngăn> vế 2" (ngăn bằng tab, phẩy, chấm phẩy, " - ", "::").', 'No lines shaped like "part 1 <separator> part 2" were found (separator: tab, comma, semicolon, " - ", "::").'],
    ['Không thấy thẻ <lesson> hay <quiz> nào trong nội dung.', 'No <lesson> or <quiz> tag was found in the content.'],
    ['PDF không có lớp chữ (file scan ảnh) — cần OCR trước.', 'This PDF has no text layer (scanned images) — it needs OCR first.'],
    ['Đang đọc', 'Reading'], ['Lỗi:', 'Error:'],
    // nhận diện
    ['văn bản thường (không theo định dạng)', 'plain text (no format)'], ['văn bản thường → cắt thành', 'plain text → split into'], ['thẻ vừa khung', 'cards that fit the frame'],
    ['văn bản thường → một thẻ có thanh cuộn', 'plain text → one scrollable card'], ['ghi chú có cấu trúc', 'structured notes'], ['câu điền từ tự tạo', 'auto-made fill-in questions'],
    ['các cặp Hỏi/Đáp', 'Q/A pairs'], ['bảng hỏi–đáp', 'Q&A table'], ['bài học chuẩn, giữ nguyên', 'native lesson, unchanged'], ['bài học chuẩn', 'native lesson'], ['thẻ từ', 'word cards'],
    ['Nhận diện:', 'Detected:'], ['đã tự sửa', 'auto-fixed'], ['lỗi định dạng', 'format issues'], ['cảnh báo', 'warnings'],
    ['thẻ bài học', 'lesson cards'], ['mốc cuối', 'last mark at'], ['cần video khoảng', 'needs a video of about'],
    // các lỗi đã sửa
    ['Đã tự sửa:', 'Auto-fixed:'], ['bỏ khối code ``` bọc ngoài bài', 'removed the ``` code fence around the lesson'], ['đổi &lt; &gt; thành < >', 'turned &lt; &gt; into < >'],
    ['đổi ngoặc ＜＞ toàn chiều rộng thành < >', 'turned full-width ＜＞ into < >'], ['đổi [lesson] / [quiz] thành <lesson> / <quiz>', 'turned [lesson] / [quiz] into <lesson> / <quiz>'],
    ['đổi thẻ <bài học> thành <lesson>', 'turned <bài học> tags into <lesson>'], ['đổi thẻ <câu hỏi> thành <quiz>', 'turned <câu hỏi> tags into <quiz>'],
    ['bỏ khoảng trắng thừa trong thẻ', 'removed stray spaces inside tags'], ['sửa thuộc tính thẻ (ngoặc kép cong, dấu ":" thay cho "=")', 'fixed tag attributes (curly quotes, ":" used instead of "=")'],
    ['thêm gạch đầu dòng cho đáp án "[x] ..."', 'added the leading dash to "[x] ..." answers'], ['đổi "(x)" thành "[x]"', 'turned "(x)" into "[x]"'],
    ['đổi dấu tích thành "- [x]"', 'turned check marks into "- [x]"'], ['đổi ô trống thành "- [ ]"', 'turned empty boxes into "- [ ]"'],
    ['đổi "Giải thích:" thành dòng ">"', 'turned "Explanation:" into a ">" line'], ['đổi đáp án A/B/C + "Đáp án: …" thành "- [x]"', 'turned A/B/C options + "Answer: …" into "- [x]"'],
    ['đổi "Đáp án: …" thành dòng "= …"', 'turned "Answer: …" into a "= …" line'], ['thẻ đóng — đã tự ngắt khối ở thẻ kế tiếp', 'closing tags — blocks were ended at the next tag'], ['thiếu', 'missing'],
    // cảnh báo của parser
    ['không đọc được mốc thời gian', 'unreadable timestamp'], ['không có đáp án "- [x]" hoặc "= ..." nên hiển thị như lesson', 'has no "- [x]" or "= ..." answer, so it is shown as a lesson'],
    ['chưa đánh dấu đáp án đúng [x]', 'no correct answer marked with [x]'], ['thiếu dòng "= đáp án"', 'missing the "= answer" line'],
    ['Không tìm thấy khối <lesson> hoặc <quiz> nào', 'No <lesson> or <quiz> block found'], ['Khối', 'Block'],
    // thanh đầu video
    ['đã thu nhỏ, ⏭ để xem tiếp', 'minimized, ⏭ to continue'], ['phần còn lại sang video sau', 'the rest continues in the next video'], ['đã học xong', 'completed'], ['đang ẩn', 'hidden'],
    // thư viện
    ['✓ đã học xong', '✓ completed'], ['khối · chưa học', 'blocks · not started'], ['đang học', 'current'], ['đã học', 'studied'], ['khối', 'blocks'],
    // tổng kết
    ['Làm lại câu sai', 'Retry missed'], ['sửa đúng', 'fixed'], ['câu khi làm lại', 'on retry'], ['câu đúng', 'correct'], ['bỏ qua', 'skipped'],
    ['khối chưa học', 'blocks left'], ['lược', 'deferred'], ['cho vừa video', 'to fit the video'], ['còn', 'still'],
    ['(làm lại: đúng ✓)', '(retry: correct ✓)'], ['(làm lại: chưa đúng)', '(retry: still wrong)'], ['(làm lại: đúng)', '(retry: correct)'],
    ['Bạn chọn:', 'You chose:'], ['Trả lời:', 'Answered:'], ['Đáp án:', 'Answer:'], ['Tự ẩn sau', 'Hides in'], ['Phím', 'Keys'],
    ['đã xem hết', 'finished'], ['chưa xem hết', 'not finished'], ['bài học đã xem', 'lessons viewed'], ['sai', 'missed'],
    ['Bộ màu', 'Theme'], ['Vị trí:', 'Position:'],
    ['Trên trái', 'top left'], ['Trên phải', 'top right'], ['Dưới trái', 'bottom left'], ['Dưới phải', 'bottom right'],
    ['Trên', 'top'], ['Dưới', 'bottom'], ['Trái', 'left'], ['Phải', 'right'], ['Giữa', 'center'],
    ['Màu viền chữ', 'Text outline color'], ['Màu bóng chữ', 'Text shadow color'], ['Màu viền khung', 'Border color'],
    ['Màu nền khung', 'Card background'], ['Màu nhấn', 'Accent color'], ['Màu chữ', 'Text color'],
    ['câu hỏi', 'questions'], ['bài học', 'lessons'], ['thẻ', 'cards'], ['mục', 'sections'], ['chữ', 'words'], ['file:', 'file:']
  ];
  const THEME_NAMES = { 'Đêm': 'Night', 'Kem': 'Cream', 'Rừng': 'Forest', 'Hồng': 'Pink', 'Tương phản': 'High contrast', 'Đại dương': 'Ocean', 'Hoàng hôn': 'Sunset', 'Tím than': 'Indigo' };
  Object.assign(EXACT, THEME_NAMES);
  Object.keys(THEME_NAMES).forEach((k) => { EXACT['Bộ màu ' + k] = THEME_NAMES[k] + ' theme'; });

  const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/;
  YTL.lang = 'vi';
  YTL.setLang = function (l) { YTL.lang = l === 'en' ? 'en' : 'vi'; };

  YTL.tr = function (s) {
    if (YTL.lang !== 'en' || !s) return s;
    const key = String(s).replace(/\s+/g, ' ').trim();
    if (!key) return s;
    if (EXACT[key] != null) { // giữ khoảng trắng đầu / cuối của chuỗi gốc
      const m = /^(\s*)[\s\S]*?(\s*)$/.exec(String(s));
      return m[1] + EXACT[key] + m[2];
    }
    if (!VI.test(key)) return s;
    let out = String(s);
    for (const [vi, en] of PHRASES) if (out.includes(vi)) out = out.split(vi).join(en);
    return out;
  };

  // Vùng nội dung của người dùng: không dịch.
  const USER = '.ytl-title, .ytl-lib-name, .ytl-review-q, .ytl-explain, .ytl-opt-text, .ytl-user, textarea, pre, code, #out, #src, #prompt, #lessonSelect, .ellipsis, .q';
  const CHROME_IN_BODY = '.ytl-verdict, .ytl-answer, .ytl-score-sub, .ytl-review-a, .ytl-hint, .ytl-input, .ytl-feedback > div';
  function skip(el) {
    if (!el || !el.closest) return true;
    if (el.closest('small') && el.closest('.q')) return false; // dòng phụ "Trả lời: …" trong trang kết quả
    if (el.closest(USER)) return true;
    const body = el.closest('.ytl-body');
    if (body && !el.closest(CHROME_IN_BODY) && !el.closest('.ytl-score, .ytl-review, .ytl-options')) return true;
    return false;
  }
  const ATTRS = ['title', 'placeholder', 'aria-label', 'label'];
  function trNode(n) {
    if (n.nodeType === 3) {
      const p = n.parentElement;
      if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName) || skip(p)) return;
      const t = YTL.tr(n.nodeValue);
      if (t !== n.nodeValue) n.nodeValue = t;
    } else if (n.nodeType === 1) {
      ATTRS.forEach((a) => {
        const v = n.getAttribute(a);
        if (v) { const t = YTL.tr(v); if (t !== v) n.setAttribute(a, t); }
      });
      if (n.tagName === 'TITLE') { const t = YTL.tr(n.textContent); if (t !== n.textContent) n.textContent = t; }
    }
  }
  YTL.localize = function (el) {
    if (YTL.lang !== 'en' || !el) return;
    trNode(el);
    const w = el.ownerDocument.createTreeWalker(el, 5); // SHOW_ELEMENT | SHOW_TEXT
    let n;
    while ((n = w.nextNode())) trNode(n);
  };
  // Dịch ngay và tiếp tục dịch mọi thứ được thêm sau đó.
  YTL.autoLocalize = function (el) {
    if (YTL.lang !== 'en' || !el) return null;
    YTL.localize(el);
    const mo = new MutationObserver((list) => {
      list.forEach((m) => {
        if (m.type === 'characterData') trNode(m.target);
        else if (m.type === 'attributes') trNode(m.target);
        else m.addedNodes.forEach((n) => { if (n.nodeType === 1) YTL.localize(n); else trNode(n); });
      });
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return mo;
  };

  YTL.AI_PROMPT_EN = [
    'Turn the content I send below into ONE markdown lesson file in exactly this format. Return only the file, no commentary.',
    '',
    'FORMAT',
    '- Start with front matter:',
    '  ---',
    '  title: Lesson title',
    '  ---',
    '- Each idea is one block: <lesson time="30s" title="Heading" priority="1"> markdown content </lesson>',
    '- Questions are <quiz> blocks. Three kinds:',
    '  * single answer: lines "- [x] right" and "- [ ] wrong" (exactly one [x])',
    '  * multiple answers: <quiz type="multi"> with two or more [x] lines',
    '  * type-in: <quiz type="input"> and one line "= answer | other accepted spelling"',
    '  Every quiz has one line starting with "> " that explains the answer. Do not use ">" inside the question.',
    '- Always close tags with </lesson> and </quiz>. No other HTML.',
    '',
    'CONTENT RULES',
    '- First block: <lesson time="5s" title="Intro" size="banner"> one introductory sentence </lesson>',
    '- One idea per block, under 80 words. Use **bold**, ==highlight==, {#ffd34d: colored text} for key terms; markdown tables for vocabulary.',
    '- After every 1-2 lessons add a <quiz> WITHOUT a time attribute (it appears right after the lesson). Mix all three question kinds.',
    '- Write time as 30s, 1m, 1m30s. Keep marks at least 30 seconds apart; the last one 30 seconds before the video ends.',
    '- priority: 1 = core, 2 = supporting, 3 = extra (deferred first when the video is short).',
    '- Keep the knowledge of the source; do not add ideas the source does not contain.',
    '',
    'Expected video length: [N] minutes.',
    '',
    'CONTENT TO CONVERT:',
    '[paste your content here]'
  ].join('\n');
  YTL.getPrompt = () => (YTL.lang === 'en' ? YTL.AI_PROMPT_EN : YTL.AI_PROMPT);

  root.YTL = YTL;
  if (typeof module !== 'undefined' && module.exports) module.exports = YTL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
