# Chill Learn — bài học tương tác trên YouTube (Edge / Chrome)

Mở một video chill bất kỳ, bài học và quiz từ file `.md` của bạn hiện ngay trên video theo mốc thời gian.
Video chạy như hình nền, bạn đọc bài, trả lời câu hỏi, cuối video có bảng kết quả.
Extension chạy hoàn toàn bằng thuật toán trên máy bạn: không gọi AI, không gửi dữ liệu đi đâu.

## Cài vào Edge

1. Mở `edge://extensions`
2. Bật **Developer mode** (góc trái dưới)
3. Bấm **Load unpacked** và chọn thư mục này (`D:\Ext-Popup learning`)
4. Ghim biểu tượng Chill Learn lên thanh công cụ

## Dùng

1. Bấm biểu tượng extension → **Tải file .md** (hoặc **Nạp bài mẫu** để thử ngay)
2. Mở một video YouTube. Thanh nhỏ phía trên video cho biết bài đang dùng, tiến độ, điểm, mốc kế tiếp
3. Tới mốc thời gian, thẻ bài học / câu hỏi hiện trên video. `Enter` = nút chính, phím `1`–`9` = chọn đáp án
4. Cuối video hiện bảng kết quả, có nút **Làm lại câu sai**. Lịch sử đầy đủ nằm ở popup → **Xem chi tiết**

Hoạt động ở cả chế độ thường, rạp và toàn màn hình (nút ⛶ trên thanh nhỏ, hoặc nút của YouTube).
Nút 📂 trên thanh nhỏ cho phép tải bài ngay trên trang YouTube; nút ⏸ tạm ẩn bài học.

## Định dạng file bài học

```markdown
---
title: Tên bài học
---

<lesson time="5s" title="Tiêu đề thẻ">
Nội dung **markdown**.
</lesson>

<quiz>
Câu hỏi một đáp án?
- [ ] Sai
- [x] Đúng
> Giải thích hiện sau khi trả lời.
</quiz>

<quiz time="1p30s" type="multi">
Câu hỏi nhiều đáp án?
- [x] Đúng 1
- [x] Đúng 2
- [ ] Sai
</quiz>

<quiz time="2:10" type="input">
Câu hỏi điền chữ?
= đáp án | đáp án khác cũng đúng
</quiz>
```

### Mốc thời gian

`time="..."` nhận: `30s`, `1p`, `1p30s`, `1m30`, `1:30`, `1h2p`, `90` (giây).

Khối **không có** `time` sẽ hiện ngay sau khối trước đó khi người học bấm *Tiếp*.
Ví dụ một `<lesson time="20s">` rồi một `<quiz>` không có mốc: 20s hiện bài, bấm Tiếp thì hiện câu hỏi.

### Thuộc tính của khối

| Thuộc tính | Giá trị | Ý nghĩa |
|---|---|---|
| `time` | xem trên | mốc ước tính |
| `title` | chữ | tiêu đề thẻ |
| `size` | `banner` / `card` / `full` | dải dưới / thẻ giữa / phủ kín video. Bỏ trống thì tự chọn theo độ dài nội dung |
| `priority` | `1`, `2`, `3`… | số nhỏ = quan trọng hơn (mặc định 2). Dùng khi video ngắn hơn bài |
| `type` (quiz) | `single` / `multi` / `input` | bỏ trống thì tự đoán |
| `color`, `bg` | màu (`#ffcc00`, `tomato`) | màu chữ, màu nền riêng cho thẻ |
| `font` | `serif`, `mono`, `hand`, `rounded`, `jp` hoặc tên font | font riêng cho thẻ |
| `align` | `left` / `center` / `right` | căn lề |
| `fontsize` | `50`–`300` | cỡ chữ theo % |

### Markdown hỗ trợ

Tiêu đề `#`–`####`, **đậm**, *nghiêng*, `code`, ~~gạch~~, `==tô vàng==`, màu chữ `{red: chữ}` hoặc `{#7ee0a1: chữ}`,
danh sách, trích dẫn `>`, bảng `| a | b |`, khối code ba dấu `` ` ``, đường kẻ `---`, link và ảnh `https://`.

Trong `<quiz>`: dòng `- [x]` / `- [ ]` là đáp án, dòng `= ...` là đáp án điền chữ, dòng `>` là giải thích.

## Tối ưu theo độ dài video

Không cần học hết file. Khi video được mở, extension xếp lại lịch:

- **Video đủ dài**: giữ nguyên mốc trong file (hoặc giãn đều cả video nếu chọn *Giãn đều*)
- **Video ngắn hơn bài**: ước lượng thời gian mỗi cụm (theo số chữ / số đáp án), chọn các cụm theo `priority`
  cho vừa thời lượng, rồi co mốc theo tỉ lệ và giữ khoảng cách tối thiểu. Quiz không có mốc luôn đi cùng bài học đứng trước nó
