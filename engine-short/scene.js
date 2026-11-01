// Short "Động cơ 4 kỳ hoạt động thế nào?" — chạy hoàn toàn từ spec.json.
// File này chỉ khai báo "từ vựng" mà kịch bản được dùng: góc máy, mặt cắt, mũi tên.
import * as THREE from "three";
import spec from "./spec.json" with { type: "json" };
import { keyframes } from "./lib/mech.js";
import { createEngineAssembly } from "./lib/engine.js";
import { createDirector } from "./lib/director.js";
import { createStage, createOverlay, applyEffects, startLoop } from "./lib/stage.js";
import * as FX from "./lib/fx.js";

export const DURATION = spec.duration;

// ---------- Cơ cấu: góc trục khuỷu theo kịch bản ----------
const engine = createEngineAssembly();
const crankAt = keyframes(spec.drive.crank);
const { kin } = engine;
const { portIn, portEx } = engine.geometry;

// ---------- Từ vựng: góc máy [đích nhìn x, y, z, khoảng cách, yaw, pitch] ----------
const SHOTS = {
  hero: [0, 9.5, 0, 54, 0.55, 0.12],
  overview: [0, 9.5, 0, 60, 0.8, 0.22],
  sideCut: [0, 9.0, 0, 42, 0.12, 0.05],
  headCut: [0, 17.6, 0, 27, 0.18, 0.1],
  crankCut: [0, 2.0, 0, 30, 0.22, 0.06],
};
const director = createDirector(spec, { shots: SHOTS });

// ---------- Từ vựng: mặt cắt — bổ đôi động cơ theo mặt phẳng z = 0, bỏ nửa phía camera ----------
const CUTS = {
  engine: {
    plane: { normal: [0, 0, -1], point: [0, 0, 0], sweep: 7 },
    parts: ["crankcase", "cylinder", "head"],
    noCap: ["gas"], // khối khí trong suốt: chỉ cắt, không tô nắp
  },
};

// ---------- Sân khấu ----------
const stage = createStage({ mount: document.getElementById("stage") });
const rig = engine.rig;
stage.scene.add(rig);

// ---------- Từ vựng: mũi tên ----------
const MAX_VEL = 0.0485; // vận tốc piston lớn nhất (cm/độ) để chuẩn hoá
const ARROWS = {
  // Chiều quay trục khuỷu (cùng chiều kim đồng hồ khi nhìn từ phía trước)
  crankSpin: (() => {
    const a = FX.arcArrow({ radius: 5.8, arc: Math.PI * 1.3, color: 0xe5e7eb });
    a.scale.x = -1; // cung ngược kim đồng hồ → lật thành cùng chiều kim đồng hồ
    a.rotation.z = -0.4;
    a.position.z = 3.8;
    rig.add(a);
    return { obj: a };
  })(),
  // Piston lên / xuống: mũi tên bên trái xi-lanh, đổi chiều theo vận tốc, mờ khi gần điểm chết
  pistonMove: (() => {
    const a = FX.straightArrow({ length: 2.6, shaft: 0.18, head: 0.7, color: 0xe5e7eb });
    rig.add(a);
    return {
      obj: a,
      update: (st) => {
        const up = st.pistonVel > 0;
        a.rotation.z = up ? Math.PI / 2 : -Math.PI / 2;
        a.position.set(-6.4, st.crown + (up ? -2.2 : 0.6), 0);
        return Math.min(1, Math.abs(st.pistonVel) / (MAX_VEL * 0.5));
      },
    };
  })(),
  // Khí nạp đi vào qua cửa nạp — chỉ hiện khi xupap nạp mở
  intakeFlow: (() => {
    const g = new THREE.Group();
    const a = FX.straightArrow({ length: 3.0, shaft: 0.2, head: 0.8, color: 0x38bdf8 });
    g.add(a);
    const [from, to] = [portIn[1], portIn[0]];
    g.position.set(from[0] + 0.6, from[1] - 0.5, 0);
    g.rotation.z = Math.atan2(to[1] - from[1], to[0] - from[0]);
    rig.add(g);
    return { obj: g, update: (st) => st.liftIn / engine.cfg.valve.lift };
  })(),
  // Khí cháy đi ra qua cửa xả — chỉ hiện khi xupap xả mở
  exhaustFlow: (() => {
    const g = new THREE.Group();
    const a = FX.straightArrow({ length: 3.0, shaft: 0.2, head: 0.8, color: 0x9ca3af });
    g.add(a);
    const [from, to] = [portEx[0], portEx[1]];
    g.position.set(from[0] + 0.9, from[1] + 0.6, 0);
    g.rotation.z = Math.atan2(to[1] - from[1], to[0] - from[0]);
    rig.add(g);
    return { obj: g, update: (st) => st.liftEx / engine.cfg.valve.lift };
  })(),
  // Áp suất khí cháy đẩy piston xuống — chỉ trong kỳ nổ
  powerPush: (() => {
    const g = new THREE.Group();
    [-1.2, 0, 1.2].forEach((x) => {
      const a = FX.straightArrow({ length: 2.0, shaft: 0.18, head: 0.7, color: 0xfacc15 });
      a.rotation.z = -Math.PI / 2;
      a.position.x = x;
      g.add(a);
    });
    rig.add(g);
    return {
      obj: g,
      update: (st) => {
        g.position.y = st.crown + 2.3;
        const c = st.cycle - 360;
        return c >= 0 && c < 180 ? Math.min(1, c / 15) * (1 - Math.max(0, (c - 120) / 60)) : 0;
      },
    };
  })(),
};
Object.values(ARROWS).forEach((a) => FX.setOpacity(a.obj, 0));

