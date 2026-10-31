// Bộ phận hộp số vô cấp CVT (xe tay ga). Đơn vị: cm. Trục quay của mọi bộ phận tròn xoay là trục z.
// Kích thước mặc định lấy theo cỡ thông dụng của xe 110–125cc.
import * as THREE from "three";
import { styledMesh, latheZ, TAU } from "./mech.js";

const DEG = Math.PI / 180;

// Nửa góc rãnh chữ V của puli và dây đai (dây đai CVT thường 28° → nửa góc 14°)
export const HALF_V = 14 * DEG;

// ---------- 1. Nửa puli côn (má puli) ----------
// Mặt côn hướng về +z. Tại bán kính r, mặt côn nằm ở z = (rOut - r)·tan(halfAngle).
// Lật bằng `mirror: true` để có má đối diện (mặt côn hướng về -z).
export function sheaveGeometry({
  rOut = 5.8,
  rIn = 2.2, // nơi mặt côn gặp moay-ơ
  hubRadius = 1.6,
  bore = 0.9,
  thickness = 0.35, // bề dày vành ngoài
  hubLength = 1.6, // moay-ơ nhô ra phía lưng
  halfAngle = HALF_V,
  fins = 0, // cánh tản nhiệt sau lưng (má cố định puli trước)
  mirror = false,
} = {}) {
  const h = (rOut - rIn) * Math.tan(halfAngle);
  const profile = [
    [bore, -hubLength],
    [hubRadius, -hubLength],
    [hubRadius, -thickness],
    [rOut, -thickness],
    [rOut, 0],
    [rIn, h],
    [bore, h],
    [bore, -hubLength],
  ];
  let geo = latheZ(profile, 96);

  if (fins > 0) {
    const parts = [geo];
    const finLen = rOut - hubRadius - 0.3;
    for (let i = 0; i < fins; i++) {
      const a = (i / fins) * TAU;
      const fin = new THREE.BoxGeometry(finLen, 0.18, 0.9);
      fin.translate(hubRadius + 0.15 + finLen / 2, 0, -thickness - 0.45);
      fin.rotateZ(a + 0.35); // cánh hơi xiên như quạt
      parts.push(fin.toNonIndexed());
    }
    geo = mergeGeometries([geo.toNonIndexed(), ...parts.slice(1)]);
  }
  if (mirror) {
    geo.scale(1, 1, -1);
    flipWinding(geo); // phép lật gương đảo chiều tam giác → đảo lại để pháp tuyến hướng ra ngoài
  }
  geo.computeVertexNormals();
  return geo;
}

// Khoảng cách từ mặt phẳng giữa dây đai tới gốc mỗi má puli, sao cho dây đai nằm ở bán kính r.
// Bề rộng rãnh tại r phải bằng bề rộng dây đai tại tâm tiết diện.
export function sheaveOffsetForRadius(r, { rOut, halfAngle = HALF_V }, belt) {
  const tan = Math.tan(halfAngle);
  const beltWidthAtCenter = belt.width - belt.thickness * tan;
  return beltWidthAtCenter / 2 + (rOut - r) * tan;
}