- Khi bạn tua tới, các mốc đã qua vẫn lần lượt hiện theo thứ tự nên không mất bài; bấm ⏭ (phím `]`) để bỏ qua, ⏮ (phím `[`) để xem lại bài trước
- Kéo phần đầu khung để dời vị trí (nhấp đúp để về chỗ cũ); kiểu khung *Chỉ viền* cho nền trong suốt hoàn toàn
- Kéo núm ở góc dưới phải của khung để đổi rộng / cao (nhấp đúp núm để về mặc định)
- Trong lúc YouTube chạy quảng cáo, bài học đứng yên

## Tiến độ đi theo bài học, không theo video

- Sang video khác (tự phát tiếp, bấm video gợi ý, playlist) hay tải lại trang: thẻ đang mở hiện lại, phần chưa học được xếp lịch lại trên video mới
- Video hết mà bài chưa hết thì không chặn gì: phần còn lại tiếp tục ở video sau. Video ngắn sẽ ưu tiên các cụm `priority` nhỏ trước
- Học hết cả bài mới hiện bảng kết quả. Sau đó thanh đầu video báo *đã học xong* và không tự phát lại; muốn học lại thì chọn **↻ Học lại bài này từ đầu**
- Mỗi bài giữ tiến độ riêng: đổi sang bài khác rồi quay lại vẫn học tiếp chỗ cũ. Nạp lại file có nội dung khác thì bài đó bắt đầu lại
- Bấm tên bài trên thanh đầu video (hoặc ☰) để mở danh sách bài, đổi bài, nạp file, **nạp cả thư mục**, xem kết quả giữa chừng

## Tính năng khác

- Font, cỡ chữ, màu chữ, màu nền thẻ, độ trong suốt, độ tối của video khi hiện thẻ
- **Tự chuyển thẻ** (mặc định bật): mỗi thẻ có đồng hồ đếm ngược theo thời gian video, hết giờ tự sang thẻ kế, câu hỏi chưa trả lời tính là bỏ qua. Tắt trong popup nếu muốn tự bấm *Tiếp*
- **Tiếp ▶** hiện ngay khối kế tiếp (không chờ mốc, không tua video); nút **–** thu nhỏ: ẩn thẻ và chờ tới mốc của bài kế; trả lời đúng thì câu hỏi tự ẩn sau 5 giây
- **Thư viện bài học** (bấm tên bài trên thanh đầu video): tiến độ từng bài, chuyển bài, xóa bài (bấm 🗑 hai lần), tải file, nạp thư mục, tạo bài
- Bấm vào đồng hồ ⏱ trên khung để tạm dừng / chạy lại việc tự chuyển thẻ
- **Cài đặt ngay trong trình phát**: nút quyển sách trên thanh điều khiển của YouTube (hoặc ⚙ trên thanh đầu video) mở bảng chỉnh cỡ chữ, rộng/cao khung, vị trí 9 ô, bảng màu nhanh, màu chữ / nền / nhấn, kiểu khung, độ đặc nền, độ dày viền, bo góc, độ tối video, font
- **Chế độ thường và toàn màn hình có bộ kích thước riêng**: cỡ chữ, rộng/cao và vị trí khung chỉnh ở chế độ nào thì lưu cho chế độ đó (toàn màn hình chưa chỉnh thì dùng giá trị chế độ thường). Màu sắc và kiểu khung dùng chung
- Nút ✕ ngay trong khung để ẩn bài học; bật lại bằng nút ▶ trên thanh đầu video
- Tùy chọn tạm dừng video khi có câu hỏi, trộn đáp án
- Vạch mốc trên thanh tiến trình của YouTube (trắng = bài học, vàng = có câu hỏi)
- Thư viện nhiều bài học, đổi bài trong popup
- Trang kết quả: lịch sử phiên, tỉ lệ đúng, câu hay sai nhất, xuất JSON

## Nhập từ định dạng khác (không cần AI)

Ngoài file bài học chuẩn, extension tự chuyển các kiểu nội dung sau thành bài học, theo cách các công cụ flashcard vẫn nhận dữ liệu (mỗi dòng một thẻ, hai vế ngăn bằng tab / dấu phẩy / chấm phẩy):

| Nội dung | Ví dụ | Thành |
|---|---|---|
| Flashcard `.csv` `.tsv` hoặc dán | `cat, con mèo` · `cat - con mèo` · `cat :: con mèo` | bảng từ theo nhóm + câu hỏi nghĩa xuôi / ngược / gõ lại |
| Bảng hỏi–đáp có tiêu đề | `question;answer;wrong1;wrong2;explain` | câu chọn đáp án, hoặc điền chữ nếu không có đáp án sai |
| Hỏi / Đáp từng dòng | `Q: …` / `A: …` | câu điền chữ |
| Ghi chú `.txt` `.md`, PDF | mục theo tiêu đề, "Đáp án: B" | thẻ bài học; mục có đáp án thành câu hỏi; chữ **in đậm** thành câu điền từ |
| Cloze của Anki | `{{c1::Paris}}` | thẻ tô vàng + câu điền chỗ trống |

**Theo định dạng hay không theo định dạng**

