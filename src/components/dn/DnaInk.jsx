"use client";
/* ─────────────────────────────────────────────────────────────────────────
   DNA ink — two point clouds (the strand, and an ink plume it sheds) plus a
   camera-attached sediment cloud, all MULTIPLY-blended so the dye DARKENS the
   cream paper instead of glowing on black. Recoloured from the reference
   mint/teal to Physio Castle's cream + forest-emerald palette.
   ───────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { subscribe, clamp, prefersReducedMotion } from "@/lib/dnMotion";

/* Reference palette, kept verbatim — the panels behind both scenes are painted
   --dn-mint-50 (#eff4f2) to match bgColor exactly, or the canvas paints a
   differently-tinted rectangle over the section. */
const CFG = {
  bgColor: "#eff4f2",
  atmoColor: "#247063", atmoCount: 1500, atmoSize: 0, atmoSpeed: 0.6,
  helixColorA: "#247061", helixColorB: "#4ca98a",
  inkCore: "#81a297", inkMid: "#f7fec3", inkEdge: "#246f65",
  helixCount: 40000, inkCount: 160000,
  camDist: 12, helixSize: 1, inkSize: 6, brightness: 0.4,
  helixOpacity: 1.54, inkOpacity: 0.86, inkGrow: 1.8,
  radius: 1.75, height: 6.8, twist: 0.65, strandThick: 0.39, wave: 0.5,
  spin: 0, tilt: -0.34,
  emitRate: 0.19, spread: 0.6, rise: -0.2, turbulence: 1.6, noiseFreq: 1.05, noiseEvolve: 0.1,
  parallax: 3, pointerRadius: 5, pointerStrength: 1.55, maxPixelRatio: 1.5,
};

const REFERENCE_BUFFER_HEIGHT = 1600;   // 800 design px at a 2x cap
const MAX_FRAME_DELTA = 0.05;
const APPEAR_DELAY = 0.2, APPEAR_DURATION = 1.6;
const POINTER_EASE = 0.05, CURSOR_EASE = 0.15, ACTIVITY_EASE = 0.08, POINTER_IDLE_SECONDS = 3;

const triplet = (hex) => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
};
/* setRGB on RAW components — setHex would convert sRGB into the linear working
   space, and nothing in this pipeline encodes back (the final pass is a custom
   shader with no colorspace_fragment). */
const rawColor = (hex) => {
  const [r, g, b] = triplet(hex);
  const c = new THREE.Color();
  c.setRGB(r, g, b);
  return c;
};
const vec3 = (hex) => new THREE.Vector3(...triplet(hex));

