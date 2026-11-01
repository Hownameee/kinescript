# Thị trường video 3D giải thích cơ khí

Cập nhật: 31/10/2026 · Tài liệu kỹ thuật: [technical-approach.md](technical-approach.md).

## 1. Vấn đề

Video 3D giải thích "máy móc hoạt động thế nào" có lượng xem lớn, nhưng **chi phí sản xuất rất cao** nên ra ít và chủ đề hẹp:

- **Jared Owen** (~3,2 triệu subscriber): mỗi animation **20–100 giờ** làm tay bằng Blender ([BlenderNation](https://www.blendernation.com/2018/11/19/meet-the-artist-jared-owen/)).
- **Lesics** (~6,7 triệu subscriber): cần **cả đội animator** ([lesics.com](https://lesics.com/engineering-animation.html)).

Nút thắt không nằm ở render mà ở: (1) có mô hình các bộ phận bên trong, (2) dàn dựng (chiếu gì, góc nào, khi nào cắt lớp), (3) làm tay từng keyframe nên sửa gì cũng phải làm lại.

## 2. Các dạng video hiện có

| Dạng | Ví dụ | Điểm yếu |
|---|---|---|
| 3D cắt lớp, đơn giản hoá | Jared Owen | Ra chậm, chủ đề phổ thông |
| 3D giống thật / siêu chi tiết | Animagraffs, Branch Education | Rất chậm, ra rất ít |
| Animation theo đội | Lesics | Chi phí cao |
| Shorts 3D kể chuyện | Zack D Films (~27 triệu sub) | Không phải cơ khí, nhưng chứng minh định dạng Shorts 3D rất mạnh |
| Tháo máy thật | "硬核拆解" (Bilibili), JerryRigEverything | Không thấy chuyển động bên trong |

Các ví dụ 3D cơ khí bằng Three.js trên mạng (vd. [máy làm kem của PYC](https://www.pycheung.com/weblog/post/1703)) chủ yếu là demo một sản phẩm, có sẵn CAD, dựng tay — chưa phải dây chuyền sản xuất video.

## 3. Điểm yếu nội dung của các kênh hiện tại

1. **Chủ đề lặp lại**: động cơ, vi sai đã có hàng chục video; sản phẩm cụ thể và địa phương (Honda Wave, CVT xe tay ga, VinFast, máy nông nghiệp) còn trống.
2. **Không theo kịp tin tức**.
3. **Một mức độ sâu duy nhất**: quá cơ bản với kỹ sư, quá khó với trẻ em.
4. **Thiếu số liệu**: vòng tua, áp suất, lực, tỉ số truyền.
5. **Hiếm khi chiếu "khi hỏng thì sao"**, dù người dùng tìm rất nhiều.
6. **Ít so sánh trực tiếp** (AT / CVT / DCT, xăng / điện).

## 4. Công cụ hiện có và điểm yếu

| Nhóm | Ví dụ | Điểm yếu |
|---|---|---|
| Tài liệu kỹ thuật từ CAD (B2B) | [SOLIDWORKS Composer](https://www.goengineer.com/videos/solidworks-composer-creating-animations), [Cadasio](https://www.cadasio.com/), [PTC Illustrate](https://www.ptc.com/en/products/arbortext/ptc-illustrate), [KeyShot](https://www.keyshot.com/blog/quick-tip-104-exploded-view-animation-keyshot/) | Bắt buộc có CAD; không kể chuyện; giấy phép đắt; không phải đối thủ của người làm nội dung |
| Dựng / render | Blender, Remotion, [HyperFrames](https://github.com/heygen-com/hyperframes) | Blender làm tay, không "hiểu" cơ cấu, làm chữ / số liệu cực; HyperFrames mạnh motion graphics nhưng không có thư viện cơ khí |
| AI sinh video | Sora, Veo, Kling | **Sai vật lý cơ khí** ([MechVerse](https://arxiv.org/html/2605.14843v1)), không sửa được |
| AI sinh 3D | Meshy, Hunyuan3D | Một khối liền, không có bộ phận bên trong → không cắt lớp / tách rời được |
| AI điều khiển Blender | [Blender MCP](https://github.com/ahujasid/mcp-for-blender) | Chỉ hợp thử nghiệm, animation yếu ([đánh giá](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/blender-mcp)) |
| AI cho CAD | [Zoo](https://zoo.dev/research/zookeeper), [CADAM](https://github.com/Adam-CAD/CADAM), [Werk24](https://werk24.io/) | Từng chi tiết / cụm nhỏ, không mô tả cơ cấu truyền động |

**Khoảng trống:** chưa có công cụ cho người làm nội dung gồm thư viện bộ phận cơ khí + chuyển động đúng cơ khí + mẫu kể chuyện + lớp số liệu.

## 5. Định vị

**Làm kênh nội dung, tool là công cụ nội bộ.** Giá trị nằm ở tốc độ và sản lượng nội dung, nhờ **dựng video bằng code** (thư viện cơ khí + Three.js + HyperFrames). Phong cách **dễ hiểu, không cần giống thật** (như Jared Owen) — tránh bẫy chi phí "giống thật từ A–Z".

### Hướng phát triển nội dung

| # | Hướng | Trạng thái |
|---|---|---|
| 1 | **Lớp số liệu chồng lên 3D** (vòng tua, tỉ số, tốc độ, biểu đồ) | ✅ Có |
| 2 | **Nhiều phiên bản từ một cảnh** (Shorts / dài / bản kỹ sư / bản trẻ em) | ✅ Có (đổi kịch bản, không dựng lại cảnh) |
| 3 | **Series "khi hỏng thì sao"** | Hạ tầng sẵn |
| 4 | **So sánh chia màn hình** đồng bộ thời gian | Chưa |
| 5 | **Mascot dẫn đường** (2D Lottie/Rive hoặc 3D đơn giản, không cần motion capture) | Chưa |
| 6 | **Cảnh quay thật + "tia X" 3D** (quay điện thoại + camera tracking) | Chưa |
| 7 | **Giải thích theo tin tức** trong 2–3 ngày | Hạ tầng sẵn cho chủ đề đã có thư viện |
| 8 | **Trả lời bình luận bằng Shorts** | Chưa |
| 9 | **Âm thanh cơ khí** (tiếng máy theo vòng tua) | Chưa (đã có lời đọc + nhạc) |

### Trạng thái

| Video | Thời lượng | Nội dung |
|---|---|---|
| `cvt-short` | 59,4 s | "Xe tay ga sang số thế nào?": cắt lớp, highlight, mũi tên lực, HUD, 10 cảnh, lời đọc + nhạc |
| `vi-sao-may-gao` | 28,8 s | "Vì sao vặn ga, máy gào mà xe lên từ từ?" — kịch bản AI viết từ đề bài |
| `engine-short` | 59,4 s | "Động cơ 4 kỳ hoạt động thế nào?": bổ đôi động cơ 110 cc, 4 kỳ từng bước, khí đổi màu theo kỳ, tia lửa bugi, biểu đồ đóng mở xupap |

Quy trình **đề bài → AI viết kịch bản → kiểm tra tự động → video có tiếng** mất vài phút (render 60 s video ~30 s), so với 20–100 giờ làm tay.

Thêm chủ đề mới (động cơ 4 kỳ) chỉ cần viết bộ phận + cơ cấu + từ vựng; phần dựng, lời đọc, nhạc, kiểm tra dùng lại toàn bộ.

Còn thiếu trước khi thử nghiệm A/B trên kênh: bản "3D thường" (tắt `hud`), bản có mascot.

## 6. Rủi ro

| Rủi ro | Hướng xử lý |
|---|---|
| YouTube tắt kiếm tiền nội dung **"inauthentic" / template lặp lại**, đánh giá trên toàn kênh ([Gulf News](https://gulfnews.com/technology/youtube-updates-monetisation-policies-ai-and-repetitive-content-ban-begins-july-15-1.500192660), [MediaCopilot](https://mediacopilot.ai/youtube-ai-slop-monetization-policy/)) | Tự động hoá để làm nhanh, nhưng mỗi video có kịch bản và giá trị riêng |
| YouTube đã **tự lồng tiếng AI 27 ngôn ngữ** ([Storyboard18](https://www.storyboard18.com/digital/youtube-expands-auto-dubbing-to-27-languages-adds-more-natural-and-expressive-voices-88923.htm)) → đa ngôn ngữ giọng đọc không còn là lợi thế | Lợi thế còn lại: chữ và nhãn trên hình render lại theo ngôn ngữ |
| Bản quyền model có logo hãng ([Volvo 3D T&C](https://developer.volvocars.com/terms-and-conditions/3d-terms-and-conditions)) | Tự dựng bộ phận bằng tham số |
| Sai cơ khí bị khán giả bắt lỗi | Chuyển động tính từ quan hệ cơ khí thật + kiểm tra tự động trước khi render |

## 7. Tài liệu tham khảo

**Video tham chiếu ban đầu**
- [How does a 3D Printer work? (A1 by Bambu Lab) – Jared Owen](https://www.youtube.com/watch?v=f94CnlQ0eq4&t=239s), mốc 3:59

**Kênh và người làm nội dung**
- [BlenderNation – Meet the artist: Jared Owen](https://www.blendernation.com/2018/11/19/meet-the-artist-jared-owen/) · [Diginomica – Jared Owen](https://diginomica.com/node/27336)
- [Lesics – Engineering animation](https://lesics.com/engineering-animation.html)
- [Animagraffs](https://wwwhatsnew.com/2017/02/16/animagraffs-animaciones-para-entender-como-funcionan-las-cosas/)
- [OutlierKit – Zack D Films](https://outlierkit.com/channel/zackdfilms) · [Zack D Films tuyển animator](https://quickdrawanimation.ca/opportunities/job-postings/zack-d-films-animator-wanted)
- [硬核拆解 / Bilibili (bài báo)](https://www.ctdsb.net/c1673_202305/1767721.html)
- [Bartosz Ciechanowski – Internal combustion engine (Kottke)](https://kottke.org/21/05/how-internal-combustion-engines-work)
- [PYC – Interactive exploded ice cream machine](https://www.pycheung.com/weblog/post/1703)

**Nền tảng YouTube**
- [YouTube auto-dubbing 27 ngôn ngữ – Storyboard18](https://www.storyboard18.com/digital/youtube-expands-auto-dubbing-to-27-languages-adds-more-natural-and-expressive-voices-88923.htm) · [RouteNote](https://routenote.com/blog/youtube-auto-dubbing-partner-program/)
- [Chính sách inauthentic content – Gulf News](https://gulfnews.com/technology/youtube-updates-monetisation-policies-ai-and-repetitive-content-ban-begins-july-15-1.500192660) · [MediaCopilot](https://mediacopilot.ai/youtube-ai-slop-monetization-policy/) · [Plagiarism Today](https://www.plagiarismtoday.com/2025/07/08/youtube-targets-inauthentic-content/)

**Công cụ tài liệu kỹ thuật từ CAD**
- [SOLIDWORKS Composer](https://www.goengineer.com/videos/solidworks-composer-creating-animations) · [Cadasio](https://www.cadasio.com/) · [PTC Illustrate](https://www.ptc.com/en/products/arbortext/ptc-illustrate) · [Cortona3D RapidAuthor](https://www.cortona3d.com/en/rapidauthor) · [KeyShot – exploded view](https://www.keyshot.com/blog/quick-tip-104-exploded-view-animation-keyshot/) · [Siemens vSTAGE](https://www.siemens.com/en-gb/products/side-effects-vstage-interactive-3d/)

**AI**
- Sinh video sai vật lý cơ khí: [MechVerse](https://arxiv.org/html/2605.14843v1)
- AI sinh 3D / hoạt hình: [Meshy – AI animation generators](https://www.meshy.ai/blog/ai-animation-generator)
- AI điều khiển Blender: [Blender MCP](https://github.com/ahujasid/mcp-for-blender) · [Blender Lab MCP](https://projects.blender.org/lab/blender_mcp) · [Đánh giá – MindStudio](https://www.mindstudio.ai/blog/claude-blender-mcp-real-world-performance) · [Đánh giá – 3DAIStudio](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/blender-mcp)
- AI cho CAD: [Zoo / Zookeeper](https://zoo.dev/research/zookeeper) · [Adam](https://adam.new/) / [CADAM](https://github.com/Adam-CAD/CADAM) · [Werk24](https://werk24.io/) · [Aibuild OS](https://ai-build.com/use-cases/2d-to-3d/) · [Drawing2CAD](https://github.com/lllssc/Drawing2CAD) · [CAD2Program](https://manycore-research.github.io/CAD2Program/) · [Leo AI](https://www.getleo.ai/ai-for-cad) · [Eneblr 3D](https://cad.eneblr.se/)
- Lắp ráp: [ASAP – MIT/Autodesk](https://asap.csail.mit.edu/) · [AssembleIt (ACM)](https://dl.acm.org/doi/10.1145/3800645.3812912)

**Dựng / render và ví dụ Three.js cơ khí**
- [HyperFrames](https://github.com/heygen-com/hyperframes) · [Three CAD Viewer](https://github.com/bernhard-42/three-cad-viewer) · [CascadeStudio](https://github.com/zalo/CascadeStudio) · [Jet Engine Air Flow](https://github.com/dilums/jet-engine-threejs)

**Bản quyền model**
- [Volvo Cars – 3D Terms & Conditions](https://developer.volvocars.com/terms-and-conditions/3d-terms-and-conditions) · [Thảo luận giấy phép model xe – three.js forum](https://discourse.threejs.org/t/i-want-to-buy-a-realistic-car-3d-model-with-animation/59553)

> Số subscriber lấy từ nguồn thứ cấp ở các thời điểm khác nhau, cần kiểm tra trực tiếp trước khi trích dẫn.
