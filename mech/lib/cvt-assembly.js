// Cụm CVT lắp ráp hoàn chỉnh + động học sang số.
// Mọi đại lượng suy ra từ một biến tiến độ sang số s ∈ [0, 1]:
//   bi văng văng ra ρ(s) → má puli trước khép lại x1 (qua rãnh dốc) → dây leo lên r1
//   → chiều dài dây không đổi ⇒ r2 → má puli sau mở ra x2 → lò xo bị nén.
import * as THREE from "three";
import { styledMesh, TAU } from "./mech.js";
import {
  HALF_V,
  COLORS,
  meshes,
  beltPath,
  sheaveOffsetForRadius,
  coilSpringGeometry,
} from "./cvt.js";

export const DEFAULT_CVT = {
  front: { rOut: 5.8, rIn: 2.2, hubRadius: 1.6, bore: 0.9, thickness: 0.35, hubLength: 1.6 },
  rear: { rOut: 7.0, rIn: 2.6, hubRadius: 1.8, bore: 1.0, thickness: 0.35, hubLength: 1.6 },
  belt: { width: 2.0, thickness: 1.0 },
  C: 24, // khoảng cách tâm hai trục
  r1Low: 3.2, // bán kính dây ở puli trước khi số thấp nhất
  r2Low: 6.3, // ... và ở puli sau (cùng xác định chiều dài dây)
  r1High: 5.3, // bán kính dây ở puli trước khi số cao nhất
  roller: { radius: 0.9, width: 1.3, count: 6, rhoMin: 2.6, rhoMax: 4.2 },
  spring: { coilRadius: 2.6, wireRadius: 0.22, activeTurns: 5, length: 8 },
};

