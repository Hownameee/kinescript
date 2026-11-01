# Phản biện ý tưởng

Cập nhật: 31/10/2026 · Phản biện cho: [proposal.md](proposal.md)

Tài liệu này cố tình tìm điểm yếu của ý tưởng, theo 5 câu hỏi: (1) đã có ai làm chưa, (2) điểm yếu của họ và mình có hơn không, (3) làm thì giúp được gì, (4) điểm yếu của mình và có khắc phục được không, (5) baseline và độ đo.

## 1. Đã có ai làm chưa?

**Từng mảnh có rất nhiều; kết hợp đúng như mình làm thì chưa thấy.**

| Mảnh | Đã có |
|---|---|
| Video 3D giải thích cơ khí | Jared Owen, Lesics, Animagraffs, Branch Education (làm tay bằng Blender) |
| Dựng video bằng code | Remotion, HyperFrames (motion graphics, không có thư viện cơ khí) |
| AI sinh video | Sora, Veo, Kling (sai vật lý cơ khí) |
| Animation từ CAD | SOLIDWORKS Composer, Cadasio, KeyShot (B2B, cần CAD) |
| Xưởng Shorts tự động | Rất nhiều kênh faceless dùng footage có sẵn + giọng AI |

Chưa thấy: **thư viện cơ khí tham số + chuyển động đúng cơ khí + kịch bản AI viết có kiểm tra cơ khí tự động + video có lời đọc**.

**Phản biện:**
- **Kỹ thuật cốt lõi không mới.** "Ràng buộc cơ khí bằng code rồi áp lên 3D" đã có từ lâu: CAD (ràng buộc lắp ghép, mô phỏng chuyển động — chính xác hơn mình), game engine / robot (URDF, khớp nối), demo Three.js cơ khí làm tay (máy làm kem PYC), nghiên cứu suy chuyển động từ CAD (Mitra et al., SIGGRAPH 2010). Điểm mới chỉ nằm ở **cách ghép**: đặt mô hình cơ cấu + bộ kiểm tra vào giữa AI viết kịch bản và video, để AI viết sai cũng không ra video sai.
- Research mới ở mức vài chục lượt tìm kiếm; chưa đào kỹ Douyin, Bilibili, các studio làm video đào tạo kỹ thuật. "Chưa thấy" ≠ "chưa có".
- **Không có rào cản kỹ thuật**: dây chuyền này dựng được trong khoảng một ngày với trợ lý AI lập trình — người khác cũng làm được. Công nghệ không phải hào bảo vệ.

## 2. Điểm yếu của đối thủ — mình có hơn thật không?

| Điểm yếu của họ | Mình hơn? |
|---|---|
| Chậm (20–100 giờ / video) | **Có** — chủ đề đã có thư viện: vài phút tới ~1 giờ |
| Sai cơ khí (AI sinh video) | **Có**, kiểm chứng được — chuyển động tính từ công thức + bộ kiểm tra |
| Ít nội dung tiếng Việt / chủ đề địa phương | **Có** — nhưng là lợi thế chọn chủ đề, không phải công nghệ |
| Thiếu số liệu trên hình | **Có** — HUD, biểu đồ |
| **Chất lượng hình và kể chuyện** | **Không** — hiện kém Jared Owen về độ trau chuốt, nhịp kể, giọng đọc |

Mình hơn về **tốc độ, độ đúng, chủ đề ngách**; đang **thua về chất lượng cảm nhận** — thứ quyết định người xem có lướt qua trong 3 giây đầu của Shorts hay không.

## 3. Làm thì giúp được gì?

| Cho ai | Giá trị | Mức chắc chắn |
|---|---|---|
| Mình | Chi phí / video giảm mạnh → 5–10 Shorts / tuần | Cao |
| Người xem Việt | Hiểu chiếc xe mình đi, tiếng Việt, có số liệu | **Chưa biết họ có muốn xem** |
| Giáo viên, trường nghề | Video / bản tuỳ biến cho bài giảng | Giả thuyết, chưa hỏi ai |
| Garage, hãng phụ tùng | Video giải thích sản phẩm / lỗi hỏng | Giả thuyết |

**Phản biện lớn nhất:** đã chứng minh **phía cung** (làm nhanh, đúng); **chưa có bằng chứng nào về phía cầu**. Rủi ro lớn nhất hiện tại là thị trường, không phải kỹ thuật. Tiếp tục làm tính năng lúc này là tối ưu sai chỗ.

## 4. Điểm yếu của mình — khắc phục được không?

