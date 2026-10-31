# Giải pháp kỹ thuật: thư viện cơ khí Three.js + HyperFrames

Cập nhật: 31/10/2026 · Bối cảnh thị trường: [market-landscape.md](market-landscape.md).

## 1. Vấn đề

Làm video giải thích cơ khí nhanh và đúng phải giải quyết 5 vấn đề:

| # | Vấn đề | Vì sao cách hiện có không giải quyết được |
|---|---|---|
| 1 | **Chuyển động phải đúng cơ khí**: ăn khớp, tỉ số truyền, chiều quay, dây không trượt | AI sinh video sai vật lý; Blender làm tay từng keyframe nên dễ sai, khó sửa |
| 2 | **Không có CAD** cho phần lớn sản phẩm thương mại | Công cụ CAD (Composer, KeyShot…) bắt buộc có CAD sạch |
| 3 | **Sửa và làm lại phải rẻ**: đổi lời, đổi cảnh, làm nhiều phiên bản | Blender: sửa là làm lại, chữ và nhãn làm tay |
| 4 | **Số liệu, nhãn, UI chồng lên 3D** | Blender làm infographic rất cực |
| 5 | **Lời đọc, nhạc và hình phải khớp nhau**; kịch bản sai phải phát hiện sớm | Canh tay trong phần mềm dựng; lỗi chỉ thấy sau khi render |

## 2. Giải pháp

Dựng video bằng code, chia lớp, mô tả nội dung bằng kịch bản dữ liệu:

| # | Giải pháp |
|---|---|
| 1 | Tư thế mọi bộ phận tính từ **quan hệ cơ khí thật** (khoảng cách má puli theo bán kính dây, chiều dài dây không đổi, v = ω·r), là hàm thuần của thời gian `t` |
| 2 | Bộ phận sinh từ **tham số** (đường kính, góc rãnh, số vòng lò xo…), phong cách đơn giản hoá kiểu Jared Owen — không cần CAD, không vướng bản quyền model |
| 3 | Video mô tả bằng **kịch bản JSON** (lời đọc + cảnh + hiệu ứng); đổi kịch bản rồi build + render trong khoảng 1 phút; AI viết được kịch bản |
| 4 | HyperFrames chồng **HTML/CSS lên canvas 3D**: phụ đề, nhãn bám vật thể, bảng số liệu + biểu đồ, cập nhật cùng frame |
| 5 | Công cụ build **tự đọc lời (TTS), đo độ dài, canh giờ từng cảnh theo lời đọc và phách nhạc**, và **kiểm tra schema + cơ khí trước khi render** |

## 3. Kiến trúc

```
┌────────────────────────────────────────────────────────────────┐
│ 5. Render     HyperFrames → MP4 (hình + lời đọc + nhạc nền)    │
│ 4. Kịch bản   script.json → build (TTS, canh giờ, kiểm tra)    │
│               → spec.json → director: camera, phụ đề, hiệu ứng │
│ 3. Hiệu ứng   cắt lớp có nắp, highlight, mũi tên, X-ray        │
│ 2. Cơ cấu     CVT: bi văng → puli → dây → lò xo, tư thế = f(t) │
│ 1. Bộ phận    hình học từ tham số (puli, dây đai, bi văng…)    │
└────────────────────────────────────────────────────────────────┘
   Lớp HTML chồng lên: phụ đề, nhãn bám theo vật thể, bảng số liệu
```

Luồng làm một video:

```
đề bài ──(AI + docs/prompts/write-cvt-script.md)──► script.json   lời đọc + cảnh, không có giờ tuyệt đối
                                                        │  npm run video:check   schema + cơ khí, không TTS
                                                        │  npm run video:build
                                                        ├─ TTS từng cảnh → đo độ dài → tính giờ, làm tròn theo phách nhạc
                                                        ├─ kiểm tra cơ khí kịch bản động cơ
                                                        ├─ ghép voiceover (-16 LUFS) + tự sinh nhạc, hạ nhạc khi có lời
                                                        └─► spec.json + index.html + audio/
                                                                │  npm run render
                                                                └─► renders/*.mp4
```

