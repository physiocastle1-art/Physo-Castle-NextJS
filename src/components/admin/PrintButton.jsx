"use client";

/* window.print() needs an event handler, and an event handler needs a client
   component — a server component cannot pass one down. */
export default function PrintButton({ label = "Print / Save PDF", className = "btn-print" }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      🖨 {label}
    </button>
  );
}
