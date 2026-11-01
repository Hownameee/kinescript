// Sân khấu dùng chung cho mọi video: renderer, ánh sáng, camera theo director, nhãn, phụ đề,
// áp hiệu ứng theo kịch bản và vòng render theo `hf-seek` của HyperFrames.
// Mỗi chủ đề chỉ cần khai báo "từ vựng" (SHOTS, CUTS, ARROWS) và cập nhật cơ cấu.
import * as THREE from "three";
import * as FX from "./fx.js";

// view: vùng vẽ 3D theo toạ độ CSS { top, height } (phần còn lại dành cho phụ đề / HUD)
export function createStage({ W = 1080, H = 1920, view = { top: 300, height: 1100 }, bg = 0x0e1116, mount }) {
  // Adapter Three.js của HyperFrames tìm window.THREE để chờ asset load xong
  window.THREE = THREE;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  mount.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(bg);
  renderer.autoClear = false;
  FX.enableClipping(renderer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(5, 8, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ec5ff, 0.8);
  rim.position.set(-8, -2, -6);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(32, W / view.height, 0.1, 500);
  const tmp = new THREE.Vector3();

  // shot: [đích nhìn trong toạ độ rig x, y, z, khoảng cách, yaw, pitch]
  function placeCamera(rig, shot) {
    const [x, y, z, dist, yaw, pitch] = shot;
    const target = rig.localToWorld(tmp.set(x, y, z)).clone();
    camera.position.set(
      target.x + dist * Math.sin(yaw) * Math.cos(pitch),
      target.y + dist * Math.sin(pitch),
      target.z + dist * Math.cos(yaw) * Math.cos(pitch)
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  function render() {
    renderer.setViewport(0, 0, W, H);
    renderer.clear();
    renderer.setViewport(0, H - view.top - view.height, W, view.height);
    renderer.render(scene, camera);
  }

  // Toạ độ CSS của một điểm trong rig
  function project(rig, point) {
    rig.localToWorld(tmp.set(...point));
    tmp.project(camera);
    return [((tmp.x + 1) / 2) * W, view.top + ((1 - tmp.y) / 2) * view.height];
  }

  return { renderer, scene, camera, placeCamera, render, project, W, H, view };
}

// Nhãn bám vật thể + phụ đề, theo director
export function createOverlay({ stage, director, rig, tagsEl, capEl, subEl }) {
  const tagEls = director.tags.map((tag) => {
    const el = document.createElement("div");
    el.className = "tag";
    el.style.color = tag.color || "#e5e7eb";
    el.textContent = tag.text;
    tagsEl.appendChild(el);
    return el;
  });

  return function update(t, anchors) {
    director.tagsAt(t).forEach(({ tag, k }, i) => {
      const el = tagEls[i];
      el.style.opacity = k;
      if (k <= 0) return;
      const [x, y] = stage.project(rig, anchors[tag.anchor]);
      el.style.left = x + (tag.dx || 0) + "px";
      el.style.top = y + (tag.dy || 0) + "px";
    });
    const { main, sub, k } = director.captionAt(t);
    capEl.textContent = main;
    subEl.textContent = sub;
    capEl.classList.toggle("two-lines", main.length > 30);
    for (const el of [capEl, subEl]) {
      el.style.opacity = k;
      el.style.transform = `translateY(${(1 - k) * -24}px)`;
    }
  };
}

// Áp hiệu ứng của kịch bản (mỗi frame):
//   parts:  tên → [Object3D]           (highlight)
//   cuts:   tên → { plane, parts: [tên bộ phận], noCap?: [tên bộ phận] }
//   arrows: tên → { obj, update?(state) → hệ số 0–1 nhân thêm vào độ hiện }
export function applyEffects({ director, t, state, parts, cuts = {}, arrows = {} }) {
  const partsOf = (name) => {
    const list = parts[name];
    if (!list) throw new Error(`kịch bản gọi bộ phận không có: "${name}"`);
    return list;
  };
  director.names("highlight").forEach((name) => {
    const k = director.level("highlight", name, t);
    partsOf(name).forEach((o) => FX.applyHighlight(o, k, { t }));
  });
  director.names("cut").forEach((name) => {
    const cut = cuts[name];
    if (!cut) throw new Error(`kịch bản gọi mặt cắt không có: "${name}"`);
    const k = director.level("cut", name, t);
    cut.parts.forEach((p) => partsOf(p).forEach((o) => FX.applyCut(o, cut.plane, k)));
    (cut.noCap || []).forEach((p) => partsOf(p).forEach((o) => FX.applyCut(o, cut.plane, k, { caps: false })));
  });
  Object.entries(arrows).forEach(([name, a]) => {
    const f = a.update ? a.update(state) : 1;
    const factor = typeof f === "number" ? f : 1; // update có thể chỉ đặt vị trí, không trả hệ số
    FX.setOpacity(a.obj, director.level("arrows", name, t) * factor);
  });
}

// Vòng render: HyperFrames đặt thời gian qua event hf-seek (đáng tin hơn onUpdate của GSAP)
export function startLoop(renderFrame) {
  window.__hfThreeTime = 0;
  window.addEventListener("hf-seek", (e) => {
    if (e && e.detail && typeof e.detail.time === "number") window.__hfThreeTime = e.detail.time;
    renderFrame();
  });
  renderFrame();
}
