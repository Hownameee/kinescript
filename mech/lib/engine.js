// Động cơ 4 kỳ 1 xi-lanh làm mát bằng gió, 2 xupap, 2 trục cam (DOHC giản lược). Đơn vị: cm.
// Mọi chuyển động suy ra từ một biến: góc trục khuỷu θ (độ, cộng dồn; θ = 0 là điểm chết trên đầu kỳ nạp).
//   piston: y = r·cosθ + √(l² − r²·sin²θ)       (cơ cấu tay quay – thanh truyền)
//   trục cam quay bằng ½ trục khuỷu; độ nâng xupap lấy từ chính biên dạng cam
import * as THREE from "three";
import { styledMesh, TAU } from "./mech.js";
import { coilSpringGeometry } from "./cvt.js";

const DEG = Math.PI / 180;

export const DEFAULT_ENGINE = {
  bore: 5.0, // đường kính xi-lanh
  stroke: 5.56, // hành trình piston → dung tích ≈ 109 cc
  rod: 9.0, // chiều dài thanh truyền (tâm – tâm)
  compression: 9.0, // tỉ số nén
  piston: { height: 4.0, pinHeight: 1.6 }, // chiều cao piston; tâm chốt cách đáy váy
  valve: { radius: 0.95, offset: 1.05, lift: 0.75 }, // xupap: bán kính nấm, lệch tâm x, độ nâng tối đa
  // cửa sổ mở xupap theo góc trục khuỷu trong chu trình 720°
  timing: { intake: [-10, 220], exhaust: [500, 730] },
  cam: { base: 0.6 },
  valveSpring: { coilRadius: 0.5, wireRadius: 0.06, activeTurns: 3, length: 1.5 },
};

// ---------- Động học thuần (không phụ thuộc Three.js) ----------
export function engineKinematics(cfg = DEFAULT_ENGINE) {
  const r = cfg.stroke / 2;
  const l = cfg.rod;
  const crownAbovePin = cfg.piston.height - cfg.piston.pinHeight;
  const crownTDC = r + l + crownAbovePin;
  const clearance = cfg.stroke / (cfg.compression - 1); // khe hở buồng đốt ở điểm chết trên
  const roof = crownTDC + clearance; // mặt dưới nắp máy
  const R = cfg.bore / 2;
  const displacement = Math.PI * R * R * cfg.stroke; // cm³ = cc

  // Biên dạng cam dạng (1 + cos)/2 quanh tâm cửa sổ — dùng chung cho hình cam và độ nâng xupap
  const camWindow = (win) => ({ center: (win[0] + win[1]) / 4, half: (win[1] - win[0]) / 4 }); // độ trục cam
  const camIn = camWindow(cfg.timing.intake);
  const camEx = camWindow(cfg.timing.exhaust);
  const bump = (u) => (Math.abs(u) >= 1 ? 0 : (1 + Math.cos(Math.PI * u)) / 2);
  function liftFor(cam, camDeg) {
    // khoảng cách góc ngắn nhất trên vòng 360° của trục cam
    const d = ((((camDeg - cam.center) % 360) + 540) % 360) - 180;
    return cfg.valve.lift * bump(d / cam.half);
  }

  const STROKES = ["Nạp", "Nén", "Nổ", "Xả"];

  function state(thetaDeg) {
    const th = thetaDeg * DEG;
    const s = Math.sin(th);
    const pinY = r * Math.cos(th) + Math.sqrt(l * l - r * r * s * s);
    const crankPin = [r * s, r * Math.cos(th)];
    const cycle = ((thetaDeg % 720) + 720) % 720;
    const camDeg = thetaDeg / 2;
    // vận tốc piston (cm / độ trục khuỷu), dấu cho biết đi lên / xuống
    const dy = -r * s * (1 + (r * Math.cos(th)) / Math.sqrt(l * l - r * r * s * s)) * DEG;
    return {
      theta: thetaDeg,
      cycle,
      stroke: Math.floor(cycle / 180), // 0 nạp, 1 nén, 2 nổ, 3 xả
      strokeName: STROKES[Math.floor(cycle / 180)],
      pinY,
      crown: pinY + crownAbovePin,
      crankPin,
      rodAngle: Math.atan2(-(0 - crankPin[0]), pinY - crankPin[1]), // quay +y của thanh truyền tới chốt piston
      pistonVel: dy,
      camDeg,
      liftIn: liftFor(camIn, camDeg),
      liftEx: liftFor(camEx, camDeg),
    };
  }

  return { state, r, l, R, roof, crownTDC, clearance, displacement, camIn, camEx, bump, STROKES };
}

