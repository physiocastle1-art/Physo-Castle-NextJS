"use client";
import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* Faithful port of the CODE-GRID landonorris text-reveal "Copy" component.
   Splits text into lines and sweeps a colored block across each line on scroll.

   IMPORTANT: SplitText mutates the DOM that React owns (it replaces the original
   text nodes with line <div>s). React's fiber still references the ORIGINAL text
   nodes, so on client-side navigation (unmount) React calls removeChild on nodes
   that no longer exist -> "NotFoundError: Failed to execute 'removeChild'".
   To fix this we snapshot each split element's original child nodes up front and
   restore those exact nodes on cleanup, so React always finds what it expects. */
export default function Copy({
  children,
  animateOnScroll = true,
  delay = 0,
  blockColor = "#2f6fb0",
  stagger = 0.12,
  duration = 0.75,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(SplitText, ScrollTrigger);
    const container = containerRef.current;
    if (!container) return;

    const splits = [];
    const lines = [];
    const blocks = [];
    const triggers = [];

    const elements = container.hasAttribute("data-copy-wrapper")
      ? Array.from(container.children)
      : [container];

    // Snapshot the exact DOM nodes React rendered, BEFORE SplitText replaces them.
    const originals = elements.map((element) => ({
      element,
      nodes: Array.from(element.childNodes),
    }));

    const ctx = gsap.context(() => {
      elements.forEach((element) => {
        const split = SplitText.create(element, { type: "lines", linesClass: "block-line", lineThreshold: 0.1 });
        splits.push(split);
        split.lines.forEach((line) => {
          const wrapper = document.createElement("div");
          wrapper.className = "block-line-wrapper";
          line.parentNode.insertBefore(wrapper, line);
          wrapper.appendChild(line);
          const block = document.createElement("div");
          block.className = "block-revealer";
          block.style.backgroundColor = blockColor;
          wrapper.appendChild(block);
          lines.push(line);
          blocks.push(block);
        });
      });

      gsap.set(lines, { opacity: 0 });
      gsap.set(blocks, { scaleX: 0, transformOrigin: "left center" });

      const makeTl = (block, line, index) => {
        const tl = gsap.timeline({ delay: delay + index * stagger });
        tl.to(block, { scaleX: 1, duration, ease: "power4.inOut" });
        tl.set(line, { opacity: 1 });
        tl.set(block, { transformOrigin: "right center" });
        tl.to(block, { scaleX: 0, duration, ease: "power4.inOut" });
        return tl;
      };

      if (animateOnScroll) {
        blocks.forEach((block, index) => {
          const tl = makeTl(block, lines[index], index);
          tl.pause();
          triggers.push(ScrollTrigger.create({ trigger: container, start: "top 88%", once: true, onEnter: () => tl.play() }));
        });
      } else {
        blocks.forEach((block, index) => makeTl(block, lines[index], index));
      }
    }, container);

    return () => {
      try {
        triggers.forEach((t) => t && t.kill());
        splits.forEach((s) => s.revert && s.revert());
        ctx.revert();
      } catch (e) {
        /* ignore — DOM restore below is what matters */
      }
      // Restore the exact nodes React's fiber still points at, so unmount is safe.
      originals.forEach(({ element, nodes }) => {
        if (element && element.replaceChildren) element.replaceChildren(...nodes);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateOnScroll, delay, blockColor, stagger, duration]);

  if (React.Children.count(children) === 1) {
    return React.cloneElement(children, { ref: containerRef });
  }
  return (
    <div ref={containerRef} data-copy-wrapper="true">
      {children}
    </div>
  );
}
