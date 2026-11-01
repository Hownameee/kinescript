# Đề xuất: kênh video 3D giải thích cơ khí làm bằng dây chuyền tự động

Cập nhật: 31/10/2026 · Tài liệu liên quan: [market-landscape.md](market-landscape.md) · [technical-approach.md](technical-approach.md) · [critique.md](critique.md) (phản biện)

## 1. Tóm tắt

Video 3D giải thích "máy móc hoạt động thế nào" có lượng xem lớn nhưng làm rất tốn công: kênh lớn nhất thế giới mất 20–100 giờ cho mỗi video. Đề xuất này xây một **kênh Shorts tiếng Việt về cơ khí đời thường** (xe máy, xe tay ga…), sản xuất bằng một **dây chuyền dựng video bằng code**. Trên dây chuyền này, với chủ đề đã có thư viện, làm một video chỉ còn là **viết kịch bản JSON**: AI viết được, máy kiểm tra cơ khí, tự đọc lời, tự canh nhạc, render chưa tới 1 phút.

Dây chuyền **đã chạy được** với 2 chủ đề (hộp số CVT, động cơ 4 kỳ) và ra 3 video hoàn chỉnh. Bước tiếp theo không phải là thêm tính năng, mà là **kiểm chứng thị trường**: đăng 20 Shorts trong 4 tuần, đo theo các độ đo và tiêu chí dừng đã chốt trước.

### Ý tưởng cốt lõi

> **Dây chuyền làm video giải thích cơ khí, trong đó AI chỉ viết kịch bản ở mức ý đồ, còn tính đúng của chuyển động được bảo đảm bằng mô hình cơ cấu trong code và bộ kiểm tra tự động.**

Kịch bản chỉ nói "quay tới kỳ nổ" (`"drive": { "crank": { "to": 1980 } }`); vị trí piston, góc thanh truyền, độ nâng xupap, màu khí… đều do mô hình cơ cấu tính từ **một biến điều khiển** (góc trục khuỷu, tiến độ sang số). AI có thể viết sai, nhưng không thể ra video sai: lỗi bị chặn ở bước kiểm tra.

Không kỹ thuật riêng lẻ nào là mới — điểm mới là **cách ghép**:

| Thành phần | Đã có ở đâu | Thiếu gì |
|---|---|---|
| Ràng buộc cơ khí → chuyển động 3D | CAD (SolidWorks Motion), game engine, demo Three.js làm tay | Không kể chuyện, không ra video hàng loạt |
| JSON → component → render | Remotion, HyperFrames, tool video template | Không hiểu cơ khí; dữ liệu sai vẫn ra video |
| Kể chuyện tự động bằng AI | AI sinh video (Sora, Veo) | Sai vật lý, không kiểm chứng được |
| **Ghép cả ba + kiểm tra cơ khí và ngữ nghĩa ở giữa + canh giờ theo lời đọc** | Chưa thấy | — |

## 2. Vấn đề

| Ai | Vấn đề |
|---|---|
| Người làm nội dung | Video 3D cơ khí phải làm tay bằng Blender (20–100 giờ / video) hoặc thuê đội animator; sửa một chi tiết là làm lại. AI sinh video thì sai vật lý cơ khí; công cụ CAD (Composer, KeyShot) bắt buộc có CAD và không biết kể chuyện |
| Người xem Việt | Gần như không có video 3D giải thích chính chiếc xe mình đang đi, bằng tiếng Việt, có số liệu (vòng tua, tỉ số truyền…) |

Chi tiết thị trường và đối thủ: [market-landscape.md](market-landscape.md).

## 3. Giải pháp

**Dây chuyền dựng video bằng code**, gồm 5 lớp (chi tiết: [technical-approach.md](technical-approach.md)):

1. **Bộ phận tham số**: puli, dây đai, piston, xupap, cam… sinh từ thông số, không cần CAD, không vướng bản quyền model.
2. **Cơ cấu đúng cơ khí**: chuyển động tính từ công thức thật (chiều dài dây không đổi, tay quay – thanh truyền, biên dạng cam).
3. **Hiệu ứng giải thích**: cắt lớp, highlight, mũi tên lực, X-ray.
4. **Kịch bản JSON**: lời đọc + cảnh + hiệu ứng. Công cụ build tự đọc lời, canh giờ theo lời đọc và phách nhạc, **kiểm tra schema và cơ khí trước khi render**.
5. **Render** bằng HyperFrames: hình + phụ đề + bảng số liệu + lời đọc + nhạc nền.

**Định vị:** kênh nội dung trước, dây chuyền là công cụ nội bộ. Phong cách **dễ hiểu, không cần giống thật** (như Jared Owen).

## 4. Đã làm được (bằng chứng)

| Hạng mục | Kết quả |
|---|---|
| Video | `cvt-short` (59,4 s), `vi-sao-may-gao` (28,8 s, **kịch bản do AI viết từ đề bài**, qua kiểm tra ngay lần đầu), `engine-short` (59,4 s) |
| Tốc độ | Build (TTS + nhạc + canh giờ) ~6 s; render video 60 s ~30 s; sửa một lỗi ~1 phút |
| Độ đúng | CVT: dây không giãn ở mọi trạng thái, tỉ số 1,97 → 0,81 khớp xe thật. Động cơ: 109,2 cc, tỉ số nén 9,0, xupap không va piston (khe hở nhỏ nhất 6,8 mm) |
| Kiểm tra tự động | Bắt được lỗi cơ khí thật trong kịch bản (bi văng còn văng ra khi vòng tua đã dưới 4.000), tên cảnh / hiệu ứng không tồn tại, hiệu ứng không khớp chuyển động |
| Dùng lại | Chủ đề thứ hai (động cơ) chỉ viết mới ~735 dòng (bộ phận, cơ cấu, từ vựng, HUD); toàn bộ phần dựng, lời đọc, nhạc, kiểm tra dùng lại nguyên |

