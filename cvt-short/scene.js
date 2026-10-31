// Short "Xe tay ga sang số thế nào?" — chạy hoàn toàn từ spec.json.
// File này chỉ khai báo "từ vựng" mà kịch bản được dùng: góc máy (shots), mũi tên (arrows), mặt cắt (cuts).
import * as THREE from "three";
import spec from "./spec.json" with { type: "json" };
import { TAU } from "./lib/mech.js";
import { createCvtAssembly } from "./lib/cvt-assembly.js";
import { createDrive } from "./lib/cvt-drive.js";
import { createDirector } from "./lib/director.js";
import * as FX from "./lib/fx.js";

// Adapter Three.js của HyperFrames tìm window.THREE để chờ asset load xong
window.THREE = THREE;

export const DURATION = spec.duration;
const W = 1080;
const H = 1920;
const VIEW = { top: 300, height: 1100 }; // vùng vẽ 3D (toạ độ CSS)
const BG = 0x0e1116;
const vn = (x, d = 0) => x.toFixed(d).replace(".", ",");

// ---------- Cơ cấu + động cơ ----------
const cvt = createCvtAssembly(undefined, { xrayFront: false }); // dùng cắt lớp thay cho X-ray
const drive = createDrive(cvt.kin, spec.drive, { duration: DURATION });
const { cfg, d1, d2 } = cvt;
const C = cfg.C;

// ---------- Từ vựng: góc máy [đích nhìn trong rig x, y, z, khoảng cách, yaw, pitch] ----------
const SHOTS = {
  hero: [C / 2, 0, 2, 62, 0.35, 0.05],
  overview: [C / 2, 0, 2, 70, 0.75, 0.18],
  frontCut: [0, 0, -1.0, 25, 1.35, 0.12],
  rear: [C, 0, 3, 40, 0.8, 0.16],
};
const director = createDirector(spec, { shots: SHOTS });

// ---------- Từ vựng: mặt cắt (toạ độ thế giới; rig đặt puli trước tại gốc) ----------
// Bổ đôi puli trước theo mặt phẳng chứa trục, bỏ nửa phía camera (x > 0)
const CUTS = {
  frontPulley: { normal: [-1, 0, 0], point: [0, 0, 0], sweep: 8 },
};

// ---------- Scene ----------
const canvas = document.createElement("canvas");
canvas.width = W;
canvas.height = H;
document.getElementById("stage").appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.setClearColor(BG);
renderer.autoClear = false;
FX.enableClipping(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.2));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(5, 8, 10);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9ec5ff, 0.8);
rim.position.set(-8, -2, -6);
scene.add(rim);

const rig = cvt.rig;
rig.rotation.z = -Math.PI / 2; // puli trước ở trên, puli sau ở dưới
scene.add(rig);
const camera = new THREE.PerspectiveCamera(32, W / VIEW.height, 0.1, 500);

// ---------- Từ vựng: mũi tên ----------
const F = cfg.front;
const R = cfg.rear;
const RL = cfg.roller;
const rollerZ = cvt.anchors().rollers[2];
const ARROWS = {
  frontSpin: (() => {
    const a = FX.arcArrow({ radius: F.rOut + 1.0, arc: Math.PI * 1.3, color: 0xe5e7eb });
    a.position.z = d1 + 2;
    rig.add(a);
    return { obj: a };
  })(),
  rearSpin: (() => {
    const a = FX.arcArrow({ radius: R.rOut + 1.0, arc: Math.PI * 1.3, color: 0xe5e7eb });
    a.position.set(C, 0, -d2 - 2);
    rig.add(a);
    return { obj: a };
  })(),
  // Lực ly tâm: mỗi bi văng một mũi tên hướng tâm ra ngoài, quay cùng puli
  centrifugal: (() => {
    const g = new THREE.Group();
    const arrows = [];
    for (let i = 0; i < RL.count; i++) {
      const holder = new THREE.Group();
      holder.rotation.z = (i / RL.count) * TAU;
      const a = FX.straightArrow({ length: 1.5, color: 0xfbbf24 });
      holder.add(a);
      g.add(holder);
      arrows.push(a);
    }
    cvt.front.add(g);
    return {
      obj: g,
      update: (st) => arrows.forEach((a) => a.position.set(st.rho + RL.radius + 0.2, 0, rollerZ)),
    };
  })(),
  // Má di động trước bị đẩy về phía dây (+z)
  sheavePush: (() => {
    const a = FX.straightArrow({ length: 2.2, color: 0xa5b4fc });
    a.rotation.y = -Math.PI / 2; // +x → +z
    rig.add(a);
    return { obj: a, update: (st) => a.position.set(0, -(F.rOut + 1.0), -d1 + st.x1 - 3.0) };
  })(),
  // Lò xo đẩy má sau về phía dây (-z)
  springPush: (() => {
    const g = new THREE.Group();
    // hai mũi tên hai bên lò xo cho dễ thấy dù camera ở góc nào
    [-1, 1].forEach((side) => {
      const a = FX.straightArrow({ length: 3.6, shaft: 0.2, head: 0.8, color: 0xfca5a5 });
      a.rotation.y = Math.PI / 2; // +x → -z
      a.position.y = side * (cfg.spring.coilRadius + 2.0);
      g.add(a);
    });
    rig.add(g);
    return { obj: g, update: (st) => g.position.set(C, 0, d2 + st.x2 + 7.5) };
  })(),
};
Object.values(ARROWS).forEach((a) => FX.setOpacity(a.obj, 0));