// ---------- Bộ phận ----------
// Khối tròn xoay quanh trục y (piston, xupap, bugi đứng thẳng)
function latheY(profile, segments = 64) {
  return new THREE.LatheGeometry(
    profile.map(([rr, y]) => new THREE.Vector2(rr, y)),
    segments
  );
}

// Piston: váy rỗng, đỉnh phẳng, 2 rãnh xéc-măng. Gốc tại tâm chốt piston.
function pistonGeometry(R, H, pinH) {
  const b = -pinH; // đáy váy
  const t = H - pinH; // đỉnh
  const g = 0.12;
  return latheY([
    [R - 0.35, b],
    [R, b],
    [R, t - 1.0],
    [R - g, t - 1.0],
    [R - g, t - 0.85],
    [R, t - 0.85],
    [R, t - 0.6],
    [R - g, t - 0.6],
    [R - g, t - 0.45],
    [R, t - 0.45],
    [R, t],
    [0, t],
    [0, t - 0.6],
    [R - 0.35, t - 0.6],
    [R - 0.35, b],
  ]);
}

// Thanh truyền: đầu to tại gốc, đầu nhỏ tại (0, l), thân chữ I; đùn theo z
function rodGeometry(l) {
  const s = new THREE.Shape();
  s.absarc(0, 0, 1.5, Math.PI * 0.15, Math.PI * 0.85, true); // đầu to (nửa dưới vòng)
  s.lineTo(-0.5, l - 0.75);
  s.absarc(0, l, 0.85, Math.PI * 1.25, -Math.PI * 0.25, true); // đầu nhỏ
  s.lineTo(0.5, 1.3);
  s.closePath();
  const big = new THREE.Path();
  big.absarc(0, 0, 0.9, 0, TAU, true);
  const small = new THREE.Path();
  small.absarc(0, l, 0.45, 0, TAU, true);
  s.holes.push(big, small);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1, curveSegments: 32 });
  geo.translate(0, 0, -0.5);
  return geo;
}

// Má khuỷu: đầu quanh chốt khuỷu (0, r) + đối trọng nửa dưới
function crankWebGeometry(r) {
  const s = new THREE.Shape();
  s.absarc(0, 0, 3.6, Math.PI * 1.1, Math.PI * 1.9, false); // đối trọng
  s.absarc(0, r, 1.45, -Math.PI * 0.15, Math.PI * 1.15, false); // quanh chốt khuỷu
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 32 });
  geo.translate(0, 0, -0.3);
  return geo;
}

// Cam: bán kính r(ψ) = base + lift·bump((ψ − mũi)/nửa-bề-rộng), mũi cam hướng xuống (−y) khi góc quay = 0
function camGeometry(base, lift, halfDeg, bump) {
  const s = new THREE.Shape();
  const n = 180;
  for (let i = 0; i <= n; i++) {
    const psi = (i / n) * TAU;
    let d = (psi + Math.PI / 2) / DEG; // độ lệch so với hướng −y
    d = ((d % 360) + 540) % 360 - 180;
    const rr = base + lift * bump(d / halfDeg);
    const x = rr * Math.cos(psi);
    const y = rr * Math.sin(psi);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: false });
  geo.translate(0, 0, -0.5);
  return geo;
}

function zCylinder(radius, z0, z1, segs = 32) {
  const g = new THREE.CylinderGeometry(radius, radius, z1 - z0, segs);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}

function yCylinder(radius, y0, y1, segs = 48) {
  const g = new THREE.CylinderGeometry(radius, radius, y1 - y0, segs);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

// Ống thẳng từ a tới b (cửa nạp / xả)
function tube(a, b, radius) {
  const curve = new THREE.LineCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b));
  return new THREE.TubeGeometry(curve, 1, radius, 24, false);
}

