// Kiểm tra cơ khí cho video động cơ 4 kỳ, chạy trước khi render.
// 1. Cấu hình: dung tích / tỉ số nén hợp lý, piston không chạm nắp máy, xupap không va piston, lò xo xupap không bị nén sát vòng.
// 2. Kịch bản: trục khuỷu không quay ngược, không quay quá nhanh (mắt không theo kịp, hình bị nhoè / quay giật lùi).
// 3. Ngữ nghĩa (cảnh báo): hiệu ứng phải khớp với kỳ đang diễn ra trong cảnh.
import { DEFAULT_ENGINE, engineKinematics } from "../../mech/lib/engine.js";

export const CHANNELS = { crank: 0 }; // góc trục khuỷu cộng dồn (độ)

export const LIMITS = {
  maxDegPerSec: 1080, // 3 vòng/giây: ở 30 fps mỗi frame quay 36°, vẫn nhìn rõ
  compression: [7, 13],
};

const kin = engineKinematics(DEFAULT_ENGINE);

export function checkConfig(cfg = DEFAULT_ENGINE) {
  const errors = [];
  const k = engineKinematics(cfg);
  const cr = (k.displacement / (Math.PI * k.R * k.R) + k.clearance) / k.clearance;
  if (cr < LIMITS.compression[0] || cr > LIMITS.compression[1]) errors.push(`tỉ số nén ${cr.toFixed(1)} ngoài khoảng hợp lý`);
  if (k.roof - k.crownTDC <= 0) errors.push("piston chạm nắp máy ở điểm chết trên");
  let minGap = Infinity;
  let at = 0;
  for (let th = 0; th < 720; th += 0.5) {
    const s = k.state(th);
    const gap = k.roof - Math.max(s.liftIn, s.liftEx) - s.crown;
    if (gap < minGap) [minGap, at] = [gap, th];
  }
  if (minGap <= 0.1) errors.push(`xupap va piston tại θ=${at}° (khe hở ${minGap.toFixed(2)} cm)`);
  const sp = cfg.valveSpring;
  const solid = (sp.activeTurns + 1.5) * sp.wireRadius * 2;
  const minLen = sp.length - cfg.valve.lift;
  if (minLen <= solid * 1.1) errors.push(`lò xo xupap bị nén gần sát vòng (${minLen.toFixed(2)} / ${solid.toFixed(2)} cm)`);
  const summary =
    `dung tích ${k.displacement.toFixed(1)} cc · tỉ số nén ${cr.toFixed(2)} ✓ · ` +
    `khe hở xupap–piston ${minGap.toFixed(2)} cm ✓ · lò xo xupap còn ${minLen.toFixed(2)} cm ✓`;
  return { errors, summary };
}

export function checkDrive({ crank }, duration, beats, step = 1 / 60) {
  const errors = [];
  const seen = new Set();
  const beatAt = (t) => beats.find((b) => t >= b.start && t < b.end) || beats[beats.length - 1];
  let prev = crank(0);
  for (let t = step; t <= duration + 1e-9; t += step) {
    const cur = crank(t);
    const b = beatAt(t);
    const report = (code, msg) => {
      if (seen.has(code + b.id)) return;
      seen.add(code + b.id);
      errors.push(`beat "${b.id}" (t=${t.toFixed(2)} s): ${msg}`);
    };
    if (cur < prev - 1e-6) report("back", "trục khuỷu quay ngược — `drive.crank.to` phải không nhỏ hơn cảnh trước");
    const speed = (cur - prev) / step;
    if (speed > LIMITS.maxDegPerSec)
      report(
        "fast",
        `trục khuỷu quay ${Math.round(speed)}°/s > ${LIMITS.maxDegPerSec}°/s — giảm số vòng trong cảnh hoặc kéo dài ramp`
      );
    prev = cur;
  }
  return errors;
}

// Cảnh báo khi hiệu ứng không khớp với chuyển động thực trong cảnh
export function warnings(beats, { crank }) {
  const warns = [];
  for (const b of beats) {
    const samples = [];
    for (let t = b.start; t < b.end; t += 0.05) samples.push(kin.state(crank(t)));
    const has = (name) => (b.arrows || []).includes(name);
    const moved = samples.length && Math.abs(samples[samples.length - 1].theta - samples[0].theta) > 1;
    if (has("intakeFlow") && !samples.some((s) => s.liftIn > 0.2))
      warns.push(`beat "${b.id}": mũi tên khí nạp nhưng xupap nạp đóng suốt cảnh`);
    if (has("exhaustFlow") && !samples.some((s) => s.liftEx > 0.2))
      warns.push(`beat "${b.id}": mũi tên khí xả nhưng xupap xả đóng suốt cảnh`);
    if (has("powerPush") && !samples.some((s) => s.stroke === 2 && s.cycle < 500))
      warns.push(`beat "${b.id}": mũi tên lực nổ nhưng cảnh không có kỳ nổ`);
    if ((has("pistonMove") || has("crankSpin")) && !moved)
      warns.push(`beat "${b.id}": mũi tên chuyển động nhưng trục khuỷu đứng yên trong cảnh`);
    if ((b.cut || []).length && !["sideCut", "headCut", "crankCut"].includes(b.shot))
      warns.push(`beat "${b.id}": cắt lớp nhưng shot "${b.shot}" khó nhìn thấy mặt cắt`);
  }
  return warns;
}