// ---------- 2. Dây đai răng (cogged V-belt) ----------
// Vòng dây hở quanh 2 puli: puli 1 tâm (0,0) bán kính r1, puli 2 tâm (C,0) bán kính r2, nằm trong mặt z = 0.
// r1, r2 là bán kính đường tâm tiết diện dây. `phase` (cm) dịch răng dọc dây để tạo chuyển động.
export function beltPath(r1, r2, C) {
  const alpha = Math.acos((r1 - r2) / C); // góc pháp tuyến của tiếp tuyến chung ngoài
  const tangentLen = Math.sqrt(C * C - (r2 - r1) * (r2 - r1));
  const arc1 = r1 * (TAU - 2 * alpha);
  const arc2 = r2 * (2 * alpha);
  const length = 2 * tangentLen + arc1 + arc2;
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  // Điểm và pháp tuyến hướng ra ngoài tại hoành độ cong s ∈ [0, length), chiều ngược kim đồng hồ.
  function at(s) {
    s = ((s % length) + length) % length;
    if (s < tangentLen) {
      // tiếp tuyến trên: từ puli 2 về puli 1
      const k = s / tangentLen;
      const p2 = [C + r2 * ca, r2 * sa];
      const p1 = [r1 * ca, r1 * sa];
      return { x: p2[0] + (p1[0] - p2[0]) * k, y: p2[1] + (p1[1] - p2[1]) * k, nx: ca, ny: sa };
    }
    s -= tangentLen;
    if (s < arc1) {
      const a = alpha + s / r1;
      return { x: r1 * Math.cos(a), y: r1 * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
    }
    s -= arc1;
    if (s < tangentLen) {
      // tiếp tuyến dưới: từ puli 1 sang puli 2
      const k = s / tangentLen;
      const p1 = [r1 * ca, -r1 * sa];
      const p2 = [C + r2 * ca, -r2 * sa];
      return { x: p1[0] + (p2[0] - p1[0]) * k, y: p1[1] + (p2[1] - p1[1]) * k, nx: ca, ny: -sa };
    }
    s -= tangentLen;
    const a = -alpha + s / r2;
    return { x: C + r2 * Math.cos(a), y: r2 * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
  }

  return { length, at, alpha, tangentLen };
}

export function beltGeometry({
  r1 = 3.2,
  r2 = 6.3,
  C = 24,
  width = 2.0, // bề rộng mặt lưng
  thickness = 1.0,
  halfAngle = HALF_V,
  cogPitch = 0.9, // bước răng mặt trong
  cogDepth = 0.35,
  phase = 0,
  samplesPerCm = 14,
} = {}) {
  const path = beltPath(r1, r2, C);
  const n = Math.ceil(path.length * samplesPerCm);
  const tan = Math.tan(halfAngle);
  const wOut = width / 2;
  const positions = [];
  const indices = [];

  // Tiết diện hình thang: 4 đỉnh (lưng-trái, lưng-phải, bụng-phải, bụng-trái).
  // Mặt bụng có răng: tại rãnh răng, bụng nâng lên cogDepth.
  for (let i = 0; i < n; i++) {
    const s = (i / n) * path.length;
    const p = path.at(s);
    const cog = ((((s + phase) / cogPitch) % 1) + 1) % 1;
    const inGroove = cog > 0.55; // 45% chu kỳ là rãnh
    const inner = -thickness / 2 + (inGroove ? cogDepth : 0);
    const outer = thickness / 2;
    const wIn = wOut - (outer - inner) * tan;
    const ring = [
      [outer, -wOut],
      [outer, wOut],
      [inner, wIn],
      [inner, -wIn],
    ];
    for (const [d, z] of ring) {
      positions.push(p.x + p.nx * d, p.y + p.ny * d, z);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 4;
    const b = ((i + 1) % n) * 4;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      indices.push(a + k, b + k, b + k2, a + k, b + k2, a + k2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geometry: geo, length: path.length };
}

// ---------- 3. Trục bậc có then hoa ----------
// segments: các đoạn [bán kính, chiều dài] nối tiếp theo +z, bắt đầu tại z = 0.
// spline: { segment: chỉ số đoạn có then hoa, teeth, depth }.
export function steppedShaftGeometry({
  segments = [
    [0.9, 3.0],
    [1.1, 1.2],
    [0.75, 4.5],
  ],
  spline = { segment: 2, teeth: 14, depth: 0.12 },
  chamfer = 0.08,
} = {}) {
  const profile = [[0, 0]];
  let z = 0;
  segments.forEach(([r, len], i) => {
    const c = Math.min(chamfer, len / 4);
    profile.push([r - c, z], [r, z + c], [r, z + len - c], [r - c, z + len]);
    z += len;
    if (i === segments.length - 1) profile.push([0, z]);
  });
  let geo = latheZ(profile, 48);

  if (spline) {
    const [r, len] = segments[spline.segment];
    const z0 = segments.slice(0, spline.segment).reduce((acc, [, l]) => acc + l, 0);
    const parts = [geo.toNonIndexed()];
    for (let i = 0; i < spline.teeth; i++) {
      const tooth = new THREE.BoxGeometry(spline.depth * 2, 0.12, len * 0.8);
      tooth.translate(r, 0, z0 + len * 0.55);
      tooth.rotateZ((i / spline.teeth) * TAU);
      parts.push(tooth.toNonIndexed());
    }
    geo = mergeGeometries(parts);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- 4. Bi văng (con lăn ly tâm) ----------
// Hình trụ trục z, bo mép, có lỗ ống lót. Khi lắp, trục con lăn nằm theo phương tiếp tuyến.
export function rollerGeometry({ radius = 0.9, width = 1.3, bore = 0.35, fillet = 0.18 } = {}) {
  const w = width / 2;
  const f = fillet;
  const profile = [[bore, -w]];
  // bo mép bằng cung 1/4 ở hai góc ngoài
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    profile.push([radius - f + f * Math.cos(a), -w + f + f * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    profile.push([radius - f + f * Math.cos(a), w - f + f * Math.sin(a)]);
  }
  profile.push([bore, w], [bore, -w]);
  const geo = latheZ(profile, 48);
  geo.computeVertexNormals();
  return geo;
}

// ---------- 5. Lò xo trụ xoắn (lò xo ép puli sau) ----------
// Hai đầu khép kín (bước = đường kính dây), phần giữa chia đều theo chiều dài.
// Đổi `length` theo thời gian để mô phỏng lò xo bị nén.
export function coilSpringGeometry({
  coilRadius = 2.6,
  wireRadius = 0.22,
  activeTurns = 5,
  endTurns = 0.75,
  length = 8,
  tubularPerTurn = 64,
} = {}) {
  const totalTurns = activeTurns + 2 * endTurns;
  const endPitch = wireRadius * 2;
  const endHeight = endTurns * endPitch;
  const activePitch = (length - 2 * endHeight - wireRadius * 2) / activeTurns;

  class Helix extends THREE.Curve {
    getPoint(u, target = new THREE.Vector3()) {
      const turns = u * totalTurns;
      let z;
      if (turns < endTurns) z = turns * endPitch;
      else if (turns < endTurns + activeTurns) z = endHeight + (turns - endTurns) * activePitch;
      else z = endHeight + activeTurns * activePitch + (turns - endTurns - activeTurns) * endPitch;
      const a = turns * TAU;
      return target.set(coilRadius * Math.cos(a), coilRadius * Math.sin(a), z + wireRadius);
    }
  }
  const geo = new THREE.TubeGeometry(
    new Helix(),
    Math.ceil(totalTurns * tubularPerTurn),
    wireRadius,
    12,
    false
  );
  return geo;
}

// ---------- Màu mặc định (stylized) ----------
export const COLORS = {
  sheave: 0xa8b3c2,
  sheaveMovable: 0x7f8ea3,
  belt: 0x3a3f4b,
  shaft: 0xc9ced6,
  roller: 0xfacc15,
  spring: 0xef4444,
};

// Dựng nhanh mesh có phong cách mặc định cho từng bộ phận
export const meshes = {
  sheave: (opts, color = COLORS.sheave) =>
    styledMesh(sheaveGeometry(opts), color, { doubleSide: true, metalness: 0.35, roughness: 0.4 }),
  belt: (opts) =>
    styledMesh(beltGeometry(opts).geometry, COLORS.belt, {
      edges: false,
      doubleSide: true,
      roughness: 0.85,
      metalness: 0,
    }),
  shaft: (opts) =>
    styledMesh(steppedShaftGeometry(opts), COLORS.shaft, { doubleSide: true, metalness: 0.5, roughness: 0.35 }),
  roller: (opts) => styledMesh(rollerGeometry(opts), COLORS.roller, { doubleSide: true, roughness: 0.5 }),
  spring: (opts) =>
    styledMesh(coilSpringGeometry(opts), COLORS.spring, { edges: false, metalness: 0.3, roughness: 0.4 }),
};

// ---------- Tiện ích nội bộ ----------
function flipWinding(geo) {
  const index = geo.getIndex();
  if (index) {
    const arr = index.array;
    for (let i = 0; i < arr.length; i += 3) [arr[i + 1], arr[i + 2]] = [arr[i + 2], arr[i + 1]];
    index.needsUpdate = true;
    return;
  }
  const pos = geo.getAttribute("position");
  const a = pos.array;
  for (let i = 0; i < a.length; i += 9) {
    for (let k = 0; k < 3; k++) [a[i + 3 + k], a[i + 6 + k]] = [a[i + 6 + k], a[i + 3 + k]];
  }
  pos.needsUpdate = true;
}

// Gộp các BufferGeometry không đánh chỉ số (chỉ cần position). Tránh phụ thuộc three/addons.
function mergeGeometries(geos) {
  const arrays = geos.map((g) => g.getAttribute("position").array);
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const a of arrays) {
    merged.set(a, offset);
    offset += a.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(merged, 3));
  return geo;
}
