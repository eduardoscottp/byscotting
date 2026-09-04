import { useEffect, useRef, useState } from "react";

const TEAL = "#01DECB";
const SOFT = "#B9D4FB";
const DURATION = 2400;

type Step = { label: string; note: string };

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function useIsNarrow(breakpoint = 768) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return narrow;
}

/** 0 → 1, una sola vez, cuando el bloque entra en pantalla. */
function useDrawProgress(ref: React.RefObject<HTMLDivElement>, reduced: boolean) {
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setProgress(1);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION);
          setProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, reduced]);

  return progress;
}

function Node({ x, y, lit, dormant }: { x: number; y: number; lit: boolean; dormant: string }) {
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={lit ? 26 : 20}
        fill={TEAL}
        opacity={lit ? 0.16 : 0}
        style={{ transition: "r .3s ease-out, opacity .3s ease-out" }}
      />
      <circle
        cx={x}
        cy={y}
        r={lit ? 13 : 9}
        fill={lit ? TEAL : dormant}
        style={{ transition: "r .3s ease-out, fill .3s ease-out" }}
      />
    </>
  );
}

export default function ProcessFlow({ steps, hint, tone = "dark" }: { steps: readonly Step[]; hint: string; tone?: "dark" | "light" }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const narrow = useIsNarrow();
  const progress = useDrawProgress(wrapRef, reduced);
  const [open, setOpen] = useState<number | null>(null);

  const light = tone === "light";
  const labelClass = light ? "fill-white font-display font-bold" : "fill-ink font-display font-bold";
  const noteClass = light ? "fill-white/65 font-body" : "fill-ink/60 font-body";
  const railColor = light ? "rgba(255,255,255,.22)" : SOFT;

  const n = steps.length;
  const H = { w: 900, h: 150, x0: 90, x1: 810, y: 52 };
  const V = { w: 330, h: 620, x: 44, y0: 46, y1: 574 };

  const line = narrow ? `M ${V.x} ${V.y0} V ${V.y1}` : `M ${H.x0} ${H.y} H ${H.x1}`;

  const points = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return narrow
      ? { x: V.x, y: V.y0 + t * (V.y1 - V.y0) }
      : { x: H.x0 + t * (H.x1 - H.x0), y: H.y };
  });

  return (
    <div ref={wrapRef} className="w-full">
      <div className="overflow-x-auto">
        <svg
          viewBox={narrow ? `0 0 ${V.w} ${V.h}` : `0 0 ${H.w} ${H.h}`}
          className={`block h-auto w-full ${narrow ? "" : "min-w-[640px]"}`}
          style={{ overflow: "visible" }}
          role="img"
          aria-label={steps.map((s) => s.label).join(", ")}
        >
          <defs>
            <linearGradient id="scottingFlow" x1="0" y1="0" x2={narrow ? "0" : "1"} y2={narrow ? "1" : "0"}>
              <stop offset="0" stopColor={light ? "#4C7BFF" : "#0038FC"} />
              <stop offset="1" stopColor={TEAL} />
            </linearGradient>
          </defs>

          <path d={line} fill="none" stroke={railColor} strokeWidth={6} strokeLinecap="round" opacity={light ? 1 : 0.45} />
          <path
            d={line}
            fill="none"
            stroke="url(#scottingFlow)"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - progress}
          />

          {points.map((p, i) => {
            const lit = progress >= i / (n - 1) - 0.001;
            return (
              <g key={steps[i].label}>
                <Node x={p.x} y={p.y} lit={lit} dormant={railColor} />
                {narrow ? (
                  <>
                    <text x={p.x + 34} y={p.y - 1} fontSize={19} className={labelClass}>
                      {steps[i].label}
                    </text>
                    <text x={p.x + 34} y={p.y + 22} fontSize={13.5} className={noteClass}>
                      {steps[i].note}
                    </text>
                  </>
                ) : (
                  <>
                    <text
                      x={p.x}
                      y={p.y + 48}
                      fontSize={19}
                      textAnchor="middle"
                      className={labelClass}
                    >
                      {steps[i].label}
                    </text>
                    <text
                      x={p.x}
                      y={p.y + 72}
                      fontSize={12.5}
                      textAnchor="middle"
                      className={noteClass}
                      opacity={open === i ? 1 : 0}
                      style={{ transition: "opacity .2s ease-out" }}
                    >
                      {steps[i].note}
                    </text>
                    <rect
                      x={p.x - 78}
                      y={p.y - 32}
                      width={156}
                      height={96}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${steps[i].label}. ${steps[i].note}`}
                      className="cursor-pointer focus:outline-none focus-visible:stroke-teal"
                      strokeWidth={2}
                      onMouseEnter={() => setOpen(i)}
                      onMouseLeave={() => setOpen((cur) => (cur === i ? null : cur))}
                      onFocus={() => setOpen(i)}
                      onBlur={() => setOpen((cur) => (cur === i ? null : cur))}
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {!narrow && <p className={`mt-4 text-center font-body text-sm ${light ? "text-white/45" : "text-ink/45"}`}>{hint}</p>}
    </div>
  );
}
