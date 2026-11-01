// Build video từ kịch bản: script.json → (kiểm tra) → TTS → canh thời gian → nhạc → spec.json + index.html.
// Dùng: node --import ./tools/lib/register-three.mjs tools/build-video.mjs <thư-mục-project> [--check] [--script <file>]
//   --check:  chỉ kiểm tra schema + cơ khí (không TTS, không ghi file) — dùng sau khi AI viết kịch bản.
//   --script: kịch bản khác script.json (vd. bản nháp do AI viết), đường dẫn tính từ thư mục project.
// Chủ đề lấy từ trường "topic" của kịch bản (mặc định "cvt"): dùng mech/schema/<topic>-script.schema.json
// và tools/lib/checks-<topic>.mjs (CHANNELS, checkConfig, checkDrive, warnings).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./lib/validate.mjs";
import { tts, duration, buildVoiceover, synthMusic, duckMusic } from "./lib/audio.mjs";
import { keyframes } from "../mech/lib/mech.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--script");
const projectDir = resolve(positional[0] || ".");
const checkOnly = args.includes("--check");
const scriptFile = flag("--script") || "script.json";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const script = readJson(join(projectDir, scriptFile));
const topic = script.topic || "cvt";
const schema = readJson(join(ROOT, `mech/schema/${topic}-script.schema.json`));
const checks = await import(`./lib/checks-${topic}.mjs`);

const voice = { provider: "say", voice: "Linh", rate: 185, ...script.voice };
const music = { enabled: true, bpm: 96, volume: 0.5, ...script.music };
const timing = { lead: 0.3, pad: 0.6, snapToBeat: true, maxDuration: 60, ...script.timing };
const beatLen = 60 / music.bpm;

let failed = false;
const fail = (title, list) => {
  if (!list.length) return;
  failed = true;
  console.error(`\n✗ ${title}`);
  list.forEach((e) => console.error("  - " + e));
};

// ---------- 1. Schema ----------
fail("Kịch bản không khớp schema", validate(schema, script));
const ids = script.beats?.map((b) => b.id) || [];
fail(
  "id beat bị trùng",
  ids.filter((id, i) => ids.indexOf(id) !== i).map((id) => `"${id}"`)
);
if (failed) process.exit(1);

// ---------- 2. Cấu hình cơ khí ----------
const cfgCheck = checks.checkConfig();
fail("Cấu hình cơ khí sai", cfgCheck.errors);

// ---------- 3. Độ dài lời đọc ----------
// Ở chế độ --check ước lượng theo tốc độ đọc (ký tự/giây) để không phải chạy TTS
const CHARS_PER_SEC = 15;
const voDir = join(projectDir, "audio/vo-cache");
const lines = script.beats.map((b) => {
  if (checkOnly) return { file: null, len: b.narration.length / CHARS_PER_SEC };
  const file = tts(voice, b.narration, voDir);
  return { file, len: duration(file) };
});

// ---------- 4. Canh thời gian beat theo lời đọc (+ làm tròn theo phách nhạc) ----------
let t = 0;
const beats = script.beats.map((b, i) => {
  let d = Math.max(b.minDuration ?? 2.5, timing.lead + lines[i].len + timing.pad);
  if (timing.snapToBeat) d = Math.ceil(d / beatLen - 1e-6) * beatLen;
  const start = +t.toFixed(3);
  t += d;
  return { ...b, start, end: +t.toFixed(3), voAt: start + timing.lead, voLen: lines[i].len };
});
const total = +t.toFixed(3);

// ---------- 5. Kênh chuyển động (vd. vòng tua, góc trục khuỷu): đích theo beat → mốc tuyệt đối ----------
function channel(key, initial) {
  const pts = [[0, initial]];
  let cur = initial;
  for (const b of beats) {
    const target = b.drive?.[key];
    if (target === undefined) continue;
    const { to, ramp = [0, 1] } = typeof target === "number" ? { to: target } : target;
    const d = b.end - b.start;
    const t0 = b.start + ramp[0] * d;
    const t1 = b.start + Math.max(ramp[1], ramp[0] + 0.01) * d;
    if (t0 > pts[pts.length - 1][0] + 1e-6) pts.push([+t0.toFixed(3), cur]);
    pts.push([+t1.toFixed(3), to]);
    cur = to;
  }
  if (total > pts[pts.length - 1][0] + 1e-6) pts.push([total, cur]);
  return pts;
}
const drive = Object.fromEntries(Object.entries(checks.CHANNELS).map(([k, init]) => [k, channel(k, init)]));
const fns = Object.fromEntries(Object.entries(drive).map(([k, pts]) => [k, keyframes(pts)]));
fail("Kịch bản chuyển động sai cơ khí", checks.checkDrive(fns, total, beats));

