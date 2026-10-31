// Mech — lõi thư viện cơ khí cho Three.js: phong cách mesh, khối tròn xoay, tiện ích thời gian.
// Nguyên tắc: mọi tư thế là hàm thuần của thời gian t (giây), không mô phỏng từng bước,
// để HyperFrames seek tới frame bất kỳ đều cho cùng một kết quả.
import * as THREE from "three";

export const TAU = Math.PI * 2;

// ---------- Lớp 1: bộ phận tham số ----------

// Mesh có màu phẳng + viền nét (phong cách "stylized").
// edges: false để bỏ viền (vd. lò xo, dây đai — lưới dày làm viền rối mắt).
export function styledMesh(
  geometry,
  color,
  {
    edgeColor = 0x111111,
    edgeOpacity = 0.55,
    edgeThreshold = 30,
    edges = true,
    roughness = 0.55,
    metalness = 0.15,
    doubleSide = false,
  } = {}
) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    })
  );
  group.add(mesh);
  if (edges) {
    group.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, edgeThreshold),
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity })
      )
    );
  }
  return group;
}

// Tròn xoay một biên dạng kín (r, z) quanh trục z. Dùng chung cho puli, trục bậc, bi văng.
export function latheZ(profile, segments = 72) {
  const geo = new THREE.LatheGeometry(
    profile.map(([r, z]) => new THREE.Vector2(r, z)),
    segments
  );
  geo.rotateX(Math.PI / 2); // trục Y của Lathe → trục Z
  return geo;
}

// ---------- Tiện ích thời gian ----------

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
// Tiến độ 0→1 trong khoảng [a, b], làm mượt
export function ease(t, a, b) {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}

// Hàm theo thời gian từ các mốc [t, value] (đã sắp xếp), nội suy mượt giữa hai mốc liền kề.
// value có thể là số hoặc mảng số (vd. vị trí camera).
export function keyframes(points) {
  const lerp = (a, b, k) =>
    Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k;
  return function (t) {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      if (t <= t1) {
        const [t0, v0] = points[i - 1];
        return lerp(v0, v1, ease(t, t0, t1));
      }
    }
    return points[points.length - 1][1];
  };
}

// Tích phân trước f(t) trên [0, T] (vd. vận tốc góc → góc quay), trả về hàm tra bảng F(t).
// Vẫn là hàm thuần của t nên seek tới frame bất kỳ cho cùng kết quả.
export function integrate(f, T, dt = 1 / 600) {
  const n = Math.ceil(T / dt) + 1;
  const table = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const t0 = (i - 1) * dt;
    table[i] = table[i - 1] + ((f(t0) + f(t0 + dt)) / 2) * dt; // hình thang
  }
  return function (t) {
    const x = Math.min(Math.max(t / dt, 0), n - 1);
    const i = Math.floor(x);
    if (i >= n - 1) return table[n - 1];
    return table[i] + (table[i + 1] - table[i]) * (x - i);
  };
}