// ---------- Nhãn + phụ đề ----------
const overlay = createOverlay({
  stage,
  director,
  rig,
  tagsEl: document.getElementById("tags"),
  capEl: document.getElementById("cap"),
  subEl: document.getElementById("sub"),
});

// ---------- Bảng số liệu: kỳ, góc trục khuỷu, xupap + biểu đồ thời điểm đóng mở ----------
const $ = (id) => document.getElementById(id);
const STROKE_COLORS = ["#60a5fa", "#22d3ee", "#fb923c", "#9ca3af"];
const CH = { w: 960, h: 100, base: 112 };
let chartReady = false;
function drawTimingChart() {
  const ptsIn = [];
  const ptsEx = [];
  for (let c = 0; c <= 720; c += 4) {
    const s = kin.state(c);
    const x = (c / 720) * CH.w;
    ptsIn.push(`${x},${CH.base - (s.liftIn / engine.cfg.valve.lift) * CH.h}`);
    ptsEx.push(`${x},${CH.base - (s.liftEx / engine.cfg.valve.lift) * CH.h}`);
  }
  $("line-in").setAttribute("points", ptsIn.join(" "));
  $("line-ex").setAttribute("points", ptsEx.join(" "));
  chartReady = true;
}

function updateHud(t, st) {
  if (!$("v-angle")) return; // HUD là sub-composition, có thể chưa được gắn vào trang
  if (!chartReady) drawTimingChart();
  const k = director.level("hud", "hud", t);
  $("hud").style.opacity = k;
  $("hud").style.transform = `translateY(${(1 - k) * 40}px)`;
  for (let i = 0; i < 4; i++) {
    const el = $(`st-${i}`);
    const on = i === st.stroke;
    el.classList.toggle("on", on);
    el.style.background = on ? STROKE_COLORS[i] : "";
  }
  $("v-angle").textContent = `${Math.round(st.cycle)}°`;
  $("b-angle").style.width = (st.cycle / 720) * 100 + "%";
  const lift = (v) => v / engine.cfg.valve.lift;
  $("v-in").textContent = st.liftIn > 0.02 ? "Mở" : "Đóng";
  $("v-ex").textContent = st.liftEx > 0.02 ? "Mở" : "Đóng";
  $("b-in").style.width = lift(st.liftIn) * 100 + "%";
  $("b-ex").style.width = lift(st.liftEx) * 100 + "%";
  const x = (st.cycle / 720) * CH.w;
  $("cursor").setAttribute("x1", x);
  $("cursor").setAttribute("x2", x);
}

// ---------- Vòng render ----------
export function renderFrame() {
  const t = window.__hfThreeTime || 0;
  const st = engine.update(crankAt(t));
  applyEffects({ director, t, state: st, parts: engine.parts, cuts: CUTS, arrows: ARROWS });
  rig.updateMatrixWorld(true);
  stage.placeCamera(rig, director.cameraAt(t));
  stage.render();
  overlay(t, engine.anchors());
  updateHud(t, st);
}

startLoop(renderFrame);