- Bài *gần đúng* định dạng được tự sửa và báo lại đã sửa gì: bọc trong khối code, thẻ `[lesson]` / `&lt;lesson&gt;` / `<bài học>`, ngoặc kép cong, `time: 30s`, đáp án `[x] …` thiếu gạch đầu dòng, dấu ✅ ❌, đáp án A/B/C kèm "Đáp án: B", "Giải thích: …", thiếu thẻ đóng
- Văn bản thường (không theo định dạng nào) có hai cách: **cắt thành nhiều thẻ vừa khung** (theo câu, mặc định 55 chữ mỗi thẻ) hoặc **một thẻ lớn có thanh cuộn**
- Nhận diện sai thì chọn lại ở ô *Kiểu nội dung* trên trang nhập đầy đủ

Ba chỗ để nhập:

- **Trong trình phát**: nút quyển sách → tab **Tạo bài học**: hướng dẫn 3 bước, nút chép prompt chuẩn cho AI, ô dán nội dung, nhập là chạy ngay trên video
- **Trang nhập đầy đủ** (popup → *Tạo / chuyển đổi bài học*): kéo thả file kể cả **PDF**, xem trước và sửa trước khi lưu, nhập nhiều file một lượt
- **Các nút tải file / nạp thư mục**: nhận thêm `.csv`, `.tsv`, `.txt` và tự chuyển

PDF được đọc bằng pdf.js (Mozilla, Apache 2.0) đóng gói sẵn trong `lib/`, chạy tại chỗ. PDF scan ảnh không có lớp chữ thì không đọc được.

## Bài mẫu

Popup → **Nạp bài mẫu…** chia ba nhóm, file nằm trong `samples/`:

| Nhóm | File | Dùng để |
|---|---|---|
| Hướng dẫn và bài chuẩn | `huong-dan-su-dung.md`, `user-guide-en.md` | bài hướng dẫn dùng chính extension (Việt / Anh), nên nạp đầu tiên |
| | `bai-hoc-chuan.md` | khuôn mẫu định dạng chuẩn: mọi thuộc tính và cả ba kiểu câu hỏi |
| | `demo-nhanh-1-phut.md` | thử nhanh trong một phút |
| Thử từng kiểu đầu vào | `flashcard.csv`, `flashcard-cap-tu.txt` | flashcard dạng bảng và dạng "từ - nghĩa" |
| | `hoi-dap.csv`, `hoi-dap-qa.txt` | bảng hỏi–đáp và các cặp Q:/A: |
| | `ghi-chu.md`, `van-ban-thuong.txt`, `cloze-anki.txt` | ghi chú có tiêu đề, văn bản thường, cloze của Anki |
| | `gan-dung-dinh-dang.md` | bài cố ý viết lệch cú pháp để xem tính năng tự sửa |
| Bài theo chủ đề | tiếng Anh, tiếng Nhật, Python, Hệ Mặt Trời, kỹ năng học | bài học thật để học thử |

## Ngôn ngữ giao diện

Tiếng Việt hoặc English: chọn ở góc trên popup hoặc dòng đầu của bảng cài đặt trên video. Nội dung bài học không bị dịch.

## Soạn / chuyển đổi bài học bằng Claude Code

Skill `chill-learn-lesson` đã cài global (`~/.claude/skills/chill-learn-lesson/`). Mở Claude Code ở thư mục bất kỳ rồi nói, ví dụ: *"tạo bài học về thì hiện tại đơn cho video 10 phút"* hoặc *"convert file ghi-chu.md sang chuẩn bài học"*. Hai script đi kèm chạy được độc lập, không cần AI:

```bash
node ~/.claude/skills/chill-learn-lesson/convert.js ghi-chu.md --duration 10p --out lessons/ghi-chu.md
```

```bash
node ~/.claude/skills/chill-learn-lesson/validate.js lessons/ghi-chu.md 600
```

## Prompt mẫu để nhờ AI soạn file bài học

```text
Soạn bài học về [CHỦ ĐỀ] cho video dài khoảng [N] phút theo đúng định dạng sau, chỉ trả về file markdown:
- Mở đầu bằng frontmatter: --- title: ... ---
- Mỗi ý là một khối <lesson time="..." title="..." priority="1|2|3"> ... </lesson>, nội dung markdown ngắn gọn
  (dưới 80 chữ), dùng **đậm**, ==tô vàng==, {#ffd34d: màu} cho từ khóa.
- Sau mỗi 1-2 lesson có một <quiz> KHÔNG có time (để hiện ngay sau lesson). Ba kiểu:
  một đáp án (- [x] / - [ ]), nhiều đáp án (type="multi"), điền chữ (type="input", dòng "= đáp án | đáp án khác").
  Mỗi quiz có dòng "> giải thích".
- time viết kiểu 30s, 1p, 1p30s; các mốc cách nhau ít nhất 30 giây, mốc cuối trước khi hết video 30 giây.
- priority 1 cho ý cốt lõi, 3 cho phần mở rộng (sẽ bị lược khi video ngắn).
```

## Thử không cần YouTube

```bash
node dev/server.js
```

Rồi mở `http://localhost:5178/dev/harness.html`: một trình phát giả lập để xem trước bài học và chỉnh giao diện.
