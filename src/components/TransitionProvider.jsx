"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";

if (typeof window !== "undefined" && !window.__react_remove_child_patched__) {
  window.__react_remove_child_patched__ = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return referenceNode.parentNode.insertBefore(newNode, referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
}

export default function TransitionProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const svgRef = useRef(null);
  const isFirstMount = useRef(true);

  // Uncover on pathname change
  useEffect(() => {
    if (!svgRef.current) return;
    
    const path = svgRef.current.querySelector("path");
    
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Ensure it's hidden on first load without animating
      gsap.set(path, { attr: { d: "M 0 100 L 100 100 L 100 100 Q 50 100 0 100 Z" } });
      return;
    }

    // Start state for uncover (fully covering the screen)
    gsap.set(path, { attr: { d: "M 0 100 L 100 100 L 100 0 Q 50 0 0 0 Z" } });
    
    // Animate bottom edge up to uncover
    const tl = gsap.timeline();
    tl.to(path, {
      attr: { d: "M 0 50 Q 50 0 100 50 L 100 0 L 0 0 Z" },
      duration: 0.4,
      ease: "power2.in",
    }).to(path, {
      attr: { d: "M 0 0 Q 50 0 100 0 L 100 0 L 0 0 Z" },
      duration: 0.4,
      ease: "power2.out",
    });

  }, [pathname]);

  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest("a");
      
      // Allow cross-origin, mailto, etc. to pass through normally
      if (
        target && 
        target.href && 
        target.href.startsWith(window.location.origin) &&
        !target.hasAttribute("target") &&
        !target.hasAttribute("download")
      ) {
        const url = new URL(target.href);
        // Only transition if navigating to a different path
        if (url.pathname !== window.location.pathname) {
          e.preventDefault();
          const path = svgRef.current.querySelector("path");
          
          // Reset to bottom flat
          gsap.set(path, { attr: { d: "M 0 100 L 100 100 L 100 100 Q 50 100 0 100 Z" } });
          
          // Animate to cover screen
          const tl = gsap.timeline({
            onComplete: () => {
              // Now push route - the pathname change will trigger the uncover animation
              router.push(target.href);
            }
          });
          
          tl.to(path, {
            attr: { d: "M 0 100 L 100 100 L 100 50 Q 50 0 0 50 Z" },
            duration: 0.4,
            ease: "power2.in"
          }).to(path, {
            attr: { d: "M 0 100 L 100 100 L 100 0 Q 50 0 0 0 Z" },
            duration: 0.4,
            ease: "power2.out"
          });
        }
      }
    };
    
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [router]);

  return (
    <>
      {children}
      <div className="transition-svg-wrapper" ref={svgRef}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 0 100 L 100 100 L 100 100 Q 50 100 0 100 Z" fill="var(--gold)" />
        </svg>
      </div>
    </>
  );
}
