---
title: Python — list và vòng lặp
---

# Python — list và vòng lặp

Bài có khối code. Thẻ dài sẽ tự chọn cỡ lớn.

<lesson time="5s" title="Mở đầu" size="banner">
Bốn ý ngắn về **list** trong Python: tạo, duyệt, lọc, và viết gọn bằng *list comprehension*.
</lesson>

<lesson time="20s" title="Tạo list" priority="1">
## List là dãy có thứ tự

```
nums = [3, 1, 4]
nums.append(1)      # [3, 1, 4, 1]
print(len(nums))    # 4
print(nums[0])      # 3
```

Chỉ số bắt đầu từ ==0==. `nums[-1]` là phần tử cuối.
</lesson>

<quiz priority="1">
`nums = [10, 20, 30]` thì `nums[1]` là gì?
- [ ] 10
- [x] 20
- [ ] 30
- [ ] Lỗi
> Chỉ số bắt đầu từ 0 nên `nums[1]` là phần tử thứ hai: **20**.
</quiz>

<lesson time="1p10s" title="Duyệt bằng for" priority="1">
## Vòng lặp for

```
for n in [3, 1, 4]:
    print(n * 2)
```

In ra `6`, `2`, `8`. Cần cả vị trí thì dùng `enumerate`:

```
for i, n in enumerate(nums):
    print(i, n)
```
</lesson>

<quiz type="input" priority="1">
Hàm nào trả về số phần tử của một list? (chỉ gõ tên hàm)
= len | len()
> `len(nums)` trả về số phần tử.
</quiz>

<lesson time="2p10s" title="List comprehension" priority="2">
## Viết gọn trong một dòng

```
squares = [n * n for n in range(4)]
# [0, 1, 4, 9]

evens = [n for n in range(10) if n % 2 == 0]
# [0, 2, 4, 6, 8]
```

Mẫu chung: `[biểu_thức for biến in dãy if điều_kiện]`
</lesson>

<quiz priority="2">
`[x * 2 for x in range(3)]` cho kết quả nào?
- [ ] `[2, 4, 6]`
- [x] `[0, 2, 4]`
- [ ] `[0, 1, 2]`
- [ ] `[1, 2, 3]`
> `range(3)` là 0, 1, 2; nhân đôi thành **[0, 2, 4]**.
</quiz>

<lesson time="3p10s" title="Lỗi hay gặp" priority="3">
## Sửa list khi đang duyệt

Đừng xóa phần tử của list ngay trong vòng `for` duyệt chính nó — dễ bị ==bỏ sót==.

Cách an toàn: tạo list mới.

```
nums = [n for n in nums if n != 1]
```
</lesson>

<quiz type="multi" priority="3">
Chọn các phát biểu **đúng**:
- [x] `nums[-1]` là phần tử cuối
- [ ] Chỉ số list bắt đầu từ 1
- [x] `append` thêm phần tử vào cuối list
- [x] List comprehension có thể kèm điều kiện `if`
</quiz>