## 4. Quyết định kỹ thuật

1. **Tư thế là hàm thuần của `t`, không dùng physics engine.** HyperFrames render bằng cách nhảy tới frame bất kỳ (`window.__hfThreeTime` + event `hf-seek`); physics engine chạy từng bước nên không seek được.
2. **Thời gian lấy từ event `hf-seek`**, không từ `onUpdate` của GSAP (chạy trước khi `__hfThreeTime` cập nhật → trễ).
3. **Hiệu ứng không giữ trạng thái**: mỗi frame tính cường độ `k` từ `t` rồi áp lại, vì dây đai và lò xo được dựng lại mỗi frame.
4. **Three.js r170 dạng ES module đặt sẵn** (`mech/vendor/`), nạp qua `importmap`; gán `window.THREE` để adapter của HyperFrames chờ asset. Render không cần mạng.
5. **Hai tầng kịch bản**: `script.json` (người / AI viết) và `spec.json` (máy sinh, giờ tuyệt đối). Kịch bản JSON nạp bằng `import … with { type: "json" }` (không `fetch`).
6. **Giọng đọc tiếng Việt `say -v Linh`** (macOS, offline) — `hyperframes tts` không có tiếng Việt. Có cache theo nội dung câu.
7. **Nhạc nền tự sinh bằng code** (hợp âm Am–F–C–G, arpeggio, kick nhẹ): không bản quyền, đúng độ dài, chuyển cảnh trúng phách.
8. **Kiểm tra trước khi render** (`--check`, vài giây) thay vì phát hiện lỗi sau khi render.
9. **Mỗi video một project HyperFrames** (lint chỉ cho một composition gốc / project); thư viện dùng chung ở `mech/`, project trỏ tới bằng symlink. Template HTML để trong `templates/` vì mọi file HTML ở gốc project bị coi là composition gốc. Sub-composition (HUD) có thể gắn vào trang sau `scene.js` → kiểm tra phần tử tồn tại trước khi dùng.
10. **Phiên bản ghim:** HyperFrames 0.8.166, Three.js 0.170.0, Node ≥ 22.

## 5. Mã nguồn

```
assemble-3d-video/
├── docs/                         market-landscape.md, technical-approach.md, prompts/write-cvt-script.md
├── mech/                         thư viện
│   ├── lib/mech.js               lõi: styledMesh, latheZ, ease, keyframes, integrate
│   ├── lib/cvt.js                bộ phận CVT + quan hệ dây – puli
│   ├── lib/cvt-assembly.js       cụm CVT + động học sang số
│   ├── lib/cvt-drive.js          kịch bản động cơ → vòng tua, tỉ số, km/h, góc quay
│   ├── lib/fx.js                 cắt lớp, highlight, mũi tên
│   ├── lib/director.js           spec → camera, phụ đề, cường độ hiệu ứng, nhãn
│   ├── schema/cvt-script.schema.json
│   └── vendor/                   three.module.min.js + LICENSE
├── tools/
│   ├── build-video.mjs           script.json → kiểm tra → TTS → canh giờ → nhạc → spec.json + index.html
│   └── lib/                      validate.mjs, audio.mjs, checks-cvt.mjs, register-three.mjs
├── package.json                  npm run video:check / video:build
└── cvt-short/                    project video CVT
    ├── script.json               kịch bản chính
    ├── scripts/                  kịch bản khác (vd. vi-sao-may-gao.json)
    ├── scene.js                  "từ vựng" (SHOTS, CUTS, ARROWS) + vòng render
    ├── templates/index.html      khung HTML (phụ đề, nhãn, HUD, audio)
    ├── compositions/hud.html     bảng số liệu + biểu đồ
    ├── spec.json, index.html, audio/   sinh tự động bởi build — không sửa tay
    └── renders/
```

### 5.1. `mech.js` — lõi

