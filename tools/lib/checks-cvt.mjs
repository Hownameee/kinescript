// Kiểm tra cơ khí cho video CVT, chạy trước khi render.
// 1. Cấu hình hình học: dây nằm trong vành puli, bi văng không chạm moay-ơ / vành, lò xo không bị nén tới sát vòng.
// 2. Kịch bản động cơ: vòng tua trong giới hạn, bi văng chỉ văng ra khi vòng tua đủ cao.
import { DEFAULT_CVT, cvtKinematics } from "../../mech/lib/cvt-assembly.js";

export const LIMITS = {
  rpmMin: 1500,
  rpmMax: 8500, // vạch đỏ động cơ
  shiftRpm: 4000, // dưới mức này lực ly tâm chưa đủ thắng lò xo → bi văng phải nằm trong
};

export function checkConfig(cfg = DEFAULT_CVT) {
  const errors = [];
  const kin = cvtKinematics(cfg);
  const th = cfg.belt.thickness / 2;
  for (const s of [0, 1]) {
    const st = kin.state(s);
    if (st.r1 + th > cfg.front.rOut) errors.push(`s=${s}: dây vượt vành puli trước (r1=${st.r1.toFixed(2)})`);
    if (st.r1 - th < cfg.front.rIn) errors.push(`s=${s}: dây chạm moay-ơ puli trước`);
    if (st.r2 + th > cfg.rear.rOut) errors.push(`s=${s}: dây vượt vành puli sau (r2=${st.r2.toFixed(2)})`);
    if (st.r2 - th < cfg.rear.rIn) errors.push(`s=${s}: dây chạm moay-ơ puli sau`);
  }
  const { rhoMin, rhoMax, radius } = cfg.roller;
  if (rhoMax + radius > cfg.front.rOut) errors.push("bi văng vượt vành puli trước khi văng hết");
  if (rhoMin - radius < cfg.front.hubRadius) errors.push("bi văng chạm moay-ơ khi nằm trong");
  const sp = cfg.spring;
  const solid = (sp.activeTurns + 1.5) * sp.wireRadius * 2; // chiều dài khi các vòng chạm nhau
  const minLen = kin.state(1).springLength;
  if (minLen <= solid * 1.1) errors.push(`lò xo bị nén gần sát vòng (${minLen.toFixed(2)} cm, sát vòng ${solid.toFixed(2)} cm)`);
  return { errors, kin, solid, minLen };
}

// rpmAt, shiftAt: hàm theo thời gian; beats: có start / end / id để báo lỗi đúng chỗ
export function checkDrive(rpmAt, shiftAt, duration, beats, step = 0.05) {
  const errors = [];
  const seen = new Set();
  const beatAt = (t) => beats.find((b) => t >= b.start && t < b.end) || beats[beats.length - 1];
  for (let t = 0; t <= duration + 1e-9; t += step) {
    const rpm = rpmAt(t);
    const s = shiftAt(t);
    const b = beatAt(t);
    const report = (code, msg) => {
      if (seen.has(code + b.id)) return;
      seen.add(code + b.id);
      errors.push(`beat "${b.id}" (t=${t.toFixed(2)} s): ${msg}`);
    };
    if (rpm < LIMITS.rpmMin || rpm > LIMITS.rpmMax)
      report("rpm", `vòng tua ${Math.round(rpm)} ngoài giới hạn ${LIMITS.rpmMin}–${LIMITS.rpmMax}`);
    if (s > 0.02 && rpm < LIMITS.shiftRpm)
      report(
        "shift",
        `bi văng đang văng ra (s=${s.toFixed(2)}) nhưng vòng tua chỉ ${Math.round(rpm)} < ${LIMITS.shiftRpm}: ` +
          `lực ly tâm không đủ thắng lò xo. Cho shift về 0 sớm hơn vòng tua (ramp ngắn hơn)`
      );
  }
  return errors;
}