const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float random(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
vec3 helixPoint(float rnd1, float rnd2, float rnd3, float rnd4, float twist, float radius, float height, float thick, float wave, float time) {
  float y = (rnd2 * 2.0 - 1.0) * height;
  vec3 core;
  if (rnd1 < 0.85) {
    float strand = step(0.5, rnd1) * 3.14159265;
    float a = y * twist + strand;
    core = vec3(radius * cos(a), y, radius * sin(a));
    core += (vec3(rnd2, rnd3, rnd4) - 0.5) * thick;
  } else {
    float rungT = rnd3;
    float dy = floor(y * 2.2) / 2.2;
    float a = dy * twist;
    vec3 p1 = vec3(radius * cos(a), dy, radius * sin(a));
    vec3 p2 = vec3(radius * cos(a + 3.14159265), dy, radius * sin(a + 3.14159265));
    core = mix(p1, p2, rungT) + (vec3(rnd2, rnd4, rnd3) - 0.5) * 0.08;
  }
  core.x += sin(time * 0.5 + y * 0.6) * wave;
  core.z += cos(time * 0.4 + y * 0.6) * wave;
  return core;
}
`;

const HELIX_VERT = `
uniform float uTime, uHelixSize, uTwist, uRadius, uHeight, uThick, uWave;
uniform float uPixelScale;
uniform vec3 uHelixA, uHelixB;
uniform vec3 uCursor; uniform float uRepelRadius, uRepelStrength, uActivity;
varying vec3 vColor; varying float vFade;
${SNOISE}
void main() {
  vec3 s = position;
  float rnd1 = random(s), rnd2 = random(s + 1.7), rnd3 = random(s + 3.3), rnd4 = random(s + 5.9);
  vec3 p = helixPoint(rnd1, rnd2, rnd3, rnd4, uTwist, uRadius, uHeight, uThick, uWave, uTime);
  vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
  vec3 toP = wp - uCursor;
  float fall = smoothstep(uRepelRadius, 0.0, length(toP));
  wp += normalize(toP + vec3(1e-4)) * fall * uRepelStrength * uActivity;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vColor = mix(uHelixB, uHelixA, rnd4);
  vFade = 0.65 + 0.35 * rnd2;
  gl_PointSize = uHelixSize * uPixelScale * (12.0 / -mv.z);
  gl_PointSize = max(gl_PointSize, 1.5);
  gl_Position = projectionMatrix * mv;
}
`;

const HELIX_FRAG = `
uniform float uBrightness, uHelixOpacity, uAppear;
varying vec3 vColor; varying float vFade;
void main() {
  vec2 xy = gl_PointCoord - 0.5;
  float ll = length(xy);
  if (ll > 0.5) discard;
  float soft = smoothstep(0.5, 0.05, ll);
  float cov = clamp(soft * vFade * uHelixOpacity * uAppear * uBrightness, 0.0, 1.0);
  gl_FragColor = vec4(mix(vec3(1.0), vColor, cov), 1.0);
}
`;

const INK_VERT = `
uniform float uTime, uInkSize, uTwist, uRadius, uHeight, uThick, uWave;
uniform float uEmitRate, uSpread, uRise, uTurb, uNoiseFreq, uNoiseEvolve, uInkGrow;
uniform float uPixelScale;
uniform vec3 uInkCore, uInkMid, uInkEdge;
uniform vec3 uCursor; uniform float uRepelRadius, uRepelStrength, uActivity;
varying vec3 vColor; varying float vAlpha;
${SNOISE}
void main() {
  vec3 s = position;
  float rnd1 = random(s), rnd2 = random(s + 1.7), rnd3 = random(s + 3.3), rnd4 = random(s + 5.9);
  float seed = random(s + 9.1);

  float life = fract(seed + uTime * uEmitRate);

  float birthTime = uTime - life / max(uEmitRate, 1e-4);
  vec3 birth = helixPoint(rnd1, rnd2, rnd3, rnd4, uTwist, uRadius, uHeight, uThick, uWave, birthTime);

  vec3 outward = normalize(vec3(birth.x, 0.0, birth.z) + vec3(1e-4));

  float e = uTime * uNoiseEvolve;
  vec3 np = birth * uNoiseFreq;
  vec3 flow = vec3(
    snoise(np + vec3(e, 0.0, 0.0)),
    snoise(np + vec3(0.0, e, 0.0) + 11.0),
    snoise(np + vec3(0.0, 0.0, e) + 23.0)
  );

  vec3 disp = outward * life * uSpread
            + flow * pow(life, 1.4) * uTurb
            + vec3(0.0, life * uRise, 0.0);
  vec3 p = birth + disp;

  vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
  vec3 toP = wp - uCursor;
  float fall = smoothstep(uRepelRadius, 0.0, length(toP));
  wp += normalize(toP + vec3(1e-4)) * fall * uRepelStrength * uActivity;
  vec4 mv = viewMatrix * vec4(wp, 1.0);

  vec3 c = mix(uInkCore, uInkMid, smoothstep(0.0, 0.4, life));
  c = mix(c, uInkEdge, smoothstep(0.35, 1.0, life));
  vColor = c;

  vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.4, 1.0, life));

  float grow = 0.35 + life * uInkGrow;
  gl_PointSize = uInkSize * grow * uPixelScale * (12.0 / -mv.z);
  gl_PointSize = max(gl_PointSize, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const INK_FRAG = `
uniform float uBrightness, uInkOpacity, uAppear;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec2 xy = gl_PointCoord - 0.5;
  float ll = length(xy);
  if (ll > 0.5) discard;
  float soft = exp(-ll * ll * 7.0);
  float cov = clamp(soft * vAlpha * uInkOpacity * uAppear * uBrightness, 0.0, 1.0);
  gl_FragColor = vec4(mix(vec3(1.0), vColor, cov), 1.0);
}
`;

const ATMO_VERT = `
attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes;
varying float vA;
vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
  p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
  p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
  return cos(p+vec3(1,2,4)); }
void main(){
  vec3 v = position*5.0 + warp(position, uTime)*1.4;
  vec4 mv = modelViewMatrix * vec4(v, 1.0);
  float r = length(v); float farF = 1.0 - smoothstep(6.0, 8.0, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
  vA = farF * nearF;
  gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;
const ATMO_FRAG = `
uniform vec3 uColor; varying float vA;
void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
  float tex = smoothstep(0.5, 0.0, l); float cov = clamp(tex * vA * 0.4, 0.0, 1.0);
  gl_FragColor = vec4(mix(vec3(1.0), uColor, cov), 1.0); }