| Điểm yếu | Mức | Khắc phục |
|---|---|---|
| **Giọng đọc macOS máy móc** | **Rất cao** — người xem lướt qua ngay; làm sai lệch mọi thử nghiệm đo người xem (đo ra "giọng tệ" chứ không đo được ý tưởng) | Được (TTS chất lượng cao hoặc thu giọng thật). Bước này đã bị bỏ khỏi lộ trình — **đề nghị xem lại, ít nhất cho đợt thử** |
| Mỗi chủ đề mới tốn code (~700 dòng, 1–2 ngày) | Cao | Chọn chủ đề **theo cụm** để dùng lại bộ phận (xe máy: CVT, động cơ, ly hợp, phanh, phun xăng); AI viết module chủ đề, bộ kiểm tra cơ khí làm lưới an toàn |
| **Ràng buộc là công thức viết tay cho từng cơ cấu** (tay quay – thanh truyền, chiều dài dây CVT), không phải bộ giải ràng buộc tổng quát như CAD | Cao khi muốn mở rộng lên hàng chục / trăm chủ đề | Ưu điểm hiện tại: đơn giản, chính xác, dễ kiểm tra — đủ cho đợt thử 20 video. Khi cần mở rộng: xây **bộ giải ràng buộc tổng quát** (khai báo khớp quay, khớp trượt, ăn khớp, dây đai → máy tự giải), để AI khai báo cơ cấu mới thay vì người viết công thức |
| Hình realtime kém Blender | Trung bình | Cải thiện ánh sáng, vật liệu, hậu kỳ; phong cách đơn giản hoá vốn không cần giống thật |
| Giản lược kỹ thuật (2 trục cam, chưa có xích cam…) | Trung bình | Người xem rành kỹ thuật sẽ bắt lỗi → ghi rõ "mô hình giản lược" hoặc dựng đúng hơn cho cụm xe máy |
| Video na ná nhau → chính sách "inauthentic content" | Trung bình → cao khi ra số lượng lớn | Đa dạng góc máy, cấu trúc kể, chủ đề; mỗi video một insight riêng |
| Dễ bị sao chép | Cao về lâu dài | Hào bảo vệ: độ rộng thư viện, tốc độ ra video theo tin tức, khán giả tích luỹ |
| Hook / kịch bản vẫn phụ thuộc người hoặc AI viết | Trung bình | Dùng số liệu các video đã đăng để cải thiện prompt viết kịch bản |
| Chỉ chạy trên macOS (giọng `say`), một máy | Thấp lúc thử nghiệm | Đổi provider TTS khi cần mở rộng |

## 5. Baseline và độ đo — làm sao biết tốt hơn?

"Tốt hơn" phải tách 3 trục; tốt ở trục này không suy ra tốt ở trục kia.

### Trục A — hiệu quả sản xuất (đo được một phần)

| Độ đo | Baseline | Của mình |
|---|---|---|
| Giờ công / video (chủ đề có sẵn thư viện) | Jared Owen 20–100 giờ | Cần đo trên 10 video tới, gồm cả thời gian xem lại |
| Giờ công / chủ đề mới | Như trên | ~1–2 ngày (đo trên chủ đề động cơ) |
| Thời gian sửa một lỗi nhỏ | Blender: render lại hàng giờ | ~1 phút |

### Trục B — độ đúng và mức hiểu (chưa đo)

| Độ đo | Cách đo | So với |
|---|---|---|
| Lỗi cơ khí / video | Người rành kỹ thuật chấm theo checklist | Video AI sinh (Sora / Veo) cùng đề bài; video YouTube cùng chủ đề |
| Mức hiểu bài | 20–30 người, 5 câu trắc nghiệm trước / sau khi xem | Video Lesics hoặc Jared Owen cùng chủ đề; bài đọc chữ |
| Hiệu quả của HUD | Cùng video, có / không HUD | Bản không HUD |

### Trục C — thị trường (quan trọng nhất, hiện bằng 0)

| Độ đo (YouTube Studio) | Ý nghĩa | Ngưỡng tham khảo* |
|---|---|---|
| Viewed vs swiped away | Hook 3 giây đầu có giữ được không | > 60–70% |
| % thời lượng được xem trung bình | Nội dung có giữ tới cuối không | > 70% với Shorts < 60 s |
| Chia sẻ + lưu / 1.000 view | Có giá trị thật không | So với trung bình kênh |
| Sub mới / 1.000 view | Có xây được khán giả không | So với trung bình kênh |

\* Ngưỡng cộng đồng creator hay nhắc, không phải số chính thức của YouTube. Baseline đúng nhất là **trung bình của chính kênh sau ~10 video đầu**.

**Thiết kế A/B:** đăng theo cặp biến thể (có / không HUD; hai kiểu hook) vào khung giờ tương đương; cần ≥ 8–10 video mỗi nhóm mới thấy xu hướng vì Shorts rất nhiễu.

**Tiêu chí dừng** (chốt trước để không tự lừa mình): sau 20 Shorts và 4 tuần, viewed vs swiped < 50% **và** không video nào vượt 10.000 view → đổi chủ đề / định dạng hoặc chuyển hướng B2B.

## 6. Các câu hỏi còn mở

1. **Kênh YouTube hay B2B?** Trường nghề, garage, hãng phụ tùng có thể trả tiền cho video đúng kỹ thuật — doanh thu rõ hơn quảng cáo Shorts, nhưng cần đi bán. Chưa hỏi khách hàng nào.
2. **Cụm chủ đề cho 20 video đầu?** Cụm xe máy dùng lại bộ phận tốt nhất; nhưng có thể chủ đề "lạ" (máy in 3D, khoá cửa, đồng hồ cơ) giữ người xem tốt hơn.
3. **Giọng đọc cho đợt thử?** Giữ giọng macOS (rẻ, nhưng có thể làm hỏng kết quả) hay dùng TTS chất lượng cao / thu giọng thật.
4. **Mức giản lược chấp nhận được?** Đúng nguyên lý là đủ cho khán giả phổ thông, nhưng khán giả kỹ thuật Việt Nam có thể khắt khe.

## 7. Kết luận

1. Kỹ thuật đã đủ để thử thị trường; **thêm tính năng lúc này là tối ưu sai chỗ**.
2. Giả định rủi ro nhất: **"người Việt muốn xem Shorts 3D cơ khí"** — kiểm chứng rẻ nhất là 10–20 Shorts trong 2–4 tuần.
3. **Giọng đọc** có thể làm hỏng cả thử nghiệm — cần quyết định trước khi đăng.
