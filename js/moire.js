// Moiré physics. Pure functions, no DOM — also runs under Node for tests.
// Units: mm everywhere unless the name says otherwise. Frequencies in cycles/mm on the sensor.

const LAMBDA_MM = 0.00055; // green light, for diffraction
const HARMONICS = 6;
const PIXEL_FILL = 0.8; // effective light-collecting width of a photosite (microlens), fraction of pitch
// Across a real frame the LED grid is never one exact size on the sensor (perspective, curve, lens
// distortion), so risk is taken as the worst case over this spread of scales.
const SCALE_SPREAD = [0.85, 0.89, 0.93, 0.96, 1, 1.04, 1.07, 1.11, 1.15];

export const LEVELS = { low: 0.06, high: 0.25 }; // aliased contrast thresholds — provisional, calibrate on site

export function cameraPixelMm(cam) {
  return cam.sensor_w_mm / cam.res_w_px;
}

// Max aperture (lowest f-number) at a focal length, linear between curve points.
export function maxApertureAt(lens, focalMm, extenderOn) {
  const curve = extenderOn ? lens.extender_aperture_curve : lens.aperture_curve;
  if (!curve || !curve.length) return lens.max_aperture || 1.4;
  if (focalMm <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [f0, n0] = curve[i - 1];
    const [f1, n1] = curve[i];
    if (focalMm <= f1) return n0 + ((n1 - n0) * (focalMm - f0)) / (f1 - f0);
  }
  return curve[curve.length - 1][1];
}

// Bessel J1, Numerical Recipes rational approximation.
function besselJ1(x) {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const a = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
    const b = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
    return a / b;
  }
  const z = 8 / ax;
  const y = z * z;
  const xx = ax - 2.356194491;
  const p = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
  const q = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p - z * Math.sin(xx) * q);
  return x < 0 ? -ans : ans;
}

const sinc = (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
const jinc = (x) => (x === 0 ? 1 : (2 * besselJ1(x)) / x);

// Blur circle diameter on the sensor for a wall at distance d when focused at s.
export function defocusBlurMm(f, N, d, s) {
  if (s <= f) return 0;
  return (f * f * Math.abs(d - s)) / (N * d * (s - f));
}

// System MTF at one spatial frequency: lens, diffraction, defocus, OLPF, pixel aperture.
export function systemMtf(freq, { pc, blur, N, lensMtf50 }) {
  const pixel = Math.abs(sinc(PIXEL_FILL * freq * pc));
  // 2-spot OLPF nulled at the sampling frequency. Real filters never reach a clean null
  // (alignment, wall perspective, 3-chip registration), so keep a 30% floor.
  const olpf = 0.3 + 0.7 * Math.abs(Math.cos((Math.PI * freq * pc) / 2));
  const defocus = Math.abs(jinc(Math.PI * blur * freq));
  const nu = freq * LAMBDA_MM * N;
  const diffraction = nu >= 1 ? 0 : (2 / Math.PI) * (Math.acos(nu) - nu * Math.sqrt(1 - nu * nu));
  // Broadcast zooms roll off gently rather than as a Gaussian — exponential fit through MTF50.
  const lens = lensMtf50 ? Math.exp(-Math.LN2 * (freq / lensMtf50)) : 1;
  return pixel * olpf * defocus * diffraction * lens;
}

// Modulation of harmonic k for a row of lit dots of width fill*pitch (relative to the mean level).
function harmonicAmp(k, fill) {
  return Math.abs((2 * Math.sin(Math.PI * k * fill)) / (Math.PI * k * fill));
}

// Core analysis. p: { pitch, fill, pc, f, N, d, s, lensMtf50 }  (d, s = wall and focus distance in mm)
export function analyse(p) {
  const { pitch, fill, pc, f, N, d, s, lensMtf50 } = p;
  const mag = f / Math.max(d - f, 1e-6);
  const ledOnSensor = pitch * mag;
  const fLed = 1 / ledOnSensor;
  const fs = 1 / pc;
  const fNyq = fs / 2;
  const blur = defocusBlurMm(f, N, d, s);
  const ctx = { pc, blur, N, lensMtf50 };

  const harmonicsAt = (scale) => {
    const fl = fLed / scale;
    return Array.from({ length: HARMONICS }, (_, i) => {
      const k = i + 1;
      const freq = k * fl;
      const contrast = harmonicAmp(k, fill) * systemMtf(freq, ctx);
      const aliased = freq > fNyq;
      const aliasFreq = Math.abs(freq - Math.round(freq / fs) * fs);
      return { k, freq, contrast, aliased, aliasFreq };
    });
  };

  const harmonics = harmonicsAt(1);
  let risk = 0;
  let worst = null;
  for (const scale of SCALE_SPREAD) {
    for (const h of harmonicsAt(scale)) {
      if (h.aliased && h.contrast > risk) {
        risk = h.contrast;
        worst = h;
      }
    }
  }

  return {
    mag,
    ledOnSensor,
    ledPx: ledOnSensor / pc, // camera pixels per LED pixel
    blurPx: blur / pc,
    risk,
    level: levelOf(risk),
    beatPx: worst && worst.aliasFreq > 0 ? 1 / (worst.aliasFreq * pc) : Infinity,
    harmonics,
  };
}

export function levelOf(risk) {
  if (risk >= LEVELS.high) return "high";
  if (risk >= LEVELS.low) return "moderate";
  return "low";
}

// Log-spaced sweep of one parameter. build(x) returns analyse() inputs.
export function sweep(min, max, steps, build) {
  const out = [];
  const lmin = Math.log(min);
  const lmax = Math.log(max);
  for (let i = 0; i < steps; i++) {
    const x = Math.exp(lmin + ((lmax - lmin) * i) / (steps - 1));
    out.push({ x, ...analyse(build(x)) });
  }
  return out;
}

// Contiguous x ranges where the level is at least moderate.
export function riskRanges(points) {
  const ranges = [];
  let start = null;
  let peak = "moderate";
  for (const pt of points) {
    if (pt.level !== "low") {
      if (start === null) {
        start = pt.x;
        peak = pt.level;
      }
      if (pt.level === "high") peak = "high";
    } else if (start !== null) {
      ranges.push({ from: start, to: pt.x, peak });
      start = null;
    }
  }
  if (start !== null) ranges.push({ from: start, to: points.at(-1).x, peak });
  return ranges;
}

// Camera-pixel image of the wall, sampled after the optics — this is where aliasing appears.
// Writes grey levels 0..255 into out (length w*h). angleRad rotates the wall grid; perspective
// makes the LED grid grow by that fraction from left to right edge, like a wall seen off-axis.
export function renderPreview(out, w, h, a, angleRad, perspective = 0.15) {
  const fLedPx = 1 / a.ledPx; // cycles per camera pixel at frame centre
  const comps = a.harmonics.map((hm) => ({ c: hm.contrast, k: hm.k }));
  const norm = (1 + comps.reduce((s, c) => s + c.c, 0)) ** 2;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const row = (u) => {
    let v = 1;
    for (const { c, k } of comps) v += c * Math.cos(2 * Math.PI * k * fLedPx * u);
    return Math.max(v, 0);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Chirp: local grid scale runs from (1 - p/2) to (1 + p/2) across the frame.
      const xc = x - w / 2;
      const xs = xc - (perspective / (2 * w)) * xc * xc + w / 2;
      const u = xs * cos + y * sin;
      const v = -xs * sin + y * cos;
      out[y * w + x] = Math.min(255, ((255 * row(u) * row(v)) / norm) * 1.6);
    }
  }
}
