"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/* Exact port of the CODE-GRID SenseiTech scroll animation (with Lenis). */
export default function SenseiScroll() {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const el = root.current;
    const spotlightImgFinalPos = [[-140, -140], [40, -130], [-160, 40], [20, 30]];
    const spotlightImages = el.querySelectorAll(".spotlight-img");

    const st = ScrollTrigger.create({
      trigger: el.querySelector(".sensei-spotlight"),
      start: "top top",
      end: `+=${window.innerHeight * 6}px`,
      pin: true,
      pinSpacing: true,
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        const initialRotations = [5, -3, 3.5, -1];
        const phaseOneStartOffsets = [0, 0.1, 0.2, 0.3];

        spotlightImages.forEach((img, index) => {
          const initialRotation = initialRotations[index];
          const phase1Start = phaseOneStartOffsets[index];
          const phase1End = Math.min(phase1Start + (0.45 - phase1Start) * 0.9, 0.45);

          let x = -50, y, rotation;

          if (progress < phase1Start) { y = 200; rotation = initialRotation; }
          else if (progress <= 0.45) {
            let phase1Progress;
            if (progress >= phase1End) phase1Progress = 1;
            else { const linearProgress = (progress - phase1Start) / (phase1End - phase1Start); phase1Progress = 1 - Math.pow(1 - linearProgress, 3); }
            y = 200 - phase1Progress * 250; rotation = initialRotation;
          } else { y = -50; rotation = initialRotation; }

          const phaseTwoStartOffsets = [0.5, 0.55, 0.6, 0.65];
          const phase2Start = phaseTwoStartOffsets[index];
          const phase2End = Math.min(phase2Start + (0.95 - phase2Start) * 0.9, 0.95);
          const finalX = spotlightImgFinalPos[index][0];
          const finalY = spotlightImgFinalPos[index][1];

          if (progress >= phase2Start && progress <= 0.95) {
            let phase2Progress;
            if (progress >= phase2End) phase2Progress = 1;
            else { const linearProgress = (progress - phase2Start) / (phase2End - phase2Start); phase2Progress = 1 - Math.pow(1 - linearProgress, 3); }
            x = -50 + (finalX + 50) * phase2Progress;
            y = -50 + (finalY + 50) * phase2Progress;
            rotation = initialRotation * (1 - phase2Progress);
          } else if (progress > 0.95) { x = finalX; y = finalY; rotation = 0; }

          gsap.set(img, { transform: `translate(${x}%, ${y}%) rotate(${rotation}deg)` });
        });
      },
    });

    return () => {
      st && st.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="sensei" ref={root}>
      <section className="s-intro"><h1>The art of healing becomes the art of sensing.</h1></section>

      <section className="sensei-spotlight">
        <div className="spotlight-header"><h1>Time stretches differently inside recovery.</h1></div>
        <div className="spotlight-images">
          <div className="spotlight-img"><img src="/journal-1.jpg" alt="" /></div>
          <div className="spotlight-img"><img src="/journal-2.jpg" alt="" /></div>
          <div className="spotlight-img"><img src="/journal-3.jpg" alt="" /></div>
          <div className="spotlight-img"><img src="/journal-4.jpg" alt="" /></div>
        </div>
      </section>

      <section className="s-outro"><h1>We help bodies move with quiet precision.</h1></section>
    </div>
  );
}
