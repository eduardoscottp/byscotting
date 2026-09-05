/**
 * Hueco de imagen. Si la foto ya existe la muestra; si no, dibuja un espacio
 * de marca que dice exactamente qué foto va ahí. El sitio se ve intencional
 * hoy y la foto entra sin tocar el diseño.
 */
import { useEffect, useState } from "react";

/** Igual que en ProcessFlow: si el visitante pide menos movimiento, el video
 *  no arranca solo y se le dan controles para que lo vea si quiere. */
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

export default function Frame({
  src,
  video,
  alt,
  shot,
  ratio = "4 / 5",
  mark = "/node-ring.svg",
  className = "",
}: {
  src?: string;
  video?: string;
  alt?: string;
  shot: string;
  ratio?: string;
  mark?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (video) {
    return (
      <video
        src={video}
        aria-label={alt}
        autoPlay={!reduced}
        controls={reduced}
        muted
        loop
        playsInline
        preload="metadata"
        className={`w-full rounded-[24px] object-cover ${className}`}
        style={{ aspectRatio: ratio }}
      />
    );
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        className={`w-full rounded-[24px] object-cover ${className}`}
        style={{ aspectRatio: ratio }}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-blue/30 bg-gradient-to-br from-blue-soft/70 via-blue-soft/30 to-teal/20 px-7 text-center ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <img src={mark} alt="" aria-hidden="true" className="h-9 w-9 opacity-45" />
      <p className="max-w-[22ch] font-body text-sm leading-snug text-ink/55">{shot}</p>
      <p className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-blue/60">
        Foto pendiente
      </p>
    </div>
  );
}
