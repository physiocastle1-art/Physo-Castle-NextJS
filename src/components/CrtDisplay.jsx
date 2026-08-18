"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D map;
  uniform float imageAspect, planeAspect, glitchIntensity, time;
  uniform vec2 iResolution;
  varying vec2 vUv;
  float hash(float n){ return fract(sin(n)*43758.5453123); }
  vec2 coverUV(vec2 uv){
    if(planeAspect>imageAspect){ float s=imageAspect/planeAspect; uv.y=uv.y*s+(1.0-s)*0.5; }
    else { float s=planeAspect/imageAspect; uv.x=uv.x*s+(1.0-s)*0.5; }
    return uv;
  }
  void main(){
    vec2 uv=vUv; float gi=glitchIntensity;
    uv.x += (hash(floor(uv.y*20.0+time*80.0)+time*7.0)-0.5)*2.0*gi*0.15;
    uv.y += (hash(floor(time*50.0))-0.5)*gi*0.06;
    float rs=0.001+gi*0.025;
    vec3 col;
    col.r=texture2D(map,coverUV(vec2(uv.x+rs,uv.y+rs))).r+0.05;
    col.g=texture2D(map,coverUV(vec2(uv.x,uv.y-rs*2.0))).g+0.05;
    col.b=texture2D(map,coverUV(vec2(uv.x-rs*2.0,uv.y))).b+0.05;
    col.r+=0.08*texture2D(map,coverUV(vec2(uv.x+0.026,uv.y-0.026))).r;
    col.g+=0.05*texture2D(map,coverUV(vec2(uv.x-0.022,uv.y-0.022))).g;
    col.b+=0.08*texture2D(map,coverUV(vec2(uv.x-0.022,uv.y-0.018))).b;
    col=clamp(col*0.93+0.07*col*col,0.0,1.0);
    col*=vec3(pow(16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y),0.12));
    col*=vec3(0.95,1.05,0.95)*2.5;
    col*=vec3(0.6+0.4*pow(clamp(0.35+0.35*sin(uv.y*iResolution.y*1.5),0.0,1.0),1.2));
    col*=1.0-0.65*vec3(clamp((mod(vUv.x*iResolution.x,2.0)-1.0)*2.0,0.0,1.0));
    col+=vec3(hash(uv.x*100.0+uv.y*1000.0+time*300.0)*gi*0.3);
    gl_FragColor=vec4(col,1.0);
  }
`;

const PROJECTS = [
  ["Clinic", "/crt-default.jpg"],
  ["District", "/crt-1.jpg"],
  ["Waypoint", "/crt-2.jpg"],
  ["Corridor", "/crt-3.jpg"],
  ["Archive", "/crt-4.jpg"],
  ["Terminal", "/crt-5.jpg"],
];

export default function CrtDisplay() {
  const hostRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;
      const host = hostRef.current;
      if (!host) return;

      const W = () => host.clientWidth;
      const H = () => host.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.1, 1000);
      camera.position.set(0, 0.15, 1);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W(), H());
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 5));
      const dir = new THREE.DirectionalLight(0xffffff, 2.5); dir.position.set(15, 10, -5); scene.add(dir);
      const top = new THREE.PointLight(0xffffff, 5, 10); top.position.set(-5, -2.5, 0); top.decay = 0.3; scene.add(top);

      const group = new THREE.Group(); scene.add(group);
      new GLTFLoader().load("/monitor.glb", (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
        model.position.sub(center);
        group.add(model);
      });

      function screenGeo(w, h, r) {
        const s = new THREE.Shape();
        const x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        const g = new THREE.ShapeGeometry(s);
        const pos = g.attributes.position;
        const uvs = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) { uvs[i * 2] = (pos.getX(i) - x) / w; uvs[i * 2 + 1] = (pos.getY(i) - y) / h; }
        g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        return g;
      }

      const texLoader = new THREE.TextureLoader();
      const cache = {};
      function loadTex(src) {
        if (cache[src]) return cache[src];
        const t = texLoader.load(src, () => { mat.uniforms.imageAspect.value = t.image.width / t.image.height; });
        t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
        cache[src] = t; return t;
      }

      const DEFAULT = "/crt-default.jpg";
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: loadTex(DEFAULT) },
          imageAspect: { value: 1 },
          planeAspect: { value: 0.28 / 0.235 },
          iResolution: { value: new THREE.Vector2(512, 512) },
          glitchIntensity: { value: 0 },
          time: { value: 0 },
        },
        vertexShader, fragmentShader,
      });

      const plane = new THREE.Mesh(screenGeo(1, 1, 0.03), mat);
      plane.scale.set(0.28, 0.235, 1);
      plane.position.set(-0.008, 0.005, 0.041);
      plane.rotation.set(-0.18, 0, 0);
      group.add(plane);

      const mouse = { x: 0, y: 0 }, lerp = { x: 0, y: 0 };
      const start = performance.now();
      let raf;
      function animate() {
        raf = requestAnimationFrame(animate);
        mat.uniforms.time.value = (performance.now() - start) / 1000;
        lerp.x = gsap.utils.interpolate(lerp.x, mouse.x, 0.05);
        lerp.y = gsap.utils.interpolate(lerp.y, mouse.y, 0.05);
        group.rotation.x = lerp.y * 0.15;
        group.rotation.y = lerp.x * 0.3;
        renderer.render(scene, camera);
      }
      animate();
      camera.position.z = Math.max(1, 768 / W());

      const onMove = (e) => {
        const r = host.getBoundingClientRect();
        mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 10;
        mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 5;
      };
      const onResize = () => {
        camera.aspect = W() / H(); camera.updateProjectionMatrix();
        renderer.setSize(W(), H()); camera.position.z = Math.max(1, 768 / W());
      };
      host.addEventListener("mousemove", onMove);
      window.addEventListener("resize", onResize);

      const glitch = { v: 0 }; let gtw = null;
      function setImage(src) {
        mat.uniforms.map.value = loadTex(src);
        if (gtw) gtw.kill();
        glitch.v = 1;
        gtw = gsap.to(glitch, { v: 0, duration: 0.75, ease: "power3.out", onUpdate: () => { mat.uniforms.glitchIntensity.value = glitch.v; } });
        const t = mat.uniforms.map.value;
        const upd = () => { mat.uniforms.imageAspect.value = t.image.width / t.image.height; };
        t.image ? upd() : t.addEventListener("load", upd);
      }

      const links = listRef.current ? listRef.current.querySelectorAll("li") : [];
      const enterHandlers = [];
      links.forEach((li) => {
        const h = () => { const img = li.getAttribute("data-img"); if (img) setImage(img); };
        enterHandlers.push([li, h]);
        li.addEventListener("mouseenter", h);
      });
      const onListLeave = () => setImage(DEFAULT);
      listRef.current && listRef.current.addEventListener("mouseleave", onListLeave);

      cleanup = () => {
        cancelAnimationFrame(raf);
        host.removeEventListener("mousemove", onMove);
        window.removeEventListener("resize", onResize);
        enterHandlers.forEach(([li, h]) => li.removeEventListener("mouseenter", h));
        listRef.current && listRef.current.removeEventListener("mouseleave", onListLeave);
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, []);

  return (
    <div className="crt-hero">
      <div className="crt-canvas" ref={hostRef} />
      <ul className="crt-projects" ref={listRef}>
        {PROJECTS.map(([label, img]) => (
          <li key={label} data-img={img}>{label}</li>
        ))}
      </ul>
    </div>
  );
}
