// Lớp 3: hiệu ứng giải thích. Mọi hàm nhận cường độ k ∈ [0, 1] (đã tính từ t ở phía gọi)
// và áp lại trạng thái mỗi frame, nên dùng được cả với mesh dựng lại liên tục (dây đai, lò xo).
import * as THREE from "three";

// Lưu thuộc tính gốc của vật liệu ở lần chạm đầu tiên để khôi phục khi k = 0
function base(m) {
  if (!m.userData.fxBase) {
    m.userData.fxBase = {
      side: m.side,
      emissive: m.emissive ? m.emissive.getHex() : null,
      emissiveIntensity: m.emissiveIntensity ?? 1,
    };
  }
  return m.userData.fxBase;
}

function collect(root, pred) {
  const out = [];
  root.traverse((o) => {
    if (!o.userData.fxCap && pred(o)) out.push(o);
  });
  return out;
}

// ---------- Highlight: phát sáng nhấp nháy nhẹ ----------
export function applyHighlight(root, k, { color = 0xffc83d, t = 0, strength = 0.6 } = {}) {
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  collect(root, (o) => o.isMesh && o.material && o.material.emissive).forEach((o) => {
    const m = o.material;
    const b = base(m);
    if (k <= 0) {
      m.emissive.setHex(b.emissive);
      m.emissiveIntensity = b.emissiveIntensity;
    } else {
      m.emissive.setHex(color);
      m.emissiveIntensity = k * strength * pulse;
    }
  });
}

// ---------- Cắt lớp: mặt phẳng cắt + "nắp" tô màu ở mặt cắt ----------
// cut: { normal: [x,y,z], point: [x,y,z], sweep } toạ độ thế giới. Phần bị bỏ là phía -normal.
// k = 0: mặt phẳng lùi ra xa `sweep` (không cắt gì); k = 1: cắt đúng tại `point`.
// Nắp: vẽ mặt sau của chính mesh bằng màu đặc → nhìn vào mặt cắt thấy khối đặc (kỹ thuật cap giả).
const planes = new WeakMap();
export function applyCut(root, cut, k, { capColor = 0xe76f51 } = {}) {
  let plane = planes.get(root);
  if (!plane) {
    plane = new THREE.Plane();
    planes.set(root, plane);
  }
  const n = new THREE.Vector3(...cut.normal).normalize();
  plane.setFromNormalAndCoplanarPoint(n, new THREE.Vector3(...cut.point));
  plane.constant += (1 - k) * cut.sweep;
  const on = k > 0;

  collect(root, (o) => (o.isMesh || o.isLineSegments) && o.material).forEach((o) => {
    const m = o.material;
    const b = base(m);
    m.clippingPlanes = on ? [plane] : null;
    if (!o.isMesh) return;
    m.side = on ? THREE.FrontSide : b.side;
    let cap = o.userData.fxCapMesh;
    if (on && !cap) {
      cap = new THREE.Mesh(
        o.geometry,
        new THREE.MeshBasicMaterial({ color: capColor, side: THREE.BackSide })
      );
      cap.userData.fxCap = true;
      o.userData.fxCapMesh = cap;
      o.add(cap);
    }
    if (cap) {
      cap.visible = on;
      cap.material.clippingPlanes = [plane];
    }
  });
}

// ---------- Mũi tên ----------
function arrowMaterial(color) {
  // Luôn vẽ đè lên vật thể để không bị che
  return new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false });
}

// Mũi tên thẳng dọc +x, gốc tại (0,0,0)
export function straightArrow({ length = 2, shaft = 0.14, head = 0.45, color = 0xffffff } = {}) {
  const g = new THREE.Group();
  const mat = arrowMaterial(color);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(shaft, shaft, length - head, 16), mat);
  body.rotation.z = -Math.PI / 2;
  body.position.x = (length - head) / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(head * 0.55, head, 24), mat);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = length - head / 2;
  g.add(body, tip);
  g.renderOrder = 10;
  g.traverse((o) => (o.renderOrder = 10));
  return g;
}

// Mũi tên cung tròn trong mặt XY quanh trục z, từ góc 0 quay ngược kim đồng hồ một góc `arc`
export function arcArrow({ radius = 5, arc = Math.PI * 1.2, tube = 0.16, head = 0.6, color = 0xffffff } = {}) {
  const g = new THREE.Group();
  const mat = arrowMaterial(color);
  const headArc = head / radius;
  const body = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 96, arc - headArc), mat);
  const a = arc - headArc;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(head * 0.55, head, 24), mat);
  tip.position.set(radius * Math.cos(a), radius * Math.sin(a), 0);
  tip.position.add(new THREE.Vector3(-Math.sin(a), Math.cos(a), 0).multiplyScalar(head / 2));
  tip.rotation.z = a; // trục cone (+y) → phương tiếp tuyến
  g.add(body, tip);
  g.traverse((o) => (o.renderOrder = 10));
  return g;
}

// Đặt độ mờ cho cả nhóm (mũi tên, nhãn 3D…); ẩn hẳn khi gần 0
export function setOpacity(root, k) {
  root.visible = k > 0.01;
  root.traverse((o) => {
    if (o.material) {
      o.material.transparent = true;
      o.material.opacity = k;
    }
  });
}

export function enableClipping(renderer) {
  renderer.localClippingEnabled = true;
}
