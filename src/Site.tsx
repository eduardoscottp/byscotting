import { useEffect } from "react";
import { copy, waLink, type Lang } from "@/copy";
import ProcessFlow from "@/components/ProcessFlow";
import PainForm from "@/components/PainForm";
import StickyWhatsApp from "@/components/StickyWhatsApp";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Spine from "@/components/Spine";
import Frame from "@/components/Frame";
import wordmarkBlue from "@/assets/scotting-wordmark-blue.png";
import wordmarkWhite from "@/assets/scotting-wordmark-white.png";
import eduardoQuienSoy from "@/assets/eduardo-scott-ingeniero-miami.webp";
import workPicktennt from "@/assets/work-picktennt.jpg";
import picktenntDemo from "@/assets/picktennt-demo.mp4";
import agenteProspeccion from "@/assets/agente-prospeccion-clientes.mp4";
import workPoolcontrol from "@/assets/work-poolcontrol.jpg";
import consultoria from "@/assets/consultoria-tecnologica-miami.webp";
import workKeenkaya from "@/assets/work-keenkaya.jpg";
import eduardoRecorte from "@/assets/eduardo-recorte.webp";

function WaButton({
  lang,
  label,
  context,
  tone = "blue",
}: {
  lang: Lang;
  label: string;
  context: string;
  tone?: "blue" | "white";
}) {
  const skin =
    tone === "white"
      ? "bg-white text-blue hover:bg-white/90"
      : "bg-blue text-white hover:bg-blue-dark";
  return (
    <a
      href={waLink(lang, context)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 font-display text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${skin}`}
    >
      <WhatsAppIcon className="h-[18px] w-[18px]" />
      {label}
    </a>
  );
}

function Eyebrow({ children, tone = "dark" }: { children: React.ReactNode; tone?: "dark" | "light" }) {
  return (
    <p
      className={`font-display text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${
        tone === "light" ? "text-teal" : "text-blue"
      }`}
    >
      {children}
    </p>
  );
}

export default function Site({ lang }: { lang: Lang }) {
  const t = copy[lang];
  // los dos primeros casos son video real, no foto: grabaciones sin recortar en 16:10
  const caseImages = [undefined, undefined, workPoolcontrol];
  const caseVideos = [picktenntDemo, agenteProspeccion, undefined];
  const caseRatios = ["16 / 10", "16 / 10", "4 / 3"];

  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
    document.title = t.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.metaDescription);
  }, [t]);

  return (
    <div className="min-h-screen bg-warm font-body text-ink antialiased">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-warm/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3.5">
          <a href={lang === "es" ? "/" : "/en"} className="shrink-0">
            <img src={wordmarkBlue} alt="scotting" className="h-8 w-auto md:h-9" />
          </a>
          <nav className="flex items-center gap-6">
            <a href="#servicios" className="hidden text-sm text-ink/65 transition-colors hover:text-blue sm:inline">
              {t.nav.services}
            </a>
            <a href="#trabajo" className="hidden text-sm text-ink/65 transition-colors hover:text-blue md:inline">
              {t.nav.work}
            </a>
            <a href="#contacto" className="text-sm text-ink/65 transition-colors hover:text-blue">
              {t.nav.contact}
            </a>
            <a
              href={t.switchHref}
              className="rounded-full border border-ink/15 px-3 py-1.5 font-display text-xs font-semibold text-ink/70 transition-colors hover:border-blue hover:text-blue"
            >
              {t.switchTo}
            </a>
          </nav>
        </div>
      </header>

      {/* ---------- Hero: texto grande a la izquierda, foto que sangra a la derecha ---------- */}
      <section className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 pb-6 pt-16 md:grid-cols-[1.15fr_0.85fr] md:gap-16 md:pt-24">
        <div className="flex flex-col gap-7">
          <p className="animate-rise text-lg text-ink/70 md:text-xl">
            {t.hero.kickerBefore}
            <span className="font-semibold text-blue">{t.hero.kickerAccent}</span>
            {t.hero.kickerAfter}
          </p>

          <h1
            className="animate-rise text-balance font-display text-[2.9rem] font-bold leading-[0.98] tracking-[-0.035em] md:text-[4.4rem]"
            style={{ animationDelay: ".14s" }}
          >
            {t.hero.headline}
          </h1>

          <div className="animate-rise flex flex-col gap-1.5" style={{ animationDelay: ".3s" }}>
            {t.hero.body.map((line) => (
              <p key={line} className="max-w-xl text-lg leading-relaxed text-ink/70">
                {line}
              </p>
            ))}
          </div>

          <div className="animate-rise mt-1 flex flex-wrap items-center gap-x-7 gap-y-4" style={{ animationDelay: ".46s" }}>
            <WaButton lang={lang} label={t.hero.cta} context={t.hero.headline} />
          </div>
        </div>

        {/* Retrato recortado sobre el propio fondo de la pagina, sin marco */}
        <div className="animate-rise relative flex justify-center" style={{ animationDelay: ".22s" }}>
          <img
            src={eduardoRecorte}
            alt={t.about.photoAlt}
            width={1100}
            height={1657}
            className="relative w-auto max-w-full object-contain md:max-h-[580px]"
          />
        </div>
      </section>

      <div className="pt-10">
        <Spine />
      </div>

      {/* ---------- Servicios: el menú, concreto ---------- */}
      <section id="servicios" className="scroll-mt-20 bg-ice py-20 md:py-28">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-12 px-6">
          <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
            <div className="flex flex-col gap-3">
              <Eyebrow>{t.services.eyebrow}</Eyebrow>
              <h2 className="text-balance font-display text-[2.1rem] font-bold leading-[1.05] tracking-[-0.03em] md:text-[3.2rem]">
                {t.services.title}
              </h2>
              <p className="text-lg leading-relaxed text-ink/65">{t.services.lead}</p>
            </div>
            <img
              src={consultoria}
              alt={t.services.photoAlt}
              width={1200}
              height={800}
              loading="lazy"
              className="w-full rounded-card object-cover shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)]"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {t.services.items.map((s, i) => (
              <article
                key={s.name}
                className="flex flex-col gap-5 rounded-[22px] bg-white p-8 ring-1 ring-ink/[0.07]"
              >
                <div className="flex items-center justify-between">
                  <img src={s.icon} alt="" aria-hidden="true" className="h-12 w-12" />
                  <span className="font-display text-sm font-bold tabular-nums text-ink/20">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="font-display text-[1.3rem] font-bold leading-tight tracking-[-0.02em]">
                  {s.name}
                </h3>

                <p className="leading-relaxed text-ink/70">{s.claim}</p>

                <ul className="mt-1 flex flex-col gap-2.5 border-t border-ink/[0.08] pt-5">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[0.95rem] leading-snug text-ink/65">
                      <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="py-2">
        <Spine />
      </div>

      {/* ---------- Casos: filas alternadas, no tres cajas iguales ---------- */}
      <section className="mx-auto flex max-w-[1180px] flex-col gap-20 px-6 py-16 md:gap-28 md:py-24">
        <div className="flex max-w-2xl flex-col gap-3">
          <Eyebrow>{t.cases.eyebrow}</Eyebrow>
          <h2 className="text-balance font-display text-[2.1rem] font-bold leading-[1.05] tracking-[-0.03em] md:text-[3.2rem]">
            {t.cases.title}
          </h2>
        </div>

        {t.cases.items.map((item, i) => (
          <article
            key={item.name}
            className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${
              i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
            }`}
          >
            <Frame
              src={caseImages[i]}
              video={caseVideos[i]}
              alt={item.name}
              shot=""
              ratio={caseRatios[i]}
              mark="/node-network.svg"
              className="shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)]"
            />

            <div className="flex flex-col gap-7">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-sm font-bold tabular-nums text-blue">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-semibold">{item.name}</h3>
              </div>

              <blockquote className="border-l-2 border-ink/15 pl-6">
                <p className="font-display text-xl font-medium leading-snug tracking-[-0.015em] text-ink/75 md:text-[1.6rem]">
                  “{item.problem}”
                </p>
                <footer className="mt-3 font-display text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink/40">
                  {t.cases.problemLabel}
                </footer>
              </blockquote>

              <div className="flex flex-col gap-2.5 rounded-[20px] bg-white p-6 ring-1 ring-ink/[0.07]">
                <p className="font-display text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-blue">
                  {t.cases.solutionLabel}
                </p>
                <p className="text-[1.05rem] leading-relaxed text-ink/85">{item.solution}</p>
              </div>
            </div>
          </article>
        ))}

        <WaButton lang={lang} label={t.cases.cta} context={t.cases.title} />
      </section>

      {/* ---------- Banda oscura: el diferenciador + el flujo ---------- */}
      <section className="relative overflow-hidden bg-ink py-20 text-white md:py-28">
        <img
          src="/node-wave.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-8 w-72 opacity-[0.16] md:w-[28rem]"
        />

        <div className="relative mx-auto flex max-w-[1180px] flex-col gap-16 px-6 md:gap-20">
          <div className="flex max-w-3xl flex-col gap-6">
            <Eyebrow tone="light">{t.process.eyebrow}</Eyebrow>
            <h2 className="text-balance font-display text-[2.2rem] font-bold leading-[1.02] tracking-[-0.03em] md:text-[3.6rem]">
              {t.process.title}
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-white/70">{t.process.body}</p>
            <p className="font-display text-lg font-semibold text-teal md:text-xl">{t.process.cycle}</p>
          </div>

          <Spine tone="light" height={64} />

          <ProcessFlow steps={t.process.steps} hint={t.process.hint} loop={t.process.loop} tone="light" />
        </div>
      </section>

      {/* ---------- Quién soy: retrato desplazado, texto estrecho ---------- */}
      <section className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 py-20 md:grid-cols-[0.8fr_1.2fr] md:gap-20 md:py-28">
        <figure className="relative order-1 flex flex-col gap-4">
          <img
            src={eduardoQuienSoy}
            alt={t.about.photoAlt}
            width={1000}
            height={1000}
            loading="lazy"
            className="w-full rounded-[26px] object-cover"
          />
          <figcaption className="text-sm text-ink/55">{t.about.caption}</figcaption>
        </figure>

        <div className="order-2 flex flex-col gap-5">
          <Eyebrow>{t.about.eyebrow}</Eyebrow>
          <h2 className="font-display text-[2.1rem] font-bold leading-[1.05] tracking-[-0.03em] md:text-[3rem]">
            {t.about.title}
          </h2>
          {t.about.paragraphs.map((p) => (
            <p key={p} className="max-w-xl text-lg leading-relaxed text-ink/70">
              {p}
            </p>
          ))}
        </div>
      </section>

      <Spine />

      {/* ---------- En qué creo: la frase que lo define, y cuatro reglas ---------- */}
      <section className="mx-auto max-w-[1180px] px-6 py-20 md:py-28">
        <Eyebrow>{t.beliefs.eyebrow}</Eyebrow>

        <p className="mt-6 max-w-4xl text-balance font-display text-[2.4rem] font-bold uppercase leading-[1.02] tracking-[-0.035em] text-blue md:text-[4rem]">
          {t.beliefs.opener}
        </p>
        <p className="mt-4 text-lg text-ink/55">{t.beliefs.openerNote}</p>

        <ul className="relative mt-14 flex flex-col gap-9 pl-12 md:mt-16 md:gap-10">
          {/* el hilo que une las cuatro, del mismo sistema de nodos */}
          <span
            aria-hidden="true"
            className="absolute left-[10px] top-3 bottom-3 w-[3px] rounded-full bg-blue-soft"
          />
          {t.beliefs.items.map((line) => (
            <li key={line} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-12 top-[0.55em] h-[22px] w-[22px] rounded-full bg-teal/20"
              />
              <span
                aria-hidden="true"
                className="absolute -left-[41px] top-[calc(0.55em+5px)] h-3 w-3 rounded-full bg-teal"
              />
              <p className="max-w-3xl font-display text-[1.5rem] font-semibold leading-snug tracking-[-0.02em] md:text-[2rem]">
                {line}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Lo que he construido ---------- */}
      <section id="trabajo" className="scroll-mt-20 bg-ice py-20 md:py-28">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-14 px-6">
          <div className="flex max-w-3xl flex-col gap-3">
            <Eyebrow>{t.work.eyebrow}</Eyebrow>
            <h2 className="text-balance font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] md:text-[2.9rem]">
              {t.work.title}
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { src: workPoolcontrol, name: "Pool Control Solutions", url: "https://www.poolcontrolsolutions.com" },
              { src: workKeenkaya, name: "Keenkaya", url: "https://keenkaya.com" },
              { src: workPicktennt, name: "Picktennt", url: "https://picktennt.com" },
            ].map((site) => (
              <a
                key={site.name}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-3"
              >
                <img
                  src={site.src}
                  alt={site.name}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-[18px] object-cover object-top ring-1 ring-ink/[0.08] transition-transform duration-500 group-hover:-translate-y-1"
                />
                <span className="font-display text-sm font-semibold text-ink/75 transition-colors group-hover:text-blue">
                  {site.name} ↗
                </span>
              </a>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {t.work.groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-4 rounded-card bg-white p-7 ring-1 ring-ink/[0.07]">
                <img src={group.mark} alt="" aria-hidden="true" className="h-8 w-8" />
                <h3 className="font-display text-lg font-semibold">{group.label}</h3>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.name} className="text-ink/70">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-4 transition-colors hover:text-blue hover:underline"
                        >
                          {item.name} ↗
                        </a>
                      ) : (
                        item.name
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <WaButton lang={lang} label={t.work.cta} context={t.work.eyebrow} />
        </div>
      </section>

      {/* ---------- Contacto: azul pleno, el momento más fuerte de la página ---------- */}
      <section id="contacto" className="relative scroll-mt-20 overflow-hidden bg-blue py-20 text-white md:py-28">
        <img
          src="/arrow-forward.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 right-4 w-56 opacity-25 md:w-80"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <div className="relative mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
          <div className="flex flex-col gap-5">
            <Eyebrow tone="light">{t.form.eyebrow}</Eyebrow>
            <h2 className="text-balance font-display text-[1.9rem] font-bold leading-[1.06] tracking-[-0.03em] md:text-[2.7rem]">
              {t.form.title}
            </h2>
            <p className="text-white/70">{t.form.reassurance}</p>
          </div>

          <div className="rounded-[26px] bg-warm p-7 text-ink md:p-9">
            <PainForm t={t.form} lang={lang} />
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-ink py-12 text-white/70">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            {/* self-start es obligatorio: en un flex column el img se estira al
                ancho del contenedor y w-auto no lo impide. Eso lo deformaba. */}
            <img src={wordmarkWhite} alt="scotting" className="h-8 w-auto self-start" />
            <p className="text-sm text-white/50">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-col gap-1.5 text-sm sm:text-right">
            <p className="text-white/50">{t.footer.location}</p>
            <p className="text-white/35">
              © {new Date().getFullYear()} Scotting. {t.footer.rights}
            </p>
          </div>
        </div>
      </footer>

      <StickyWhatsApp lang={lang} label={t.sticky.label} />
    </div>
  );
}