// ---------- 6. Cảnh báo (không chặn) ----------
const warns = checks.warnings ? checks.warnings(beats, fns) : [];
if (total > timing.maxDuration) warns.push(`tổng ${total.toFixed(1)} s vượt ${timing.maxDuration} s`);
beats.forEach((b) => {
  const cps = b.narration.length / b.voLen;
  if (!checkOnly && cps > 20) warns.push(`beat "${b.id}": đọc quá nhanh (${cps.toFixed(1)} ký tự/giây)`);
});

// ---------- Báo cáo ----------
console.log(`\n${script.title}`);
console.log(`Tổng: ${total.toFixed(2)} s · ${beats.length} beat · nhạc ${music.bpm} bpm (phách ${beatLen.toFixed(3)} s)`);
console.log("  #  id                 bắt đầu   dài    lời đọc");
beats.forEach((b, i) =>
  console.log(
    `  ${String(i + 1).padStart(2)} ${b.id.padEnd(18)} ${b.start.toFixed(2).padStart(6)}  ${(b.end - b.start).toFixed(2).padStart(5)}  ${b.voLen.toFixed(2)} s${checkOnly ? " (ước lượng)" : ""}`
  )
);
console.log(`Cơ khí (${topic}): ${cfgCheck.summary}`);
warns.forEach((w) => console.log("⚠ " + w));
if (failed) {
  console.error("\nBuild dừng: sửa script.json theo các lỗi trên.");
  process.exit(1);
}
if (checkOnly) {
  console.log("\n✓ Kịch bản hợp lệ (chế độ --check, chưa ghi file).");
  process.exit(0);
}

// ---------- 7. Âm thanh ----------
const audioDir = join(projectDir, "audio");
mkdirSync(audioDir, { recursive: true });
const voPath = join(audioDir, "voiceover.wav");
buildVoiceover(
  beats.map((b, i) => ({ file: lines[i].file, at: b.voAt })),
  total,
  voPath
);
const musicPath = join(audioDir, "music.wav");
if (music.enabled) {
  const raw = join(audioDir, "music-raw.wav");
  synthMusic(total, music.bpm, raw);
  duckMusic(raw, voPath, total, music.volume, musicPath);
  rmSync(raw);
}

// ---------- 8. Xuất spec.json + index.html ----------
const spec = {
  $comment: "FILE SINH TỰ ĐỘNG từ script.json bởi tools/build-video.mjs — đừng sửa tay",
  title: script.title,
  duration: total,
  drive,
  audio: { voiceover: "audio/voiceover.wav", music: music.enabled ? "audio/music.wav" : null },
  beats: beats.map(({ narration, minDuration, drive: _d, voAt, voLen, ...b }) => ({ ...b, narration })),
};
writeFileSync(join(projectDir, "spec.json"), JSON.stringify(spec, null, 2) + "\n");

// Template nằm trong thư mục con: lint của HyperFrames coi mọi file HTML ở gốc project là composition gốc
const tpl = readFileSync(join(projectDir, "templates/index.html"), "utf8");
const musicTag = music.enabled
  ? `<audio id="bgm" src="audio/music.wav" data-start="0" data-duration="${total}" data-track-index="9" data-volume="1"></audio>`
  : "";
writeFileSync(
  join(projectDir, "index.html"),
  tpl.replaceAll("__DURATION__", String(total)).replace("<!-- __MUSIC__ -->", musicTag)
);
console.log(`\n✓ Đã ghi spec.json, index.html, audio/voiceover.wav${music.enabled ? ", audio/music.wav" : ""}`);
