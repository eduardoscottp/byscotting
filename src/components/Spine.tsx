import { useEffect, useRef, useState } from "react";

/**
 * Segmento del hilo que cose la página. Se dibuja al entrar en pantalla.
 * Es la idea rectora de la marca hecha estructura: los sistemas se conectan.
 */
export default function Spine({
  tone = "dark",
  height = 96,
}: {
  tone?: "dark" | "light";
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDrawn(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rail = tone === "light" ? "rgba(255,255,255,.18)" : "#B9D4FB";

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none flex justify-center">
      <svg width="24" height={height} viewBox={`0 0 24 ${height}`} fill="none">
        <line x1="12" y1="0" x2="12" y2={height} stroke={rail} strokeWidth="2" strokeLinecap="round" />
        <line
          x1="12"
          y1="0"
          x2="12"
          y2={height}
          stroke="#01DECB"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={drawn ? 0 : 1}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,.61,.36,1)" }}
        />
        <circle
          cx="12"
          cy={height / 2}
          r={drawn ? 5 : 3}
          fill={drawn ? "#01DECB" : rail}
          style={{ transition: "r .4s ease-out .5s, fill .4s ease-out .5s" }}
        />
      </svg>
    </div>
  );
}