| Hàm | Mô tả |
|---|---|
| `styledMesh(geo, color, opts)` | Mesh màu phẳng + viền nét; `edges`, `doubleSide`, `metalness`, `roughness` |
| `latheZ(profile)` | Khối tròn xoay quanh trục z từ biên dạng kín (r, z) |
| `ease(t, a, b)` | Tiến độ 0→1 làm mượt trong [a, b] |
| `keyframes([[t, v], …])` | Hàm theo thời gian từ các mốc (số hoặc mảng), nội suy mượt |
| `integrate(f, T)` | Tích phân trước (vận tốc → góc quay) dạng tra bảng, vẫn là hàm thuần của `t` |

### 5.2. `cvt.js` — bộ phận (đơn vị cm, cỡ xe 110–125cc)

| Hàm | Mô tả |
|---|---|
| `sheaveGeometry` | Má puli côn, rãnh V 28°, moay-ơ, cánh tản nhiệt; `mirror` cho má đối diện |
| `sheaveOffsetForRadius(r, pulley, belt)` | Khoảng cách má puli để dây nằm ở bán kính r |
| `beltPath(r1, r2, C)`, `beltGeometry` | Đường dây hở quanh 2 puli (+ chiều dài); dây đai răng tiết diện hình thang, `phase` cho răng chạy |
| `steppedShaftGeometry`, `rollerGeometry`, `coilSpringGeometry` | Trục bậc then hoa; bi văng; lò xo hai đầu khép kín (`length` để nén) |
| `meshes.*`, `COLORS` | Mesh dựng sẵn theo phong cách mặc định |

### 5.3. `cvt-assembly.js` — cụm CVT + động học

Mọi đại lượng suy ra từ một biến tiến độ sang số **s ∈ [0, 1]**:

```
s → bi văng ra ρ → má trước tiến x1 = (ρ − ρmin)·độ dốc rãnh → dây leo lên r1 = r1Low + x1/(2·tan14°)
  → chiều dài dây không đổi ⇒ giải r2 → má sau lùi x2 → lò xo nén x2 → tỉ số i = r2 / r1
```

| s | r1 (cm) | r2 | Nén lò xo | Tỉ số | Chiều dài dây |
|---|---|---|---|---|---|
| 0 | 3,20 | 6,30 | 0,00 | 1,97 | 78,2461 |
| 0,5 | 4,25 | 5,36 | 0,47 | 1,26 | 78,2461 |
| 1 | 5,30 | 4,32 | 0,99 | 0,81 | 78,2461 |

`createCvtAssembly(cfg, { xrayFront })` trả về `update({ s, angleFront, angleRear, beltPhase })`, `anchors()`, `parts`, `kin`. `cvtKinematics(cfg).state(s)` dùng được không cần Three.js.

### 5.4. `fx.js` — hiệu ứng

| Hàm | Mô tả |
|---|---|
| `applyCut(root, { normal, point, sweep }, k)` | Mặt phẳng cắt quét vào theo k; nắp mặt cắt tô màu đặc (vẽ mặt sau của mesh) |
| `applyHighlight(root, k)` | Phát sáng nhấp nháy nhẹ |
| `straightArrow`, `arcArrow`, `setOpacity` | Mũi tên thẳng / cung (luôn vẽ đè lên vật thể); hiện / ẩn dần |

### 5.5. `director.js` + `cvt-drive.js` — chạy video từ `spec.json`

Director biến danh sách beat thành camera (chuyển cảnh + xoay chậm), phụ đề, cường độ hiệu ứng (gộp beat liền nhau để không nháy) và nhãn; báo lỗi nếu gọi tên không tồn tại. `cvt-drive.js` biến mốc vòng tua / sang số thành tỉ số, km/h, góc quay đồng bộ (v = ω·r).

## 6. Kịch bản (`script.json`)

Mỗi beat (cảnh):

| Trường | Ý nghĩa |
|---|---|
| `id`, `narration` | Tên cảnh, lời đọc |
| `shot`, `orbit`, `transition` | Góc máy; xoay camera (rad) tới cuối cảnh; thời gian chuyển cảnh |
| `caption`, `sub` | Phụ đề chính (≤ 60 ký tự) / phụ (≤ 80) |
| `highlight`, `cut`, `arrows`, `tags`, `hud` | Hiệu ứng theo tên trong từ vựng; nhãn bám điểm neo; bật bảng số liệu |
| `drive.rpm`, `drive.shift` | Đích vòng tua / sang số trong cảnh: số hoặc `{ "to", "ramp": [a, b] }` |
| `minDuration` | Độ dài tối thiểu (mặc định 2,5 s) |