## 5. Giá trị mang lại

| Cho ai | Giá trị | Mức chắc chắn |
|---|---|---|
| Kênh (mình) | Chi phí mỗi video từ hàng chục giờ xuống ~1 giờ → 5–10 Shorts / tuần; ra video theo tin tức trong 1–2 ngày | Cao (đã đo một phần) |
| Người xem | Hiểu nguyên lý chiếc xe mình đi, bằng tiếng Việt, có số liệu trực quan | **Chưa kiểm chứng** |
| Giáo dục / B2B (sau này) | Video bài giảng cơ khí, video giải thích sản phẩm / lỗi hỏng theo yêu cầu | Giả thuyết |

## 6. Kế hoạch kiểm chứng (4 tuần)

**Giả định cần kiểm chứng nhất:** người Việt muốn xem Shorts 3D giải thích cơ khí đời thường.

| Tuần | Việc | Đầu ra |
|---|---|---|
| 0 | Chốt cụm chủ đề "xe máy": CVT, động cơ 4 kỳ + 1–2 chủ đề mới cùng cụm (ly hợp, phanh, bugi / đánh lửa). Chốt baseline, độ đo, tiêu chí dừng. Quyết định giọng đọc cho đợt thử ([critique.md](critique.md) §4) | Danh sách 20 đề bài, bảng theo dõi |
| 1–2 | Đăng 10 Shorts (~5 / tuần); mỗi video ghi giờ công thực tế | 10 video, số liệu Studio sau 7 ngày mỗi video |
| 2 | Bài test mức hiểu bài: 20–30 người, trắc nghiệm trước / sau | Điểm hiểu bài so với video đối chứng |
| 3–4 | Đăng 10 Shorts tiếp, chia cặp A/B (có / không HUD; 2 kiểu hook) | So sánh theo cặp |
| Cuối tuần 4 | Đánh giá theo tiêu chí ở §7 | Quyết định: tiếp tục / đổi hướng / dừng |

## 7. Độ đo và tiêu chí

| Trục | Độ đo | Baseline | Mục tiêu đợt thử |
|---|---|---|---|
| Sản xuất | Giờ công / video (đề bài → file cuối, gồm xem lại) | Làm tay 20–100 giờ | ≤ 2 giờ trung bình |
| Độ đúng | Lỗi cơ khí / video (người rành kỹ thuật chấm theo checklist) | Video AI sinh cùng đề bài | 0 lỗi nghiêm trọng |
| Hiểu bài | Điểm trắc nghiệm tăng sau khi xem | Video YouTube cùng chủ đề; bài đọc chữ | Không kém video đối chứng |
| Thị trường | Viewed vs swiped away | Trung bình kênh | ≥ 60% |
| Thị trường | % thời lượng được xem trung bình | Trung bình kênh | ≥ 70% |
| Thị trường | Lượt chia sẻ + lưu / 1.000 view; sub / 1.000 view | Trung bình kênh 10 video đầu | Tăng dần qua các đợt |

**Tiêu chí dừng / đổi hướng** (chốt trước, không đổi giữa chừng): sau 20 Shorts và 4 tuần, nếu viewed vs swiped < 50% **và** không video nào vượt 10.000 view → đổi chủ đề / định dạng hoặc chuyển hướng B2B.

## 8. Nguồn lực

| Hạng mục | Cần |
|---|---|
| Người | 1 người viết đề bài, duyệt kịch bản, xem lại video, đăng và theo dõi số liệu (~1–2 giờ / video) + thời gian viết chủ đề mới (~1–2 ngày / chủ đề, có AI hỗ trợ) |
| Máy | Máy Mac có GPU (render bằng GPU, giọng đọc `say` chạy trên macOS) |
| Chi phí | Gần như 0 ở hiện tại (nhạc tự sinh, giọng macOS, thư viện mã nguồn mở). Nếu nâng giọng đọc: chi phí dịch vụ TTS theo số ký tự |
| Người chấm | 1 người rành kỹ thuật xe máy (chấm độ đúng); 20–30 người cho bài test hiểu bài |

## 9. Rủi ro chính

Tóm tắt; phân tích đầy đủ ở [critique.md](critique.md).

| Rủi ro | Hướng xử lý |
|---|---|
| Không có cầu (người xem không quan tâm) | Kiểm chứng sớm, rẻ (§6), có tiêu chí dừng |
| Giọng đọc máy móc làm người xem lướt qua | Quyết định giọng đọc trước đợt thử |
| Mỗi chủ đề mới tốn code | Chọn chủ đề theo cụm để dùng lại bộ phận |
| Nội dung na ná nhau → chính sách "inauthentic content" của YouTube | Mỗi video một insight riêng, đa dạng góc máy và cấu trúc kể |
| Dễ bị sao chép | Hào bảo vệ là độ rộng thư viện, tốc độ ra video và khán giả tích luỹ, không phải công nghệ |

## 10. Đề nghị

1. **Dừng phát triển tính năng**, chuyển sang kiểm chứng thị trường theo §6.
2. Chốt danh sách 20 đề bài cụm "xe máy" và quyết định giọng đọc trước khi đăng.
3. Sau 4 tuần, ra quyết định dựa trên số liệu §7.
