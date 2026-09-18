# Nhớ Vui

Ứng dụng luyện trí nhớ hằng ngày cho người sa sút trí tuệ (sa sút trí nhớ), từ mức nhẹ đến nặng.
Chạy được trên trình duyệt và dưới dạng ứng dụng Android.

Toàn bộ dữ liệu — tiến trình, ảnh người thân, nhật ký hồi tưởng, bản ghi âm — **chỉ nằm
trong máy người dùng**. Ứng dụng không gửi gì lên mạng và không xin quyền truy cập mạng.

## Nguyên tắc lâm sàng

| Nguyên tắc | Cách hiện thực |
|---|---|
| Định hướng thực tại | Trang chính luôn hiện thứ, ngày, tháng, mùa, buổi |
| Học không lỗi (errorless learning) | Không bao giờ hiện chữ "Sai". Sau 2 lần chưa đúng, đáp án tự hiện ra để người bệnh nhắc lại |
| Kích thích nhận thức đa lĩnh vực | 15 bài phủ trí nhớ, chú ý, ngôn ngữ, gọi tên, phân loại, tính toán, vận động |
| Trí nhớ xa bền nhất | Ca dao tục ngữ, món ăn, chợ quê, địa danh — nội dung theo vùng miền |
| Liệu pháp hồi tưởng | Câu hỏi mở, không chấm điểm, ghi lại bằng chữ hoặc ghi âm giọng kể |
| Không gây áp lực | Không đếm ngược, không giới hạn thời gian, không xếp hạng trước mặt người bệnh |
| Giác quan người cao tuổi | Chữ lớn chỉnh được, tương phản cao, nút cao tối thiểu 72px, có giọng đọc tiếng Việt |

Ba mức độ: **Nhẹ** (5 bài/ngày, 4 lựa chọn) · **Trung bình** (4 bài, 3 lựa chọn) ·
**Nặng** (3 bài ngắn, 2 lựa chọn).

Nội dung theo vùng: **Bắc Bộ · Trung Bộ · Nam Bộ**, cùng gói riêng cấp tỉnh cho **Long An**
(ca dao, món ăn, chợ, địa danh, câu hỏi hồi tưởng).

## Cấu trúc

```
src/nho-vui.html     mã nguồn duy nhất của ứng dụng (một file, không phụ thuộc gì)
tools/build.mjs      dựng ra hai bản đích và tự kiểm tra
www/index.html       bản web độc lập — mở bằng trình duyệt hoặc đưa lên https
android/             dự án Android bọc trang web thành APK
```

Sửa xong `src/nho-vui.html` thì chạy:

```bash
node tools/build.mjs
```

Lệnh này sinh `www/index.html` và `android/app/src/main/assets/index.html`, đồng thời kiểm
lại những lỗi từng gặp: thiếu `<meta charset>` (tiếng Việt thành ký tự lạ), thiếu thẻ
viewport (trang bày theo khổ máy tính), và lỗi cú pháp JavaScript.

## Dựng APK

Cần Android SDK (platform API 36, build-tools) và JDK 17 trở lên.

```bash
cd android
./gradlew assembleDebug
```

APK nằm ở `android/app/build/outputs/apk/debug/app-debug.apk`.

Bản debug ký bằng khoá debug sẵn có, cài được ngay bằng cách bật "Cài ứng dụng không rõ
nguồn gốc". Muốn phát hành thì cần tạo keystore riêng và dùng `assembleRelease`.

## Vì sao phải có APK

Ghi âm giọng kể cần `getUserMedia`, mà API này chỉ chạy trong **ngữ cảnh an toàn**:

- Mở file HTML trực tiếp trên điện thoại (`file://`) → Chrome Android **khoá micro và không
  hiện cửa sổ hỏi quyền**. Không có cách lập trình nào vượt qua.
- Mở trong khung nhúng không được cấp quyền → cũng bị chặn, cài đặt Chrome không sửa được.

Ứng dụng Android giải quyết bằng `WebViewAssetLoader`: trang được phục vụ qua
`https://appassets.androidplatform.net/` — một gốc https hợp lệ — nên `getUserMedia` hoạt
động bình thường, và quyền micro do chính ứng dụng xin qua `RECORD_AUDIO`.

Bản web vẫn giữ đường vòng cho trường hợp micro bị khoá: nút **"Ghi bằng ứng dụng của máy"**
mở ứng dụng ghi âm sẵn có của điện thoại rồi nhận tệp về, không cần quyền micro.

## Giới hạn

Luyện tập nhận thức **làm chậm suy giảm chức năng và cải thiện tâm trạng, không đảo ngược
bệnh lý**. Vẫn cần khám định kỳ, dùng thuốc theo chỉ định, kiểm soát huyết áp và đường
huyết, vận động, ngủ đủ và duy trì giao tiếp xã hội.

Mức độ trong ứng dụng chỉ là thang điều chỉnh độ khó, không thay thế đánh giá MMSE/MoCA.

Tên huyện, tên chợ trong gói vùng miền dùng theo cách gọi quen thuộc ngày trước — đó là
những tên người bệnh còn nhớ, dù địa giới hành chính nay đã thay đổi.
