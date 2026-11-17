---
title: Bài học chuẩn — đủ mọi tính năng
---

# Bài học chuẩn — đủ mọi tính năng

File mẫu cho định dạng chuẩn: mọi thuộc tính của khối và cả ba kiểu câu hỏi. Dùng làm khuôn khi tự viết bài.

<lesson time="5s" title="Dải thông báo (size=banner)" size="banner" priority="1">
Khối ngắn tự thành **dải** ở dưới. Ép cỡ bằng `size="banner"`, `size="card"` hoặc `size="full"`.
</lesson>

<lesson time="25s" title="Chữ: đậm, nghiêng, tô vàng, màu" priority="1">
- **đậm**, *nghiêng*, ~~gạch~~, `code`
- ==tô vàng== cho từ khóa
- màu chữ: {#7ee0a1: xanh}, {#ffd34d: vàng}, {tomato: đỏ cà chua}
- link: [ví dụ](https://example.com)
</lesson>

<quiz priority="1">
Câu hỏi **một đáp án**: cú pháp nào tô vàng chữ?
- [ ] **chữ**
- [x] ==chữ==
- [ ] ~~chữ~~
- [ ] *chữ*
> Hai dấu bằng mỗi bên: ==chữ==.
</quiz>

<lesson time="1p05s" title="Bảng và danh sách" priority="1">
| Thuộc tính | Ví dụ | Ý nghĩa |
|------------|-------|---------|
| `time` | `30s`, `1p30s`, `1:30` | mốc hiện |
| `priority` | `1`, `2`, `3` | 1 quan trọng nhất |
| `size` | `banner` `card` `full` | cỡ khung |

1. Khối có `time` mở một cụm
2. Khối không có `time` đi theo khối trước
</lesson>

<quiz type="multi" priority="1">
Câu hỏi **nhiều đáp án**: những cách viết `time` nào đúng?
- [x] 30s
- [x] 1p30s
- [x] 1:30
- [ ] ba mươi giây
> Nhận: 30s, 1p, 1p30s, 1m30, 1:30, 1h2p, hoặc số giây.
</quiz>

<lesson time="1p50s" title="Khối code" priority="2">
Ba dấu huyền mở và đóng khối code. Bên trong giữ nguyên khoảng trắng:

```
for n in [3, 1, 4]:
    print(n * 2)
```

Lưu ý: đừng viết chữ giống thẻ lesson / quiz trong nội dung, kể cả trong khối code.
</lesson>

<quiz type="input" priority="2">
Câu hỏi **điền chữ**: trong câu hỏi kiểu input, dòng đáp án bắt đầu bằng ký tự nào?
= = | dấu bằng | bằng
> Dòng `= đáp án | cách viết khác`. Dấu `|` ngăn các cách viết đều được chấp nhận.
</quiz>

<lesson time="2p30s" title="Màu và font riêng cho một thẻ" priority="2" bg="#3a1a10" color="#ffe2c4" font="serif" align="center" fontsize="120">
Thẻ này dùng `bg`, `color`, `font="serif"`, `align="center"` và `fontsize="120"`.

Nếu người học đã tự chọn font trong cài đặt thì font của họ được ưu tiên.
</lesson>

<lesson time="3p" title="Thẻ lớn (size=full)" size="full" priority="3">
## Khi nào dùng thẻ lớn

Nội dung dài thì tự chuyển sang thẻ lớn; phần vượt quá sẽ có **thanh cuộn**.

- `priority="3"` nghĩa là phần mở rộng: video ngắn thì khối này được chuyển sang video sau
- Thẻ lớn vẫn dời và đổi kích thước được như thẻ thường
- Mỗi thẻ nên giữ dưới khoảng 80 chữ để đọc kịp khi đang xem video
</lesson>

<quiz time="3p30s" priority="1">
Khối câu hỏi không có `time` sẽ hiện khi nào?
- [ ] Ở cuối video
- [x] Ngay sau khối đứng trước nó
- [ ] Không bao giờ
> Khối không có mốc luôn đi theo khối đứng ngay trước.
</quiz>
