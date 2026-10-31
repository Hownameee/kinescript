// Kịch bản động cơ cho CVT: từ mốc vòng tua và tiến độ sang số → số liệu và góc quay theo t.
// drive = { rpm: [[t, vòng/phút], …], shift: [[t, s], …] }
import { TAU, ease, keyframes, integrate } from "./mech.js";

export function createDrive(
  kin,
  drive,
  { duration, slow = 1 / 100, finalGear = 10, wheelCirc = 1.26, clutch = [2800, 3800] }
) {
  const rpmAt = keyframes(drive.rpm);
  const shiftAt = keyframes(drive.shift);
  const omegaFront = (t) => (rpmAt(t) / 60) * TAU * slow; // quay chậm để mắt theo kịp
  const angleFront = integrate(omegaFront, duration);
  // Vận tốc dài của dây như nhau ở hai puli: ω2 = ω1 / tỉ số, v = ω1·r1
  const angleRear = integrate((t) => omegaFront(t) / kin.state(shiftAt(t)).ratio, duration);
  const beltTravel = integrate((t) => omegaFront(t) * kin.state(shiftAt(t)).r1, duration);

  function physics(t) {
    const rpm = rpmAt(t);
    const st = kin.state(shiftAt(t));
    const rearRpm = rpm / st.ratio;
    const kmh = (((rearRpm / finalGear) * wheelCirc * 60) / 1000) * ease(rpm, clutch[0], clutch[1]);
    return { rpm, st, rearRpm, kmh };
  }

  // Tham số cho createCvtAssembly().update()
  function frame(t) {
    return {
      s: shiftAt(t),
      angleFront: angleFront(t),
      angleRear: angleRear(t),
      beltPhase: -beltTravel(t), // răng dây chạy cùng chiều quay puli
    };
  }

  return { physics, frame, rpmAt, shiftAt };
}
