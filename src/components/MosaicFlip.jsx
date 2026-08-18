"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/* "Venetian blinds" focus-area reveal.
   The image is sliced into tall vertical slats; hovering/clicking a focus area
   rotates the slats in sequence (left -> right) to flip through to the next
   image. A custom motion — distinct from the common cube-mosaic template. */
const STRIPS = 16;
const W = 720, H = 520;
const SW = W / STRIPS;

// Free stock photos (Lorem Picsum, seeded so each is stable). Swap for your own.
const IMAGES = [
  "https://picsum.photos/seed/physiocastle-clinic/720/540",
  "https://picsum.photos/seed/physiocastle-ortho/720/540",
  "https://picsum.photos/seed/physiocastle-neuro/720/540",
  "https://picsum.photos/seed/physiocastle-cardio/720/540",
  "https://picsum.photos/seed/physiocastle-women/720/540",
  "https://picsum.photos/seed/physiocastle-stress/720/540",
  "https://picsum.photos/seed/physiocastle-fitness/720/540",
];

const PROJECTS = [
  ["Orthopaedic Rehab", 1], ["Neurological Rehab", 2], ["Cardiorespiratory", 3],
  ["Women's Health", 4], ["Stress Management", 5], ["Fitness · Yoga · Pilates", 6],
];

export default function MosaicFlip() {
  const blindsRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const wrap = blindsRef.current;
    if (!wrap) return;

    // Build the slats, each with a front + back face carrying an image slice.
    const strips = [];
    for (let i = 0; i < STRIPS; i++) {
      const slat = document.createElement("div");
      slat.className = "blind";
      slat.style.width = `${SW}px`;
      const faces = {};
      ["front", "back"].forEach((side) => {
        const f = document.createElement("div");
        f.className = `blind-face ${side}`;
        f.style.backgroundSize = `${W}px ${H}px`;
        f.style.backgroundPosition = `${-(i * SW)}px 0`;
        slat.appendChild(f);
        faces[side] = f;
      });
      wrap.appendChild(slat);
      strips.push({ el: slat, faces });
    }

    const setFace = (face, src) => strips.forEach((s) => (s.faces[face].style.backgroundImage = `url(${src})`));
    setFace("front", IMAGES[0]);
    setFace("back", IMAGES[0]);

    // Gentle idle: the whole slat panel breathes with a slow 3D tilt.
    const idle = gsap.to(wrap, { rotationY: 3, duration: 5.5, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 50%" });

    let active = 0, count = 0, animating = false, queued = null, delay = null;
    const hiddenFace = () => (count % 2 === 0 ? "back" : "front");

    function reveal(index) {
      if (index === active && !animating) return;
      if (animating) { queued = index; return; }
      if (index === active) return;
      animating = true; queued = null;
      setFace(hiddenFace(), IMAGES[index]);
      count++; active = index;
      gsap.to(strips.map((s) => s.el), {
        rotateY: count * 180, duration: 0.62, ease: "power3.inOut",
        stagger: { each: 0.035, from: "start" },
        onComplete: () => { animating = false; if (queued !== null && queued !== active) reveal(queued); },
      });
    }

    const links = Array.from(listRef.current.querySelectorAll("button"));
    const handlers = [];
    links.forEach((link) => {
      const go = () => {
        links.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
        clearTimeout(delay);
        delay = setTimeout(() => reveal(parseInt(link.dataset.index)), 30);
      };
      link.addEventListener("mouseenter", go);
      link.addEventListener("click", go);
      handlers.push([link, go]);
    });

    return () => {
      idle.kill();
      gsap.killTweensOf(strips.map((s) => s.el));
      handlers.forEach(([link, go]) => { link.removeEventListener("mouseenter", go); link.removeEventListener("click", go); });
      wrap.innerHTML = "";
    };
  }, []);

  return (
    <div className="spotlight">
      <div className="blinds" ref={blindsRef} />
      <nav className="project-list" ref={listRef}>
        {PROJECTS.map(([label, idx]) => (
          <button type="button" key={idx} data-index={idx}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
