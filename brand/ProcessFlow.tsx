import { useEffect, useRef, useState } from "react";

/**
 * Flujo del proceso Scotting: Detecto → Analizo → Soluciono → Automatizo → Mejoro.
 * La línea se dibuja sola al entrar en pantalla y cada nodo se enciende cuando la línea lo alcanza.
 * Respeta prefers-reduced-motion mostrando el estado final de una vez.
 */

const BLUE = "#0038FC";
const TEAL = "#01DECB";
const SOFT = "#B9D4FB";
const NAVY = "#0F172A";

const DURATION = 2400;

export type Step = { label: string; note: string };

export const STEPS: Step[] = [
  { label: "Detecto", note: "Miro cómo trabajas hoy. Sin cambiar nada todavía." },
  { label: "Analizo", note: "Qué cuesta tiempo, qué cuesta errores, qué cuesta dinero." },
  { label: "Soluciono", note: "A veces es software. A veces es cambiar el orden." },
  { label: "Automatizo", note: "Solo lo que ya sabemos que funciona." },
  { label: "Mejoro", note: "Me quedo. Lo que se construye se afina." },
];

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

/** 0 → 1 una sola vez, cuando el bloque entra en pantalla. */
function useDrawProgress(ref: React.RefObject<Element>, reduced: boolean) {
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
          // easeOutCubic
          setProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, reduced]);

  return progress;
}

/** Un nodo se considera encendido cuando la línea ya pasó por él. */
function isLit(index: number, total: number, progress: number) {
  return progress >= index / (total - 1) - 0.001;
}

function Node({ x, y, lit }: { x: number; y: number; lit: boolean }) {
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={lit ? 26 : 20}
        fill={lit ? TEAL : "#FFFFFF"}
        opacity={lit ? 0.16 : 0}
        style={{ transition: "r 300ms ease-out, opacity 300ms ease-out" }}
      />
      <circle
        cx={x}
        cy={y}
        r={lit ? 13 : 9}
        fill={lit ? TEAL : SOFT}
        style={{ transition: "r 300ms ease-out, fill 300ms ease-out" }}
      />
    </>
  );
}

export default function ProcessFlow() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const narrow = useIsNarrow();
  const progress = useDrawProgress(wrapRef, reduced);
  const [open, setOpen] = useState<number | null>(null);

  const n = STEPS.length;

  // Coordenadas: horizontal en desktop, vertical en móvil.
  const horizontal = { w: 900, h: 150, x0: 90, x1: 810, y: 52 };
  const vertical = { w: 320, h: 620, x: 44, y0: 46, y1: 574 };

  const line = narrow
    ? `M ${vertical.x} ${vertical.y0} V ${vertical.y1}`
    : `M ${horizontal.x0} ${horizontal.y} H ${horizontal.x1}`;

  const points = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return narrow
      ? { x: vertical.x, y: vertical.y0 + t * (vertical.y1 - vertical.y0) }
      : { x: horizontal.x0 + t * (horizontal.x1 - horizontal.x0), y: horizontal.y };
  });

  const viewBox = narrow
    ? `0 0 ${vertical.w} ${vertical.h}`
    : `0 0 ${horizontal.w} ${horizontal.h}`;

  return (
    <div ref={wrapRef} className="scotting-flow">
      <style>{`
        .scotting-flow { width: 100%; }
        .scotting-flow svg { width: 100%; height: auto; display: block; overflow: visible; }
        .scotting-flow .step-label {
          font-family: Inter, "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif;
          font-weight: 700;
          fill: ${NAVY};
        }
        .scotting-flow .step-note {
          font-family: "DM Sans", Inter, "Helvetica Neue", Arial, sans-serif;
          font-weight: 400;
          fill: ${NAVY};
          opacity: .62;
        }
        .scotting-flow .step-hit { cursor: pointer; fill: transparent; }
      `}</style>

      <svg viewBox={viewBox} role="img" aria-label="Mi proceso: detecto, analizo, soluciono, automatizo, mejoro">
        <defs>
          <linearGradient id="scottingFlowLine" x1="0" y1="0" x2={narrow ? "0" : "1"} y2={narrow ? "1" : "0"}>
            <stop offset="0" stopColor={BLUE} />
            <stop offset="1" stopColor={TEAL} />
          </linearGradient>
        </defs>

        {/* Riel apagado */}
        <path d={line} stroke={SOFT} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.5} />

        {/* Línea que se dibuja */}
        <path
          d={line}
          pathLength={1}
          stroke="url(#scottingFlowLine)"
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />

        {points.map((p, i) => {
          const lit = isLit(i, n, progress);
          const showNote = open === i;
          return (
            <g key={STEPS[i].label}>
              <Node x={p.x} y={p.y} lit={lit} />

              {narrow ? (
                <>
                  <text className="step-label" x={p.x + 34} y={p.y - 2} fontSize={20}>
                    {STEPS[i].label}
                  </text>
                  <text className="step-note" x={p.x + 34} y={p.y + 22} fontSize={14}>
                    {STEPS[i].note}
                  </text>
                </>
              ) : (
                <>
                  <text className="step-label" x={p.x} y={p.y + 46} fontSize={19} textAnchor="middle">
                    {STEPS[i].label}
                  </text>
                  {showNote && (
                    <text className="step-note" x={p.x} y={p.y + 70} fontSize={13} textAnchor="middle">
                      {STEPS[i].note}
                    </text>
                  )}
                  <rect
                    className="step-hit"
                    x={p.x - 70}
                    y={p.y - 30}
                    width={140}
                    height={90}
                    onMouseEnter={() => setOpen(i)}
                    onMouseLeave={() => setOpen((cur) => (cur === i ? null : cur))}
                    onFocus={() => setOpen(i)}
                    onBlur={() => setOpen((cur) => (cur === i ? null : cur))}
                    tabIndex={0}
                    role="button"
                    aria-label={`${STEPS[i].label}. ${STEPS[i].note}`}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
