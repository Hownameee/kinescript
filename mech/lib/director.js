// Lớp 4: đạo diễn. Biến kịch bản dạng dữ liệu (danh sách beat) thành các hàm theo thời gian:
// camera, phụ đề, cường độ hiệu ứng (highlight / cut / arrows / hud) và nhãn.
//
// spec = {
//   duration,
//   beats: [{ start, end, shot, orbit?, transition?, caption, sub?,
//             highlight?: [tên], cut?: [tên], arrows?: [tên], hud?: bool,
//             tags?: [{ text, anchor, color?, dx?, dy? }] }]
// }
// `shots` (do dự án cung cấp): tên → [x, y, z, khoảng cách, yaw, pitch] (đích nhìn trong toạ độ rig).
import { ease, keyframes } from "./mech.js";

export function createDirector(spec, { shots, fade = 0.4, transition = 1.0 }) {
  const beats = spec.beats;
  beats.forEach((b, i) => {
    if (!shots[b.shot]) throw new Error(`beat ${i}: không có shot "${b.shot}"`);
    if (i > 0 && b.start < beats[i - 1].end - 1e-6) throw new Error(`beat ${i}: chồng lên beat trước`);
  });

  // ----- Camera: chuyển cảnh `transition` giây đầu beat, rồi xoay chậm `orbit` rad tới cuối beat -----
  const withYaw = (shot, dYaw) => shot.map((v, k) => (k === 4 ? v + dYaw : v));
  const camPts = [];
  let prevEnd = null;
  beats.forEach((b) => {
    const shot = shots[b.shot];
    const tr = Math.min(b.transition ?? transition, (b.end - b.start) / 2);
    if (prevEnd === null) camPts.push([b.start, shot]);
    else camPts.push([b.start, prevEnd], [b.start + tr, shot]);
    prevEnd = withYaw(shot, b.orbit ?? 0);
    camPts.push([b.end, prevEnd]);
  });
  // bỏ các mốc trùng thời gian (beat liền nhau)
  const cleaned = camPts.filter((p, i) => i === 0 || p[0] > camPts[i - 1][0] + 1e-6);
  const cameraAt = keyframes(cleaned);

  // ----- Hiệu ứng: gộp các beat liền nhau dùng cùng hiệu ứng để không bị nháy tắt/bật -----
  const kinds = ["highlight", "cut", "arrows"];
  const tracks = {};
  function addInterval(kind, name, a, b) {
    const key = kind + ":" + name;
    const list = (tracks[key] ||= []);
    const last = list[list.length - 1];
    if (last && Math.abs(last[1] - a) < 1e-6) last[1] = b;
    else list.push([a, b]);
  }
  beats.forEach((b) => {
    kinds.forEach((kind) => (b[kind] || []).forEach((name) => addInterval(kind, name, b.start, b.end)));
    if (b.hud) addInterval("hud", "hud", b.start, b.end);
  });
  const presence = (ivs, t) =>
    ivs.reduce((acc, [a, b]) => Math.max(acc, ease(t, a, a + fade) * (1 - ease(t, b - fade, b))), 0);

  function level(kind, name, t) {
    const ivs = tracks[kind + ":" + name];
    return ivs ? presence(ivs, t) : 0;
  }
  function names(kind) {
    return Object.keys(tracks)
      .filter((k) => k.startsWith(kind + ":"))
      .map((k) => k.slice(kind.length + 1));
  }

  // ----- Phụ đề -----
  function captionAt(t) {
    let i = 0;
    while (i + 1 < beats.length && t >= beats[i + 1].start) i++;
    const b = beats[i];
    return { main: b.caption || "", sub: b.sub || "", k: ease(t, b.start, b.start + 0.5) };
  }

  // ----- Nhãn: hiện trong beat khai báo nó -----
  const tags = [];
  beats.forEach((b) => (b.tags || []).forEach((tag) => tags.push({ ...tag, from: b.start, to: b.end })));
  function tagsAt(t) {
    return tags.map((tag) => ({
      tag,
      k: ease(t, tag.from + 0.3, tag.from + 0.7) * (1 - ease(t, tag.to - fade, tag.to)),
    }));
  }

  return { cameraAt, level, names, captionAt, tags, tagsAt, duration: spec.duration };
}