// Giải r2 sao cho chiều dài dây bằng L (chiều dài dây tăng đơn điệu theo r2 → chia đôi).
export function solveRearRadius(r1, L, C) {
  let lo = 0.5;
  let hi = C - r1 - 0.01;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (beltPath(r1, mid, C).length < L) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Động học thuần (không phụ thuộc Three.js): trả về hàm state(s).
export function cvtKinematics(cfg = DEFAULT_CVT) {
  const tan = Math.tan(HALF_V);
  const L = beltPath(cfg.r1Low, cfg.r2Low, cfg.C).length;
  const { rhoMin, rhoMax } = cfg.roller;
  // Hành trình má di động để dây lên tới r1High; suy ra độ dốc rãnh bi văng.
  const x1Max = 2 * tan * (cfg.r1High - cfg.r1Low);
  const rampSlope = x1Max / (rhoMax - rhoMin);

  function state(s) {
    s = Math.min(1, Math.max(0, s));
    const rho = rhoMin + s * (rhoMax - rhoMin);
    const x1 = (rho - rhoMin) * rampSlope; // má di động trước tiến về phía dây
    const r1 = cfg.r1Low + x1 / (2 * tan); // chỉ một má di chuyển → rãnh hẹp đi x1
    const r2 = solveRearRadius(r1, L, cfg.C);
    const x2 = 2 * tan * (cfg.r2Low - r2); // má di động sau lùi ra, nén lò xo
    return {
      s,
      rho,
      x1,
      r1,
      r2,
      x2,
      ratio: r2 / r1, // tỉ số truyền puli (vòng puli trước / vòng puli sau)
      springLength: cfg.spring.length - x2,
    };
  }

  return { state, beltLength: L, rampSlope, x1Max };
}

// Rãnh dốc sau lưng má di động trước (gốc toạ độ của má, mặt côn hướng +z, lưng ở z = -thickness).
// Bề mặt dốc: z(ρ) = -thickness - h0 - (ρ - rhoMin)·slope, càng ra ngoài càng nhô về phía bi văng.
function rampWedgeGeometry({ rho0, rho1, rhoMin, slope, thickness, h0, width }) {
  const zr = (rho) => -thickness - h0 - (rho - rhoMin) * slope;
  const shape = new THREE.Shape();
  shape.moveTo(rho0, -thickness);
  shape.lineTo(rho1, -thickness);
  shape.lineTo(rho1, zr(rho1));
  shape.lineTo(rho0, zr(rho0));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  // Shape nằm trong mặt (x = ρ, y = z); rotateX đưa y → z, chiều đùn → phương tiếp tuyến
  geo.translate(0, 0, -width / 2);
  geo.rotateX(Math.PI / 2);
  return geo;
}

// Dựng cụm CVT. Gốc: tâm puli trước; puli sau ở (C, 0); trục quay là z.
// Trả về { rig, kin, update(frame), anchors() }.
export function createCvtAssembly(cfg = DEFAULT_CVT, { xrayFront = true } = {}) {
  const kin = cvtKinematics(cfg);
  const { front: F, rear: R, belt: B, roller: RL, spring: SP } = cfg;
  const d1 = sheaveOffsetForRadius(cfg.r1Low, F, B);
  const d2 = sheaveOffsetForRadius(cfg.r2Low, R, B);
  const h0 = 0.15;
  const rollerZ = -d1 - F.thickness - h0 - RL.radius;

  const rig = new THREE.Group();

  // ----- Puli trước (puli dẫn, gắn trục khuỷu) -----
  const front = new THREE.Group();
  const fFixed = meshes.sheave({ ...F, fins: 12, mirror: true });
  fFixed.position.z = d1;
  const fMovable = new THREE.Group();
  fMovable.add(meshes.sheave({ ...F }, COLORS.sheaveMovable));
  for (let i = 0; i < RL.count; i++) {
    const wedge = styledMesh(
      rampWedgeGeometry({
        rho0: RL.rhoMin - 0.3,
        rho1: RL.rhoMax + 0.4,
        rhoMin: RL.rhoMin,
        slope: kin.rampSlope,
        thickness: F.thickness,
        h0,
        width: RL.width + 0.3,
      }),
      COLORS.sheaveMovable,
      { doubleSide: true, metalness: 0.35, roughness: 0.4 }
    );
    wedge.rotation.z = (i / RL.count) * TAU;
    fMovable.add(wedge);
  }
  if (xrayFront) {
    // Bi văng nằm sau má puli: làm 2 má trong suốt để thấy được
    [fFixed, fMovable].forEach((m) =>
      m.traverse((o) => {
        if (!o.material) return;
        o.material.transparent = true;
        o.material.opacity = o.isLineSegments ? 0.35 : 0.3;
        o.material.depthWrite = false;
      })
    );
  }
  front.add(fFixed, fMovable);

  const rollers = [];
  for (let i = 0; i < RL.count; i++) {
    const a = (i / RL.count) * TAU;
    const holder = new THREE.Group();
    holder.rotation.z = a;
    const r = meshes.roller(RL);
    r.rotation.x = Math.PI / 2; // trục con lăn theo phương tiếp tuyến
    holder.add(r);
    front.add(holder);
    rollers.push(r);
  }
  const rampPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(RL.rhoMax + RL.radius + 0.3, RL.rhoMax + RL.radius + 0.3, 0.3, 64).rotateX(
      Math.PI / 2
    ),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.6, transparent: true, opacity: 0.55 })
  );
  rampPlate.position.z = rollerZ - RL.radius - 0.15;
  const frontShaft = meshes.shaft();
  frontShaft.position.z = rampPlate.position.z - 1.2;
  front.add(rampPlate, frontShaft);
  rig.add(front);

  // ----- Puli sau (puli bị dẫn, lò xo ép) -----
  const rear = new THREE.Group();
  rear.position.x = cfg.C;
  const rFixed = meshes.sheave({ ...R });
  rFixed.position.z = -d2;
  const rMovable = meshes.sheave({ ...R, mirror: true }, COLORS.sheaveMovable);
  const springHolder = new THREE.Group();
  const seat = new THREE.Mesh(
    new THREE.CylinderGeometry(SP.coilRadius + 0.8, SP.coilRadius + 0.8, 0.3, 64).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.6 })
  );
  const springZ0 = d2 + R.thickness; // lưng má di động khi số thấp
  seat.position.z = springZ0 + SP.length + 0.15;
  const rearShaft = meshes.shaft({
    segments: [
      [1.0, 2.5],
      [1.25, 1.0],
      [0.95, 12.5],
    ],
    spline: { segment: 2, teeth: 16, depth: 0.12 },
  });
  rearShaft.position.z = -d2 - R.hubLength - 2.5;
  rear.add(rFixed, rMovable, springHolder, seat, rearShaft);
  rig.add(rear);

  const beltHolder = new THREE.Group();
  rig.add(beltHolder);

  let current = kin.state(0);
  let lastSpringLen = null;

  function disposeChildren(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    g.clear();
  }

  // frame: { s, angleFront, angleRear, beltPhase } — tất cả đã là hàm của t ở phía gọi
  function update({ s = 0, angleFront = 0, angleRear = 0, beltPhase = 0 } = {}) {
    const st = kin.state(s);
    current = st;

    front.rotation.z = angleFront;
    fMovable.position.z = -d1 + st.x1;
    rollers.forEach((r) => r.position.set(st.rho, 0, rollerZ));

    rear.rotation.z = angleRear;
    rMovable.position.z = d2 + st.x2;
    if (lastSpringLen === null || Math.abs(st.springLength - lastSpringLen) > 1e-4) {
      disposeChildren(springHolder);
      const spring = meshes.spring({ ...SP, length: st.springLength });
      spring.position.z = springZ0 + st.x2;
      springHolder.add(spring);
      lastSpringLen = st.springLength;
    }

    // Mặt phẳng giữa dây lệch theo hành trình má di động (dây chạy hơi lệch trục — có thật)
    disposeChildren(beltHolder);
    const belt = meshes.belt({ ...B, r1: st.r1, r2: st.r2, C: cfg.C, phase: beltPhase });
    belt.position.z = (st.x1 + st.x2) / 4;
    beltHolder.add(belt);
    return st;
  }

  // Điểm neo (toạ độ cục bộ trong rig) để gắn nhãn, theo trạng thái hiện tại
  function anchors() {
    const st = current;
    return {
      frontPulley: [0, F.rOut + 0.4, d1 + 0.5],
      frontMovable: [0, -F.rOut, -d1 + st.x1],
      rollers: [0, -st.rho, rollerZ],
      belt: [cfg.C / 2, -(st.r1 + st.r2) / 2 + 0.4, 0],
      rearPulley: [cfg.C, R.rOut + 0.2, -d2],
      rearMovable: [cfg.C, -R.rOut, d2 + st.x2],
      spring: [cfg.C, -SP.coilRadius, springZ0 + st.x2 + st.springLength / 2],
      rearShaftEnd: [cfg.C, 0, rearShaft.position.z + 15.5],
    };
  }

  // Bộ phận theo tên (mỗi tên → danh sách Object3D) để kịch bản gọi highlight / cắt lớp
  const parts = {
    frontFixed: [fFixed],
    frontMovable: [fMovable],
    frontPulley: [fFixed, fMovable, rampPlate],
    rollers,
    rampPlate: [rampPlate],
    frontShaft: [frontShaft],
    rearFixed: [rFixed],
    rearMovable: [rMovable],
    rearPulley: [rFixed, rMovable],
    spring: [springHolder],
    seat: [seat],
    rearShaft: [rearShaft],
    belt: [beltHolder],
  };

  update({ s: 0 });
  return { rig, kin, update, anchors, parts, front, rear, cfg, d1, d2 };
}