export const ENGINE_COLORS = {
  piston: 0xd1d5db,
  rod: 0xf59e0b,
  crank: 0x94a3b8,
  cylinder: 0x6b7280,
  head: 0x8b95a3,
  intake: 0x38bdf8,
  exhaust: 0xf87171,
  cam: 0xa78bfa,
  spring: 0x22c55e,
  plug: 0xf5f5f4,
  crankcase: 0x4b5563,
};

// ---------- Cụm động cơ ----------
export function createEngineAssembly(cfg = DEFAULT_ENGINE) {
  const kin = engineKinematics(cfg);
  const { r, l, R, roof } = kin;
  const C = ENGINE_COLORS;
  const metal = { doubleSide: true, metalness: 0.4, roughness: 0.4 };
  const rig = new THREE.Group();

  // Vỏ máy (hộp trục khuỷu): ống rỗng trục z có 2 vách đầu
  const crankcase = styledMesh(
    new THREE.LatheGeometry(
      [
        [1.15, -3.4],
        [5.1, -3.4],
        [5.1, 3.4],
        [1.15, 3.4],
        [1.15, 2.9],
        [4.6, 2.9],
        [4.6, -2.9],
        [1.15, -2.9],
        [1.15, -3.4],
      ].map(([a, b]) => new THREE.Vector2(a, b)),
      72
    ).rotateX(Math.PI / 2),
    C.crankcase,
    { doubleSide: true, roughness: 0.7 }
  );

  // Xi-lanh: ống lót + cánh tản nhiệt
  const cylinder = new THREE.Group();
  const sleeveBottom = 4.2;
  cylinder.add(
    styledMesh(
      latheY([
        [R, sleeveBottom],
        [3.1, sleeveBottom],
        [3.1, roof],
        [R, roof],
        [R, sleeveBottom],
      ]),
      C.cylinder,
      { doubleSide: true, roughness: 0.6 }
    )
  );
  for (let y = 5.0; y < roof - 0.4; y += 0.75) {
    cylinder.add(styledMesh(yCylinder(5.0, y, y + 0.18), C.cylinder, { doubleSide: true, roughness: 0.6, edgeOpacity: 0.3 }));
  }

  // Nắp máy: khối đặc + cánh tản nhiệt + cửa nạp (trái) / xả (phải)
  const headTop = roof + 2.7;
  const head = new THREE.Group();
  head.add(styledMesh(yCylinder(3.4, roof, headTop), C.head, { doubleSide: true, roughness: 0.6 }));
  for (let y = roof + 0.5; y < headTop - 0.3; y += 0.75) {
    head.add(styledMesh(yCylinder(5.0, y, y + 0.18), C.head, { doubleSide: true, roughness: 0.6, edgeOpacity: 0.3 }));
  }
  const vx = cfg.valve.offset;
  const portIn = [[-vx, roof + 0.4, 0], [-5.6, roof + 3.4, 0]];
  const portEx = [[vx, roof + 0.4, 0], [5.6, roof + 3.4, 0]];
  head.add(styledMesh(tube(...portIn, 0.75), C.head, { doubleSide: true, edges: false }));
  head.add(styledMesh(tube(...portEx, 0.75), C.head, { doubleSide: true, edges: false }));

  // Piston + chốt
  const piston = new THREE.Group();
  piston.add(styledMesh(pistonGeometry(R - 0.02, cfg.piston.height, cfg.piston.pinHeight), C.piston, metal));
  piston.add(styledMesh(zCylinder(0.45, -2.3, 2.3), 0xe5e7eb, metal));

  // Thanh truyền
  const rod = styledMesh(rodGeometry(l), C.rod, { doubleSide: true, roughness: 0.45, metalness: 0.3 });

  // Trục khuỷu: cổ trục + 2 má khuỷu + chốt khuỷu
  const crank = new THREE.Group();
  crank.add(styledMesh(zCylinder(1.0, -4.2, -1.1), C.crank, metal));
  crank.add(styledMesh(zCylinder(1.0, 1.1, 4.2), C.crank, metal));
  [-0.8, 0.8].forEach((z) => {
    const w = styledMesh(crankWebGeometry(r), C.crank, metal);
    w.position.z = z;
    crank.add(w);
  });
  crank.add(styledMesh(zCylinder(0.9, -0.55, 0.55).translate(0, r, 0), C.crank, metal));

  // Xupap, lò xo, trục cam
  const sp = cfg.valveSpring;
  const springBase = headTop;
  const tipClosed = springBase + sp.length + 0.2;
  function valve(color, x) {
    const g = new THREE.Group();
    const vr = cfg.valve.radius;
    g.add(
      styledMesh(
        latheY([
          [0, 0],
          [vr, 0],
          [vr, 0.08],
          [0.35, 0.45],
          [0.14, 0.9],
          [0.14, tipClosed - roof],
          [0, tipClosed - roof],
        ]),
        color,
        metal
      )
    );
    // đĩa chặn lò xo: mặt dưới trùng đỉnh lò xo (headTop + chiều dài lò xo − độ nâng)
    g.add(styledMesh(yCylinder(0.6, tipClosed - roof - 0.2, tipClosed - roof - 0.05), color, metal));
    g.position.set(x, roof, 0);
    return g;
  }
  const valveIn = valve(C.intake, -vx);
  const valveEx = valve(C.exhaust, vx);
  const springs = new THREE.Group();

  const camY = tipClosed + cfg.cam.base;
  function camshaft(win, x, color) {
    const g = new THREE.Group();
    g.add(styledMesh(camGeometry(cfg.cam.base, cfg.valve.lift, win.half, kin.bump), color, metal));
    g.add(styledMesh(zCylinder(0.32, -2.5, 2.5), color, metal));
    g.position.set(x, camY, 0);
    return g;
  }
  const camIn = camshaft(kin.camIn, -vx, C.cam);
  const camEx = camshaft(kin.camEx, vx, C.cam);

  // Bugi: lệch về phía sau (z < 0) để không vướng 2 xupap
  const plugZ = -1.8;
  const plug = new THREE.Group();
  plug.add(
    styledMesh(
      latheY([
        [0, roof - 0.05],
        [0.12, roof - 0.05],
        [0.3, roof + 0.2],
        [0.45, roof + 0.2],
        [0.45, headTop + 0.3],
        [0.7, headTop + 0.3],
        [0.7, headTop + 0.9],
        [0.32, headTop + 1.0],
        [0.32, headTop + 2.6],
        [0, headTop + 2.6],
      ]),
      C.plug,
      { doubleSide: true, roughness: 0.3 }
    )
  );
  plug.position.z = plugZ;
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff7cc, transparent: true, opacity: 0 });
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), sparkMat);
  spark.position.set(0, roof - 0.15, plugZ);
  const sparkLight = new THREE.PointLight(0xffd27a, 0, 12, 1.5);
  sparkLight.position.copy(spark.position);

  // Khí trong xi-lanh: khối trụ từ đỉnh piston tới nắp máy, đổi màu theo kỳ
  const gasMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x000000,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    roughness: 1,
    side: THREE.DoubleSide, // khi bị cắt mất nửa trước, nửa còn lại quay mặt sau về camera
  });
  const gas = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 1, 48).translate(0, 0.5, 0), gasMat);

  rig.add(crankcase, cylinder, head, piston, rod, crank, valveIn, valveEx, springs, camIn, camEx, plug, spark, sparkLight, gas);

  let current = kin.state(0);
  let lastLifts = null;

  function disposeChildren(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    g.clear();
  }

  function gasLook(st) {
    const c = st.cycle;
    const col = new THREE.Color();
    let op = 0.3;
    let emi = 0;
    if (c < 180) {
      col.set(0x60a5fa); // hỗn hợp xăng + gió vào dần
      op = 0.2 + 0.4 * (c / 180);
    } else if (c < 360) {
      col.set(0x60a5fa).lerp(new THREE.Color(0x22d3ee), (c - 180) / 180); // bị nén, đặc lại
      op = 0.6 + 0.25 * ((c - 180) / 180);
    } else if (c < 540) {
      const k = (c - 360) / 180; // cháy: trắng vàng → cam → đỏ sẫm
      col.set(0xfff1a8).lerp(new THREE.Color(0xf97316), Math.min(1, k * 2.5)).lerp(new THREE.Color(0x7f1d1d), Math.max(0, k - 0.4));
      op = 0.9 - 0.35 * k;
      emi = Math.max(0, 1 - k * 1.8);
    } else {
      col.set(0x9ca3af); // khí cháy bị đẩy ra
      op = 0.55 * (1 - (c - 540) / 180) + 0.08;
    }
    return { col, op, emi };
  }

  function update(thetaDeg) {
    const st = kin.state(thetaDeg);
    current = st;
    crank.rotation.z = -thetaDeg * DEG; // chốt khuỷu tại (r·sinθ, r·cosθ)
    piston.position.set(0, st.pinY, 0);
    rod.position.set(st.crankPin[0], st.crankPin[1], 0);
    rod.rotation.z = st.rodAngle;

    valveIn.position.y = roof - st.liftIn;
    valveEx.position.y = roof - st.liftEx;
    // cam quay cùng chiều trục khuỷu (chiều kim đồng hồ) với ½ tốc độ; góc quay 0 = mũi cam ép xupap sâu nhất
    camIn.rotation.z = (kin.camIn.center - st.camDeg) * DEG;
    camEx.rotation.z = (kin.camEx.center - st.camDeg) * DEG;

    const lifts = `${st.liftIn.toFixed(4)}|${st.liftEx.toFixed(4)}`;
    if (lifts !== lastLifts) {
      disposeChildren(springs);
      [
        [-vx, st.liftIn],
        [vx, st.liftEx],
      ].forEach(([x, lift]) => {
        const s = styledMesh(coilSpringGeometry({ ...sp, length: sp.length - lift }), C.spring, {
          edges: false,
          metalness: 0.3,
          roughness: 0.4,
        });
        s.rotation.x = -Math.PI / 2; // trục lò xo z → y
        s.position.set(x, springBase, 0);
        springs.add(s);
      });
      lastLifts = lifts;
    }

    gas.position.y = st.crown;
    gas.scale.y = Math.max(0.01, roof - st.crown);
    const { col, op, emi } = gasLook(st);
    gasMat.color.copy(col);
    gasMat.opacity = op;
    gasMat.emissive.copy(col).multiplyScalar(emi);

    // Tia lửa bugi quanh 8° trước điểm chết trên kỳ nén
    const d = st.cycle - 352;
    const k = d > -6 && d < 14 ? Math.max(0, 1 - Math.abs(d) / (d < 0 ? 6 : 14)) : 0;
    sparkMat.opacity = k;
    spark.scale.setScalar(0.6 + 0.8 * k);
    sparkLight.intensity = 40 * k;
    return st;
  }

  function anchors() {
    const st = current;
    return {
      piston: [-R - 0.2, st.crown - 1.0, 0],
      rod: [(st.crankPin[0]) / 2, (st.crankPin[1] + st.pinY) / 2, 0],
      crank: [0, -3.0, 0],
      cylinder: [-5.0, 9.0, 0],
      chamber: [0, (st.crown + roof) / 2, 0],
      intakeValve: [-vx, roof + 1.2, 0],
      exhaustValve: [vx, roof + 1.2, 0],
      intakeCam: [-vx, camY + 0.8, 0],
      exhaustCam: [vx, camY + 0.8, 0],
      sparkPlug: [0, headTop + 2.0, plugZ],
      intakePort: portIn[1],
      exhaustPort: portEx[1],
    };
  }

  const parts = {
    piston: [piston],
    rod: [rod],
    crank: [crank],
    cylinder: [cylinder],
    head: [head],
    crankcase: [crankcase],
    intakeValve: [valveIn],
    exhaustValve: [valveEx],
    valveSprings: [springs],
    intakeCam: [camIn],
    exhaustCam: [camEx],
    sparkPlug: [plug],
    gas: [gas],
  };

  update(0);
  return { rig, kin, cfg, update, anchors, parts, gas, geometry: { roof, headTop, camY, portIn, portEx, plugZ, tipClosed } };
}
