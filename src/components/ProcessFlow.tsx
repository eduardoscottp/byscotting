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

export default function ProcessFlow({
  steps,
  hint,
  loop,
  tone = "dark",
}: {
  steps: readonly Step[];
  hint: string;
  loop: string;
  tone?: "dark" | "light";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const narrow = useIsNarrow();
  const progress = useDrawProgress(wrapRef, reduced);
  const [open, setOpen] = useState(0);

  const light = tone === "light";
  const labelClass = light ? "fill-white/55 font-display font-bold" : "fill-ink/45 font-display font-bold";
  const litLabelClass = light ? "fill-white font-display font-bold" : "fill-ink font-display font-bold";
  const railColor = light ? "rgba(255,255,255,.22)" : SOFT;

  const n = steps.length;

  /* El ciclo cierra: los pasos se reparten cada 360/n grados desde las 12 en
     sentido horario y la circunferencia da la vuelta completa. En el ultimo
     tramo (del ultimo paso de vuelta al primero) el trazo termina en una
     flecha que apunta al primer paso: ahi se ve que el ciclo reinicia. */
  const C = { w: 600, h: 560, cx: 300, cy: 275, r: 175, lr: 211 };

  const at = (deg: number, radius = C.r) => {
    const a = (deg * Math.PI) / 180;
    return { x: C.cx + radius * Math.cos(a), y: C.cy + radius * Math.sin(a), cos: Math.cos(a), sin: Math.sin(a) };
  };

  const START = -90; // Detecto, a las 12
  const SWEEP = 348; // casi la vuelta entera; los 12 grados que faltan son la flecha
  const STROKE_END = START + SWEEP;
  const ARROW_AT = START + 354; // punta, entrando en Detecto

  const a0 = at(START);
  const a1 = at(STROKE_END);
  const arc = `M ${a0.x} ${a0.y} A ${C.r} ${C.r} 0 ${SWEEP > 180 ? 1 : 0} 1 ${a1.x} ${a1.y}`;
  const tip = at(ARROW_AT);

  const seats = Array.from({ length: n }, (_, i) => {
    const p = at(START + (i * 360) / n);
    const l = at(START + (i * 360) / n, C.lr);
    return {
      x: p.x,
      y: p.y,
      lx: l.x,
      ly: l.y + (p.sin < -0.7 ? -10 : p.sin > 0.7 ? 20 : 7),
      anchor: p.cos > 0.3 ? ("start" as const) : p.cos < -0.3 ? ("end" as const) : ("middle" as const),
    };
  });

  /* En vertical el flujo va en HTML, no en SVG: el <text> de SVG no salta de
     línea y las notas largas se salían del ancho del teléfono sin scroll. */
  if (narrow) {
    return (
      <div ref={wrapRef} className="w-full">
        <ol className="flex flex-col gap-8">
          {steps.map((s, i) => {
            const lit = progress >= i / (n - 1) - 0.001;
            const seg = Math.max(0, Math.min(1, (progress - i / (n - 1)) * (n - 1)));
            return (
              <li key={s.label} className="relative pl-12">
                {i < n - 1 && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute left-[10px] top-8 h-[calc(100%+10px)] w-[6px] rounded-full"
                      style={{ background: railColor, opacity: light ? 1 : 0.45 }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-[10px] top-8 w-[6px] rounded-full"
                      style={{
                        height: `calc((100% + 10px) * ${seg})`,
                        background: `linear-gradient(${light ? "#4C7BFF" : "#0038FC"}, ${TEAL})`,
                      }}
                    />
                  </>
                )}

                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 h-[26px] w-[26px] rounded-full"
                  style={{
                    background: lit ? TEAL : "transparent",
                    opacity: lit ? 0.16 : 0,
                    transition: "opacity .3s ease-out",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-[9px] rounded-full"
                  style={{
                    left: lit ? "4px" : "6px",
                    height: lit ? "18px" : "14px",
                    width: lit ? "18px" : "14px",
                    background: lit ? TEAL : railColor,
                    transition: "all .3s ease-out",
                  }}
                />

                <p
                  className={`font-display text-xl font-bold tracking-[-0.02em] ${
                    light ? "text-white" : "text-ink"
                  }`}
                >
                  {s.label}
                </p>
                <p
                  className={`mt-1.5 font-body text-[1.05rem] leading-relaxed ${
                    light ? "text-white/70" : "text-ink/65"
                  }`}
                >
                  {s.note}
                </p>
              </li>
            );
          })}
        </ol>
        {/* El cierre del ciclo aqui iba con un icono que no funcionaba en
            pantalla estrecha. En movil el ciclo lo dice la linea de la seccion. */}
      </div>
    );
  }

  /* El arco se dibuja desde las 12 en sentido horario, cierra la vuelta y
     termina en flecha entrando al primer paso. El texto vive al lado, en HTML,
     no dentro del SVG, porque el <text> de SVG no salta de linea. */
  return (
    <div
      ref={wrapRef}
      className="grid items-center gap-10 md:grid-cols-[minmax(0,460px)_1fr] md:gap-16"
    >
      <svg
        viewBox={`0 0 ${C.w} ${C.h}`}
        className="block h-auto w-full"
        role="img"
        aria-label={steps.map((s) => s.label).join(" → ") + " → " + loop}
      >
        <defs>
          <linearGradient id="scottingFlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light ? "#4C7BFF" : "#0038FC"} />
            <stop offset="1" stopColor={TEAL} />
          </linearGradient>
        </defs>

        <path
          d={arc}
          fill="none"
          stroke={railColor}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={light ? 1 : 0.45}
        />
        <path
          d={arc}
          fill="none"
          stroke="url(#scottingFlow)"
          strokeWidth={6}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />

        {/* el trazo cierra apuntando de vuelta al primer paso */}
        <path
          d="M 0 0 L -19 -10 L -19 10 Z"
          fill={TEAL}
          transform={`translate(${tip.x} ${tip.y}) rotate(${ARROW_AT + 90})`}
          opacity={Math.max(0, Math.min(1, (progress - 0.9) / 0.1))}
        />

        {/* la vuelta al ciclo, en el centro */}
        <text
          x={C.cx}
          y={C.cy - 6}
          fontSize={17}
          textAnchor="middle"
          className={light ? "fill-white/40 font-body" : "fill-ink/35 font-body"}
        >
          {loop}
        </text>
        <text
          x={C.cx}
          y={C.cy + 26}
          fontSize={30}
          textAnchor="middle"
          className={light ? "fill-teal font-display font-bold" : "fill-blue font-display font-bold"}
        >
          ↻
        </text>

        {seats.map((p, i) => {
          // el paso i cae en (i*360/n)/SWEEP del trazo
          const lit = progress >= (i * 360) / n / SWEEP - 0.001;
          return (
            <g key={steps[i].label}>
              <Node x={p.x} y={p.y} lit={lit} dormant={railColor} />
              <text
                x={p.lx}
                y={p.ly}
                fontSize={23}
                textAnchor={p.anchor}
                className={open === i ? litLabelClass : labelClass}
                style={{ transition: "fill .2s ease-out" }}
              >
                {steps[i].label}
              </text>
              <circle
                cx={p.x}
                cy={p.y}
                r={40}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${steps[i].label}. ${steps[i].note}`}
                className="cursor-pointer focus:outline-none focus-visible:stroke-teal"
                strokeWidth={2}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
              />
            </g>
          );
        })}
      </svg>

      <div className="flex min-h-[224px] flex-col gap-3">
        <p
          className={`font-display text-base font-semibold tracking-[0.02em] ${
            light ? "text-teal" : "text-blue"
          }`}
        >
          {String(open + 1).padStart(2, "0")} · {steps[open].label}
        </p>
        <p
          className={`max-w-[26ch] font-display text-2xl font-medium leading-snug tracking-[-0.02em] md:text-[2rem] ${
            light ? "text-white" : "text-ink"
          }`}
        >
          {steps[open].note}
        </p>
        <p className={`mt-2 font-body text-sm ${light ? "text-white/40" : "text-ink/40"}`}>{hint}</p>
      </div>
    </div>
  );
}
