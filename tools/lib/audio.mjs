// Âm thanh cho video: TTS từng câu (có cache), ghép voiceover, tự sinh nhạc nền và hạ nhỏ nhạc khi có lời.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const SR = 48000;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} lỗi: ${r.stderr || r.stdout}`);
  return r.stdout;
}

export function duration(file) {
  return parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]));
}

// ---------- TTS ----------
// voice: { provider: "say" | "kokoro", voice, rate, speed }
export function tts(voice, text, cacheDir) {
  mkdirSync(cacheDir, { recursive: true });
  const key = createHash("sha1").update(JSON.stringify([voice, text])).digest("hex").slice(0, 16);
  const out = join(cacheDir, `${key}.wav`);
  if (existsSync(out)) return out;

  if (voice.provider === "say") {
    const aiff = join(cacheDir, `${key}.aiff`);
    run("say", ["-v", voice.voice || "Linh", "-r", String(voice.rate || 185), "-o", aiff, text]);
    run("ffmpeg", ["-v", "error", "-y", "-i", aiff, "-ar", String(SR), "-ac", "1", out]);
    rmSync(aiff);
  } else if (voice.provider === "kokoro") {
    run("npx", [
      "-y",
      "hyperframes@0.8.166",
      "tts",
      text,
      "-v",
      voice.voice || "af_heart",
      "-s",
      String(voice.speed || 1),
      "-o",
      out,
    ]);
  } else {
    throw new Error(`provider TTS không hỗ trợ: ${voice.provider}`);
  }
  return out;
}

// Ghép các câu vào một track theo thời điểm bắt đầu, chuẩn hoá độ lớn giọng (≈ -16 LUFS)
export function buildVoiceover(clips, total, out) {
  const args = ["-v", "error", "-y"];
  clips.forEach((c) => args.push("-i", c.file));
  const parts = clips.map((c, i) => {
    const ms = Math.round(c.at * 1000);
    return `[${i}:a]adelay=${ms}|${ms}[d${i}]`;
  });
  const mix = clips.map((_, i) => `[d${i}]`).join("");
  const filter = `${parts.join(";")};${mix}amix=inputs=${clips.length}:normalize=0,apad,atrim=0:${total},loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
  args.push("-filter_complex", filter, "-map", "[out]", "-ar", String(SR), "-ac", "1", out);
  run("ffmpeg", args);
}

// ---------- Nhạc nền tự sinh (không bản quyền) ----------
// Pad hợp âm Am–F–C–G + arpeggio gảy nhẹ + trống kick mềm, theo bpm. Hoàn toàn xác định (không random).
export function synthMusic(total, bpm, rawOut) {
  const beat = 60 / bpm;
  const bar = beat * 4;
  const n = Math.ceil(total * SR);
  const L = new Float32Array(n);
  const Rch = new Float32Array(n);
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // mỗi hợp âm 2 ô nhịp
  const chords = [
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [48, 52, 55], // C
    [55, 59, 62], // G
  ];
  const TAU = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ci = Math.floor(t / (bar * 2)) % chords.length;
    const tc = t % (bar * 2);
    const chord = chords[ci];
    // pad: sine + detune, đường bao vào/ra mượt ở mỗi lần đổi hợp âm
    const env = Math.min(1, tc / 0.6) * Math.min(1, (bar * 2 - tc) / 0.4);
    let pad = 0;
    chord.forEach((m, k) => {
      const f = midi(m);
      pad += Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t + k);
      pad += 0.3 * Math.sin(TAU * f * 0.5 * t); // quãng tám dưới
    });
    pad *= 0.045 * env;
    // arpeggio nốt móc đơn, tắt dần theo hàm mũ
    const eighth = beat / 2;
    const ni = Math.floor(t / eighth);
    const te = t - ni * eighth;
    const arpNote = chord[ni % 3] + 12 * (ni % 6 < 3 ? 1 : 0);
    const arp = 0.06 * Math.sin(TAU * midi(arpNote) * t) * Math.exp(-te * 9);
    // kick mềm ở phách 1 và 3
    const tb = t % (beat * 2);
    const kick = 0.22 * Math.sin(TAU * (50 + 90 * Math.exp(-tb * 30)) * tb) * Math.exp(-tb * 12);
    // stereo nhẹ: arpeggio lệch trái/phải xen kẽ
    const pan = ni % 2 ? 0.35 : -0.35;
    L[i] = pad + arp * (1 - pan) + kick;
    Rch[i] = pad + arp * (1 + pan) + kick;
  }
  writeWav(rawOut, [L, Rch]);
}

// Hạ nhỏ nhạc khi có lời (sidechain), mờ vào / mờ ra, đặt độ lớn nền
export function duckMusic(rawMusic, voiceover, total, volume, out) {
  const fadeOut = Math.max(0, total - 2.5);
  run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    rawMusic,
    "-i",
    voiceover,
    "-filter_complex",
    `[0:a]volume=${volume},afade=t=in:d=1.5,afade=t=out:st=${fadeOut}:d=2.5[m];` +
      `[1:a]aformat=channel_layouts=stereo[vo];` +
      `[m][vo]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=500,apad[out]`, // apad: bù phần đuôi bộ lọc cắt mất
    "-map",
    "[out]",
    "-t",
    String(total),
    "-ar",
    String(SR),
    out,
  ]);
}

function writeWav(file, channels) {
  const n = channels[0].length;
  const ch = channels.length;
  const buf = Buffer.alloc(44 + n * ch * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * ch * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * ch * 2, 28);
  buf.writeUInt16LE(ch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * ch * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(v * 32767), o);
      o += 2;
    }
  }
  writeFileSync(file, buf);
}
