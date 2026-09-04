import { useEffect, useState } from "react";
import { waLink, type Lang } from "@/copy";
import WhatsAppIcon from "./WhatsAppIcon";

/**
 * Pill fijo de WhatsApp. Se esconde cuando la sección de contacto está en pantalla,
 * para no repetir el mismo botón dos veces.
 */
export default function StickyWhatsApp({ lang, label }: { lang: Lang; label: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("contacto");
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => setHidden(entries[0].isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={waLink(lang, label)}
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      className={`fixed right-5 z-50 inline-flex items-center gap-2 rounded-full bg-blue px-5 py-3 font-display text-sm font-semibold text-white shadow-lg shadow-blue/25 transition-all duration-300 hover:bg-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
        hidden ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
      }`}
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <WhatsAppIcon className="h-4 w-4" />
      {label}
    </a>
  );
}