Cấp video: `voice` (`say` / `kokoro`), `music` (`bpm`, `volume`), `timing` (`lead`, `pad`, `snapToBeat`, `maxDuration`). Độ dài cảnh = max(`minDuration`, `lead` + lời đọc + `pad`), làm tròn lên bội số phách nhạc.

Từ vựng (`cvt-short/scene.js` + `mech/schema/cvt-script.schema.json`):

| Loại | Tên |
|---|---|
| `shot` | `hero`, `overview`, `frontCut`, `rear` |
| `cut` | `frontPulley` |
| `arrows` | `frontSpin`, `rearSpin`, `centrifugal`, `sheavePush`, `springPush` |
| `highlight` | `frontFixed`, `frontMovable`, `frontPulley`, `rollers`, `rampPlate`, `frontShaft`, `rearFixed`, `rearMovable`, `rearPulley`, `spring`, `seat`, `rearShaft`, `belt` |
| `tags.anchor` | `frontPulley`, `frontMovable`, `rollers`, `belt`, `rearPulley`, `rearMovable`, `spring`, `rearShaftEnd` |

**Kiểm tra tự động** (lỗi thì dừng, kèm vị trí và cách sửa):

| Loại | Nội dung |
|---|---|
| Schema | Kiểu, trường bắt buộc, độ dài chữ, tên phải thuộc từ vựng, id không trùng |
| Cấu hình | Dây nằm trong vành, không chạm moay-ơ; bi văng không chạm moay-ơ / vượt vành; lò xo không bị nén sát vòng |
| Động cơ | Vòng tua 1.500–8.500; **bi văng chỉ văng ra khi vòng tua ≥ 4.000** |
| Cảnh báo | Vượt `maxDuration`; cắt lớp mà shot không thấy mặt cắt; đọc quá nhanh |

**AI viết kịch bản:** đưa `docs/prompts/write-cvt-script.md` + đề bài cho AI → lưu `cvt-short/scripts/<tên>.json` → `video:check` → đưa lỗi lại cho AI sửa → `video:build` → render.

## 7. Cách chạy

```bash
nvm use 24
npm run video:check -- cvt-short                        # kiểm tra script.json
npm run video:build -- cvt-short                        # TTS + nhạc + canh giờ → spec.json, index.html, audio/
#   thêm --script scripts/<tên>.json để dùng kịch bản khác
cd cvt-short && npm run check && npm run render         # lint + render MP4
```

Kết quả hiện tại: `cvt-short` 59,4 s (render 31 s), `vi-sao-may-gao` 28,8 s (render 17 s); build ~6 s; `hyperframes check` 0 lỗi; lời đọc khớp thời điểm cảnh (lệch < 0,02 s).

## 8. Giới hạn

- Vòng tua và tiến độ sang số đặt theo kịch bản, chưa giải cân bằng lực (ly tâm ↔ lò xo ↔ tải). Ly hợp, chuông ly hợp chưa dựng; tấm dốc, đế lò xo là đĩa tròn.
- Mặt cắt là mặt phẳng vô hạn: không cắt được dây đai. Nắp mặt cắt không có vân gạch chéo.
- Nhãn chưa có đường dẫn; vị trí chỉnh tay (`dx`, `dy`).
- Giọng macOS nghe máy móc; build với `say` chỉ chạy trên macOS. Nhạc nền tự sinh đơn giản.
- Từ vựng khai báo ở hai nơi (schema và `scene.js`), phải sửa đồng bộ.
- Mỗi lần build ghi đè `spec.json` / `index.html` / `audio/` của project.

## 9. Tiếp theo

- **Chủ đề cơ khí thứ hai** (vd. động cơ 4 kỳ) để kiểm chứng thư viện dùng lại được ngoài CVT.
