/**
 * Hueco de imagen. Si la foto ya existe la muestra; si no, dibuja un espacio
 * de marca que dice exactamente qué foto va ahí. El sitio se ve intencional
 * hoy y la foto entra sin tocar el diseño.
 */
export default function Frame({
  src,
  alt,
  shot,
  ratio = "4 / 5",
  mark = "/node-ring.svg",
  className = "",
}: {
  src?: string;
  alt?: string;
  shot: string;
  ratio?: string;
  mark?: string;
  className?: string;
}) {
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
