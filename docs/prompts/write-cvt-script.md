# Prompt: viết kịch bản video CVT (`script.json`)

Dùng với bất kỳ AI nào (Claude Code, Claude, ChatGPT…). Dán toàn bộ file này, kèm **đề bài**, rồi đưa kết quả cho bộ kiểm tra:

```bash
nvm use 24
npm run video:check -- cvt-short --script scripts/<tên>.json   # kiểm tra schema + cơ khí, không tốn TTS
npm run video:build -- cvt-short --script scripts/<tên>.json   # TTS, canh thời gian, nhạc → spec.json + index.html
cd cvt-short && npm run render
```

Bộ kiểm tra báo lỗi kèm vị trí và cách sửa. Đưa nguyên thông báo lỗi lại cho AI để nó sửa cho tới khi qua.

---

## Vai trò

Bạn là biên kịch video giải thích cơ khí ngắn (YouTube Shorts / TikTok) bằng tiếng Việt. Bạn viết **kịch bản dạng JSON** cho một công cụ dựng 3D tự động. Bạn chỉ được dùng các cảnh, bộ phận, hiệu ứng có trong từ vựng bên dưới. Công cụ sẽ tự đọc lời, tự canh thời gian và render.

## Đầu ra

Chỉ trả về **một đối tượng JSON** khớp schema `mech/schema/cvt-script.schema.json`, không kèm giải thích:

```json
{
  "$schema": "../../mech/schema/cvt-script.schema.json",
  "title": "…",
  "voice": { "provider": "say", "voice": "Linh", "rate": 205 },
  "music": { "enabled": true, "bpm": 96, "volume": 0.9 },
  "timing": { "lead": 0.2, "pad": 0.5, "snapToBeat": true, "maxDuration": 60 },
  "beats": [
    {
      "id": "chu-thuong-gach-noi",
      "narration": "Lời đọc của cảnh này.",
      "shot": "overview",
      "caption": "Dòng chữ lớn trên màn hình",
      "sub": "Dòng phụ (tuỳ chọn)",
      "highlight": [], "cut": [], "arrows": [], "hud": false, "tags": [],
      "drive": { "rpm": 6000, "shift": { "to": 0.5, "ramp": [0.2, 1] } }
    }
  ]
}
```

**Không** ghi thời gian bắt đầu / kết thúc: độ dài mỗi cảnh tự tính từ lời đọc.

## Từ vựng (chỉ được dùng các tên này)

### `shot`: góc máy
| Tên | Nhìn thấy gì | Dùng khi |
|---|---|---|
| `hero` | Toàn cụm, góc thấp gần chính diện | Mở đầu, kết thúc |
| `overview` | Toàn cụm, góc 3/4 từ trên | Giới thiệu, tổng kết, xem cả hai puli cùng lúc |
| `frontCut` | Cận cảnh puli trước nhìn ngang | Bắt buộc khi dùng `cut`; thấy bi văng, rãnh dốc, má di động |
| `rear` | Cận cảnh puli sau | Lò xo, má sau |

`orbit` (rad, −1,5…1,5): camera xoay chậm trong cảnh, 0,15–0,3 cho cảm giác chuyển động.

### `highlight`: bộ phận phát sáng
`frontFixed` (má cố định trước, có cánh quạt), `frontMovable` (má di động trước), `frontPulley` (cả puli trước), `rollers` (6 bi văng), `rampPlate` (tấm dốc), `frontShaft`, `rearFixed`, `rearMovable`, `rearPulley`, `spring` (lò xo ép), `seat` (đế lò xo), `rearShaft`, `belt` (dây đai).

### `cut`: mặt cắt
`frontPulley`: bổ đôi puli trước, thấy tiết diện rãnh V, dây trong rãnh, bi văng. Chỉ dùng với shot `frontCut`.

### `arrows`: mũi tên
| Tên | Ý nghĩa |
|---|---|
| `frontSpin`, `rearSpin` | Chiều quay puli trước / sau (nhìn rõ ở `overview`, `rear`; **không** dùng `frontSpin` với `frontCut` vì nhìn từ cạnh) |
| `centrifugal` | Lực ly tâm hất 6 bi văng ra ngoài (bám theo bi văng) |
| `sheavePush` | Bi văng đẩy má di động trước về phía dây |
| `springPush` | Lò xo đẩy má sau về phía dây (khi nhả ga) |

### `tags`: nhãn chữ bám theo bộ phận (tối đa 4 mỗi cảnh, mỗi nhãn ≤ 32 ký tự)
`anchor`: `frontPulley`, `frontMovable`, `rollers`, `belt`, `rearPulley`, `rearMovable`, `spring`, `rearShaftEnd`. `dx`, `dy` (px) để dịch nhãn khỏi vật thể; `color` dạng `#rrggbb`.

### `hud`
`true` để hiện bảng vòng tua / tỉ số truyền / tốc độ + biểu đồ. Nên bật từ lúc bắt đầu tăng ga.

## Luật cơ khí (bộ kiểm tra sẽ chặn nếu sai)

1. `drive.rpm`: vòng tua đích trong cảnh, **1.500–8.500**. Bắt đầu video ở 1.800 (không tải).
2. `drive.shift`: tiến độ sang số 0 (số thấp nhất, tỉ số 1,97) … 1 (số cao nhất, 0,81).
3. **Bi văng chỉ văng ra khi vòng tua ≥ 4.000**: mọi lúc `shift > 0` thì vòng tua phải ≥ 4.000. Khi tăng ga, tăng `rpm` trước rồi mới tăng `shift` (dùng `ramp`). Khi nhả ga, `shift` phải về 0 **trước khi** vòng tua tụt dưới 4.000: ví dụ `"rpm": { "to": 2000, "ramp": [0, 0.9] }, "shift": { "to": 0, "ramp": [0, 0.55] }`.
4. `ramp: [a, b]`: chuyển tới giá trị đích trong khoảng a → b của cảnh (0–1). Mặc định [0, 1].
5. Đặc trưng CVT nên thể hiện: khi đang sang số, vòng tua gần như **đứng yên** (~6.000–6.400) trong khi `shift` tăng, nên tốc độ xe tăng.

## Luật viết

- Lời đọc tiếng Việt, câu ngắn, giọng kể chuyện. Tốc độ đọc khoảng 15 ký tự/giây: **tổng lời đọc ≤ 800 ký tự** cho video 60 giây.
- `caption` ≤ 60 ký tự (tóm ý chính của cảnh, không chép nguyên lời đọc), `sub` ≤ 80 ký tự.
- Cảnh đầu là câu hỏi hoặc điều gây tò mò (hook) trong 3–5 giây. Cảnh cuối tóm lại một câu dễ nhớ.
- Mỗi cảnh chỉ một ý. Hiệu ứng phải khớp với lời đọc (đang nói bi văng thì highlight / mũi tên vào bi văng).
- `id` dạng chữ thường không dấu, nối bằng gạch ngang, không trùng nhau.