`;
const FINAL_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;
const FINAL_FRAG = `
uniform sampler2D tDiffuse; varying vec2 vUv;
void main(){ gl_FragColor = vec4(texture2D(tDiffuse, vUv).xyz, 1.); }
`;

/* The shaders hash each "position" into a point identity — it is a seed, not a place. */
function seedGeometry(count) {
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random() * 64;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(seeds, 3));
  return g;
}

function build(container, onFirstFrame, scale) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
  const pr = Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio);
  renderer.setPixelRatio(pr);
  /* Nothing in this pipeline encodes back — the final pass is a custom shader
     with no colorspace_fragment — so the renderer must not encode the clear
     colour either. With the default SRGB output space three ran the clear
     colour through linear→sRGB and the canvas painted #faf7f2 over a #f4eee2
     panel: a visible vertical seam down the hero. */
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(rawColor(CFG.bgColor), 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(rawColor(CFG.bgColor), 1, 22);

  const rect = container.getBoundingClientRect();
  let W = Math.max(1, Math.round(rect.width));
  let H = Math.max(1, Math.round(rect.height));

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
  camera.position.set(0, 0, CFG.camDist);
  scene.add(camera);

  const uTime = { value: 0 };
  const uAppear = { value: 0 };
  const uPixelScale = { value: 1 };
  const uCursor = { value: new THREE.Vector3() };
  const uActivity = { value: 0 };
  const uRes = { value: new THREE.Vector2(W, H) };

  const common = {
    uTime, uAppear, uPixelScale, uCursor, uActivity,
    uRepelRadius: { value: CFG.pointerRadius },
    uRepelStrength: { value: CFG.pointerStrength },
    uBrightness: { value: CFG.brightness },
    uTwist: { value: CFG.twist },
    uRadius: { value: CFG.radius },
    uHeight: { value: CFG.height },
    uThick: { value: CFG.strandThick },
    uWave: { value: CFG.wave },
  };

  const tilt = new THREE.Group();
  tilt.rotation.z = CFG.tilt;
  scene.add(tilt);
  const spinner = new THREE.Group();
  tilt.add(spinner);

  /* premultipliedAlpha is MANDATORY: since r16x, MultiplyBlending without it
     sets no blend function at all. The premultiplied path reduces to dst*src
     because every fragment here writes alpha = 1. */
  const flags = {
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.MultiplyBlending, premultipliedAlpha: true,
  };

  const helixMat = new THREE.ShaderMaterial({
    uniforms: {
      ...common,
      uHelixSize: { value: CFG.helixSize },
      uHelixOpacity: { value: CFG.helixOpacity },
      uHelixA: { value: vec3(CFG.helixColorA) },
      uHelixB: { value: vec3(CFG.helixColorB) },
    },
    vertexShader: HELIX_VERT, fragmentShader: HELIX_FRAG, ...flags,
  });
  const helix = new THREE.Points(seedGeometry(Math.round(CFG.helixCount * scale)), helixMat);
  helix.frustumCulled = false;            // points are placed in the vertex shader
  spinner.add(helix);

  const inkMat = new THREE.ShaderMaterial({
    uniforms: {
      ...common,
      uInkSize: { value: CFG.inkSize },
      uInkOpacity: { value: CFG.inkOpacity },
      uInkGrow: { value: CFG.inkGrow },
      uEmitRate: { value: CFG.emitRate },
      uSpread: { value: CFG.spread },
      uRise: { value: CFG.rise },
      uTurb: { value: CFG.turbulence },
      uNoiseFreq: { value: CFG.noiseFreq },
      uNoiseEvolve: { value: CFG.noiseEvolve },
      uInkCore: { value: vec3(CFG.inkCore) },
      uInkMid: { value: vec3(CFG.inkMid) },
      uInkEdge: { value: vec3(CFG.inkEdge) },
    },
    vertexShader: INK_VERT, fragmentShader: INK_FRAG, ...flags,
  });
  const ink = new THREE.Points(seedGeometry(Math.round(CFG.inkCount * scale)), inkMat);
  ink.frustumCulled = false;
  spinner.add(ink);

  // suspended sediment — invisible at atmoSize 0, kept wired
  const ag = new THREE.BufferGeometry();
  const ap = new Float32Array(CFG.atmoCount * 3);
  const asz = new Float32Array(CFG.atmoCount);
  const ase = new Float32Array(CFG.atmoCount);
  for (let i = 0; i < CFG.atmoCount; i++) {
    const r = Math.cbrt(Math.random());
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    ap[i * 3] = r * Math.sin(ph) * Math.cos(th);
    ap[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    ap[i * 3 + 2] = r * Math.cos(ph);
    asz[i] = CFG.atmoSize * (0.5 + Math.random());
    ase[i] = Math.random() * 64;
  }
  ag.setAttribute("position", new THREE.Float32BufferAttribute(ap, 3));
  ag.setAttribute("size", new THREE.Float32BufferAttribute(asz, 1));
  ag.setAttribute("seed", new THREE.Float32BufferAttribute(ase, 1));
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uRes, uColor: { value: vec3(CFG.atmoColor) } },
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, ...flags,
  });
  const atmo = new THREE.Points(ag, atmoMat);
  atmo.frustumCulled = false;
  camera.add(atmo);

  // one composer — the clouds are already multiplied onto the scene
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const finalPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: FINAL_VERT, fragmentShader: FINAL_FRAG,
  });
  finalPass.renderToScreen = true;
  composer.addPass(finalPass);

  function applySize(w, h) {
    W = w; H = h;
    const ratio = Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // gl_PointSize is in DEVICE pixels — normalise or a narrow canvas packs the
    // cloud tighter and MULTIPLY turns that overlap into a darker, shifted colour
    uPixelScale.value = (h * ratio) / REFERENCE_BUFFER_HEIGHT;
    uRes.value.set(w, h);
  }
  applySize(W, H);

  const state = {
    ndc: new THREE.Vector2(),
    pointer: new THREE.Vector2(),
    cursorNdc: new THREE.Vector2(),
    activityTarget: 0,
    lastMove: -1e9,
    elapsed: 0,
    spinPhase: 0,
    startedAt: performance.now(),
    lastFrame: performance.now(),
    hidden: true,
    drawn: false,
  };

  function checkSize() {
    // only whole-pixel changes: sub-pixel rect drift while scrolling used to
    // re-frame the helix mid-scroll
    const r = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w !== W || h !== H) applySize(w, h);
  }
  function resetClock() {
    state.elapsed = 0;
    state.spinPhase = 0;
    state.pointer.set(0, 0);
    state.cursorNdc.set(0, 0);
    state.ndc.set(0, 0);
    uActivity.value = 0;
    state.activityTarget = 0;
  }

  const onMove = (e) => {
    const r = container.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // clamp to ±1 — off-screen rects otherwise reach ±15 and drag the camera away
    state.ndc.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    state.ndc.y = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1, 1);
    state.activityTarget = 1;
    state.lastMove = performance.now();
  };
  /* Touch drives the helix too. pointermove fires for touch only while the
     finger is down, so the scene follows a drag and then eases back to centre
     on its own once activityTarget decays — no hover required. The listener is
     on the window rather than the canvas so a drag that starts on the copy
     still steers the scene behind it. */
  window.addEventListener("pointermove", onMove, { passive: true });
  const onResize = () => checkSize();
  window.addEventListener("resize", onResize, { passive: true });

  const scratch = new THREE.Vector3();

  const unsub = subscribe((now) => {
    // visibility from a rect read EVERY frame — an IntersectionObserver latches
    const r = container.getBoundingClientRect();
    const onScreen = r.bottom > 0 && r.top < window.innerHeight && r.width > 0 && r.height > 0;
    if (!onScreen) {
      if (!state.hidden) { state.hidden = true; resetClock(); }
      state.lastFrame = now;
      return;
    }
    state.hidden = false;
    checkSize();

    const dt = Math.min(MAX_FRAME_DELTA, (now - state.lastFrame) / 1000 || 0);
    state.lastFrame = now;
    state.elapsed += dt;
    uTime.value = state.elapsed;      // accumulated CLAMPED deltas, never a wall clock

    // the one-shot entrance fade is the exception: it rides the WALL clock
    uAppear.value = clamp(((now - state.startedAt) / 1000 - APPEAR_DELAY) / APPEAR_DURATION, 0, 1);

    state.spinPhase += CFG.spin * dt;
    spinner.rotation.y = state.spinPhase;

    state.pointer.x += (state.ndc.x - state.pointer.x) * POINTER_EASE;
    state.pointer.y += (state.ndc.y - state.pointer.y) * POINTER_EASE;
    state.cursorNdc.x += (state.ndc.x - state.cursorNdc.x) * CURSOR_EASE;
    state.cursorNdc.y += (state.ndc.y - state.cursorNdc.y) * CURSOR_EASE;

    if ((now - state.lastMove) / 1000 > POINTER_IDLE_SECONDS) state.activityTarget = 0;
    uActivity.value += (state.activityTarget - uActivity.value) * ACTIVITY_EASE;

    camera.position.set(state.pointer.x * CFG.parallax, state.pointer.y * CFG.parallax, CFG.camDist);
    camera.lookAt(0, 0, 0);

    // eased cursor unprojected onto the z = 0 plane
    scratch.set(state.cursorNdc.x, state.cursorNdc.y, 0.5).unproject(camera);
    const dir = scratch.sub(camera.position).normalize();
    const dist = -camera.position.z / (dir.z || -1e-6);
    uCursor.value.copy(camera.position).add(dir.multiplyScalar(dist));

    composer.render();

    if (!state.drawn) {
      state.drawn = true;
      if (onFirstFrame) onFirstFrame();
    }
  });

  return () => {
    unsub();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onMove);
    composer.dispose?.();
    helix.geometry.dispose(); helixMat.dispose();
    ink.geometry.dispose(); inkMat.dispose();
    ag.dispose(); atmoMat.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
  };
}

export default function DnaInk({ className = "", onFirstFrame }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    // A 200k-point cloud is fine on a desktop GPU and a slideshow on a phone.
    const small = window.innerWidth < 1024 || window.matchMedia("(pointer: coarse)").matches;
    let teardown = null;
    try {
      teardown = build(el, onFirstFrame, small ? 0.35 : 1);
    } catch (err) {
      console.warn("[DnaInk] scene unavailable:", err);
    }
    return () => { if (teardown) teardown(); };
  }, [onFirstFrame]);

  return <div className={"dn-scene " + className} ref={ref} aria-hidden="true" />;
}
