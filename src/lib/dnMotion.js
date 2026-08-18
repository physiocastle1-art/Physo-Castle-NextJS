/* ─────────────────────────────────────────────────────────────────────────
   Hand-written motion primitives shared by the homepage's Dantora sections:
   one rAF loop for every subscriber, and a spring solver.

   Deliberately NOT gsap: these springs are driven by tension/friction the way
   the reference design specifies them, and the shared ticker lets the WebGL
   scene, the horizontal scrub, the parallax banner and the rail glide run off
   a single frame callback instead of five competing ones.
   ───────────────────────────────────────────────────────────────────────── */

const subs = new Set();
let rafId = 0;

function loop(now) {
  rafId = requestAnimationFrame(loop);
  for (const s of subs) {
    const gap = s.gap ? s.gap() : 0;           // min frame gap, read live every frame
    if (now - s.last >= gap) {
      s.last = now;
      s.fn(now);
    }
  }
}

/** Subscribe to the shared loop. Returns an unsubscribe fn. */
export function subscribe(fn, gap) {
  const s = { fn, gap, last: 0 };
  subs.add(s);
  if (!rafId) rafId = requestAnimationFrame(loop);
  return () => {
    subs.delete(s);
    if (!subs.size && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}

/* Springs share one subscriber; it stops itself once every spring is at rest. */
const live = new Set();
let springStop = null;
let springLast = 0;

function pump(now) {
  const dt = Math.min(0.064, (now - springLast) / 1000 || 0);
  springLast = now;
  for (const s of Array.from(live)) s.step(dt);
  if (!live.size && springStop) {
    springStop();
    springStop = null;
  }
}

function wake() {
  if (!springStop) {
    springLast = performance.now();
    springStop = subscribe(pump);
  }
}

export class Spring {
  constructor(value, config, onChange, onRest) {
    this.v = value;
    this.t = value;
    this.vel = 0;
    this.cfg = config;
    this.onChange = onChange;
    this.onRest = onRest;
  }
  set(target, config) {
    if (config) this.cfg = config;
    this.t = target;
    if (!live.has(this)) {
      live.add(this);
      wake();
    }
  }
  jump(v) {
    this.v = v;
    this.t = v;
    this.vel = 0;
    live.delete(this);
    if (this.onChange) this.onChange(this.v);
  }
  stop() {
    live.delete(this);
  }
  step(dt) {
    const { tension, friction } = this.cfg;
    let rest = dt;
    while (rest > 0) {
      const h = Math.min(rest, 1 / 240);       // sub-step so stiff springs stay stable
      rest -= h;
      const a = tension * (this.t - this.v) - friction * this.vel;
      this.vel += a * h;
      this.v += this.vel * h;
    }
    // precision scales with the target so this works for 0..1 and for -3000px alike
    const prec = Math.max(0.0004, Math.abs(this.t) * 0.0008);
    let done = false;
    if (Math.abs(this.vel) < prec * 6 && Math.abs(this.t - this.v) < prec) {
      this.v = this.t;
      this.vel = 0;
      done = true;
    }
    if (this.onChange) this.onChange(this.v);
    if (done) {
      live.delete(this);
      if (this.onRest) this.onRest();
    }
  }
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