// ---------- Nhãn ----------
const tagsEl = document.getElementById("tags");
const tagEls = director.tags.map((tag) => {
  const el = document.createElement("div");
  el.className = "tag";
  el.style.color = tag.color || "#e5e7eb";
  el.textContent = tag.text;
  tagsEl.appendChild(el);
  return el;
});
const tmp = new THREE.Vector3();

function placeCamera(t) {
  const [x, y, z, dist, yaw, pitch] = director.cameraAt(t);
  const target = rig.localToWorld(tmp.set(x, y, z)).clone();
  camera.position.set(
    target.x + dist * Math.sin(yaw) * Math.cos(pitch),
    target.y + dist * Math.sin(pitch),
    target.z + dist * Math.cos(yaw) * Math.cos(pitch)
  );
  camera.lookAt(target);
  camera.updateMatrixWorld();
}

function placeTags(t) {
  const anchors = cvt.anchors();
  director.tagsAt(t).forEach(({ tag, k }, i) => {
    const el = tagEls[i];
    el.style.opacity = k;
    if (k <= 0) return;
    rig.localToWorld(tmp.set(...anchors[tag.anchor]));
    tmp.project(camera);
    el.style.left = ((tmp.x + 1) / 2) * W + (tag.dx || 0) + "px";
    el.style.top = VIEW.top + ((1 - tmp.y) / 2) * VIEW.height + (tag.dy || 0) + "px";
  });
}

// ---------- Phụ đề ----------
const capEl = document.getElementById("cap");
const subEl = document.getElementById("sub");
function placeCaption(t) {
  const { main, sub, k } = director.captionAt(t);
  capEl.textContent = main;
  subEl.textContent = sub;
  capEl.classList.toggle("two-lines", main.length > 30);
  for (const el of [capEl, subEl]) {
    el.style.opacity = k;
    el.style.transform = `translateY(${(1 - k) * -24}px)`;
  }
}

// ---------- Bảng số liệu (sub-composition hud.html) ----------
const $ = (id) => document.getElementById(id);
const RPM_MAX = 8000;
const KMH_MAX = 80;
const CHART = { w: 920, h: 170 };
const series = [];
for (let t = 0; t <= DURATION + 1e-9; t += 0.1) {
  const p = drive.physics(t);
  series.push([t, p.rpm, p.kmh]);
}
const cx = (t) => (t / DURATION) * CHART.w;
const cy = (v, max) => CHART.h - (v / max) * CHART.h;

function updateHud(t) {
  if (!$("v-rpm")) return; // HUD là sub-composition, có thể chưa được gắn vào trang
  const k = director.level("hud", "hud", t);
  $("hud").style.opacity = k;
  $("hud").style.transform = `translateY(${(1 - k) * 40}px)`;
  const p = drive.physics(t);
  $("v-rpm").textContent = vn(Math.round(p.rpm / 10) * 10).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  $("v-ratio").textContent = vn(p.st.ratio, 2);
  $("v-kmh").textContent = vn(p.kmh);
  $("b-rpm").style.width = (p.rpm / RPM_MAX) * 100 + "%";
  $("b-ratio").style.width = ((p.st.ratio - 0.6) / (2.1 - 0.6)) * 100 + "%";
  $("b-kmh").style.width = (p.kmh / KMH_MAX) * 100 + "%";
  const pts = series.filter(([ts]) => ts <= t);
  pts.push([t, p.rpm, p.kmh]);
  $("line-rpm").setAttribute("points", pts.map(([ts, r]) => `${cx(ts)},${cy(r, RPM_MAX)}`).join(" "));
  $("line-kmh").setAttribute("points", pts.map(([ts, , v]) => `${cx(ts)},${cy(v, KMH_MAX)}`).join(" "));
  $("dot-rpm").setAttribute("cx", cx(t));
  $("dot-rpm").setAttribute("cy", cy(p.rpm, RPM_MAX));
  $("dot-kmh").setAttribute("cx", cx(t));
  $("dot-kmh").setAttribute("cy", cy(p.kmh, KMH_MAX));
}

// ---------- Vòng render ----------
const partsOf = (name) => {
  const list = cvt.parts[name];
  if (!list) throw new Error(`spec gọi bộ phận không có: "${name}"`);
  return list;
};

export function renderFrame() {
  const t = window.__hfThreeTime || 0;
  const st = cvt.update(drive.frame(t));

  // Hiệu ứng theo kịch bản (áp lại mỗi frame vì dây đai, lò xo được dựng lại)
  director.names("highlight").forEach((name) => {
    const k = director.level("highlight", name, t);
    partsOf(name).forEach((o) => FX.applyHighlight(o, k, { t }));
  });
  director.names("cut").forEach((name) => {
    const k = director.level("cut", name, t);
    partsOf(name).forEach((o) => FX.applyCut(o, CUTS[name], k));
  });
  Object.entries(ARROWS).forEach(([name, a]) => {
    if (a.update) a.update(st);
    FX.setOpacity(a.obj, director.level("arrows", name, t));
  });

  rig.updateMatrixWorld(true);
  placeCamera(t);
  renderer.setViewport(0, 0, W, H);
  renderer.clear();
  renderer.setViewport(0, H - VIEW.top - VIEW.height, W, VIEW.height);
  renderer.render(scene, camera);

  placeTags(t);
  placeCaption(t);
  updateHud(t);
}

window.__hfThreeTime = 0;
window.addEventListener("hf-seek", (e) => {
  if (e && e.detail && typeof e.detail.time === "number") window.__hfThreeTime = e.detail.time;
  renderFrame();
});
renderFrame();
